import { 
  BadRequestException, 
  Body, 
  Controller, 
  Get, 
  NotFoundException, 
  Param, 
  Patch, 
  Post, 
  Query, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { SubscriptionService } from './subscription.service';

const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const createPlanSchema = z.object({
  code: z.string().trim().min(3).max(50),
  name: z.string().trim().min(3).max(100),
  billingCycle: z.enum(['monthly', 'termly', 'annual']).default('annual'),
  priceAmount: z.number().int().min(1000), // Minor units / cents in TZS
  currency: z.string().trim().default('TZS'),
  maxStudents: z.number().int().min(10).default(500),
  features: z.record(z.any()).default({}),
  active: z.boolean().default(true),
});

const payInvoiceSchema = z.object({
  provider: z.string().trim().default('mock'),
  payerPhone: z.string().trim().optional(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

@Controller('api/v1')
export class SubscriptionController {
  constructor(
    private readonly svc: PlatformService,
    private readonly subService: SubscriptionService,
  ) {}

  // -------------------------------------------------------------------------
  // Platform Super Admin Routes
  // -------------------------------------------------------------------------

  /**
   * Super Admin: List all subscription plans
   */
  @Get('platform/subscriptions/plans')
  async listPlans(@Req() req: Request) {
    await this.svc.administrator(req);
    await this.subService.ensureDefaultPlans();
    return this.svc.db.subscriptionPlan.findMany({
      orderBy: { priceAmount: 'asc' },
    });
  }

  /**
   * Super Admin: Create a new subscription plan
   */
  @Post('platform/subscriptions/plans')
  async createPlan(@Req() req: Request, @Body() body: unknown) {
    const user = await this.svc.administrator(req);
    const b = parse(createPlanSchema, body);

    const existing = await this.svc.db.subscriptionPlan.findUnique({
      where: { code: b.code },
    });
    if (existing) throw new BadRequestException(`Plan with code ${b.code} already exists.`);

    const plan = await this.svc.db.subscriptionPlan.create({
      data: b,
    });

    await this.svc.db.auditEvent.create({
      data: {
        actorId: user.id,
        action: 'SUBSCRIPTION_PLAN_CREATED',
        target: plan.code,
      },
    });

    return plan;
  }

  /**
   * Super Admin: Update a subscription plan
   */
  @Patch('platform/subscriptions/plans/:planId')
  async updatePlan(
    @Req() req: Request,
    @Param('planId') planId: string,
    @Body() body: unknown
  ) {
    const user = await this.svc.administrator(req);
    parse(uuid, planId);
    const b = parse(createPlanSchema.partial(), body);

    const updated = await this.svc.db.subscriptionPlan.update({
      where: { id: planId },
      data: b,
    });

    await this.svc.db.auditEvent.create({
      data: {
        actorId: user.id,
        action: 'SUBSCRIPTION_PLAN_UPDATED',
        target: planId,
      },
    });

    return updated;
  }

  /**
   * Super Admin: View all school subscriptions
   */
  @Get('platform/subscriptions/schools')
  async listSchoolSubscriptions(@Req() req: Request) {
    await this.svc.administrator(req);
    return this.svc.db.schoolSubscription.findMany({
      include: {
        school: { select: { id: true, name: true, code: true } },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // -------------------------------------------------------------------------
  // Tenant School Routes (Headmaster / Bursar)
  // -------------------------------------------------------------------------

  /**
   * School: Get current subscription and status
   */
  @Get('schools/:schoolId/subscription')
  async getSubscription(
    @Req() req: Request,
    @Param('schoolId') schoolId: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR', 'ACADEMIC']);
    return this.subService.getOrCreateSubscription(schoolId);
  }

  /**
   * School: List subscription invoices
   */
  @Get('schools/:schoolId/subscription/invoices')
  async listSubscriptionInvoices(
    @Req() req: Request,
    @Param('schoolId') schoolId: string
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    return this.svc.db.subscriptionInvoice.findMany({
      where: { schoolId },
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * School: Generate renewal invoice
   */
  @Post('schools/:schoolId/subscription/renew')
  async renewSubscription(
    @Req() req: Request,
    @Param('schoolId') schoolId: string
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    const sub = await this.subService.getOrCreateSubscription(schoolId);
    return this.subService.generateSubscriptionInvoice(schoolId, sub.id);
  }

  /**
   * School: Pay a subscription invoice
   */
  @Post('schools/:schoolId/subscription/invoices/:invoiceId/pay')
  async paySubscriptionInvoice(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'BURSAR']);
    parse(uuid, invoiceId);
    const b = parse(payInvoiceSchema, body);

    return this.subService.paySubscriptionInvoice(schoolId, invoiceId, {
      provider: b.provider,
      payerPhone: b.payerPhone,
      idempotencyKey: b.idempotencyKey,
      actorId: user.id,
    });
  }
}
