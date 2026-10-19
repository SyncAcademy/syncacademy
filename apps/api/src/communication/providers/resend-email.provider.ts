import { 
  EmailProvider, 
  OutboundEmailRequest, 
  OutboundMessageResult 
} from '../interfaces/provider.interfaces';

export interface ResendEmailConfig {
  apiKey: string;
  defaultFrom?: string;
  mockMode?: boolean;
}

export class ResendEmailProvider implements EmailProvider {
  readonly providerName = 'resend';
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private readonly mockMode: boolean;

  constructor(config: ResendEmailConfig) {
    this.apiKey = config.apiKey;
    this.defaultFrom = config.defaultFrom || 'notifications@syncacademy.co.tz';
    this.mockMode = !!config.mockMode || !config.apiKey;
  }

  public async send(req: OutboundEmailRequest): Promise<OutboundMessageResult> {
    const from = req.from || this.defaultFrom;
    const recipient = req.to;

    if (this.mockMode) {
      const mockId = `resend-mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        channel: 'EMAIL',
        providerName: this.providerName,
        providerMessageId: mockId,
        status: 'DELIVERED',
        recipient,
        unitCostTzs: 0,
        rawResponse: { mock: true, id: mockId, to: recipient, from, subject: req.subject },
      };
    }

    try {
      const payload: Record<string, unknown> = {
        from,
        to: Array.isArray(recipient) ? recipient : [recipient],
        subject: req.subject,
        text: req.text,
      };

      if (req.html) {
        payload.html = req.html;
      }

      if (req.attachments && req.attachments.length > 0) {
        payload.attachments = req.attachments.map(att => {
          let content = att.content;
          if (Buffer.isBuffer(content)) {
            content = content.toString('base64');
          }
          return {
            filename: att.filename,
            content,
            path: att.path,
          };
        });
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null) as { id?: string; name?: string; message?: string; statusCode?: number } | null;

      if (!res.ok) {
        const isRetryable = res.status === 429 || res.status >= 500;
        return {
          channel: 'EMAIL',
          providerName: this.providerName,
          providerMessageId: `err-${Date.now()}`,
          status: 'FAILED',
          recipient,
          statusCode: res.status,
          statusDescription: data?.message || `Resend error: ${res.statusText}`,
          isRetryable,
          rawResponse: data,
        };
      }

      return {
        channel: 'EMAIL',
        providerName: this.providerName,
        providerMessageId: data?.id || `resend-${Date.now()}`,
        status: 'DELIVERED',
        recipient,
        unitCostTzs: 0,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        channel: 'EMAIL',
        providerName: this.providerName,
        providerMessageId: `err-${Date.now()}`,
        status: 'FAILED',
        recipient,
        statusDescription: error.message || 'Resend HTTP request failed',
        isRetryable: true,
        rawResponse: error,
      };
    }
  }
}
