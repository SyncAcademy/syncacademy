import { 
  SmsProvider, 
  OutboundSmsRequest, 
  OutboundMessageResult, 
  BalanceResult, 
  DeliveryReportResult,
  DeliveryStatus 
} from '../interfaces/provider.interfaces';

export interface NextSmsConfig {
  baseUrl?: string;
  token?: string;
  username?: string;
  password?: string;
  defaultSenderId?: string;
  testMode?: boolean;
}

export class NextSmsProvider implements SmsProvider {
  readonly providerName = 'nextsms';
  private readonly baseUrl: string;
  private readonly defaultSenderId: string;
  private readonly token?: string;
  private readonly username?: string;
  private readonly password?: string;
  private readonly testMode: boolean;

  constructor(options: NextSmsConfig = {}) {
    this.baseUrl = (options.baseUrl || 'https://messaging-service.co.tz').replace(/\/+$/, '');
    this.defaultSenderId = options.defaultSenderId || 'SYNCACADEMY';
    this.token = options.token;
    this.username = options.username;
    this.password = options.password;
    this.testMode = options.testMode ?? false;
  }

  /**
   * Normalizes any phone number into Tanzanian E.164 digits-only format (255XXXXXXXXX).
   * Strips leading '+', converts leading '0' to '255', and strips spaces or dashes.
   */
  public static normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned.slice(1);
    }
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '255' + cleaned.slice(1);
    }
    return cleaned;
  }

  /**
   * Validates if a phone number matches Tanzanian mobile network prefixes (Vodacom, Airtel, Tigo, Halotel).
   */
  public static isValidTanzanianNumber(normalizedPhone: string): boolean {
    return /^255[67]\d{8}$/.test(normalizedPhone);
  }

  /**
   * Calculates SMS segments based on GSM-7 or UCS-2 character sets.
   */
  public static calculateSegments(text: string): { segments: number; isUcs2: boolean } {
    // Check for characters outside standard GSM 03.38 7-bit alphabet
    const gsm7Pattern = /^[\x20-\x7E\r\n\u00A3\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\u00D8\u00F8\u00C5\u00E5\u0394\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\u00C6\u00E6\u00DF\u00C9]*$/;
    const isUcs2 = !gsm7Pattern.test(text);

    const length = text.length;
    if (length === 0) return { segments: 1, isUcs2 };

    if (!isUcs2) {
      // GSM-7: 160 chars single, 153 chars concatenated
      const segments = length <= 160 ? 1 : Math.ceil(length / 153);
      return { segments, isUcs2 };
    } else {
      // UCS-2: 70 chars single, 67 chars concatenated
      const segments = length <= 70 ? 1 : Math.ceil(length / 67);
      return { segments, isUcs2 };
    }
  }

  /**
   * Formats authorization header (Bearer token preferred, Basic auth fallback).
   */
  public getAuthorizationHeader(): string {
    if (this.token) {
      return `Bearer ${this.token}`;
    }
    if (this.username && this.password) {
      const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      return `Basic ${encoded}`;
    }
    throw new Error('NextSMS provider requires either token or username/password configuration.');
  }

  /**
   * Sends an SMS message via NextSMS REST API.
   */
  public async send(req: OutboundSmsRequest): Promise<OutboundMessageResult> {
    const recipient = NextSmsProvider.normalizePhoneNumber(req.to);
    if (!NextSmsProvider.isValidTanzanianNumber(recipient)) {
      return {
        channel: 'SMS',
        providerName: this.providerName,
        providerMessageId: `invalid-${Date.now()}`,
        status: 'REJECTED',
        recipient,
        statusCode: 69,
        statusDescription: 'Invalid destination phone number. Must be a valid Tanzanian mobile number (255XXXXXXXXX).',
        isRetryable: false,
      };
    }

    const { segments } = NextSmsProvider.calculateSegments(req.text);
    const endpointPath = this.testMode 
      ? '/api/sms/v2/test/text/single'
      : '/api/sms/v2/text/single';
    const targetUrl = `${this.baseUrl}${endpointPath}`;

    const payload = {
      from: req.from || this.defaultSenderId,
      to: recipient,
      text: req.text,
      flash: req.flash ? 1 : 0,
      reference: req.reference || undefined,
    };

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
          channel: 'SMS',
          providerName: this.providerName,
          providerMessageId: `err-${Date.now()}`,
          status: 'FAILED',
          recipient,
          segments,
          statusCode: response.status,
          statusDescription: `NextSMS HTTP error: ${response.statusText}`,
          isRetryable: response.status >= 500,
          rawResponse: responseData,
        };
      }

      // Check NextSMS response structure
      const msgObj = Array.isArray(responseData.messages) ? responseData.messages[0] : null;
      if (msgObj) {
        const statusObj = msgObj.status || {};
        const statusCode = Number(statusObj.id || 0);
        const mappedStatus = this.mapStatus(statusCode, statusObj.groupName);
        const isRetryable = statusCode === 64 || statusCode === 53; // System error or network glitch

        return {
          channel: 'SMS',
          providerName: this.providerName,
          providerMessageId: String(msgObj.messageId || `unspecified-${Date.now()}`),
          status: mappedStatus,
          recipient,
          segments: Number(msgObj.smsCount || segments),
          unitCostTzs: Number(msgObj.price || 0),
          statusCode,
          statusDescription: statusObj.description || statusObj.name,
          isRetryable,
          rawResponse: responseData,
        };
      }

      return {
        channel: 'SMS',
        providerName: this.providerName,
        providerMessageId: `unknown-${Date.now()}`,
        status: 'ENROUTE',
        recipient,
        segments,
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        channel: 'SMS',
        providerName: this.providerName,
        providerMessageId: `err-${Date.now()}`,
        status: 'FAILED',
        recipient,
        segments,
        statusDescription: `Network fetch failed: ${errorMessage}`,
        isRetryable: true,
      };
    }
  }

  /**
   * Fetches account balance from NextSMS.
   */
  public async checkBalance(): Promise<BalanceResult> {
    const targetUrl = `${this.baseUrl}/api/v2/balance`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthorizationHeader(),
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check NextSMS balance: HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      providerName: this.providerName,
      smsBalance: Number(data.sms_balance || 0),
      overdraft: Number(data.over_draft || 0),
      currency: 'TZS',
      display: String(data.display || `${data.sms_balance} TZS`),
      rawResponse: data,
    };
  }

  /**
   * Fetches delivery report for a specific messageId from NextSMS HTTP Query.
   */
  public async getDeliveryReport(messageId: string): Promise<DeliveryReportResult> {
    const targetUrl = `${this.baseUrl}/api/v2/reports?messageId=${encodeURIComponent(messageId)}`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthorizationHeader(),
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch delivery report: HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = Array.isArray(data.results) ? data.results[0] : null;

    if (!result) {
      return {
        messageId,
        status: 'PENDING',
        rawStatus: 'NOT_FOUND',
      };
    }

    const statusId = Number(result.status?.id || 0);
    return {
      messageId: String(result.messageId || messageId),
      reference: result.reference || null,
      status: this.mapStatus(statusId, result.status?.groupName),
      sentAt: result.sentAt,
      doneAt: result.doneAt,
      rawStatus: result.status?.name || result.status?.groupName,
    };
  }

  private mapStatus(id: number, groupName?: string): DeliveryStatus {
    switch (id) {
      case 50: return 'PENDING';
      case 51: return 'ENROUTE';
      case 52: return 'ACCEPTED';
      case 73: return 'DELIVERED';
      case 74: return 'EXPIRED';
      case 76: return 'UNDELIVERABLE';
      case 79: return 'REJECTED';
      case 53: // REJECTED_NETWORK
      case 54: // REJECTED_PREFIX_MISSING
      case 55: // REJECTED_DND
      case 56: // REJECTED_SOURCE
      case 59: // REJECTED_DESTINATION
      case 63: // REJECTED_FLOODING_FILTER
      case 65: // REJECTED_DUPLICATE_MESSAGE_ID
      case 69: // REJECTED_INVALID_DESTINATION
        return 'REJECTED';
      case 57: // FAILED_NOT_ENOUGH_CREDITS
      case 58: // FAILED_SENDER
      case 64: // REJECTED_SYSTEM_ERROR
        return 'FAILED';
      default:
        if (groupName === 'DELIVERY') return 'DELIVERED';
        if (groupName === 'REJECTED') return 'REJECTED';
        if (groupName === 'FAILED') return 'FAILED';
        return 'ENROUTE';
    }
  }
}
