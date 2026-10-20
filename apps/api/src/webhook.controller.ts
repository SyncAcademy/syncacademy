import { 
  BadRequestException, 
  Body, 
  Controller, 
  Headers, 
  HttpCode, 
  Post, 
  Req,
  ServiceUnavailableException,
  UnauthorizedException 
} from '@nestjs/common';
import { Request } from 'express';
import { Database } from './database/database.service';
import { config } from './config';
import { NextSmsWebhookHandler } from './communication/webhooks/nextsms-webhook';
import { verifyResendWebhookSignature } from './communication/webhooks/resend-webhook';
import { DeliveryStatus } from '@prisma/client';
import { z } from 'zod';

@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly nextSmsHandler: NextSmsWebhookHandler;

  constructor(private readonly db: Database) {
    this.nextSmsHandler = new NextSmsWebhookHandler(config.NEXTSMS_WEBHOOK_VERIFY_TOKEN);
  }

  /**
   * NextSMS Delivery Status Callback
   */
  @Post('nextsms/delivery')
  @HttpCode(200)
  async nextSmsDeliveryCallback(@Body() body: unknown) {
    const result = this.nextSmsHandler.handle(body);
    if (!result.valid || !result.data) {
      throw new UnauthorizedException(result.reason || 'Invalid webhook payload.');
    }

    const { messageId, status, rawStatus } = result.data;

    const log = await this.db.communicationLog.findFirst({
      where: { providerMessageId: messageId },
    });

    if (log) {
      await this.db.communicationLog.update({
        where: { id: log.id },
        data: {
          status,
          deliveredAt: ['DELIVERED', 'READ'].includes(status) ? new Date() : undefined,
          errorMessage: status === 'FAILED' || status === 'REJECTED' || status === 'UNDELIVERABLE' ? rawStatus : undefined,
        },
      });
    }

    return { received: true, messageId, status };
  }

  /**
   * NextSMS WhatsApp Inbound Message Callback
   * Supports STOP / SIMAMA / ONDOA keyword handling for regulatory opt-out compliance.
   */
  @Post('nextsms/inbound')
  @HttpCode(200)
  async nextSmsInboundCallback(@Body() body: unknown) {
    const result = this.nextSmsHandler.handle(body);
    if (!result.valid || !result.data) {
      throw new UnauthorizedException(result.reason || 'Invalid webhook payload.');
    }

    const text = (result.data.inboundText || '').trim().toUpperCase();
    const isOptOut = text === 'STOP' || text === 'SIMAMA' || text === 'ONDOA' || text === 'UNSUBSCRIBE';

    if (isOptOut) {
      // Find log by messageId to identify guardian
      const log = await this.db.communicationLog.findFirst({
        where: { providerMessageId: result.data.messageId },
        include: { guardian: true },
      });

      if (log?.guardianId && log.schoolId) {
        await this.db.guardian.update({
          where: { id_schoolId: { id: log.guardianId, schoolId: log.schoolId } },
          data: {
            optOutWhatsapp: true,
            optOutSms: true,
          },
        });

        await this.db.auditEvent.create({
          data: {
            schoolId: log.schoolId,
            actorId: log.guardianId,
            action: 'GUARDIAN_OPTED_OUT_VIA_INBOUND',
            target: log.guardianId,
          },
        });
      }
    }

    return { received: true, optOutApplied: isOptOut };
  }

  /**
   * Resend Webhook Callback
   * Handles delivery, bounce, and complaint events.
   */
  @Post('resend')
  @HttpCode(200)
  async resendWebhookCallback(
    @Headers('svix-signature') signature: string | undefined,
    @Headers('svix-id') id: string | undefined,
    @Headers('svix-timestamp') timestamp: string | undefined,
    @Req() req: Request,
    @Body() body: unknown
  ) {
    if (!config.RESEND_WEBHOOK_SECRET) throw new ServiceUnavailableException('Email webhook authentication is not configured.');
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!verifyResendWebhookSignature(config.RESEND_WEBHOOK_SECRET, { id, timestamp, signature }, rawBody)) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    const parsed = z.object({
      type: z.string().trim().min(1).max(100),
      data: z.object({ email_id: z.string().trim().min(1).max(200).optional() }).passthrough(),
    }).passthrough().safeParse(body);
    if (!parsed.success) return { received: true, ignored: true };
    const eventType = parsed.data.type;
    const emailId = parsed.data.data.email_id;

    if (!eventType || !emailId) {
      return { received: true, ignored: true };
    }

    let status: DeliveryStatus | undefined;
    if (eventType === 'email.delivered') {
      status = 'DELIVERED';
    } else if (eventType === 'email.bounced') {
      status = 'FAILED';
    } else if (eventType === 'email.complained') {
      status = 'REJECTED';
    }

    if (status) {
      const log = await this.db.communicationLog.findFirst({
        where: { providerMessageId: emailId },
      });

      if (log) {
        await this.db.communicationLog.update({
          where: { id: log.id },
          data: {
            status,
            deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
            errorMessage: eventType === 'email.bounced' ? 'Email bounced' : undefined,
          },
        });
      }
    }

    return { received: true, emailId, eventType };
  }
}
