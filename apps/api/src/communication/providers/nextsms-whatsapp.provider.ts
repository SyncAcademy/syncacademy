import { 
  WhatsAppProvider, 
  OutboundWhatsAppRequest, 
  OutboundMessageResult,
  DeliveryStatus 
} from '../interfaces/provider.interfaces';
import { NextSmsConfig, NextSmsProvider } from './nextsms-sms.provider';

export class NextWhatsAppProvider implements WhatsAppProvider {
  readonly providerName = 'nextsms-whatsapp';
  private readonly baseUrl: string;
  private readonly defaultAccount: string;
  private readonly token?: string;
  private readonly username?: string;
  private readonly password?: string;
  private readonly testMode: boolean;

  constructor(options: NextSmsConfig = {}) {
    this.baseUrl = (options.baseUrl || 'https://messaging-service.co.tz').replace(/\/+$/, '');
    this.defaultAccount = options.defaultSenderId || 'SYNCACADEMY';
    this.token = options.token;
    this.username = options.username;
    this.password = options.password;
    this.testMode = options.testMode ?? false;
  }

  private getAuthorizationHeader(): string {
    if (this.token) {
      return `Bearer ${this.token}`;
    }
    if (this.username && this.password) {
      const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      return `Basic ${encoded}`;
    }
    throw new Error('NextWhatsApp provider requires either token or username/password configuration.');
  }

  /**
   * Dispatches a WhatsApp pre-registered utility template message via NextSMS.
   */
  public async sendTemplate(req: OutboundWhatsAppRequest): Promise<OutboundMessageResult> {
    const rawRecipients = Array.isArray(req.to) ? req.to : [req.to];
    const normalizedRecipients = rawRecipients.map(r => NextSmsProvider.normalizePhoneNumber(r));

    // Validate that at least one recipient is valid
    const validRecipients = normalizedRecipients.filter(r => NextSmsProvider.isValidTanzanianNumber(r));
    if (validRecipients.length === 0) {
      return {
        channel: 'WHATSAPP',
        providerName: this.providerName,
        providerMessageId: `invalid-${Date.now()}`,
        status: 'REJECTED',
        recipient: normalizedRecipients.join(','),
        statusCode: 69,
        statusDescription: 'No valid recipient phone numbers provided.',
        isRetryable: false,
      };
    }

    const endpointPath = this.testMode
      ? '/api/whatsapp/v2/test/text/single'
      : '/api/whatsapp/v2/text/single';
    const targetUrl = `${this.baseUrl}${endpointPath}`;

    const payload: Record<string, unknown> = {
      to: validRecipients.map(r => Number(r)),
      account: req.account || this.defaultAccount,
      template: req.template,
      reference: req.reference || undefined,
    };

    if (req.attributes && req.attributes.length > 0) {
      payload.attributes = req.attributes;
    }

    if (req.documentUrl) {
      payload.document = req.documentUrl;
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthorizationHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          channel: 'WHATSAPP',
          providerName: this.providerName,
          providerMessageId: `err-${Date.now()}`,
          status: 'FAILED',
          recipient: validRecipients.join(','),
          statusCode: response.status,
          statusDescription: `NextSMS WhatsApp HTTP error: ${response.statusText}`,
          isRetryable: response.status >= 500,
          rawResponse: responseData,
        };
      }

      const msgObj = Array.isArray(responseData.messages) ? responseData.messages[0] : null;
      if (msgObj) {
        const statusObj = msgObj.status || {};
        const statusCode = Number(statusObj.id || 0);
        const mappedStatus = this.mapStatus(statusCode, statusObj.groupName);
        // Code 111 = REJECTED_MISSING_OUTLET (not registered template or whatsapp number)
        const isRetryable = statusCode === 64 || statusCode === 53;

        return {
          channel: 'WHATSAPP',
          providerName: this.providerName,
          providerMessageId: String(msgObj.messageId || `unspecified-${Date.now()}`),
          status: mappedStatus,
          recipient: String(msgObj.to || validRecipients[0]),
          unitCostTzs: Number(msgObj.price || 0),
          statusCode,
          statusDescription: statusObj.description || statusObj.name,
          isRetryable,
          rawResponse: responseData,
        };
      }

      return {
        channel: 'WHATSAPP',
        providerName: this.providerName,
        providerMessageId: `unknown-${Date.now()}`,
        status: 'ENROUTE',
        recipient: validRecipients.join(','),
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        channel: 'WHATSAPP',
        providerName: this.providerName,
        providerMessageId: `err-${Date.now()}`,
        status: 'FAILED',
        recipient: validRecipients.join(','),
        statusDescription: `Network fetch failed: ${errorMessage}`,
        isRetryable: true,
      };
    }
  }

  private mapStatus(id: number, groupName?: string): DeliveryStatus {
    switch (id) {
      case 50: return 'PENDING';
      case 51: return 'ENROUTE';
      case 52: return 'ACCEPTED';
      case 73: return 'DELIVERED';
      case 108: return 'READ';
      case 74: return 'EXPIRED';
      case 76: return 'UNDELIVERABLE';
      case 79: return 'REJECTED';
      case 111: return 'REJECTED'; // REJECTED_MISSING_OUTLET
      default:
        if (groupName === 'DELIVERY') return 'DELIVERED';
        if (groupName === 'REJECTED') return 'REJECTED';
        if (groupName === 'FAILED') return 'FAILED';
        return 'ENROUTE';
    }
  }
}
