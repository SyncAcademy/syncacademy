import { 
  PaymentInitiationRequest, 
  PaymentInitiationResult, 
  PaymentProvider, 
  PaymentVerificationResult 
} from './payment-provider.interface';
import { createHmac, randomUUID } from 'crypto';

export class MockPaymentProvider implements PaymentProvider {
  public readonly name = 'mock';
  private readonly webhookSecret = 'mock-secret-key-syncacademy';

  async initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResult> {
    const transactionId = `MOCK-TX-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const reference = `REF-${req.invoiceType.slice(0, 3)}-${Date.now().toString().slice(-6)}`;

    // If description or phone contains 'fail', simulate failure
    if (req.description?.includes('fail') || req.payerPhone?.includes('000000')) {
      return {
        transactionId,
        provider: this.name,
        status: 'FAILED',
        reference,
        instructions: 'Mock transaction declined by provider simulator.',
      };
    }

    return {
      transactionId,
      provider: this.name,
      status: 'CONFIRMED',
      checkoutUrl: `https://mock-pay.syncacademy.internal/checkout/${transactionId}`,
      instructions: 'Approved automatically by mock payment gateway.',
      reference,
    };
  }

  async verifyPayment(transactionId: string, payload?: any): Promise<PaymentVerificationResult> {
    return {
      transactionId,
      provider: this.name,
      status: 'CONFIRMED',
      amount: payload?.amount || 10000,
      currency: payload?.currency || 'TZS',
      paidAt: new Date(),
      idempotencyKey: payload?.idempotencyKey,
      rawPayload: payload,
    };
  }

  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    const signature = headers['x-mock-signature'] || headers['x-webhook-signature'];
    if (!signature || typeof signature !== 'string') return false;
    const computed = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return signature === computed;
  }

  generateTestSignature(payload: string): string {
    return createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
  }

  parseWebhookPayload(payload: any): PaymentVerificationResult {
    return {
      transactionId: payload.transactionId || `MOCK-TX-${Date.now()}`,
      provider: this.name,
      status: payload.status === 'FAILED' ? 'FAILED' : 'CONFIRMED',
      amount: Number(payload.amount) || 0,
      currency: payload.currency || 'TZS',
      paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
      idempotencyKey: payload.idempotencyKey,
      rawPayload: payload,
    };
  }
}
