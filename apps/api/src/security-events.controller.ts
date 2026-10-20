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
