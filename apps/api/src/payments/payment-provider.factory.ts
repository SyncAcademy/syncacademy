import { ServiceUnavailableException } from '@nestjs/common';
import { config } from '../config';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentProvider, PaymentInitiationRequest, PaymentInitiationResult, PaymentVerificationResult } from './payment-provider.interface';

class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = 'unconfigured';

  async initiatePayment(_request: PaymentInitiationRequest): Promise<PaymentInitiationResult> {
    throw new ServiceUnavailableException('Online payments are not configured.');
  }

  async verifyPayment(_transactionId: string, _payload?: unknown): Promise<PaymentVerificationResult> {
    throw new ServiceUnavailableException('Online payments are not configured.');
  }

  verifyWebhookSignature(_headers: Record<string, string | string[] | undefined>, _rawBody: string): boolean {
    return false;
  }

  parseWebhookPayload(_payload: unknown): PaymentVerificationResult {
    throw new ServiceUnavailableException('Online payments are not configured.');
  }
}

export function createPaymentProvider(): PaymentProvider {
  if (config.NODE_ENV === 'test' || (config.NODE_ENV === 'development' && config.MOCK_PAYMENT_PROVIDER === 'true')) {
    return new MockPaymentProvider();
  }
  return new UnconfiguredPaymentProvider();
}
