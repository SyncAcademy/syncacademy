import { 
  BadRequestException, 
  ConflictException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { Database } from './database/database.service';
import { MockPaymentProvider } from './payments/mock-payment.provider';
import { PaymentProvider } from './payments/payment-provider.interface';

export const SUBSCRIPTION_STATUSES = [
  'trial',
  'active',
  'renewal_due',
  'grace_period',
  'restricted_access',
  'suspended',
  'cancelled',
] as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

@Injectable()
export class SubscriptionService {
  private readonly paymentProvider: PaymentProvider;

  constructor(private readonly db: Database) {
    this.paymentProvider = new MockPaymentProvider();
  }

  /**
   * Seed default plans if none exist
   */
  async ensureDefaultPlans() {
    const count = await this.db.subscriptionPlan.count();
    if (count > 0) return;

    await this.db.subscriptionPlan.createMany({
      data: [
        {
          code: 'BASIC_ANNUAL',
          name: 'Basic Academic Tier',
          billingCycle: 'annual',
          priceAmount: 450000, // 450,000 TZS
          currency: 'TZS',
          maxStudents: 300,
          features: {
            studentManagement: true,
            academicReports: true,
            bursarLedger: false,
            messagingCreditsIncluded: 250,
          },
          active: true,
        },
        {
          code: 'STANDARD_ANNUAL',
          name: 'Standard Comprehensive Tier',
          billingCycle: 'annual',
          priceAmount: 850000, // 850,000 TZS
          currency: 'TZS',
          maxStudents: 800,
          features: {
            studentManagement: true,
            academicReports: true,
            bursarLedger: true,
            messagingCreditsIncluded: 750,
            statementReconciliation: true,
          },
          active: true,
        },
        {
          code: 'PREMIUM_ANNUAL',
          name: 'Premium Enterprise Tier',
          billingCycle: 'annual',
          priceAmount: 1650000, // 1,650,000 TZS
          currency: 'TZS',
          maxStudents: 3000,
          features: {
            studentManagement: true,
            academicReports: true,
            bursarLedger: true,
            messagingCreditsIncluded: 2000,
            statementReconciliation: true,
            prioritySupport: true,
          },
          active: true,
        },
      ],
    });
  }

  /**
   * Get or initialize school subscription
   */
  async getOrCreateSubscription(schoolId: string) {
    await this.ensureDefaultPlans();

    let sub = await this.db.schoolSubscription.findFirst({
      where: { schoolId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      const defaultPlan = await this.db.subscriptionPlan.findFirst({
        where: { code: 'BASIC_ANNUAL' },
      });
      if (!defaultPlan) throw new NotFoundException('Default subscription plan not found.');

      const now = new Date();
      const trialEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day trial
      const gracePeriodEnds = new Date(trialEnds.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day grace

      sub = await this.db.schoolSubscription.create({
        data: {
          schoolId,
          planId: defaultPlan.id,
          status: 'trial',
          startedAt: now,
          expiresAt: trialEnds,
          gracePeriodEndsAt: gracePeriodEnds,
          autoRenew: true,
        },
        include: { plan: true },
      });
    } else {
      // Evaluate live status according to state machine
      const evaluatedStatus = this.calculateSubscriptionStatus(sub);
      if (evaluatedStatus !== sub.status) {
        sub = await this.db.schoolSubscription.update({
          where: { id_schoolId: { id: sub.id, schoolId } },
          data: { status: evaluatedStatus },
          include: { plan: true },
        });
      }
    }

    return sub;
  }

  /**
   * Subscription state machine evaluator
   */
  public calculateSubscriptionStatus(sub: {
    status: string;
    expiresAt: Date;
    gracePeriodEndsAt?: Date | null;
  }): SubscriptionStatus {
    if (sub.status === 'cancelled') return 'cancelled';
    const now = new Date();
    const expiry = new Date(sub.expiresAt);
    const graceEnds = sub.gracePeriodEndsAt ? new Date(sub.gracePeriodEndsAt) : new Date(expiry.getTime() + 14 * 86400000);

    if (now < expiry) {
      // Check if within 14 days of renewal
      const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 14 && sub.status === 'active') {
        return 'renewal_due';
      }
      return sub.status === 'trial' ? 'trial' : 'active';
    }

    if (now >= expiry && now < graceEnds) {
      return 'grace_period';
    }

    // After grace period: restricted access (non-destructive, preserves records)
    return 'restricted_access';
  }

  /**
   * Generate renewal or subscription invoice
   */
  async generateSubscriptionInvoice(schoolId: string, subscriptionId: string) {
    const sub = await this.db.schoolSubscription.findFirst({
      where: { id: subscriptionId, schoolId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('School subscription not found.');

    const now = new Date();
    const start = sub.expiresAt > now ? sub.expiresAt : now;
    const end = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year period
    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days to pay

    // Check existing unpaid invoice for this period
    const existing = await this.db.subscriptionInvoice.findFirst({
      where: {
        schoolId,
        subscriptionId,
        status: { in: ['draft', 'issued'] },
      },
    });
    if (existing) return existing;

    const invoiceCount = await this.db.subscriptionInvoice.count({ where: { schoolId } });
    const invoiceNumber = `INV-SUB-${new Date().getFullYear()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

    return this.db.subscriptionInvoice.create({
      data: {
        schoolId,
        subscriptionId,
        invoiceNumber,
        amount: sub.plan.priceAmount,
        currency: sub.plan.currency,
        status: 'issued',
        billingPeriodStart: start,
        billingPeriodEnd: end,
        dueDate,
      },
    });
  }

  /**
   * Process payment for a subscription invoice
   */
  async paySubscriptionInvoice(
    schoolId: string,
    invoiceId: string,
    options: {
      provider?: string;
      payerPhone?: string;
      idempotencyKey?: string;
      actorId?: string;
    }
  ) {
    const invoice = await this.db.subscriptionInvoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!invoice) throw new NotFoundException('Subscription invoice not found.');
    if (invoice.status === 'paid') {
      return { message: 'Invoice is already paid.', invoice };
    }

    // Idempotency check
    if (options.idempotencyKey) {
      const existingPayment = await this.db.subscriptionPayment.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });
      if (existingPayment) {
        return { message: 'Payment already processed with this idempotency key.', payment: existingPayment };
      }
    }

    // Initiate payment via provider
    const initResult = await this.paymentProvider.initiatePayment({
      schoolId,
      invoiceId,
      invoiceType: 'SUBSCRIPTION',
      amount: invoice.amount,
      currency: invoice.currency,
      payerPhone: options.payerPhone,
      description: `SyncAcademy Subscription: ${invoice.subscription.plan.name} (${invoice.invoiceNumber})`,
      idempotencyKey: options.idempotencyKey,
    });

    if (initResult.status !== 'CONFIRMED') {
      throw new BadRequestException(`Payment initiation failed or was declined: ${initResult.instructions || ''}`);
    }

    // Backend authoritative confirmation
    return this.db.$transaction(async tx => {
      const now = new Date();
      const updatedInvoice = await tx.subscriptionInvoice.update({
        where: { id_schoolId: { id: invoiceId, schoolId } },
        data: {
          status: 'paid',
          paidAt: now,
          paymentReference: initResult.transactionId,
        },
      });

      const payment = await tx.subscriptionPayment.create({
        data: {
          schoolId,
          invoiceId,
          amount: invoice.amount,
          currency: invoice.currency,
          provider: initResult.provider,
          providerReference: initResult.transactionId,
          status: 'confirmed',
          idempotencyKey: options.idempotencyKey || null,
          paidAt: now,
        },
      });

      // Extend subscription expiration by 1 year and reset grace period
      const currentExpiry = invoice.subscription.expiresAt > now ? invoice.subscription.expiresAt : now;
      const newExpiry = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000);
      const newGraceEnds = new Date(newExpiry.getTime() + 14 * 24 * 60 * 60 * 1000);

      await tx.schoolSubscription.update({
        where: { id_schoolId: { id: invoice.subscriptionId, schoolId } },
        data: {
          status: 'active',
          expiresAt: newExpiry,
          gracePeriodEndsAt: newGraceEnds,
        },
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: options.actorId || null,
          action: 'SUBSCRIPTION_INVOICE_PAID',
          target: `${invoiceId}:${invoice.amount}`,
        },
      });

      return {
        message: 'Subscription payment successfully processed.',
        invoice: updatedInvoice,
        payment,
      };
    });
  }
}
