import { 
  SmsProvider, 
  WhatsAppProvider, 
  EmailProvider, 
  OutboundSmsRequest, 
  OutboundWhatsAppRequest, 
  OutboundEmailRequest, 
  OutboundMessageResult,
  BalanceResult,
  DeliveryReportResult 
} from '../interfaces/provider.interfaces';
import { NextSmsProvider } from './nextsms-sms.provider';

export class MockCommunicationProvider implements SmsProvider, WhatsAppProvider, EmailProvider {
  readonly providerName = 'mock';
  public sentSms: OutboundSmsRequest[] = [];
  public sentWhatsApp: OutboundWhatsAppRequest[] = [];
  public sentEmail: OutboundEmailRequest[] = [];
  public balanceTzs = 100000;
  public forceFail = false;
  public failStatus = 'FAILED' as const;
  public failStatusCode = 57;

  public async send(req: OutboundSmsRequest | OutboundEmailRequest): Promise<OutboundMessageResult> {
    if ('subject' in req) {
      // Email request
      return this.sendEmail(req);
    } else {
      // SMS request
      return this.sendSms(req);
    }
  }

  public async sendSms(req: OutboundSmsRequest): Promise<OutboundMessageResult> {
    this.sentSms.push(req);
    const recipient = NextSmsProvider.normalizePhoneNumber(req.to);

    if (this.forceFail) {
      return {
        channel: 'SMS',
        providerName: this.providerName,
        providerMessageId: `mock-fail-${Date.now()}`,
        status: this.failStatus,
        recipient,
        statusCode: this.failStatusCode,
        statusDescription: 'Simulated failure in MockCommunicationProvider',
        isRetryable: false,
      };
    }

    const { segments } = NextSmsProvider.calculateSegments(req.text);
    const unitCost = segments * 25; // 25 TZS per segment
    this.balanceTzs -= unitCost;

    return {
      channel: 'SMS',
      providerName: this.providerName,
      providerMessageId: `mock-sms-${Date.now()}-${this.sentSms.length}`,
      status: 'DELIVERED',
      recipient,
      segments,
      unitCostTzs: unitCost,
      statusCode: 73,
      statusDescription: 'Delivered (Mock)',
    };
  }

  public async sendTemplate(req: OutboundWhatsAppRequest): Promise<OutboundMessageResult> {
    this.sentWhatsApp.push(req);
    const rawTo = Array.isArray(req.to) ? req.to[0] : req.to;
    const recipient = NextSmsProvider.normalizePhoneNumber(rawTo);

    if (this.forceFail) {
      return {
        channel: 'WHATSAPP',
        providerName: this.providerName,
        providerMessageId: `mock-fail-${Date.now()}`,
        status: this.failStatus,
        recipient,
        statusCode: this.failStatusCode,
        statusDescription: 'Simulated WhatsApp failure in MockCommunicationProvider',
        isRetryable: false,
      };
    }

    const unitCost = 50; // 50 TZS per utility conversation
    this.balanceTzs -= unitCost;

    return {
      channel: 'WHATSAPP',
      providerName: this.providerName,
      providerMessageId: `mock-wa-${Date.now()}-${this.sentWhatsApp.length}`,
      status: 'DELIVERED',
      recipient,
      unitCostTzs: unitCost,
      statusCode: 73,
      statusDescription: 'Delivered (Mock WhatsApp)',
    };
  }

  public async sendEmail(req: OutboundEmailRequest): Promise<OutboundMessageResult> {
    this.sentEmail.push(req);

    if (this.forceFail) {
      return {
        channel: 'EMAIL',
        providerName: this.providerName,
        providerMessageId: `mock-fail-${Date.now()}`,
        status: this.failStatus,
        recipient: req.to,
        statusCode: this.failStatusCode,
        statusDescription: 'Simulated Email failure in MockCommunicationProvider',
        isRetryable: false,
      };
    }

    return {
      channel: 'EMAIL',
      providerName: this.providerName,
      providerMessageId: `mock-mail-${Date.now()}-${this.sentEmail.length}`,
      status: 'DELIVERED',
      recipient: req.to,
      unitCostTzs: 0,
      statusCode: 250,
      statusDescription: 'OK (Mock Email)',
    };
  }

  public async checkBalance(): Promise<BalanceResult> {
    return {
      providerName: this.providerName,
      smsBalance: this.balanceTzs,
      overdraft: 0,
      currency: 'TZS',
      display: `${this.balanceTzs.toLocaleString()} TZS`,
    };
  }

  public async getDeliveryReport(messageId: string): Promise<DeliveryReportResult> {
    return {
      messageId,
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
      doneAt: new Date().toISOString(),
      rawStatus: 'DELIVERED',
    };
  }

  public reset(): void {
    this.sentSms = [];
    this.sentWhatsApp = [];
    this.sentEmail = [];
    this.forceFail = false;
    this.balanceTzs = 100000;
  }
}
