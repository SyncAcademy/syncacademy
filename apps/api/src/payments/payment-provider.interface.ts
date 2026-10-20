export type InvoiceType = 'SUBSCRIPTION' | 'CREDIT_PACKAGE';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REVERSED';

export interface PaymentInitiationRequest {
  schoolId: string;
  invoiceId: string;
  invoiceType: InvoiceType;
  amount: number; // Integer minor units (TZS)
  currency: string;
  payerPhone?: string;
  payerEmail?: string;
  description: string;
  idempotencyKey?: string;
}

export interface PaymentInitiationResult {
  transactionId: string;
  provider: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  instructions?: string;
  reference: string;
}

export interface PaymentVerificationResult {
  transactionId: string;
  provider: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt?: Date;
  idempotencyKey?: string;
  rawPayload?: any;
}

export interface PaymentProvider {
  readonly name: string;
  initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResult>;
  verifyPayment(transactionId: string, payload?: any): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean;
  parseWebhookPayload(payload: any): PaymentVerificationResult;
}
