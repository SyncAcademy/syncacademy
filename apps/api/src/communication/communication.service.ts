import { Injectable } from '@nestjs/common';
import { Prisma, CommunicationChannel } from '@prisma/client';
import { Database } from '../database/database.service';
import { encrypt } from '../security';
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

  public normalizePhone(phone: string | null | undefined): string {
    return normalizePhoneNumber(phone || '');
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
      html?: string;
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
      html: params.html,
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

}
