import { NextSmsWebhookPayload, DeliveryStatus } from '../interfaces/provider.interfaces';
import { timingSafeEqual } from 'node:crypto';

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
  type?: 'DELIVERY_REPORT' | 'WHATSAPP_RESPONSE';
  data?: {
    messageId: string;
    status: DeliveryStatus;
    statusCode?: number;
    rawStatus?: string;
    inboundText?: string;
    payloadKey?: string;
  };
}

export class NextSmsWebhookHandler {
  private readonly expectedVerifyToken?: string;

  constructor(expectedVerifyToken?: string) {
    this.expectedVerifyToken = expectedVerifyToken;
  }

  /**
   * Validates and parses an incoming NextSMS webhook payload.
   */
  public handle(payload: unknown): WebhookValidationResult {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, reason: 'Payload must be a non-empty JSON object' };
    }

    const data = payload as Partial<NextSmsWebhookPayload>;

    // 1. Verify token
    if (!this.expectedVerifyToken || typeof data.token !== 'string' || !data.token || !this.tokenMatches(data.token)) {
      return { valid: false, reason: 'Invalid or missing webhook verification token' };
    }

    // 2. Validate messageId
    if (!data.messageId || typeof data.messageId !== 'string') {
      return { valid: false, reason: 'Missing messageId in webhook payload' };
    }

    // 3. Check if this is an inbound WhatsApp response
    if (data.response || data.text || data.payload) {
      return {
        valid: true,
        type: 'WHATSAPP_RESPONSE',
        data: {
          messageId: data.messageId,
          status: 'READ',
          inboundText: data.text || data.response,
          payloadKey: data.payload,
        },
      };
    }

    // 4. Delivery report
    const statusCode = data.id ? parseInt(data.id, 10) : undefined;
    const rawStatus = data.status || '';
    const status = this.mapDeliveryStatus(rawStatus, statusCode);

    return {
      valid: true,
      type: 'DELIVERY_REPORT',
      data: {
        messageId: data.messageId,
        status,
        statusCode,
        rawStatus,
      },
    };
  }

  private mapDeliveryStatus(rawStatus: string, id?: number): DeliveryStatus {
    const upper = rawStatus.toUpperCase();
    if (upper === 'DELIVERED' || id === 73) return 'DELIVERED';
    if (upper === 'READ' || id === 108) return 'READ';
    if (upper === 'EXPIRED' || id === 74) return 'EXPIRED';
    if (upper === 'UNDELIVERABLE' || id === 76) return 'UNDELIVERABLE';
    if (upper === 'REJECTED' || id === 79) return 'REJECTED';
    if (upper === 'ACCEPTED' || id === 77 || id === 52) return 'ACCEPTED';
    if (upper === 'SENT' || id === 51) return 'ENROUTE';
    if (id === 50) return 'PENDING';
    if (id === 57 || id === 58 || id === 64) return 'FAILED';
    return 'ENROUTE';
  }

  private tokenMatches(candidate: string): boolean {
    const candidateBytes = Buffer.from(candidate);
    const expectedBytes = Buffer.from(this.expectedVerifyToken!);
    return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
  }
}
