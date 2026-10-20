import { Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from './database/database.service';

export const auditCategories = [
  'AUTHENTICATION',
  'USER_MANAGEMENT',
  'SCHOOL_MANAGEMENT',
  'STUDENT_MANAGEMENT',
  'TEACHER_MANAGEMENT',
  'ACADEMIC_RECORDS',
  'FINANCIAL_RECORDS',
  'PLATFORM_SETTINGS',
  'SECURITY',
  'SYSTEM_OPERATIONS',
] as const;

export type AuditCategory = typeof auditCategories[number];
export type AuditSource = 'AUDIT' | 'SECURITY';
export type AuditOutcome = 'SUCCESS' | 'FAILED' | 'DENIED' | 'UNAVAILABLE';

export interface AuditQuery {
  page: number;
  pageSize: number;
  q: string;
  actor: string;
  schoolId?: string;
  category?: AuditCategory;
  action: string;
  outcome?: AuditOutcome;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  from?: string;
  to?: string;
}

interface AuditRow {
  id: string;
  source: AuditSource;
  createdAt: Date;
  action: string;
  category: AuditCategory;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  schoolId: string | null;
  schoolName: string | null;
  schoolCode: string | null;
  target: string | null;
  targetId: string | null;
  outcome: string;
  severity: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
}

export function sanitizeAuditDetails(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitizeAuditDetails(item, depth + 1));
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? value.slice(0, 2000) : value;
  }

  const sensitiveKey = /(pass(word)?|token|secret|otp|code|pin|authorization|cookie|csrf|credential|api.?key|private.?key|session)/i;
  return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [
    key,
    sensitiveKey.test(key) ? '[REDACTED]' : sanitizeAuditDetails(item, depth + 1),
  ]));
}

@Injectable()
export class AuditLogService {
  constructor(private readonly db: Database) {}

  recordSecurityEvent(data: {
    actorId?: string | null;
    schoolId?: string | null;
    category: string;
    eventType: string;
    severity?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: unknown;
  }) {
    return this.db.securityEvent.create({
      data: {
        actorId: data.actorId ?? null,
        schoolId: data.schoolId ?? null,
        category: data.category,
        eventType: data.eventType,
        severity: data.severity ?? 'LOW',
        ipAddress: data.ipAddress ?? '',
        userAgent: data.userAgent ?? '',
        details: sanitizeAuditDetails(data.details) as Prisma.InputJsonValue,
        investigationStatus: 'unreviewed',
      },
    });
  }

  async list(query: AuditQuery) {
    const where = this.where(query);
    const [counts, items] = await Promise.all([
      this.db.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        WITH audit_rows AS (${this.rows()})
        SELECT COUNT(*)::bigint AS total FROM audit_rows ${where}
      `),
      this.db.$queryRaw<AuditRow[]>(Prisma.sql`
        WITH audit_rows AS (${this.rows()})
        SELECT * FROM audit_rows ${where}
        ORDER BY "createdAt" DESC, id DESC
        LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
      `),
    ]);

    return {
      items: items.map(item => this.publicRow(item)),
      total: Number(counts[0]?.total ?? 0n),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(source: AuditSource, id: string, schoolId?: string) {
    const rows = await this.db.$queryRaw<AuditRow[]>(Prisma.sql`
      WITH audit_rows AS (${this.rows()})
      SELECT * FROM audit_rows
      WHERE source = ${source} AND id = ${id}
        AND (${schoolId ?? null}::text IS NULL OR "schoolId" = ${schoolId ?? null})
      LIMIT 1
    `);
    if (!rows[0]) throw new NotFoundException('Audit event not found.');
    return {
      ...this.publicRow(rows[0]),
      actorId: rows[0].actorId,
      schoolId: rows[0].schoolId,
      targetId: rows[0].targetId,
      details: sanitizeAuditDetails(rows[0].details) ?? null,
    };
  }

  async summary(days: number, schoolId?: string) {
    const since = new Date(Date.now() - days * 86400000);
    const scope = schoolId ? { schoolId } : {};
    const [auditEvents, securityEvents, failedAuthentication, highRiskEvents] = await this.db.$transaction([
      this.db.auditEvent.count({ where: { ...scope, createdAt: { gte: since } } }),
      this.db.securityEvent.count({ where: { ...scope, createdAt: { gte: since } } }),
      this.db.securityEvent.count({
        where: {
          ...scope,
          category: 'AUTHENTICATION',
          createdAt: { gte: since },
          OR: [
            { eventType: { contains: 'FAIL', mode: 'insensitive' } },
            { eventType: { contains: 'DENIED', mode: 'insensitive' } },
          ],
        },
      }),
      this.db.securityEvent.count({
        where: { ...scope, createdAt: { gte: since }, severity: { in: ['HIGH', 'CRITICAL'] } },
      }),
    ]);

    return {
      periodDays: days,
      totalEvents: auditEvents + securityEvents,
      failedAuthentication,
      securityEvents,
      highRiskEvents,
    };
  }

  async filterOptions(schoolSearch: string, selectedSchoolId?: string) {
    const [schools, auditActions, securityActions, selectedSchool] = await Promise.all([
      this.db.school.findMany({
        where: schoolSearch ? {
          OR: [
            { name: { contains: schoolSearch, mode: 'insensitive' } },
            { code: { contains: schoolSearch, mode: 'insensitive' } },
          ],
        } : {},
        select: { id: true, name: true, code: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 20,
      }),
      this.db.auditEvent.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
        take: 200,
      }),
      this.db.securityEvent.findMany({
        distinct: ['eventType'],
        select: { eventType: true },
        orderBy: { eventType: 'asc' },
        take: 200,
      }),
      selectedSchoolId
        ? this.db.school.findUnique({ where: { id: selectedSchoolId }, select: { id: true, name: true, code: true } })
        : Promise.resolve(null),
    ]);
    const visibleSchools = selectedSchool && !schools.some(school => school.id === selectedSchool.id)
      ? [selectedSchool, ...schools.slice(0, 19)]
      : schools;
    const actions = [...new Set([
      ...auditActions.map(item => item.action),
      ...securityActions.map(item => item.eventType),
    ])].sort((first, second) => first.localeCompare(second));
    return { schools: visibleSchools, actions, categories: auditCategories };
  }

  async export(query: AuditQuery, actorId: string) {
    const baseQuery = { ...query, page: 1, pageSize: 5000 };
    const where = this.where(baseQuery);
    const [counts] = await this.db.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      WITH audit_rows AS (${this.rows()})
      SELECT COUNT(*)::bigint AS total FROM audit_rows ${where}
    `);
    if (Number(counts?.total ?? 0n) > 5000) {
      throw new PayloadTooLargeException('This export exceeds the 5,000 event limit. Add filters and try again.');
    }
    const rows = await this.db.$queryRaw<AuditRow[]>(Prisma.sql`
      WITH audit_rows AS (${this.rows()})
      SELECT * FROM audit_rows ${where}
      ORDER BY "createdAt" DESC, id DESC
      LIMIT 5000
    `);
    await this.db.auditEvent.create({
      data: {
        actorId,
        schoolId: query.schoolId,
        action: 'AUDIT_LOG_EXPORTED',
        target: 'filtered export (maximum 5,000 events)',
      },
    });

    const cell = (value: unknown) => {
      let text = String(value ?? '');
      if (/^[\u0000-\u0020]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const header = ['Timestamp', 'Action', 'Category', 'Actor', 'Role', 'School', 'Target', 'Outcome', 'Severity'];
    const values = rows.map(row => [
      row.createdAt.toISOString(),
      row.action,
      row.category,
      row.actorName ?? 'Unavailable',
      row.actorRole ?? 'Unavailable',
      row.schoolName ?? 'Platform',
      row.target && !/[0-9a-f]{8}-[0-9a-f-]{27}/i.test(row.target) ? row.target : 'Unavailable',
      row.outcome,
      row.severity ?? 'Unavailable',
    ]);
    return '\uFEFF' + [header, ...values].map(row => row.map(cell).join(',')).join('\r\n');
  }

  private publicRow(row: AuditRow) {
    return {
      id: row.id,
      source: row.source,
      createdAt: row.createdAt,
      action: row.action,
      category: row.category,
      actor: row.actorName ? { name: row.actorName, email: row.actorEmail } : null,
      role: row.actorRole,
      school: row.schoolName ? { name: row.schoolName, code: row.schoolCode } : null,
      target: row.target && !/[0-9a-f]{8}-[0-9a-f-]{27}/i.test(row.target) ? row.target : null,
      outcome: row.outcome,
      severity: row.severity,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    };
  }

  private where(query: AuditQuery) {
    const filters: Prisma.Sql[] = [];
    if (query.schoolId) filters.push(Prisma.sql`"schoolId" = ${query.schoolId}`);
    if (query.category) filters.push(Prisma.sql`category = ${query.category}`);
    if (query.action) filters.push(Prisma.sql`action ILIKE ${`%${query.action}%`}`);
    if (query.outcome) filters.push(Prisma.sql`outcome = ${query.outcome}`);
    if (query.severity) filters.push(Prisma.sql`severity = ${query.severity}`);
    if (query.from) filters.push(Prisma.sql`"createdAt" >= ${new Date(`${query.from}T00:00:00.000Z`)}`);
    if (query.to) filters.push(Prisma.sql`"createdAt" < ${new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86400000)}`);
    if (query.actor) {
      const search = `%${query.actor}%`;
      filters.push(Prisma.sql`(COALESCE("actorName", '') ILIKE ${search} OR COALESCE("actorEmail", '') ILIKE ${search})`);
    }
    if (query.q) {
      const search = `%${query.q}%`;
      filters.push(Prisma.sql`(
        action ILIKE ${search}
        OR COALESCE(target, '') ILIKE ${search}
        OR COALESCE("actorName", '') ILIKE ${search}
        OR COALESCE("actorEmail", '') ILIKE ${search}
        OR COALESCE("schoolName", '') ILIKE ${search}
        OR COALESCE("schoolCode", '') ILIKE ${search}
        OR COALESCE(details::text, '') ILIKE ${search}
        OR COALESCE("actorId", '') ILIKE ${search}
        OR COALESCE("schoolId", '') ILIKE ${search}
      )`);
    }
    return filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.empty;
  }

  private rows() {
    return Prisma.sql`
      SELECT
        a.id::text AS id,
        'AUDIT'::text AS source,
        a."createdAt" AS "createdAt",
        a.action AS action,
        CASE
          WHEN a.action ILIKE 'LOGIN%' OR a.action ILIKE 'PASSWORD%' OR a.action ILIKE '%MFA%' OR a.action ILIKE '%SESSION%' THEN 'AUTHENTICATION'
          WHEN a.action ILIKE '%MEMBER%' OR a.action ILIKE '%ROLE%' OR a.action ILIKE '%INVITATION%' OR a.action ILIKE '%USER%' THEN 'USER_MANAGEMENT'
          WHEN a.action ILIKE '%SCHOOL%' OR a.action ILIKE '%LEAD%' THEN 'SCHOOL_MANAGEMENT'
          WHEN a.action ILIKE '%STUDENT%' OR a.action ILIKE '%ADMISSION%' OR a.action ILIKE '%REGISTRY%' THEN 'STUDENT_MANAGEMENT'
          WHEN a.action ILIKE '%TEACHER%' OR a.action ILIKE '%ASSIGNMENT%' THEN 'TEACHER_MANAGEMENT'
          WHEN a.action ILIKE '%ACADEMIC%' OR a.action ILIKE '%RESULT%' OR a.action ILIKE '%MARK%' OR a.action ILIKE '%ATTENDANCE%' THEN 'ACADEMIC_RECORDS'
          WHEN a.action ILIKE '%FEE%' OR a.action ILIKE '%PAYMENT%' OR a.action ILIKE '%FINANCE%' OR a.action ILIKE '%WALLET%' OR a.action ILIKE '%RECONCILIATION%' THEN 'FINANCIAL_RECORDS'
          WHEN a.action ILIKE '%SETTING%' OR a.action ILIKE '%CONFIGURATION%' THEN 'PLATFORM_SETTINGS'
          WHEN a.action ILIKE '%SECURITY%' OR a.action ILIKE '%ACCESS_DENIED%' THEN 'SECURITY'
          ELSE 'SYSTEM_OPERATIONS'
        END AS category,
        a."actorId"::text AS "actorId",
        u.name AS "actorName",
        u.email AS "actorEmail",
        CASE WHEN u."platformAdmin" THEN 'SUPER_ADMIN' ELSE m.role::text END AS "actorRole",
        a."schoolId"::text AS "schoolId",
        s.name AS "schoolName",
        s.code AS "schoolCode",
        a.target AS target,
        CASE
          WHEN a.target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN a.target
          ELSE NULL
        END AS "targetId",
        'SUCCESS'::text AS outcome,
        NULL::text AS severity,
        NULL::jsonb AS details,
        NULL::text AS "ipAddress",
        NULL::text AS "userAgent"
      FROM "AuditEvent" a
      LEFT JOIN "User" u ON u.id = a."actorId"
      LEFT JOIN "School" s ON s.id = a."schoolId"
      LEFT JOIN LATERAL (
        SELECT membership.role
        FROM "Membership" membership
        WHERE membership."userId" = a."actorId"
          AND (a."schoolId" IS NULL OR membership."schoolId" = a."schoolId")
        ORDER BY membership."createdAt" ASC
        LIMIT 1
      ) m ON true
      UNION ALL
      SELECT
        e.id::text AS id,
        'SECURITY'::text AS source,
        e."createdAt" AS "createdAt",
        e."eventType" AS action,
        CASE
          WHEN e.category = 'AUTHENTICATION' THEN 'AUTHENTICATION'
          WHEN e.category = 'FINANCIAL' OR e.category = 'WALLET' THEN 'FINANCIAL_RECORDS'
          WHEN e.category = 'INTEGRITY' THEN 'SYSTEM_OPERATIONS'
          ELSE 'SECURITY'
        END AS category,
        e."actorId"::text AS "actorId",
        actor.name AS "actorName",
        actor.email AS "actorEmail",
        CASE WHEN actor."platformAdmin" THEN 'SUPER_ADMIN' ELSE securityMembership.role::text END AS "actorRole",
        e."schoolId"::text AS "schoolId",
        securitySchool.name AS "schoolName",
        securitySchool.code AS "schoolCode",
        COALESCE(e.details->>'resourceName', e.details->>'targetName') AS target,
        COALESCE(e.details->>'resourceId', e.details->>'targetId') AS "targetId",
        CASE
          WHEN e."eventType" ILIKE '%denied%' OR e."eventType" ILIKE '%forbidden%' THEN 'DENIED'
          WHEN e."eventType" ILIKE '%fail%' OR e."eventType" ILIKE '%reject%' THEN 'FAILED'
          ELSE 'UNAVAILABLE'
        END AS outcome,
        e.severity AS severity,
        e.details AS details,
        NULLIF(e."ipAddress", '') AS "ipAddress",
        NULLIF(e."userAgent", '') AS "userAgent"
      FROM "SecurityEvent" e
      LEFT JOIN "User" actor ON actor.id = e."actorId"
      LEFT JOIN "School" securitySchool ON securitySchool.id = e."schoolId"
      LEFT JOIN LATERAL (
        SELECT membership.role
        FROM "Membership" membership
        WHERE membership."userId" = e."actorId"
          AND (e."schoolId" IS NULL OR membership."schoolId" = e."schoolId")
        ORDER BY membership."createdAt" ASC
        LIMIT 1
      ) securityMembership ON true
    `;
  }
}
