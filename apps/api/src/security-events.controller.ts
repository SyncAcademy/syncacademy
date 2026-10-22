import { 
  BadRequestException, 
  Body, 
  Controller, 
  Get, 
  Param, 
  Patch, 
  Query, 
  Req 
} from '@nestjs/common';
import { Post, Delete } from '@nestjs/common';
import { isIP } from 'node:net';
import { digest } from './security';
import { config } from './config';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { InvestigationStatus, SecurityEventsService } from './security-events.service';

const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const querySchema = z.object({
  category: z.string().trim().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['unreviewed', 'investigating', 'acknowledged', 'resolved']).optional(),
  schoolId: uuid.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const updateStatusSchema = z.object({
  status: z.enum(['unreviewed', 'investigating', 'acknowledged', 'resolved']),
  resolutionNotes: z.string().trim().max(1000).default(''),
});

@Controller('api/v1')
export class SecurityEventsController {
  constructor(
    private readonly svc: PlatformService,
    private readonly securityService: SecurityEventsService,
  ) {}

  @Get('platform/public-forms/activity')
  async publicFormActivity(@Req() req: Request, @Query() query: unknown) {
    await this.svc.administrator(req);
    const q = parse(z.object({ page: z.coerce.number().int().min(1).default(1), form: z.enum(['contact', 'demo']).optional(), ip: z.string().max(45).optional() }).strict(), query);
    if (q.ip && !isIP(q.ip)) throw new BadRequestException('Enter a valid IP address.');
    const where = { category: 'PUBLIC_FORM', ...(q.ip ? { ipAddress: q.ip } : {}), ...(q.form ? { details: { path: ['form'], equals: q.form } } : {}) };
    const [items, total] = await this.svc.db.$transaction([this.svc.db.securityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * 25, take: 25 }), this.svc.db.securityEvent.count({ where })]);
    const blocks = await this.svc.db.publicFormBlock.findMany({ where: { expiresAt: { gt: new Date() } } });
    return { items: items.map(item => ({ ...item, blockedUntil: blocks.find(block => block.ipHash === digest('public-form-ip:' + item.ipAddress))?.expiresAt ?? null })), total };
  }

  @Post('platform/public-forms/blocks')
  async blockPublicFormIp(@Req() req: Request, @Body() body: unknown) {
    const actor = await this.svc.administrator(req);
    const b = parse(z.object({ ip: z.string().refine(value => !!isIP(value), 'Enter a valid IP address.'), reason: z.string().trim().min(5).max(500) }).strict(), body);
    const ipHash = digest('public-form-ip:' + b.ip);
    const expiresAt = new Date(Date.now() + config.PUBLIC_FORM_BLOCK_HOURS * 3600000);
    await this.svc.atomic(async tx => {
      await tx.publicFormBlock.upsert({ where: { ipHash }, create: { ipHash, expiresAt }, update: { expiresAt } });
      await tx.securityEvent.create({ data: { category: 'PUBLIC_FORM', severity: 'MEDIUM', eventType: 'PUBLIC_FORM_MANUAL_BLOCK', actorId: actor.id, ipAddress: b.ip, details: { reason: b.reason, blockExpiresAt: expiresAt.toISOString() } } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PUBLIC_FORM_IP_BLOCKED', target: ipHash } });
    });
    return { expiresAt };
  }

  @Delete('platform/public-forms/blocks')
  async unblockPublicFormIp(@Req() req: Request, @Body() body: unknown) {
    const actor = await this.svc.administrator(req);
    const b = parse(z.object({ ip: z.string().refine(value => !!isIP(value), 'Enter a valid IP address.'), reason: z.string().trim().min(5).max(500) }).strict(), body);
    const ipHash = digest('public-form-ip:' + b.ip);
    await this.svc.atomic(async tx => {
      await tx.publicFormBlock.deleteMany({ where: { ipHash } });
      await tx.securityEvent.create({ data: { category: 'PUBLIC_FORM', eventType: 'PUBLIC_FORM_MANUAL_UNBLOCK', actorId: actor.id, ipAddress: b.ip, details: { reason: b.reason } } });
      await tx.auditEvent.create({ data: { actorId: actor.id, action: 'PUBLIC_FORM_IP_UNBLOCKED', target: ipHash } });
    });
    return { message: 'IP restriction removed.' };
  }

  /**
   * Super Admin: View platform-wide security telemetry
   */
  @Get('platform/security/events')
  async listPlatformEvents(
    @Req() req: Request,
    @Query() query: unknown
  ) {
    await this.svc.administrator(req);
    const q = parse(querySchema, query);
    return this.securityService.listPlatformEvents(q);
  }

  /**
   * Super Admin: Update investigation status
   */
  @Patch('platform/security/events/:eventId')
  async updatePlatformEventStatus(
    @Req() req: Request,
    @Param('eventId') eventId: string,
    @Body() body: unknown
  ) {
    const user = await this.svc.administrator(req);
    parse(uuid, eventId);
    const b = parse(updateStatusSchema, body);

    return this.securityService.updateEventStatus(
      eventId,
      b.status as InvestigationStatus,
      b.resolutionNotes,
      user.id
    );
  }

  /**
   * School Headmaster: View security events scoped to their school
   */
  @Get('schools/:schoolId/security/events')
  async listSchoolEvents(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Query() query: unknown
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER']);
    const q = parse(querySchema.omit({ schoolId: true }), query);
    return this.securityService.listSchoolEvents(schoolId, q);
  }

  /**
   * School Headmaster: Acknowledge or resolve school incident
   */
  @Patch('schools/:schoolId/security/events/:eventId')
  async updateSchoolEventStatus(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('eventId') eventId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER']);
    parse(uuid, eventId);
    const b = parse(updateStatusSchema, body);

    return this.securityService.updateEventStatus(
      eventId,
      b.status as InvestigationStatus,
      b.resolutionNotes,
      user.id,
      schoolId
    );
  }
}
