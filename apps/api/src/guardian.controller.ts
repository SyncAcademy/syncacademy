import { 
  BadRequestException, 
  Body, 
  ConflictException, 
  Controller, 
  Delete, 
  ForbiddenException, 
  Get, 
  NotFoundException, 
  Param, 
  Patch, 
  Post, 
  Query, 
  Req 
} from '@nestjs/common';
import { CommunicationChannel, Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { CommunicationService, normalizePhoneNumber } from './communication/communication.service';

const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const readers: Role[] = ['HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER', 'BURSAR'];
const writers: Role[] = ['HEADMASTER', 'REGISTRAR', 'ACADEMIC'];

const phoneValidator = z.string().trim().min(7).max(25).transform(v => normalizePhoneNumber(v)).refine(v => /^255\d{9}$|^\+?[1-9]\d{6,14}$/.test(v), {
  message: 'Enter a valid phone number (e.g., 0712345678 or 255712345678).',
});

const guardianSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: phoneValidator,
  whatsappPhone: z.union([phoneValidator, z.literal('')]).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  preferredChannel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']).default('SMS'),
  preferredLanguage: z.enum(['sw', 'en']).default('sw'),
  optOutSms: z.boolean().default(false),
  optOutWhatsapp: z.boolean().default(false),
});

const linkGuardianSchema = z.object({
  guardianId: uuid.optional(),
  guardianData: guardianSchema.optional(),
  relationship: z.string().trim().min(2).max(50).default('Guardian'),
  isPrimary: z.boolean().default(false),
  canReceiveReports: z.boolean().default(true),
  canReceiveFinanceAlert: z.boolean().default(true),
  canReceiveAttendanceAlert: z.boolean().default(true),
}).refine(data => !!data.guardianId || !!data.guardianData, {
  message: 'Provide either an existing guardianId or guardianData to create a new guardian.',
});

const updateLinkSchema = z.object({
  relationship: z.string().trim().min(2).max(50).optional(),
  isPrimary: z.boolean().optional(),
  canReceiveReports: z.boolean().optional(),
  canReceiveFinanceAlert: z.boolean().optional(),
  canReceiveAttendanceAlert: z.boolean().optional(),
  active: z.boolean().optional(),
});

const paging = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(150).default(''),
};
const invitationSchema = z.object({
  yearId: uuid,
  classId: uuid.optional(),
  studentIds: z.array(uuid).min(1).max(100).optional(),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']).default('SMS'),
}).strict();

@Controller('api/v1/schools/:schoolId')
export class GuardianController {
  constructor(
    private readonly svc: PlatformService,
    private readonly comms: CommunicationService,
  ) {}

  private async access(req: Request, schoolId: string, write = false) {
    return this.svc.authorize(req, parse(uuid, schoolId), write ? writers : readers);
  }

  @Post('guardian-invitations')
  async sendInvitations(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(invitationSchema, body);
    await this.svc.rate(`guardian-invitations:${user.id}`, 20, 3600);
    const year = await this.svc.db.academicYear.findFirst({ where: { id: b.yearId, schoolId } });
    if (!year) throw new NotFoundException('Academic year not found in this school.');
    if (b.classId) {
      const classroom = await this.svc.db.classroom.findFirst({ where: { id: b.classId, schoolId, yearId: b.yearId } });
      if (!classroom) throw new NotFoundException('Class not found in this academic year.');
    }
    if (b.studentIds) {
      const enrolled = await this.svc.db.enrollment.findMany({ where: { schoolId, classroom: { yearId: b.yearId }, status: 'active', ...(b.classId ? { classroomId: b.classId } : {}), studentId: { in: b.studentIds } }, select: { studentId: true } });
      if (new Set(enrolled.map(row => row.studentId)).size !== new Set(b.studentIds).size) throw new BadRequestException('Every selected student must be actively enrolled in the selected scope.');
    }
    const links = await this.svc.db.studentGuardian.findMany({
      where: { schoolId, active: true, ...(b.studentIds ? { studentId: { in: b.studentIds } } : {}), student: { schoolId, enrollments: { some: { schoolId, classroom: { yearId: b.yearId }, status: 'active', ...(b.classId ? { classroomId: b.classId } : {}) } } } },
      include: { guardian: true },
    });
    const guardians = new Map(links.map(link => [link.guardianId, link.guardian]));
    let sent = 0; let skipped = 0;
    const recipients = [...guardians.values()];
    for (let offset = 0; offset < recipients.length; offset += 8) {
      const outcomes = await Promise.all(recipients.slice(offset, offset + 8).map(async guardian => {
        if ((b.channel === 'SMS' && guardian.optOutSms) || (b.channel === 'WHATSAPP' && guardian.optOutWhatsapp) || (b.channel === 'EMAIL' && !guardian.email) || (b.channel === 'WHATSAPP' && !guardian.whatsappPhone)) return false;
        try {
          await this.comms.requestVerification(schoolId, guardian.id, b.channel as CommunicationChannel, user.id, true);
          return true;
        } catch (error) {
          if (error instanceof ConflictException || error instanceof BadRequestException) return false;
          throw error;
        }
      }));
      sent += outcomes.filter(Boolean).length;
      skipped += outcomes.filter(outcome => !outcome).length;
    }
    return { eligibleGuardians: guardians.size, sent, skipped, message: 'Contact verification invitations queued. Student-record access is not granted.' };
  }

  private async teacherClassrooms(req: Request, schoolId: string, memberships: { id: string }[]) {
    if (req.session.selectedRole !== 'TEACHER') return undefined;
    if (!memberships.length) throw new ForbiddenException('No authorized class assignments were found.');
    const assignments = await this.svc.db.teachingAssignment.findMany({
      where: { schoolId, membershipId: { in: memberships.map(membership => membership.id) } },
      select: { classroomId: true },
      distinct: ['classroomId'],
    });
    const classroomIds = assignments.map(assignment => assignment.classroomId);
    if (!classroomIds.length) throw new ForbiddenException('No authorized class assignments were found.');
    return classroomIds;
  }

  /**
   * List guardians registered in the school with paging, search, and student count
   */
  @Get('guardians')
  async listGuardians(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Query() query: unknown
  ) {
    const access = await this.access(req, schoolId, false);
    const classroomIds = await this.teacherClassrooms(req, schoolId, access.memberships);
    const b = parse(z.object(paging).strict(), query);

    const where: Prisma.GuardianWhereInput = {
      schoolId,
      ...(classroomIds ? {
        students: {
          some: {
            active: true,
            student: { enrollments: { some: { schoolId, classroomId: { in: classroomIds }, status: 'active' } } },
          },
        },
      } : {}),
      ...(b.q ? {
        OR: [
          { name: { contains: b.q, mode: 'insensitive' } },
          { phone: { contains: b.q } },
          { email: { contains: b.q, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      this.svc.db.guardian.count({ where }),
      this.svc.db.guardian.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (b.page - 1) * b.pageSize,
        take: b.pageSize,
        include: {
          _count: {
            select: {
              students: classroomIds ? {
                where: {
                  active: true,
                  student: { enrollments: { some: { schoolId, classroomId: { in: classroomIds }, status: 'active' } } },
                },
              } : true,
            },
          },
          students: {
            where: classroomIds ? {
              active: true,
              student: { enrollments: { some: { schoolId, classroomId: { in: classroomIds }, status: 'active' } } },
            } : undefined,
            include: {
              student: {
                select: { id: true, name: true, admissionNumber: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: items.map(g => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        whatsappPhone: g.whatsappPhone,
        email: g.email,
        preferredChannel: g.preferredChannel,
        preferredLanguage: g.preferredLanguage,
        phoneVerifiedAt: g.phoneVerifiedAt,
        whatsappVerifiedAt: g.whatsappVerifiedAt,
        emailVerifiedAt: g.emailVerifiedAt,
        optOutSms: g.optOutSms,
        optOutWhatsapp: g.optOutWhatsapp,
        studentCount: g._count.students,
        students: g.students.map(sg => ({
          studentId: sg.student.id,
          name: sg.student.name,
          admissionNumber: sg.student.admissionNumber,
          relationship: sg.relationship,
          isPrimary: sg.isPrimary,
        })),
        createdAt: g.createdAt,
      })),
      total,
      page: b.page,
      pageSize: b.pageSize,
    };
  }

  /**
   * Create a guardian in the school
   */
  @Post('guardians')
  async createGuardian(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    const b = parse(guardianSchema, body);

    const existing = await this.svc.db.guardian.findFirst({
      where: { schoolId, phone: b.phone },
    });

    if (existing) {
      throw new ConflictException(`A guardian with phone number ${b.phone} already exists in this school.`);
    }

    const guardian = await this.svc.db.guardian.create({
      data: {
        schoolId,
        name: b.name,
        phone: b.phone,
        whatsappPhone: b.whatsappPhone || undefined,
        email: b.email || undefined,
        preferredChannel: b.preferredChannel as CommunicationChannel,
        preferredLanguage: b.preferredLanguage,
        optOutSms: b.optOutSms,
        optOutWhatsapp: b.optOutWhatsapp,
      },
    });

    await this.svc.db.auditEvent.create({
      data: {
        schoolId,
        actorId: user.id,
        action: 'GUARDIAN_CREATED',
        target: guardian.id,
      },
    });

    return guardian;
  }

  /**
   * Get single guardian details with linked students and contact verification status
   */
  @Get('guardians/:guardianId')
  async getGuardian(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string
  ) {
    const access = await this.access(req, schoolId, false);
    parse(uuid, guardianId);
    const classroomIds = await this.teacherClassrooms(req, schoolId, access.memberships);

    const guardian = await this.svc.db.guardian.findFirst({
      where: {
        id: guardianId,
        schoolId,
        ...(classroomIds ? {
          students: {
            some: {
              active: true,
              student: { enrollments: { some: { schoolId, classroomId: { in: classroomIds }, status: 'active' } } },
            },
          },
        } : {}),
      },
      include: {
        students: {
          where: classroomIds ? {
            active: true,
            student: { enrollments: { some: { schoolId, classroomId: { in: classroomIds }, status: 'active' } } },
          } : undefined,
          include: {
            student: {
              select: {
                id: true,
                name: true,
                admissionNumber: true,
                gender: true,
                enrollments: {
                  where: { status: 'active' },
                  include: { classroom: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found in this school.');
    }

    return {
      ...guardian,
      students: guardian.students.map(sg => ({
        id: sg.id,
        studentId: sg.student.id,
        name: sg.student.name,
        admissionNumber: sg.student.admissionNumber,
        classroomName: sg.student.enrollments[0]?.classroom?.name ?? 'Unassigned',
        relationship: sg.relationship,
        isPrimary: sg.isPrimary,
        canReceiveReports: sg.canReceiveReports,
        canReceiveFinanceAlert: sg.canReceiveFinanceAlert,
        canReceiveAttendanceAlert: sg.canReceiveAttendanceAlert,
      })),
    };
  }

  /**
   * Update guardian information
   */
  @Patch('guardians/:guardianId')
  async updateGuardian(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, guardianId);
    const b = parse(guardianSchema.partial(), body);

    const existing = await this.svc.db.guardian.findFirst({
      where: { id: guardianId, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Guardian not found in this school.');
    }

    if (b.phone && b.phone !== existing.phone) {
      const duplicate = await this.svc.db.guardian.findFirst({
        where: { schoolId, phone: b.phone, NOT: { id: guardianId } },
      });
      if (duplicate) throw new ConflictException(`Phone number ${b.phone} is already registered to another guardian.`);
    }

    const updated = await this.svc.atomic(async tx => {
      // Invalidate outstanding verification challenges if contacts change
      if (b.phone && b.phone !== existing.phone) {
        await tx.contactVerification.deleteMany({
          where: { schoolId, guardianId, channel: 'SMS' },
        });
      }
      if (b.whatsappPhone !== undefined && b.whatsappPhone !== existing.whatsappPhone) {
        await tx.contactVerification.deleteMany({
          where: { schoolId, guardianId, channel: 'WHATSAPP' },
        });
      }
      if (b.email !== undefined && b.email !== existing.email) {
        await tx.contactVerification.deleteMany({
          where: { schoolId, guardianId, channel: 'EMAIL' },
        });
      }

      const res = await tx.guardian.update({
        where: { id_schoolId: { id: guardianId, schoolId } },
        data: {
          ...(b.name ? { name: b.name } : {}),
          ...(b.phone ? { phone: b.phone, phoneVerifiedAt: b.phone === existing.phone ? existing.phoneVerifiedAt : null } : {}),
          ...(b.whatsappPhone !== undefined ? { whatsappPhone: b.whatsappPhone || null, whatsappVerifiedAt: b.whatsappPhone === existing.whatsappPhone ? existing.whatsappVerifiedAt : null } : {}),
          ...(b.email !== undefined ? { email: b.email || null, emailVerifiedAt: b.email === existing.email ? existing.emailVerifiedAt : null } : {}),
          ...(b.preferredChannel ? { preferredChannel: b.preferredChannel as CommunicationChannel } : {}),
          ...(b.preferredLanguage ? { preferredLanguage: b.preferredLanguage } : {}),
          ...(b.optOutSms !== undefined ? { optOutSms: b.optOutSms } : {}),
          ...(b.optOutWhatsapp !== undefined ? { optOutWhatsapp: b.optOutWhatsapp } : {}),
        },
      });

      if (b.name || b.phone) {
        await tx.student.updateMany({
          where: { schoolId, guardians: { some: { schoolId, guardianId, active: true, isPrimary: true } } },
          data: { guardianName: res.name, guardianPhone: res.phone },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'GUARDIAN_UPDATED',
          target: guardianId,
        },
      });

      return res;
    });

    return updated;
  }

  /**
   * Link a guardian to a student
   */
  @Post('students/:studentId/guardians')
  async linkGuardianToStudent(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('studentId') studentId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, studentId);
    const b = parse(linkGuardianSchema, body);

    const student = await this.svc.db.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found in this school.');

    return this.svc.atomic(async tx => {
      // Transactional lock on the Student row to serialize concurrent link creation
      await tx.$queryRaw`SELECT id FROM "Student" WHERE id = ${studentId}::uuid AND "schoolId" = ${schoolId}::uuid FOR UPDATE`;

      let guardianId = b.guardianId;

      if (!guardianId && b.guardianData) {
        // Find existing guardian by phone or create new
        const existing = await tx.guardian.findFirst({
          where: { schoolId, phone: b.guardianData.phone },
        });

        if (existing) {
          guardianId = existing.id;
        } else {
          const created = await tx.guardian.create({
            data: {
              schoolId,
              name: b.guardianData.name,
              phone: b.guardianData.phone,
              whatsappPhone: b.guardianData.whatsappPhone || undefined,
              email: b.guardianData.email || undefined,
              preferredChannel: b.guardianData.preferredChannel as CommunicationChannel,
              preferredLanguage: b.guardianData.preferredLanguage,
            },
          });
          guardianId = created.id;
        }
      }

      if (!guardianId) throw new BadRequestException('Guardian identification failed.');

      // Verify guardian belongs to the same school
      const guardianRecord = await tx.guardian.findFirst({
        where: { id: guardianId, schoolId },
      });
      if (!guardianRecord) {
        throw new NotFoundException('Guardian not found in this school.');
      }

      // Check if already actively linked
      const existingLink = await tx.studentGuardian.findUnique({
        where: { studentId_guardianId: { studentId, guardianId } },
      });

      if (existingLink && existingLink.active) {
        throw new ConflictException('This guardian is already actively linked to the student.');
      }

      // If isPrimary is true, unset other primary guardians for this student
      if (b.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId, schoolId },
          data: { isPrimary: false },
        });
      }

      let link;
      if (existingLink) {
        // Reactivate historical relationship
        link = await tx.studentGuardian.update({
          where: { id_schoolId: { id: existingLink.id, schoolId } },
          data: {
            active: true,
            relationship: b.relationship,
            isPrimary: b.isPrimary,
            canReceiveReports: b.canReceiveReports,
            canReceiveFinanceAlert: b.canReceiveFinanceAlert,
            canReceiveAttendanceAlert: b.canReceiveAttendanceAlert,
          },
          include: { guardian: true },
        });
      } else {
        link = await tx.studentGuardian.create({
          data: {
            schoolId,
            studentId,
            guardianId,
            relationship: b.relationship,
            isPrimary: b.isPrimary,
            canReceiveReports: b.canReceiveReports,
            canReceiveFinanceAlert: b.canReceiveFinanceAlert,
            canReceiveAttendanceAlert: b.canReceiveAttendanceAlert,
            active: true,
          },
          include: { guardian: true },
        });
      }

      // Keep legacy student fields synced with primary or first guardian for backwards-compatibility
      if (b.isPrimary || !student.guardianName) {
        await tx.student.update({
          where: { id_schoolId: { id: studentId, schoolId } },
          data: {
            guardianName: link.guardian.name,
            guardianPhone: link.guardian.phone,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'STUDENT_GUARDIAN_LINKED',
          target: `${studentId}:${guardianId}`,
        },
      });

      return link;
    });
  }

  /**
   * Update student-guardian relationship and notification permissions
   */
  @Patch('students/:studentId/guardians/:guardianId')
  async updateStudentGuardianLink(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('studentId') studentId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, studentId);
    parse(uuid, guardianId);
    const b = parse(updateLinkSchema, body);

    const link = await this.svc.db.studentGuardian.findFirst({
      where: { schoolId, studentId, guardianId },
    });

    if (!link) throw new NotFoundException('Guardian is not linked to this student.');

    return this.svc.atomic(async tx => {
      // If activating or setting primary, serialize on student
      if (b.active === true || b.isPrimary === true) {
        await tx.$queryRaw`SELECT id FROM "Student" WHERE id = ${studentId}::uuid AND "schoolId" = ${schoolId}::uuid FOR UPDATE`;
      }

      if (b.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId, schoolId, NOT: { guardianId } },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.studentGuardian.update({
        where: { id_schoolId: { id: link.id, schoolId } },
        data: {
          ...(b.relationship ? { relationship: b.relationship } : {}),
          ...(b.isPrimary !== undefined ? { isPrimary: b.isPrimary } : {}),
          ...(b.canReceiveReports !== undefined ? { canReceiveReports: b.canReceiveReports } : {}),
          ...(b.canReceiveFinanceAlert !== undefined ? { canReceiveFinanceAlert: b.canReceiveFinanceAlert } : {}),
          ...(b.canReceiveAttendanceAlert !== undefined ? { canReceiveAttendanceAlert: b.canReceiveAttendanceAlert } : {}),
          ...(b.active !== undefined ? { active: b.active } : {}),
        },
        include: { guardian: true },
      });

      if (b.isPrimary && updated.active) {
        await tx.student.update({
          where: { id_schoolId: { id: studentId, schoolId } },
          data: {
            guardianName: updated.guardian.name,
            guardianPhone: updated.guardian.phone,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'STUDENT_GUARDIAN_PERMISSIONS_UPDATED',
          target: `${studentId}:${guardianId}`,
        },
      });

      return updated;
    });
  }

  /**
   * Unlink a guardian from a student (soft deactivation to preserve historical relationships)
   */
  @Delete('students/:studentId/guardians/:guardianId')
  async unlinkGuardianFromStudent(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('studentId') studentId: string,
    @Param('guardianId') guardianId: string
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, studentId);
    parse(uuid, guardianId);

    const link = await this.svc.db.studentGuardian.findFirst({
      where: { schoolId, studentId, guardianId },
    });

    if (!link) throw new NotFoundException('Guardian is not linked to this student.');

    await this.svc.atomic(async tx => {
      // Soft-deactivate to preserve historical communication logs, report links, and audit history
      await tx.studentGuardian.update({
        where: { id_schoolId: { id: link.id, schoolId } },
        data: { active: false, isPrimary: false },
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'STUDENT_GUARDIAN_UNLINKED',
          target: `${studentId}:${guardianId}`,
        },
      });
    });

    return { message: 'Guardian unlinked successfully (relationship archived).' };
  }

  /**
   * Request contact verification code
   */
  @Post('guardians/:guardianId/verification/request')
  async requestVerification(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, guardianId);
    const b = parse(z.object({ channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']) }), body);

    return this.comms.requestVerification(schoolId, guardianId, b.channel as CommunicationChannel, user.id);
  }

  /**
   * Confirm verification code
   */
  @Post('guardians/:guardianId/verification/confirm')
  async confirmVerification(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.access(req, schoolId, true);
    parse(uuid, guardianId);
    const b = parse(z.object({
      channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
      code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
    }), body);

    return this.comms.confirmVerification(schoolId, guardianId, b.channel as CommunicationChannel, b.code, user.id);
  }

  /**
   * View delivery log history for this guardian
   */
  @Get('guardians/:guardianId/history')
  async guardianCommunicationHistory(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('guardianId') guardianId: string,
    @Query() query: unknown
  ) {
    const access = await this.access(req, schoolId, false);
    parse(uuid, guardianId);
    const b = parse(z.object(paging).strict(), query);
    const classroomIds = await this.teacherClassrooms(req, schoolId, access.memberships);
    const studentIds = classroomIds
      ? (await this.svc.db.enrollment.findMany({
        where: { schoolId, classroomId: { in: classroomIds }, status: 'active' },
        select: { studentId: true },
        distinct: ['studentId'],
      })).map(enrollment => enrollment.studentId)
      : undefined;

    const where: Prisma.CommunicationLogWhereInput = {
      schoolId,
      guardianId,
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
    };

    const [total, items] = await Promise.all([
      this.svc.db.communicationLog.count({ where }),
      this.svc.db.communicationLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (b.page - 1) * b.pageSize,
        take: b.pageSize,
      }),
    ]);

    return { items, total, page: b.page, pageSize: b.pageSize };
  }
}
