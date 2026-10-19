import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, CommunicationChannel, DeliveryStatus } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { Database } from '../database/database.service';
import { digest, encrypt } from '../security';
import { config } from '../config';

export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  // Remove all spaces, dashes, parentheses, plus signs
  let cleaned = raw.replace(/[^\d]/g, '');
  
  // Tanzania local formats:
  // 07XXXXXXXX or 06XXXXXXXX -> 2557XXXXXXXX / 2556XXXXXXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '255' + cleaned.substring(1);
  } else if (cleaned.length === 9 && (cleaned.startsWith('6') || cleaned.startsWith('7'))) {
    cleaned = '255' + cleaned;
  }
  return cleaned;
}

export function calculateSmsSegments(text: string): number {
  if (!text) return 1;
  // Check if GSM 7-bit or UCS-2 (contains characters outside basic GSM)
  const isAscii = /^[\x20-\x7E\r\n]*$/.test(text);
  if (isAscii) {
    if (text.length <= 160) return 1;
    return Math.ceil(text.length / 153);
  } else {
    if (text.length <= 70) return 1;
    return Math.ceil(text.length / 67);
  }
}

export const SMS_COST_PER_SEGMENT_TZS = 30; // 30 TZS per SMS segment
export const WHATSAPP_COST_PER_TEMPLATE_TZS = 55; // 55 TZS per WhatsApp utility/notification template

@Injectable()
export class CommunicationService {
  constructor(private readonly db: Database) {}

  public normalizePhone(phone: string): string {
    return normalizePhoneNumber(phone);
  }

  public estimateCost(channel: CommunicationChannel, content: string): { unitCostTzs: number; segments: number } {
    if (channel === 'SMS') {
      const segments = calculateSmsSegments(content);
      return { unitCostTzs: segments * SMS_COST_PER_SEGMENT_TZS, segments };
    }
    if (channel === 'WHATSAPP') {
      return { unitCostTzs: WHATSAPP_COST_PER_TEMPLATE_TZS, segments: 1 };
    }
    return { unitCostTzs: 0, segments: 1 };
  }

  /**
   * Enqueue a communication into the Outbox and record a pending CommunicationLog entry atomically.
   */
  public async enqueueMessage(
    tx: Prisma.TransactionClient,
    params: {
      schoolId: string;
      channel: CommunicationChannel;
      recipient: string;
      guardianId?: string;
      studentId?: string;
      subject?: string;
      body: string;
      templateKey?: string;
      templateParams?: Record<string, string>;
      idempotencyKey?: string;
    }
  ): Promise<{ outboxId: string; logId: string }> {
    const { unitCostTzs, segments } = this.estimateCost(params.channel, params.body);

    const log = await tx.communicationLog.create({
      data: {
        schoolId: params.schoolId,
        guardianId: params.guardianId,
        studentId: params.studentId,
        channel: params.channel,
        providerName: params.channel === 'EMAIL' ? config.EMAIL_PROVIDER : 'nextsms',
        recipient: params.recipient,
        templateKey: params.templateKey,
        status: 'PENDING',
        unitCostTzs,
        segments,
        metadata: params.templateParams ? JSON.parse(JSON.stringify(params.templateParams)) : undefined,
      },
    });

    // Package payload securely
    const payloadObject = {
      channel: params.channel,
      recipient: params.recipient,
      subject: params.subject,
      body: params.body,
      templateKey: params.templateKey,
      templateParams: params.templateParams,
      communicationLogId: log.id,
      schoolId: params.schoolId,
    };

    const outbox = await tx.outbox.create({
      data: {
        channel: params.channel,
        schoolId: params.schoolId,
        idempotencyKey: params.idempotencyKey,
        payload: encrypt(JSON.stringify(payloadObject)),
      },
    });

    return { outboxId: outbox.id, logId: log.id };
  }

  /**
   * Request contact verification OTP code (SMS, WhatsApp, or Email)
   */
  public async requestVerification(
    schoolId: string,
    guardianId: string,
    channel: CommunicationChannel,
    actorId: string
  ): Promise<{ success: boolean; resendAfter: string; channel: CommunicationChannel; destination: string }> {
    const guardian = await this.db.guardian.findFirst({
      where: { id: guardianId, schoolId },
    });

    if (!guardian) {
      throw new BadRequestException('Guardian not found in this school.');
    }

    let destination = '';
    if (channel === 'SMS') {
      destination = this.normalizePhone(guardian.phone);
      if (!destination) throw new BadRequestException('Guardian does not have a valid phone number.');
    } else if (channel === 'WHATSAPP') {
      destination = this.normalizePhone(guardian.whatsappPhone || guardian.phone);
      if (!destination) throw new BadRequestException('Guardian does not have a valid WhatsApp phone number.');
    } else if (channel === 'EMAIL') {
      destination = (guardian.email || '').trim().toLowerCase();
      if (!destination || !destination.includes('@')) throw new BadRequestException('Guardian does not have a valid email address.');
    }

    // Check rate limit: recent active verification requests for this guardian & channel
    const recent = await this.db.contactVerification.findFirst({
      where: {
        schoolId,
        guardianId,
        channel,
        resendAfter: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      throw new ConflictException(`Please wait until ${recent.resendAfter.toISOString()} before requesting another code.`);
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const code = randomInt(100000, 999999).toString();
    const codeHash = digest(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const resendAfter = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown

    const verificationMessage = `SyncAcademy verification code: ${code}. Valid for 15 minutes. Do not share this code.`;

    await this.db.$transaction(async tx => {
      // Invalidate existing unverified codes for this guardian and channel
      await tx.contactVerification.deleteMany({
        where: { schoolId, guardianId, channel, verifiedAt: null },
      });

      await tx.contactVerification.create({
        data: {
          schoolId,
          guardianId,
          channel,
          destination,
          codeHash,
          expiresAt,
          resendAfter,
        },
      });

      // Enqueue verification message into outbox
      await this.enqueueMessage(tx, {
        schoolId,
        guardianId,
        channel,
        recipient: destination,
        subject: 'SyncAcademy Verification Code',
        body: verificationMessage,
        templateKey: channel === 'WHATSAPP' ? 'verification_code' : undefined,
        templateParams: { code, validity: '15 minutes' },
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId,
          action: `CONTACT_VERIFICATION_REQUESTED_${channel}`,
          target: guardianId,
        },
      });
    });

    return {
      success: true,
      resendAfter: resendAfter.toISOString(),
      channel,
      destination: channel === 'EMAIL' 
        ? destination.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : destination.slice(0, 4) + '****' + destination.slice(-3),
    };
  }

  /**
   * Confirm verification code
   */
  public async confirmVerification(
    schoolId: string,
    guardianId: string,
    channel: CommunicationChannel,
    code: string,
    actorId: string
  ): Promise<{ verified: boolean; message: string }> {
    const codeHash = digest(code.trim());

    const verification = await this.db.contactVerification.findFirst({
      where: {
        schoolId,
        guardianId,
        channel,
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('No pending verification request found. Request a new code.');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    if (verification.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Request a new code.');
    }

    if (verification.codeHash !== codeHash) {
      await this.db.contactVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code.');
    }

    const now = new Date();
    await this.db.$transaction(async tx => {
      await tx.contactVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: now },
      });

      const updateData: Prisma.GuardianUpdateInput = {};
      if (channel === 'SMS') updateData.phoneVerifiedAt = now;
      if (channel === 'WHATSAPP') updateData.whatsappVerifiedAt = now;
      if (channel === 'EMAIL') updateData.emailVerifiedAt = now;

      await tx.guardian.update({
        where: { id_schoolId: { id: guardianId, schoolId } },
        data: updateData,
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId,
          action: `CONTACT_VERIFIED_${channel}`,
          target: guardianId,
        },
      });
    });

    return {
      verified: true,
      message: `${channel} contact method has been successfully verified.`,
    };
  }
}
