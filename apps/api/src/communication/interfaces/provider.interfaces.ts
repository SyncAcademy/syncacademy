/**
 * SyncAcademy Communication Provider Interfaces
 * Multi-channel abstraction layer for SMS, WhatsApp, and Email.
 */

export type CommunicationChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';

export type DeliveryStatus = 
  | 'PENDING'
  | 'ENROUTE'
  | 'ACCEPTED'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'REJECTED'
  | 'UNDELIVERABLE'
  | 'EXPIRED';

export interface OutboundSmsRequest {
  to: string; // E.164 phone number (e.g. "+255712345678" or "255712345678")
  text: string;
  from?: string; // Sender ID (defaults to SYNCACADEMY)
  reference?: string; // Unique deduplication / tracking reference
  flash?: boolean;
}

export interface OutboundWhatsAppRequest {
  to: string | string[]; // Single or multiple recipient phone numbers
  template: string; // Registered pre-approved template name
  account?: string; // Registered WhatsApp account/sender (defaults to SYNCACADEMY)
  attributes?: Record<string, string>[]; // Parameter interpolation array
  documentUrl?: string; // Optional PDF/media attachment URL
  reference?: string;
}

export interface OutboundEmailRequest {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    cid?: string;
  }>;
  reference?: string;
}

export interface OutboundMessageResult {
  channel: CommunicationChannel;
  providerName: string; // e.g. 'nextsms', 'smtp-nodemailer', 'mock'
  providerMessageId: string;
  status: DeliveryStatus;
  recipient: string;
  unitCostTzs?: number;
  segments?: number;
  statusCode?: number;
  statusDescription?: string;
  isRetryable?: boolean;
  rawResponse?: unknown;
}

export interface BalanceResult {
  providerName: string;
  smsBalance: number;
  overdraft: number;
  currency: string;
  display: string;
  rawResponse?: unknown;
}

export interface DeliveryReportResult {
  messageId: string;
  reference?: string | null;
  status: DeliveryStatus;
  sentAt?: string;
  doneAt?: string;
  rawStatus?: string;
}

export interface SmsProvider {
  readonly providerName: string;
  send(req: OutboundSmsRequest): Promise<OutboundMessageResult>;
  checkBalance?(): Promise<BalanceResult>;
  getDeliveryReport?(messageId: string): Promise<DeliveryReportResult>;
}

export interface WhatsAppProvider {
  readonly providerName: string;
  sendTemplate(req: OutboundWhatsAppRequest): Promise<OutboundMessageResult>;
}

export interface EmailProvider {
  readonly providerName: string;
  send(req: OutboundEmailRequest): Promise<OutboundMessageResult>;
}

export interface NextSmsWebhookPayload {
  token: string;
  messageId: string;
  status?: string;
  id?: string;
  response?: string;
  payload?: string;
  text?: string;
}
