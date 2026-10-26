import { 
  BadRequestException, 
  ConflictException,
  Body, 
  Controller, 
  ForbiddenException, 
  Get, 
  HttpCode, 
  NotFoundException, 
  Param, 
  Post, 
  Query, 
  Req,
  Res
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma, Role, CommunicationChannel } from '@prisma/client';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { CommunicationService } from './communication/communication.service';
import { ReportAccessVerificationService } from './report-access-verification.service';
import { digest, randomToken } from './security';
import { config } from './config';
import { renderReportPdf } from './report-pdf';
import { enqueueParentPush } from './parent-push';
import { buildParentResultEmail } from './communication/email/email-templates';

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
const withdrawPublicationSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

const paging = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

@Controller('api/v1')
export class ReportAccessController {
  constructor(
    private readonly svc: PlatformService,
    private readonly comms: CommunicationService,
    private readonly reportVerification: ReportAccessVerificationService,
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

    const school = await this.svc.db.school.findFirst({ where: { id: schoolId, active: true }, select: { name: true } });
    if (!school) throw new BadRequestException('School not found.');

    const expiresAt = new Date(Date.now() + b.expiresDays * 86400000);
    const results: Array<{ studentName: string; guardianName: string; linkId: string; channel: string }> = [];
    const reportStudentIds = [...new Set(classReports.map(report => String(report.id).split(':')[2]).filter(Boolean))];
    const publishedAt = new Date();
    const approvedClasses = new Set(classes.filter(classroom => {
      const submissions = (state?.submissions || []).filter((submission: any) => submission.assessmentId === b.assessmentId && submission.classId === classroom.id);
      return submissions.length > 0 && submissions.every((submission: any) => submission.assessmentProgress?.status === 'approved');
    }).map(classroom => classroom.id));

    await this.svc.atomic(async tx => {
      const [students, enrollments] = await Promise.all([
        tx.student.findMany({ where: { schoolId, id: { in: reportStudentIds } }, include: { guardians: { where: { schoolId, active: true, canReceiveReports: true }, include: { guardian: true } } } }),
        tx.enrollment.findMany({ where: { schoolId, studentId: { in: reportStudentIds }, classroomId: { in: classes.map(classroom => classroom.id) }, status: 'active' }, select: { studentId: true, classroomId: true } }),
      ]);
      const studentById = new Map(students.map(student => [student.id, student]));
      const enrolled = new Set(enrollments.map(enrollment => `${enrollment.studentId}:${enrollment.classroomId}`));
      for (const report of classReports) {
        // report.id is formatted as `${assessmentId}:${classId}:${studentId}`
        const parts = report.id.split(':');
        const studentId = parts[2];
        if (!studentId) continue;
        if (parts[0] !== b.assessmentId || parts[1] !== report.classId) continue;

        if (!approvedClasses.has(report.classId)) continue;

        await tx.parentResultPublication.upsert({
          where: { schoolId_reportCardId: { schoolId, reportCardId: report.id } },
          create: { schoolId, studentId, yearId: b.yearId, classId: report.classId, reportCardId: report.id, publishedAt },
          update: { studentId, yearId: b.yearId, classId: report.classId, publishedAt, withdrawnAt: null, withdrawnByUserId: null, withdrawalReason: null },
        });

        const student = studentById.get(studentId);

        if (!student || !student.guardians.length) continue;
        if (!enrolled.has(`${studentId}:${report.classId}`)) continue;
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

          const period = report.period || year.name;
          const email = channel === 'EMAIL' ? buildParentResultEmail({
            guardianName: guardian.name,
            studentName: student.name,
            schoolName: school.name,
            className,
            period,
            reportUrl,
            expiresDays: b.expiresDays,
          }) : undefined;
          await this.comms.enqueueMessage(tx, {
            schoolId,
            guardianId: guardian.id,
            studentId,
            channel,
            recipient,
            subject: email?.subject ?? `Ripoti ya Maendeleo - ${student.name}`,
            body: email?.text ?? messageText,
            ...(email ? { html: email.html } : {}),
            templateKey: channel === 'WHATSAPP' ? 'student_report_published' : undefined,
            templateParams: {
              student_name: student.name,
              class_name: className,
              period,
              report_url: reportUrl,
            },
          });

          if (guardian.userId) {
            const notification = await tx.parentNotification.upsert({
              where: { dedupeKey: `result:${schoolId}:${report.id}:${guardian.userId}` },
              create: { userId: guardian.userId, schoolId, studentId, kind: 'RESULT', title: 'New academic result', body: 'A published report is available in the parent app.', targetId: link.id, dedupeKey: `result:${schoolId}:${report.id}:${guardian.userId}` },
              update: { targetId: link.id, readAt: null },
            });
            await enqueueParentPush(tx, notification);
          }

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

    const revokedAt = new Date();
    const updated = await this.svc.atomic(async tx => {
      const result = await tx.reportAccessLink.update({
        where: { id: linkId },
        data: { revokedAt, revokedByUserId: user.id, revokeReason: b.reason, sessionTokenHash: null },
      });
      await tx.auditEvent.create({
        data: { schoolId, actorId: user.id, action: 'REPORT_ACCESS_LINK_REVOKED', target: linkId },
      });
      return result;
    });

    return { message: 'Report access link has been revoked.', revokedAt: updated.revokedAt };
  }

  @Post('schools/:schoolId/reports/publications/:publicationId/withdraw')
  async withdrawResultPublication(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('publicationId') publicationId: string,
    @Body() body: unknown,
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC']);
    parse(uuid, publicationId);
    if (!req.session.parentActionCsrf || req.get('x-csrf-token') !== req.session.parentActionCsrf) {
      throw new ForbiddenException('CSRF token is required.');
    }
    const input = parse(withdrawPublicationSchema, body);
    const publication = await this.svc.db.parentResultPublication.findFirst({ where: { id: publicationId, schoolId }, select: { id: true, withdrawnAt: true } });
    if (!publication) throw new NotFoundException('Published result not found.');
    if (publication.withdrawnAt) throw new ConflictException('This result publication is already withdrawn.');
    const withdrawnAt = new Date();
    await this.svc.atomic(async tx => {
      const changed = await tx.parentResultPublication.updateMany({
        where: { id: publicationId, schoolId, withdrawnAt: null },
        data: { withdrawnAt, withdrawnByUserId: user.id, withdrawalReason: input.reason },
      });
      if (!changed.count) throw new ConflictException('This result publication has changed. Refresh and try again.');
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'PARENT_RESULT_PUBLICATION_WITHDRAWN', target: publicationId } });
    });
    return { withdrawn: true, withdrawnAt };
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

    if (!link.guardian.phone) throw new BadRequestException('Guardian phone is unavailable for this report link.');
    const last4 = link.guardian.phone.slice(-4);
    const code = b.code || b.challengeResponse;

    // If guardian requests an OTP challenge or hasn't provided code yet
    if (b.requestOtp || !code) {
      // Disallow phone-last-4 as standalone authorization; require verified OTP challenge
      await this.reportVerification.requestCode(link.schoolId, link.guardianId);
      return {
        status: 'CHALLENGE_REQUIRED',
        verificationType: 'otp',
        maskedDestination: `+255 *** *** ${last4}`,
        studentName: link.student.name,
        schoolName: link.school.name,
      };
    }

    // Verify 6-digit OTP
    await this.reportVerification.confirmCode(link.schoolId, link.guardianId, code);

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
    @Query() query: unknown,
    @Res() res: Response,
  ) {
    parse(tokenValidator, token);
    parse(z.object({}).strict(), query);
    const sessionToken = req.get('x-report-session-token');
    if (!sessionToken) {
      throw new ForbiddenException('Active verified report session required for PDF download.');
    }
    parse(tokenValidator, sessionToken);

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
    await this.svc.rate(`guardian-report-pdf:${link.id}`, 30, 3600);

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

    const publication = await this.svc.db.parentResultPublication.findFirst({ where: { schoolId: link.schoolId, studentId: link.studentId, reportCardId: link.reportCardId, withdrawnAt: null }, select: { publishedAt: true } });
    if (!reportCardData || reportCardData.status !== 'approved' || reportCardData.academicApproved !== true || !publication) {
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

    const pdf = renderReportPdf({ school: link.school.name, student: link.student.name,
      admissionNumber: link.student.admissionNumber, academicYear: classroom?.year.name ?? '',
      className: classroom?.name ?? '', period: String(reportCardData.period ?? ''),
      publishedAt: publication.publishedAt.toISOString().slice(0, 10), results: reportCardData.results,
      noMarks: reportCardData.noMarks, summary: reportCardData.summary });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="syncacademy-result.pdf"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(pdf);
  }
}
