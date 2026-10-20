import { Injectable } from '@nestjs/common';
import { Database } from './database/database.service';

export type SecurityCategory = 
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'MFA'
  | 'OTP'
  | 'REPORT_ACCESS'
  | 'WEBHOOK'
  | 'FINANCIAL'
  | 'WALLET'
  | 'INTEGRITY';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type InvestigationStatus = 'unreviewed' | 'investigating' | 'acknowledged' | 'resolved';

@Injectable()
export class SecurityEventsService {
  constructor(private readonly db: Database) {}

  /**
   * Sanitize security event metadata to guarantee zero secret leakage
   */
  public sanitizeDetails(details: any): any {
    if (!details || typeof details !== 'object') return {};
    const sanitized = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'otp', 'code', 'pin', 'authorization', 'cookie'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeDetails(sanitized[key]);
      }
    }
    return sanitized;
  }

  /**
   * Record a structured security telemetry event
   */
  async recordEvent(params: {
    schoolId?: string | null;
    category: SecurityCategory;
    severity?: SecuritySeverity;
    eventType: string;
    actorId?: string | null;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
  }) {
    const sanitizedDetails = this.sanitizeDetails(params.details);

    return this.db.securityEvent.create({
      data: {
        schoolId: params.schoolId || null,
        category: params.category,
        severity: params.severity || 'LOW',
        eventType: params.eventType,
        actorId: params.actorId || null,
        ipAddress: params.ipAddress || '',
        userAgent: params.userAgent || '',
        details: sanitizedDetails,
        investigationStatus: 'unreviewed',
      },
    });
  }

  /**
   * List platform security events (Super Admin)
   */
  async listPlatformEvents(query: {
    schoolId?: string;
    category?: string;
    severity?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 25, 100);

    const where: any = {
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { investigationStatus: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      this.db.securityEvent.count({ where }),
      this.db.securityEvent.findMany({
        where,
        include: {
          school: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * List school-scoped security events (Headmaster)
   */
  async listSchoolEvents(schoolId: string, query: {
    category?: string;
    severity?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 25, 100);

    const where: any = {
      schoolId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { investigationStatus: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      this.db.securityEvent.count({ where }),
      this.db.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Update incident investigation status
   */
  async updateEventStatus(
    eventId: string,
    status: InvestigationStatus,
    resolutionNotes: string,
    actorId: string,
    schoolId?: string
  ) {
    const where: any = { id: eventId, ...(schoolId ? { schoolId } : {}) };

    const event = await this.db.securityEvent.findFirst({ where });
    if (!event) throw new Error('Security event not found or access denied.');

    return this.db.securityEvent.update({
      where: { id: eventId },
      data: {
        investigationStatus: status,
        resolutionNotes,
        resolvedById: status === 'resolved' ? actorId : event.resolvedById,
        resolvedAt: status === 'resolved' ? new Date() : event.resolvedAt,
      },
    });
  }
}
