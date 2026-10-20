import { Controller, Get, Patch, Post, Req, Query, Body, Param, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from '../platform.service';
import { MonitoringService } from './monitoring.service';
import { settingsSchema } from './settings';
const rangeSchema = z.object({ range: z.enum(['15m', '1h', '6h', '24h', '7d', '30d']).default('1h') }).strict();
function parse<T>(schema: z.ZodType<T, any, any>, value: unknown): T { const result = schema.safeParse(value); if (!result.success)
    throw new BadRequestException('Check the monitoring settings or selected time range. Critical thresholds must exceed warning thresholds.'); return result.data; }
@Controller('api/v1/system-health')
export class MonitoringController {
    constructor(private readonly platform: PlatformService, private readonly monitoring: MonitoringService) { }
    @Get()
    async summary(
    @Req()
    req: Request,
    @Query()
    query: unknown) { await this.platform.administrator(req); parse(z.object({}).strict(), query); return this.monitoring.summary(); }
    @Get('history')
    async history(
    @Req()
    req: Request,
    @Query()
    q: unknown) { await this.platform.administrator(req); return this.monitoring.history(parse(rangeSchema, q).range); }
    @Get('endpoints')
    async endpoints(
    @Req()
    req: Request,
    @Query()
    q: unknown) { await this.platform.administrator(req); return this.monitoring.endpoints(parse(rangeSchema, q).range); }
    @Get('alerts')
    async alerts(
    @Req()
    req: Request,
    @Query()
    q: unknown) { await this.platform.administrator(req); return this.monitoring.alerts(parse(rangeSchema, q).range); }
    @Post('alerts/:id/acknowledge')
    async acknowledge(
    @Req()
    req: Request,
    @Param('id')
    id: string,
    @Body()
    body: unknown) { const actor = await this.platform.administrator(req); parse(z.object({}).strict(), body); return this.monitoring.acknowledge(parse(z.string().uuid(), id), actor.id); }
    @Patch('settings')
    async settings(
    @Req()
    req: Request,
    @Body()
    body: unknown) { const actor = await this.platform.administrator(req); return this.monitoring.saveSettings(parse(settingsSchema, body), actor.id); }
}
