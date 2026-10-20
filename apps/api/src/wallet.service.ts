import { 
  BadRequestException, 
  ConflictException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { CommunicationChannel, Prisma } from '@prisma/client';
import { Database } from './database/database.service';
import { MockPaymentProvider } from './payments/mock-payment.provider';
import { PaymentProvider } from './payments/payment-provider.interface';

@Injectable()
export class WalletService {
  private readonly paymentProvider: PaymentProvider;

  constructor(private readonly db: Database) {
    this.paymentProvider = new MockPaymentProvider();
  }

  /**
   * Ensure wallet exists for the school
   */
  async ensureWallet(schoolId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.db;
    let wallet = await client.schoolCreditWallet.findUnique({
      where: { schoolId },
    });

    if (!wallet) {
      wallet = await client.schoolCreditWallet.create({
        data: {
          schoolId,
          smsBalance: 100, // 100 complimentary trial SMS
          whatsappBalance: 25, // 25 complimentary trial WhatsApp messages
          currency: 'TZS',
        },
      });
    }

    return wallet;
  }

  /**
   * Seed default credit packages if empty
   */
  async ensureDefaultPackages() {
    const count = await this.db.creditPackage.count();
    if (count > 0) return;

    await this.db.creditPackage.createMany({
      data: [
        {
          code: 'SMS_STARTER_500',
          name: 'Starter SMS Pack (500 SMS)',
          smsUnits: 500,
          whatsappUnits: 0,
          priceAmount: 15000, // 15,000 TZS (30 TZS per SMS)
          currency: 'TZS',
          active: true,
        },
        {
          code: 'SMS_STANDARD_2000',
          name: 'Standard SMS Pack (2,000 SMS)',
          smsUnits: 2000,
          whatsappUnits: 0,
          priceAmount: 55000, // 55,000 TZS (27.5 TZS per SMS)
          currency: 'TZS',
          active: true,
        },
        {
          code: 'SMS_ENTERPRISE_5000',
          name: 'Enterprise SMS Pack (5,000 SMS)',
          smsUnits: 5000,
          whatsappUnits: 0,
          priceAmount: 130000, // 130,000 TZS (26 TZS per SMS)
          currency: 'TZS',
          active: true,
        },
        {
          code: 'WHATSAPP_1000',
          name: 'WhatsApp Pack (1,000 Messages)',
          smsUnits: 0,
          whatsappUnits: 1000,
          priceAmount: 45000, // 45,000 TZS
          currency: 'TZS',
          active: true,
        },
        {
          code: 'COMBO_PACK_3000',
          name: 'Omnichannel Combo (2,500 SMS + 500 WhatsApp)',
          smsUnits: 2500,
          whatsappUnits: 500,
          priceAmount: 85000, // 85,000 TZS
          currency: 'TZS',
          active: true,
        },
      ],
    });
  }

  /**
   * Reserve credits for message dispatch (with row lock)
   */
  async reserveCredit(
    tx: Prisma.TransactionClient,
    schoolId: string,
    channel: CommunicationChannel,
    units: number,
    referenceId: string
  ): Promise<{ walletId: string; balanceBefore: number; balanceAfter: number }> {
    if (units <= 0) throw new BadRequestException('Units must be positive.');

    // Ensure wallet exists
    await this.ensureWallet(schoolId, tx);

    // Row lock on wallet
    const rows = await tx.$queryRaw<Array<{ id: string; smsBalance: number; whatsappBalance: number }>>`
      SELECT id, "smsBalance", "whatsappBalance" 
      FROM "SchoolCreditWallet" 
      WHERE "schoolId" = ${schoolId}::uuid 
      FOR UPDATE
    `;

    if (!rows.length) throw new NotFoundException('Wallet not found.');
    const wallet = rows[0];

    const isSms = channel === 'SMS';
    const currentBalance = isSms ? wallet.smsBalance : wallet.whatsappBalance;

    if (currentBalance < units) {
      throw new BadRequestException(
        `Insufficient ${channel} credits. Current balance: ${currentBalance}, required: ${units}. Please purchase a credit package.`
      );
    }

    const newBalance = currentBalance - units;

    if (isSms) {
      await tx.schoolCreditWallet.update({
        where: { id: wallet.id },
        data: { smsBalance: newBalance },
      });
    } else {
      await tx.schoolCreditWallet.update({
        where: { id: wallet.id },
        data: { whatsappBalance: newBalance },
      });
    }

    await tx.creditLedger.create({
      data: {
        schoolId,
        walletId: wallet.id,
        channel,
        type: 'RESERVATION',
        units: -units,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        referenceId,
        referenceType: 'OUTBOX',
        description: `Reserved ${units} ${channel} credits for dispatch`,
      },
    });

    return {
      walletId: wallet.id,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    };
  }

  /**
   * Release reserved credit (e.g. if provider call fails or recipient is blacklisted)
   */
  async releaseCredit(
    tx: Prisma.TransactionClient,
    schoolId: string,
    channel: CommunicationChannel,
    units: number,
    referenceId: string,
    reason: string
  ) {
    if (units <= 0) return;

    const rows = await tx.$queryRaw<Array<{ id: string; smsBalance: number; whatsappBalance: number }>>`
      SELECT id, "smsBalance", "whatsappBalance" 
      FROM "SchoolCreditWallet" 
      WHERE "schoolId" = ${schoolId}::uuid 
      FOR UPDATE
    `;
    if (!rows.length) return;
    const wallet = rows[0];

    const isSms = channel === 'SMS';
    const currentBalance = isSms ? wallet.smsBalance : wallet.whatsappBalance;
    const newBalance = currentBalance + units;

    if (isSms) {
      await tx.schoolCreditWallet.update({
        where: { id: wallet.id },
        data: { smsBalance: newBalance },
      });
    } else {
      await tx.schoolCreditWallet.update({
        where: { id: wallet.id },
        data: { whatsappBalance: newBalance },
      });
    }

    await tx.creditLedger.create({
      data: {
        schoolId,
        walletId: wallet.id,
        channel,
        type: 'RELEASE',
        units,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        referenceId,
        referenceType: 'OUTBOX',
        description: `Released ${units} ${channel} credits: ${reason}`,
      },
    });
  }

  /**
   * Finalize consumption after provider delivery
   */
  async consumeCredit(
    tx: Prisma.TransactionClient,
    schoolId: string,
    channel: CommunicationChannel,
    units: number,
    referenceId: string
  ) {
    const wallet = await tx.schoolCreditWallet.findUnique({
      where: { schoolId },
    });
    if (!wallet) return;

    const isSms = channel === 'SMS';
    const currentBalance = isSms ? wallet.smsBalance : wallet.whatsappBalance;

    await tx.creditLedger.create({
      data: {
        schoolId,
        walletId: wallet.id,
        channel,
        type: 'CONSUMPTION',
        units: -units,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance, // balance was decremented at reservation
        referenceId,
        referenceType: 'OUTBOX',
        description: `Delivered and consumed ${units} ${channel} units`,
      },
    });
  }

  /**
   * Purchase a credit package
   */
  async purchaseCreditPackage(
    schoolId: string,
    packageId: string,
    options: {
      payerPhone?: string;
      idempotencyKey?: string;
      actorId?: string;
    }
  ) {
    const pkg = await this.db.creditPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg || !pkg.active) throw new NotFoundException('Credit package not found or inactive.');

    // Idempotency check on purchases
    if (options.idempotencyKey) {
      const existing = await this.db.creditPurchaseInvoice.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });
      if (existing) {
        return { message: 'Package purchase already processed.', invoice: existing };
      }
    }

    const count = await this.db.creditPurchaseInvoice.count({ where: { schoolId } });
    const invoiceNumber = `INV-CRD-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    // Initiate payment
    const initResult = await this.paymentProvider.initiatePayment({
      schoolId,
      invoiceId: invoiceNumber,
      invoiceType: 'CREDIT_PACKAGE',
      amount: pkg.priceAmount,
      currency: pkg.currency,
      payerPhone: options.payerPhone,
      description: `SyncAcademy Credits: ${pkg.name} (${invoiceNumber})`,
      idempotencyKey: options.idempotencyKey,
    });

    if (initResult.status !== 'CONFIRMED') {
      throw new BadRequestException(`Credit purchase payment failed: ${initResult.instructions || ''}`);
    }

    // Backend authoritative confirmation and atomic credit allocation
    return this.db.$transaction(async tx => {
      const now = new Date();
      const invoice = await tx.creditPurchaseInvoice.create({
        data: {
          schoolId,
          packageId: pkg.id,
          invoiceNumber,
          smsUnits: pkg.smsUnits,
          whatsappUnits: pkg.whatsappUnits,
          amount: pkg.priceAmount,
          currency: pkg.currency,
          status: 'paid',
          paymentProvider: initResult.provider,
          paymentReference: initResult.transactionId,
          idempotencyKey: options.idempotencyKey || null,
          paidAt: now,
        },
      });

      // Lock wallet and allocate credits
      await this.ensureWallet(schoolId, tx);
      const rows = await tx.$queryRaw<Array<{ id: string; smsBalance: number; whatsappBalance: number }>>`
        SELECT id, "smsBalance", "whatsappBalance" 
        FROM "SchoolCreditWallet" 
        WHERE "schoolId" = ${schoolId}::uuid 
        FOR UPDATE
      `;
      const wallet = rows[0];

      if (pkg.smsUnits > 0) {
        const smsBefore = wallet.smsBalance;
        const smsAfter = smsBefore + pkg.smsUnits;
        await tx.schoolCreditWallet.update({
          where: { id: wallet.id },
          data: { smsBalance: smsAfter },
        });

        await tx.creditLedger.create({
          data: {
            schoolId,
            walletId: wallet.id,
            channel: 'SMS',
            type: 'PURCHASE',
            units: pkg.smsUnits,
            balanceBefore: smsBefore,
            balanceAfter: smsAfter,
            referenceId: invoice.id,
            referenceType: 'PURCHASE_INVOICE',
            description: `Purchased package: ${pkg.name}`,
            actorId: options.actorId,
          },
        });
      }

      if (pkg.whatsappUnits > 0) {
        const waBefore = wallet.whatsappBalance;
        const waAfter = waBefore + pkg.whatsappUnits;
        await tx.schoolCreditWallet.update({
          where: { id: wallet.id },
          data: { whatsappBalance: waAfter },
        });

        await tx.creditLedger.create({
          data: {
            schoolId,
            walletId: wallet.id,
            channel: 'WHATSAPP',
            type: 'PURCHASE',
            units: pkg.whatsappUnits,
            balanceBefore: waBefore,
            balanceAfter: waAfter,
            referenceId: invoice.id,
            referenceType: 'PURCHASE_INVOICE',
            description: `Purchased package: ${pkg.name}`,
            actorId: options.actorId,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: options.actorId || null,
          action: 'CREDIT_PACKAGE_PURCHASED',
          target: `${pkg.code}:${invoice.id}`,
        },
      });

      return {
        message: 'Credit package successfully purchased and credited to wallet.',
        invoice,
      };
    });
  }

  /**
   * Super Admin administrative credit adjustment
   */
  async adjustCredits(
    schoolId: string,
    channel: CommunicationChannel,
    units: number,
    reason: string,
    actorId: string
  ) {
    if (units === 0) throw new BadRequestException('Units cannot be zero.');

    return this.db.$transaction(async tx => {
      await this.ensureWallet(schoolId, tx);
      const rows = await tx.$queryRaw<Array<{ id: string; smsBalance: number; whatsappBalance: number }>>`
        SELECT id, "smsBalance", "whatsappBalance" 
        FROM "SchoolCreditWallet" 
        WHERE "schoolId" = ${schoolId}::uuid 
        FOR UPDATE
      `;
      const wallet = rows[0];

      const isSms = channel === 'SMS';
      const before = isSms ? wallet.smsBalance : wallet.whatsappBalance;
      const after = before + units;
      if (after < 0) {
        throw new BadRequestException(`Adjustment would cause negative balance (current: ${before}, change: ${units}).`);
      }

      if (isSms) {
        await tx.schoolCreditWallet.update({
          where: { id: wallet.id },
          data: { smsBalance: after },
        });
      } else {
        await tx.schoolCreditWallet.update({
          where: { id: wallet.id },
          data: { whatsappBalance: after },
        });
      }

      const ledger = await tx.creditLedger.create({
        data: {
          schoolId,
          walletId: wallet.id,
          channel,
          type: 'ADJUSTMENT',
          units,
          balanceBefore: before,
          balanceAfter: after,
          referenceType: 'ADMIN_ADJUSTMENT',
          description: `Super Admin adjustment: ${reason}`,
          actorId,
        },
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId,
          action: 'CREDIT_WALLET_ADJUSTED',
          target: `${channel}:${units}`,
        },
      });

      return {
        message: 'Credits adjusted successfully.',
        ledger,
      };
    });
  }
}
