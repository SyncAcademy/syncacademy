import { 
  BadRequestException, 
  Body, 
  Controller, 
  Get, 
  NotFoundException, 
  Param, 
  Post, 
  Query, 
  Req 
} from '@nestjs/common';
import { CommunicationChannel } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { WalletService } from './wallet.service';

const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const purchasePackageSchema = z.object({
  packageId: uuid,
  payerPhone: z.string().trim().optional(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

const adjustSchema = z.object({
  schoolId: uuid,
  channel: z.enum(['SMS', 'WHATSAPP']),
  units: z.number().int(),
  reason: z.string().trim().min(3).max(300),
});

const createPackageSchema = z.object({
  code: z.string().trim().min(3).max(50),
  name: z.string().trim().min(3).max(100),
  smsUnits: z.number().int().min(0).default(0),
  whatsappUnits: z.number().int().min(0).default(0),
  priceAmount: z.number().int().min(1000),
  currency: z.string().trim().default('TZS'),
  active: z.boolean().default(true),
});

@Controller('api/v1')
export class WalletController {
  constructor(
    private readonly svc: PlatformService,
    private readonly walletService: WalletService,
  ) {}

  // -------------------------------------------------------------------------
  // Tenant School Routes (Bursar / Headmaster)
  // -------------------------------------------------------------------------

  /**
   * Get school messaging wallet balance
   */
  @Get('schools/:schoolId/wallet')
  async getWallet(
    @Req() req: Request,
    @Param('schoolId') schoolId: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR', 'ACADEMIC']);
    return this.walletService.ensureWallet(schoolId);
  }

  /**
   * List available credit packages for purchase
   */
  @Get('schools/:schoolId/wallet/packages')
  async listPackages(
    @Req() req: Request,
    @Param('schoolId') schoolId: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    await this.walletService.ensureDefaultPackages();
    return this.svc.db.creditPackage.findMany({
      where: { active: true },
      orderBy: { priceAmount: 'asc' },
    });
  }

  /**
   * Purchase a credit package
   */
  @Post('schools/:schoolId/wallet/purchases')
  async purchasePackage(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    const b = parse(purchasePackageSchema, body);

    return this.walletService.purchaseCreditPackage(schoolId, b.packageId, {
      payerPhone: b.payerPhone,
      idempotencyKey: b.idempotencyKey,
      actorId: user.id,
    });
  }

  /**
   * Get credit ledger history
   */
  @Get('schools/:schoolId/wallet/ledger')
  async getLedger(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Query('channel') channel?: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);

    return this.svc.db.creditLedger.findMany({
      where: {
        schoolId,
        ...(channel ? { channel: channel as CommunicationChannel } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // -------------------------------------------------------------------------
  // Super Admin Platform Routes
  // -------------------------------------------------------------------------

  /**
   * Super Admin: List all credit packages
   */
  @Get('platform/wallet/packages')
  async platformListPackages(@Req() req: Request) {
    await this.svc.administrator(req);
    await this.walletService.ensureDefaultPackages();
    return this.svc.db.creditPackage.findMany({
      orderBy: { priceAmount: 'asc' },
    });
  }

  /**
   * Super Admin: Create a new credit package
   */
  @Post('platform/wallet/packages')
  async createPackage(@Req() req: Request, @Body() body: unknown) {
    const user = await this.svc.administrator(req);
    const b = parse(createPackageSchema, body);

    const pkg = await this.svc.db.creditPackage.create({
      data: b,
    });

    await this.svc.db.auditEvent.create({
      data: {
        actorId: user.id,
        action: 'CREDIT_PACKAGE_CREATED',
        target: pkg.code,
      },
    });

    return pkg;
  }

  /**
   * Super Admin: Adjust credits for a school
   */
  @Post('platform/wallet/adjust')
  async adjustCredits(@Req() req: Request, @Body() body: unknown) {
    const user = await this.svc.administrator(req);
    const b = parse(adjustSchema, body);

    return this.walletService.adjustCredits(
      b.schoolId,
      b.channel as CommunicationChannel,
      b.units,
      b.reason,
      user.id
    );
  }
}
