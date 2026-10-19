import nodemailer, { Transporter } from 'nodemailer';
import { 
  EmailProvider, 
  OutboundEmailRequest, 
  OutboundMessageResult 
} from '../interfaces/provider.interfaces';

export interface SmtpEmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  password?: string;
  defaultFrom?: string;
}

export class SmtpEmailProvider implements EmailProvider {
  readonly providerName = 'smtp-nodemailer';
  private transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(optionsOrTransporter: SmtpEmailConfig | Transporter) {
    if ('sendMail' in optionsOrTransporter && typeof optionsOrTransporter.sendMail === 'function') {
      this.transporter = optionsOrTransporter;
      this.defaultFrom = 'noreply@syncacademy.local';
    } else {
      const config = optionsOrTransporter as SmtpEmailConfig;
      this.defaultFrom = config.defaultFrom || 'noreply@syncacademy.local';
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure ?? false,
        auth: config.user ? { user: config.user, pass: config.password } : undefined,
        connectionTimeout: 10000,
        socketTimeout: 20000,
      });
    }
  }

  public async send(req: OutboundEmailRequest): Promise<OutboundMessageResult> {
    const from = req.from || this.defaultFrom;
    const messageId = `<${req.reference || Date.now()}@syncacademy.local>`;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: req.to,
        subject: req.subject,
        text: req.text,
        html: req.html,
        attachments: req.attachments?.map(att => ({
          filename: att.filename,
          path: att.path,
          content: att.content,
          cid: att.cid,
        })),
        messageId,
      });

      return {
        channel: 'EMAIL',
        providerName: this.providerName,
        providerMessageId: String(info.messageId || messageId),
        status: 'DELIVERED',
        recipient: req.to,
        unitCostTzs: 0, // Transactional email has no per-segment telecom fee
        rawResponse: info,
      };
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string; responseCode?: number };
      const isRetryable = !error.responseCode || (error.responseCode >= 400 && error.responseCode < 500);

      return {
        channel: 'EMAIL',
        providerName: this.providerName,
        providerMessageId: `err-${Date.now()}`,
        status: 'FAILED',
        recipient: req.to,
        statusCode: error.responseCode,
        statusDescription: error.message || 'SMTP delivery failed',
        isRetryable,
        rawResponse: error,
      };
    }
  }

  public close(): void {
    this.transporter.close();
  }
}
