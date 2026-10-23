import { 
  BadRequestException, 
  Body, 
  Controller, 
  ForbiddenException, 
  Get, 
  HttpCode, 
  NotFoundException, 
  Param, 
  Post, 
  Query, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';
import { Prisma, Role, CommunicationChannel } from '@prisma/client';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { CommunicationService } from './communication/communication.service';
import { digest, randomToken } from './security';
import { config } from './config';

const uuid = z.string().uuid();
const tokenValidator = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/, 'Invalid report link token format.');
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const publishWithLinksSchema = z.object({
  yearId: uuid,
  assessmentId: uuid,
  classId: uuid.optional(),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']).default('SMS'),
  expiresDays: z.coerce.number().int().min(1).max(90).default(30),
  verificationType: z.enum(['otp']).default('otp'),
});

const verifyPublicChallengeSchema = z.object({
  token: tokenValidator,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code.').optional(),
  challengeResponse: z.string().trim().max(20).optional(),
  requestOtp: z.boolean().optional(),
});

const revokeLinkSchema = z.object({
  reason: z.string().trim().min(3).max(300).default('Link revoked by school staff'),
});

const paging = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

@Controller('api/v1')
export class ReportAccessController {
  constructor(
    private readonly svc: PlatformService,
    private readonly comms: CommunicationService,
  ) {}

  @Get('schools/:schoolId/reports/publish-options')
  async publishOptions(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    const { yearId } = parse(z.object({ yearId: uuid }).strict(), query);
    const workspace = await this.svc.db.academicWorkspace.findFirst({ where: { schoolId, yearId } });
    const state = workspace?.data as any;
    const approved = new Set((state?.reports || []).filter((r: any) => r.academicApproved === true && r.status === 'approved').map((r: any) => r.assessmentId));
    return { assessments: (state?.assessments || []).filter((a: any) => approved.has(a.id)).map((a: any) => ({ id: a.id, name: a.name, term: a.term })) };
  }

  /**
   * School Administrative: Generate report access links and notify guardians
   */
  @Post('schools/:schoolId/reports/publish-with-links')
  async publishReportsWithLinks(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    const b = parse(publishWithLinksSchema, body);

    // Verify academic year and workspace
    const year = await this.svc.db.academicYear.findFirst({
      where: { id: b.yearId, schoolId },
    });
    if (!year) throw new BadRequestException('Academic year not found in this school.');

    const workspace = await this.svc.db.academicWorkspace.findFirst({
      where: { schoolId, yearId: b.yearId },
    });
    if (!workspace) throw new BadRequestException('Academic workspace not found.');

    const state = workspace.data as any;
    const reports: any[] = state?.reports || [];
    const classes = await this.svc.db.classroom.findMany({ where: { schoolId, yearId: b.yearId, ...(b.classId ? { id: b.classId } : {}) }, select: { id: true, name: true } });
    if (b.classId && !classes.length) throw new BadRequestException('Class not found in this academic year.');
    const classNames = new Map(classes.map(c => [c.id, c.name]));
    const classReports = reports.filter(r => r.assessmentId === b.assessmentId && classNames.has(r.classId) && r.academicApproved === true && r.status === 'approved');

    if (!classReports.length) {
      throw new BadRequestException('No approved reports found for this assessment and scope. Generate and approve reports first.');
    }

    const expiresAt = new Date(Date.now() + b.expiresDays * 86400000);
    const results: Array<{ studentName: string; guardianName: string; linkId: string; channel: string }> = [];

    await this.svc.atomic(async tx => {
      for (const report of classReports) {
        // report.id is formatted as `${assessmentId}:${classId}:${studentId}`
        const parts = report.id.split(':');
        const studentId = parts[2];
        if (!studentId) continue;
        if (parts[0] !== b.assessmentId || parts[1] !== report.classId) continue;

        const approvedSubmissions = (state?.submissions || []).filter((s: any) => s.assessmentId === b.assessmentId && s.classId === report.classId);
        if (!approvedSubmissions.length || approvedSubmissions.some((s: any) => s.assessmentProgress?.status !== 'approved')) continue;

        const student = await tx.student.findFirst({
          where: { id: studentId, schoolId },
          include: {
            guardians: {
              where: { schoolId, active: true, canReceiveReports: true },
              include: { guardian: true },
            },
          },
        });

        if (!student || !student.guardians.length) continue;
        const enrolled = await tx.enrollment.findFirst({ where: { schoolId, studentId, classroomId: report.classId, classroom: { yearId: b.yearId }, status: 'active' } });
        if (!enrolled) continue;
        const className = classNames.get(report.classId) || 'Class';

        for (const sg of student.guardians) {
          const guardian = sg.guardian;
          const channel = b.channel as CommunicationChannel;
          const recipient = channel === 'WHATSAPP' ? guardian.whatsappPhone : channel === 'EMAIL' ? guardian.email : guardian.phone;
          if (!recipient || (channel === 'SMS' && guardian.optOutSms) || (channel === 'WHATSAPP' && guardian.optOutWhatsapp)) continue;
          const rawToken = randomToken();
          const tokenHash = digest(rawToken);

          // Invalidate any previous unexpired links for this student + guardian + reportCardId
          await tx.reportAccessLink.updateMany({
            where: {
              schoolId,
              studentId,
              guardianId: guardian.id,
              reportCardId: report.id,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
              revokeReason: 'Superceded by newly published report link',
            },
          });

          const link = await tx.reportAccessLink.create({
            data: {
              schoolId,
              studentId,
              guardianId: guardian.id,
              reportCardId: report.id,
              tokenHash,
              expiresAt,
              verificationType: b.verificationType,
            },
          });

          // Build access URL
          const reportUrl = `${config.APP_ORIGIN}/r/${rawToken}`;

          // Format notification text in Swahili / English
          const messageText = `SyncAcademy: Taarifa ya maendeleo ya mwanafunzi ${student.name} (${className} - ${report.period || year.name}) ipo tayari. Bonyeza link kuona ripoti: ${reportUrl} (Inaisha siku ${b.expiresDays}).`;

          await this.comms.enqueueMessage(tx, {
            schoolId,
            guardianId: guardian.id,
            studentId,
            channel,
            recipient,
            subject: `Ripoti ya Maendeleo - ${student.name}`,
            body: messageText,
            templateKey: channel === 'WHATSAPP' ? 'student_report_published' : undefined,
            templateParams: {
              student_name: student.name,
              class_name: className,
              period: report.period || year.name,
              report_url: reportUrl,
            },
          });

          results.push({
            studentName: student.name,
            guardianName: guardian.name,
            linkId: link.id,
            channel,
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'REPORTS_PUBLISHED_WITH_GUARDIAN_LINKS',
          target: `${b.classId || 'school'}:${b.assessmentId}`,
        },
      });
    });

    return {
      message: `Report access links generated and notifications enqueued.`,
      dispatchedCount: results.length,
      expiresAt: expiresAt.toISOString(),
      items: results,
    };
  }

  /**
   * School Administrative: List generated report access links with filter & pagination
   */
  @Get('schools/:schoolId/reports/links')
  async listReportLinks(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Query() query: unknown
  ) {
    const access = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'TEACHER', 'REGISTRAR']);
    const b = parse(z.object({
      ...paging,
      studentId: uuid.optional(),
      classId: uuid.optional(),
    }).strict(), query);

    let authorizedClassIds: string[] | undefined;
    if (req.session.selectedRole === 'TEACHER') {
      const assignments = await this.svc.db.teachingAssignment.findMany({
        where: { schoolId, membershipId: { in: access.memberships.map(membership => membership.id) } },
        select: { classroomId: true },
        distinct: ['classroomId'],
      });
      authorizedClassIds = assignments.map(assignment => assignment.classroomId);
      if (!authorizedClassIds.length) throw new ForbiddenException('No authorized class assignments were found.');
      if (b.classId && !authorizedClassIds.includes(b.classId)) {
        throw new ForbiddenException('You do not have access to reports for this class.');
      }
    }

    const where: Prisma.ReportAccessLinkWhereInput = {
      schoolId,
      ...(b.studentId ? { studentId: b.studentId } : {}),
      ...(b.classId ? { student: { enrollments: { some: { classroomId: b.classId, status: 'active' } } } } : {}),
      ...(authorizedClassIds ? {
        student: {
          enrollments: {
            some: { schoolId, classroomId: { in: authorizedClassIds }, status: 'active' },
          },
        },
      } : {}),
    };

    const [total, items] = await Promise.all([
      this.svc.db.reportAccessLink.count({ where }),
      this.svc.db.reportAccessLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (b.page - 1) * b.pageSize,
        take: b.pageSize,
        include: {
          student: { select: { id: true, name: true, admissionNumber: true } },
          guardian: { select: { id: true, name: true, phone: true } },
        },
      }),
    ]);

    return {
      items: items.map(l => ({
        id: l.id,
        reportCardId: l.reportCardId,
        student: l.student,
        guardian: l.guardian,
        expiresAt: l.expiresAt,
        isExpired: l.expiresAt < new Date(),
        isRevoked: !!l.revokedAt,
        revokedAt: l.revokedAt,
        revokeReason: l.revokeReason,
        accessCount: l.accessCount,
        maxAccessCount: l.maxAccessCount,
        lastAccessedAt: l.lastAccessedAt,
        verificationType: l.verificationType,
        createdAt: l.createdAt,
      })),
      total,
      page: b.page,
      pageSize: b.pageSize,
    };
  }

  /**
   * School Administrative: Revoke an active report link
   */
  @Post('schools/:schoolId/reports/links/:linkId/revoke')
  async revokeReportLink(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('linkId') linkId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    parse(uuid, linkId);
    const b = parse(revokeLinkSchema, body);

    const link = await this.svc.db.reportAccessLink.findFirst({
      where: { id: linkId, schoolId },
    });
    if (!link) throw new NotFoundException('Report access link not found.');
    if (link.revokedAt) throw new BadRequestException('This report link is already revoked.');

    const updated = await this.svc.db.reportAccessLink.update({
      where: { id: linkId },
      data: {
        revokedAt: new Date(),
        revokedByUserId: user.id,
        revokeReason: b.reason,
        sessionTokenHash: null,
      },
    });

    await this.svc.db.auditEvent.create({
      data: {
        schoolId,
        actorId: user.id,
        action: 'REPORT_ACCESS_LINK_REVOKED',
        target: linkId,
      },
    });

    return { message: 'Report access link has been revoked.', revokedAt: updated.revokedAt };
  }

  /**
   * Public Guardian Route: Verify link and security challenge, then view report
   */
  @Post('public/reports/verify')
  @HttpCode(200)
  async verifyAndFetchReport(
    @Req() req: Request,
    @Body() body: unknown
  ) {
    const b = parse(verifyPublicChallengeSchema, body);
    const tokenHash = digest(b.token);

    // Rate limit public access to prevent brute force
    await this.svc.rate('report-link:' + tokenHash, 10, 600);
    await this.svc.rate('report-ip:' + (req.ip || 'unknown'), 30, 600);

    const link = await this.svc.db.reportAccessLink.findUnique({
      where: { tokenHash },
      include: {
        school: { select: { id: true, name: true, phone: true, email: true, active: true } },
        student: { select: { id: true, name: true, admissionNumber: true, gender: true } },
        guardian: { select: { id: true, name: true, phone: true, email: true, preferredLanguage: true } },
      },
    });

    if (!link || !link.school.active) {
      throw new NotFoundException('This report link is invalid or no longer available.');
    }
    if (!await this.svc.db.studentGuardian.findFirst({ where: { schoolId: link.schoolId, studentId: link.studentId, guardianId: link.guardianId, active: true, canReceiveReports: true } })) throw new ForbiddenException('Guardian access to this student is no longer active.');

    if (link.revokedAt) {
      throw new ForbiddenException(`This report link has been revoked by the school: ${link.revokeReason || 'Access removed'}.`);
    }

    if (link.expiresAt < new Date()) {
      throw new ForbiddenException('This report access link has expired. Please contact the school to request a new link.');
    }

    if (link.accessCount >= link.maxAccessCount) {
      throw new ForbiddenException('Maximum view limit reached for this link. Please contact the school for an updated link.');
    }

    const last4 = link.guardian.phone.slice(-4);
    const code = b.code || b.challengeResponse;

    // If guardian requests an OTP challenge or hasn't provided code yet
    if (b.requestOtp || !code) {
      // Disallow phone-last-4 as standalone authorization; require verified OTP challenge
      await this.comms.requestVerification(link.schoolId, link.guardianId, 'SMS', 'public-report-viewer');
      return {
        status: 'CHALLENGE_REQUIRED',
        verificationType: 'otp',
        maskedDestination: `+255 *** *** ${last4}`,
        studentName: link.student.name,
        schoolName: link.school.name,
      };
    }

    // Verify 6-digit OTP
    await this.comms.confirmVerification(link.schoolId, link.guardianId, 'SMS', code, 'public-report-viewer');

    // Generate short-lived secure session token for subsequent viewing and PDF downloads
    const sessionToken = randomToken();
    const sessionTokenHash = digest(sessionToken);

    // Increment access count & update lastAccessedAt and sessionTokenHash
    await this.svc.db.reportAccessLink.update({
      where: { id: link.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
        sessionTokenHash,
      },
    });

    // Fetch the actual report card from AcademicWorkspace
    // reportCardId is `${assessmentId}:${classId}:${studentId}`
    const parts = link.reportCardId.split(':');
    const classId = parts[1];

    const classroom = await this.svc.db.classroom.findFirst({
      where: { id: classId, schoolId: link.schoolId },
      include: { year: true },
    });

    let reportCardData: any = null;
    if (classroom) {
      const workspace = await this.svc.db.academicWorkspace.findFirst({
        where: { schoolId: link.schoolId, yearId: classroom.yearId },
      });
      const reports: any[] = (workspace?.data as any)?.reports || [];
      reportCardData = reports.find(r => r.id === link.reportCardId);
    }

    if (!reportCardData) {
      throw new NotFoundException('Report card details are currently unavailable. Contact the school administrator.');
    }

    await this.svc.db.auditEvent.create({
      data: {
        schoolId: link.schoolId,
        actorId: link.guardianId,
        action: 'REPORT_ACCESSED_BY_GUARDIAN',
        target: link.reportCardId,
      },
    });

    return {
      status: 'VERIFIED',
      sessionToken,
      school: {
        name: link.school.name,
        phone: link.school.phone,
        email: link.school.email,
      },
      student: {
        name: link.student.name,
        admissionNumber: link.student.admissionNumber,
        gender: link.student.gender,
      },
      guardian: {
        name: link.guardian.name,
      },
      academicYear: classroom?.year.name,
      className: classroom?.name,
      reportCard: {
        period: reportCardData.period,
        results: reportCardData.results || [],
        noMarks: reportCardData.noMarks || [],
        summary: reportCardData.summary,
        publishedAt: reportCardData.createdAt,
      },
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  /**
   * Public Guardian Route: Download verified report PDF using session token
   */
  @Get('public/reports/:token/pdf')
  async downloadReportPdf(
    @Req() req: Request,
    @Param('token') token: string,
    @Query('sessionToken') sessionTokenQuery?: string,
  ) {
    parse(tokenValidator, token);
    const sessionToken = sessionTokenQuery || (req.headers['x-report-session-token'] as string);
    if (!sessionToken) {
      throw new ForbiddenException('Active verified report session required for PDF download.');
    }

    const tokenHash = digest(token);
    const sessionTokenHash = digest(sessionToken);

    const link = await this.svc.db.reportAccessLink.findUnique({
      where: { tokenHash },
      include: {
        school: { select: { id: true, name: true, phone: true, email: true, active: true } },
        student: { select: { id: true, name: true, admissionNumber: true, gender: true } },
        guardian: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!link || !link.school.active) {
      throw new NotFoundException('Report link not found or inactive.');
    }
    if (!await this.svc.db.studentGuardian.findFirst({ where: { schoolId: link.schoolId, studentId: link.studentId, guardianId: link.guardianId, active: true, canReceiveReports: true } })) throw new ForbiddenException('Guardian access to this student is no longer active.');

    if (link.revokedAt) {
      throw new ForbiddenException('Report access link has been revoked.');
    }

    if (link.expiresAt < new Date()) {
      throw new ForbiddenException('Report access link has expired.');
    }

    if (link.sessionTokenHash !== sessionTokenHash) {
      throw new ForbiddenException('Invalid or expired report viewing session. Please complete OTP verification.');
    }

    const parts = link.reportCardId.split(':');
    const classId = parts[1];

    const classroom = await this.svc.db.classroom.findFirst({
      where: { id: classId, schoolId: link.schoolId },
      include: { year: true },
    });

    let reportCardData: any = null;
    if (classroom) {
      const workspace = await this.svc.db.academicWorkspace.findFirst({
        where: { schoolId: link.schoolId, yearId: classroom.yearId },
      });
      const reports: any[] = (workspace?.data as any)?.reports || [];
      reportCardData = reports.find(r => r.id === link.reportCardId);
    }

    if (!reportCardData) {
      throw new NotFoundException('Report card not found.');
    }

    await this.svc.db.auditEvent.create({
      data: {
        schoolId: link.schoolId,
        actorId: link.guardianId,
        action: 'REPORT_PDF_DOWNLOADED_BY_GUARDIAN',
        target: link.reportCardId,
      },
    });

    return {
      status: 'VERIFIED',
      school: link.school,
      student: link.student,
      academicYear: classroom?.year.name,
      className: classroom?.name,
      reportCard: reportCardData,
      downloadedAt: new Date().toISOString(),
    };
  }
}
