import { 
  BadRequestException, 
  Body, 
  ConflictException, 
  Controller, 
  ForbiddenException, 
  Get, 
  NotFoundException, 
  Param, 
  Post, 
  Query, 
  Req 
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';

const uuid = z.string().uuid();
const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  return result.data;
};

const rosterQuerySchema = z.object({
  classroomId: uuid.optional(),
  yearId: uuid.optional(),
  status: z.enum(['pending', 'confirmed', 'flagged', 'all']).default('all'),
});

const flagIssueSchema = z.object({
  reason: z.string().trim().min(3).max(300),
  notes: z.string().trim().max(1000).default(''),
  issueType: z.string().trim().min(2).max(50).default('STUDENT_DATA_DISCREPANCY'),
});

const resolveIssueSchema = z.object({
  resolutionNotes: z.string().trim().min(3).max(1000),
  action: z.enum(['reconfirm', 'pending']).default('reconfirm'),
});

@Controller('api/v1/schools/:schoolId/academics/roster')
export class RosterConfirmationController {
  constructor(private readonly svc: PlatformService) {}

  /**
   * Retrieve assigned class roster with confirmation status
   */
  @Get()
  async getRoster(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Query() query: unknown
  ) {
    const { user, memberships } = await this.svc.authorize(req, parse(uuid, schoolId), [
      'HEADMASTER', 
      'ACADEMIC', 
      'TEACHER', 
      'REGISTRAR'
    ]);
    const member = memberships[0];
    const q = parse(rosterQuerySchema, query);

    // Determine authorized classrooms
    let targetClassroomIds: string[] = [];

    if (member.role === 'TEACHER') {
      const assignments = await this.svc.db.teachingAssignment.findMany({
        where: { schoolId, membershipId: member.id },
        select: { classroomId: true },
      });
      const assignedClassIds = Array.from(new Set(assignments.map(a => a.classroomId)));
      if (assignedClassIds.length === 0) {
        return { items: [], count: 0 };
      }

      if (q.classroomId) {
        if (!assignedClassIds.includes(q.classroomId)) {
          throw new ForbiddenException('You are not assigned to this classroom.');
        }
        targetClassroomIds = [q.classroomId];
      } else {
        targetClassroomIds = assignedClassIds;
      }
    } else {
      if (q.classroomId) {
        targetClassroomIds = [q.classroomId];
      }
    }

    // Query active enrollments
    const enrollments = await this.svc.db.enrollment.findMany({
      where: {
        schoolId,
        status: 'active',
        ...(targetClassroomIds.length > 0 ? { classroomId: { in: targetClassroomIds } } : {}),
        ...(q.yearId ? { classroom: { yearId: q.yearId } } : {}),
      },
      include: {
        student: { select: { id: true, name: true, admissionNumber: true, gender: true, dateOfBirth: true } },
        classroom: { select: { id: true, name: true, yearId: true, year: { select: { name: true } } } },
        rosterConfirmations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { classroom: { name: 'asc' } },
        { student: { name: 'asc' } },
      ],
    });

    const items = enrollments.map(e => {
      const confirmation = e.rosterConfirmations[0];
      return {
        enrollmentId: e.id,
        studentId: e.student.id,
        name: e.student.name,
        admissionNumber: e.student.admissionNumber,
        gender: e.student.gender,
        dateOfBirth: e.student.dateOfBirth,
        classroomId: e.classroom.id,
        classroomName: e.classroom.name,
        academicYearId: e.classroom.yearId,
        academicYearName: e.classroom.year?.name,
        status: confirmation?.status || 'pending',
        notes: confirmation?.notes || '',
        flagReason: confirmation?.flagReason || null,
        flaggedAt: confirmation?.flaggedAt || null,
        confirmedAt: confirmation?.confirmedAt || null,
        resolvedAt: confirmation?.resolvedAt || null,
        confirmationId: confirmation?.id || null,
      };
    });

    const filtered = q.status === 'all' 
      ? items 
      : items.filter(item => item.status === q.status);

    return { items: filtered, count: filtered.length };
  }

  /**
   * Confirm an individual student on the roster
   */
  @Post(':enrollmentId/confirm')
  async confirmStudent(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() body: unknown
  ) {
    const { user, memberships } = await this.svc.authorize(req, parse(uuid, schoolId), [
      'HEADMASTER', 
      'ACADEMIC', 
      'TEACHER'
    ]);
    const member = memberships[0];
    parse(uuid, enrollmentId);
    const b = parse(z.object({ notes: z.string().trim().max(1000).optional() }), body);

    const enrollment = await this.svc.db.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: { classroom: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found in this school.');

    // If teacher, verify assignment to classroom
    if (member?.role === 'TEACHER') {
      const assignment = await this.svc.db.teachingAssignment.findFirst({
        where: { schoolId, membershipId: member.id, classroomId: enrollment.classroomId },
      });
      if (!assignment) {
        throw new ForbiddenException('You must be assigned to this classroom to confirm students.');
      }
    }

    return this.svc.atomic(async tx => {
      const now = new Date();
      const existing = await tx.rosterConfirmation.findFirst({
        where: { enrollmentId, schoolId, teacherMembershipId: member?.id },
      });

      let confirmation;
      if (existing) {
        confirmation = await tx.rosterConfirmation.update({
          where: { id_schoolId: { id: existing.id, schoolId } },
          data: {
            status: 'confirmed',
            confirmedAt: now,
            notes: b.notes || existing.notes,
            resolvedAt: existing.status === 'flagged' ? now : existing.resolvedAt,
            resolvedBy: existing.status === 'flagged' ? user.id : existing.resolvedBy,
          },
        });
      } else {
        confirmation = await tx.rosterConfirmation.create({
          data: {
            schoolId,
            enrollmentId,
            studentId: enrollment.studentId,
            classroomId: enrollment.classroomId,
            yearId: enrollment.classroom.yearId,
            teacherMembershipId: member?.id || user.id,
            status: 'confirmed',
            confirmedAt: now,
            notes: b.notes || '',
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'ROSTER_STUDENT_CONFIRMED',
          target: `${enrollment.studentId}:${enrollment.classroomId}`,
        },
      });

      return {
        message: 'Student roster confirmation recorded.',
        confirmation,
      };
    });
  }

  /**
   * Flag an issue with a student on the roster
   */
  @Post(':enrollmentId/flag')
  async flagStudentIssue(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() body: unknown
  ) {
    const { user, memberships } = await this.svc.authorize(req, parse(uuid, schoolId), [
      'HEADMASTER', 
      'ACADEMIC', 
      'TEACHER'
    ]);
    const member = memberships[0];
    parse(uuid, enrollmentId);
    const b = parse(flagIssueSchema, body);

    const enrollment = await this.svc.db.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: { classroom: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found in this school.');

    if (member?.role === 'TEACHER') {
      const assignment = await this.svc.db.teachingAssignment.findFirst({
        where: { schoolId, membershipId: member.id, classroomId: enrollment.classroomId },
      });
      if (!assignment) {
        throw new ForbiddenException('You must be assigned to this classroom to flag roster issues.');
      }
    }

    return this.svc.atomic(async tx => {
      const now = new Date();
      const existing = await tx.rosterConfirmation.findFirst({
        where: { enrollmentId, schoolId, teacherMembershipId: member?.id },
      });

      let confirmation;
      if (existing) {
        confirmation = await tx.rosterConfirmation.update({
          where: { id_schoolId: { id: existing.id, schoolId } },
          data: {
            status: 'flagged',
            flagReason: b.reason,
            flaggedAt: now,
            notes: b.notes || existing.notes,
          },
        });
      } else {
        confirmation = await tx.rosterConfirmation.create({
          data: {
            schoolId,
            enrollmentId,
            studentId: enrollment.studentId,
            classroomId: enrollment.classroomId,
            yearId: enrollment.classroom.yearId,
            teacherMembershipId: member?.id || user.id,
            status: 'flagged',
            flagReason: b.reason,
            flaggedAt: now,
            notes: b.notes || '',
          },
        });
      }

      // Link to RosterIssue if a teaching assignment exists
      const wholeAssignment = await tx.teachingAssignment.findFirst({
        where: { schoolId, classroomId: enrollment.classroomId },
      });
      if (wholeAssignment) {
        await tx.rosterIssue.create({
          data: {
            schoolId,
            assignmentId: wholeAssignment.id,
            studentId: enrollment.studentId,
            reportedBy: user.id,
            issueType: b.issueType,
            description: b.reason,
            status: 'open',
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'ROSTER_STUDENT_FLAGGED',
          target: `${enrollment.studentId}:${b.reason}`,
        },
      });

      return {
        message: 'Roster issue flagged and forwarded for administrative resolution.',
        confirmation,
      };
    });
  }

  /**
   * Registrar / Headmaster resolution of flagged roster issue
   */
  @Post(':enrollmentId/resolve')
  async resolveRosterIssue(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() body: unknown
  ) {
    const { user } = await this.svc.authorize(req, parse(uuid, schoolId), [
      'HEADMASTER', 
      'REGISTRAR'
    ]);
    parse(uuid, enrollmentId);
    const b = parse(resolveIssueSchema, body);

    const confirmation = await this.svc.db.rosterConfirmation.findFirst({
      where: { enrollmentId, schoolId, status: 'flagged' },
    });
    if (!confirmation) {
      throw new NotFoundException('No flagged roster confirmation found for this enrollment.');
    }

    return this.svc.atomic(async tx => {
      const now = new Date();
      const updated = await tx.rosterConfirmation.update({
        where: { id_schoolId: { id: confirmation.id, schoolId } },
        data: {
          status: b.action === 'reconfirm' ? 'confirmed' : 'pending',
          resolvedAt: now,
          resolvedBy: user.id,
          confirmedAt: b.action === 'reconfirm' ? now : null,
          notes: `${confirmation.notes ? confirmation.notes + ' | ' : ''}Resolution: ${b.resolutionNotes}`,
        },
      });

      // Update related RosterIssue records if present
      await tx.rosterIssue.updateMany({
        where: { schoolId, studentId: confirmation.studentId, status: 'open' },
        data: {
          status: 'resolved',
          resolution: b.resolutionNotes,
          resolvedBy: user.id,
          resolvedAt: now,
        },
      });

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: user.id,
          action: 'ROSTER_ISSUE_RESOLVED',
          target: `${confirmation.studentId}:${b.action}`,
        },
      });

      return {
        message: `Roster issue resolved with status ${updated.status}.`,
        confirmation: updated,
      };
    });
  }

  /**
   * Headmaster / Academic Dean oversight summary
   */
  @Get('oversight')
  async getRosterOversight(
    @Req() req: Request,
    @Param('schoolId') schoolId: string,
    @Query('yearId') yearIdQuery: unknown
  ) {
    await this.svc.authorize(req, parse(uuid, schoolId), ['HEADMASTER', 'ACADEMIC', 'REGISTRAR']);
    const yearId = parse(uuid, yearIdQuery);

    const classrooms = await this.svc.db.classroom.findMany({
      where: { schoolId, yearId },
      include: {
        assignments: {
          where: { subjectId: null },
          include: { membership: { include: { user: { select: { name: true } } } } },
          take: 1,
        },
        enrollments: {
          where: { status: 'active' },
          include: {
            rosterConfirmations: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const summary = classrooms.map(c => {
      const total = c.enrollments.length;
      let confirmed = 0;
      let flagged = 0;
      let pending = 0;

      for (const e of c.enrollments) {
        const status = e.rosterConfirmations[0]?.status || 'pending';
        if (status === 'confirmed') confirmed++;
        else if (status === 'flagged') flagged++;
        else pending++;
      }

      return {
        classroomId: c.id,
        classroomName: c.name,
        classTeacherName: c.assignments[0]?.membership?.user?.name || 'Unassigned',
        totalStudents: total,
        confirmedCount: confirmed,
        flaggedCount: flagged,
        pendingCount: pending,
        completionPercentage: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      };
    });

    return { yearId, classrooms: summary };
  }
}
