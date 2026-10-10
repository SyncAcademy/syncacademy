import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { parse, uuid, studentProfile, profileData, subjectIds, setSubjects, registryEvent, addClassSubjectsToEnrollments, defaultSubjectIds, isClassTeacher } from './registry-support';

const managers: Role[] = ['HEADMASTER', 'REGISTRAR'];
const academics: Role[] = ['HEADMASTER', 'ACADEMIC'];
const staff: Role[] = [...managers, 'ACADEMIC', 'TEACHER'];
const key = (req: Request) => parse(uuid, req.header('Idempotency-Key'));
const importRow = z.object({ row: z.number().int().min(2), values: z.record(z.string().max(1000)).refine(v => Object.keys(v).length <= 15) });
type CheckedRow = { row: number; values: Record<string, string>; errors: string[]; data?: any };

@Controller('api/v1/schools/:schoolId/registry')
export class RegistryWorkflowsController {
  constructor(private readonly svc: PlatformService) {}
  private access(req: Request, schoolId: string, roles = managers) { return this.svc.authorize(req, parse(uuid, schoolId), roles); }
  private async openYear(tx: Prisma.TransactionClient, schoolId: string, yearId: string) {
    if (!await tx.academicYear.findFirst({ where: { id: yearId, schoolId } })) throw new BadRequestException('Choose an academic year in this school.');
  }

  @Get('subjects') async subjects(@Req() req: Request, @Param('schoolId') schoolId: string, @Query('yearId') yearId: string) {
    await this.access(req, schoolId, staff); parse(uuid, yearId);
    const [subjects, offerings] = await Promise.all([
      this.svc.db.subject.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
      this.svc.db.classSubject.findMany({ where: { schoolId, classroom: { yearId } }, include: { subject: true } }),
    ]);
    return { subjects, offerings };
  }
  @Post('subjects') async addSubject(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, academics);
    const b = parse(z.object({ name: z.string().trim().min(2).max(100), code: z.string().trim().min(1).max(20).transform(v => v.toUpperCase()) }).strict(), body);
    return this.svc.idempotent(`${user.id}:subject:${schoolId}`, key(req), b, async tx => {
      if (await tx.subject.findFirst({ where: { schoolId, OR: [{ name: { equals: b.name, mode: 'insensitive' } }, { code: b.code }] } })) throw new ConflictException('This subject already exists.');
      const subject = await tx.subject.create({ data: { schoolId, ...b } });
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'SUBJECT_CREATED', target: subject.id } }); return subject;
    });
  }
  @Patch('subjects/:subjectId') async editSubject(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('subjectId') subjectId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, academics);
    parse(uuid, subjectId);
    const b = parse(z.object({ name: z.string().trim().min(2).max(100), code: z.string().trim().min(1).max(20).transform(v => v.toUpperCase()) }).strict(), body);
    return this.svc.idempotent(`${user.id}:edit-subject:${schoolId}:${subjectId}`, key(req), b, async tx => {
      const current = await tx.subject.findFirst({ where: { id: subjectId, schoolId } });
      if (!current) throw new BadRequestException('Subject not found in this school.');
      if (await tx.subject.findFirst({ where: { schoolId, id: { not: subjectId }, OR: [{ name: { equals: b.name, mode: 'insensitive' } }, { code: { equals: b.code, mode: 'insensitive' } }] } })) throw new ConflictException('Another subject already uses this name or code.');
      if (current.name === b.name && current.code === b.code) return current;
      const subject = await tx.subject.update({ where: { id: subjectId }, data: b });
      const workspaces = await tx.academicWorkspace.findMany({ where: { schoolId } });
      for (const workspace of workspaces) {
        const data = workspace.data as any;
        let changed = false;
        const submissions = (data.submissions ?? []).map((row: any) => {
          if (row.subjectId !== subjectId) return row;
          changed = true;
          return { ...row, subjectName: b.name, subjectCode: b.code };
        });
        const slots = (data.slots ?? []).map((row: any) => row.subject === current.name ? (changed = true, { ...row, subject: b.name }) : row);
        const support = (data.support ?? []).map((row: any) => row.subject === current.name ? (changed = true, { ...row, subject: b.name }) : row);
        const reports = (data.reports ?? []).map((row: any) => ({ ...row, results: (row.results ?? []).map((result: any) => result.subject === current.name ? (changed = true, { ...result, subject: b.name }) : result) }));
        if (changed) await tx.academicWorkspace.update({ where: { yearId: workspace.yearId }, data: { data: { ...data, submissions, slots, support, reports }, revision: { increment: 1 } } });
      }
      await tx.auditEvent.create({ data: { schoolId, actorId: user.id, action: 'SUBJECT_UPDATED', target: subject.id } });
      return subject;
    });
  }
  @Post('class-subjects') async offerSubjects(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, academics);
    const b = parse(z.object({ classroomId: uuid, subjectIds }).strict(), body);
    return this.svc.idempotent(`${user.id}:offer-subjects:${schoolId}`, key(req), b, async tx => {
      const c = await tx.classroom.findFirst({ where: { id: b.classroomId, schoolId } });
      if (!c) throw new BadRequestException('Choose a class in an open year.');
      if (await tx.subject.count({ where: { schoolId, id: { in: b.subjectIds } } }) !== b.subjectIds.length) throw new BadRequestException('Choose subjects in this school.');
      const removed = { notIn: b.subjectIds };
      if (await tx.enrollmentSubject.count({ where: { schoolId, enrollment: { classroomId: c.id }, subjectId: removed } }) || await tx.teachingAssignment.count({ where: { schoolId, classroomId: c.id, subjectId: removed } })) throw new ConflictException('A subject in use cannot be removed. Update student and teacher assignments first.');
      const current = await tx.classSubject.findMany({ where: { schoolId, classroomId: c.id }, select: { subjectId: true } });
      const currentIds = new Set(current.map(row => row.subjectId));
      const newlyOffered = b.subjectIds.filter(subjectId => !currentIds.has(subjectId));
      await tx.classSubject.deleteMany({ where: { schoolId, classroomId: c.id, subjectId: removed } });
      await tx.classSubject.createMany({ data: b.subjectIds.map(subjectId => ({ schoolId, classroomId: c.id, subjectId })), skipDuplicates: true });
      await addClassSubjectsToEnrollments(tx, schoolId, c.id, newlyOffered);
      await registryEvent(tx, schoolId, user.id, c.yearId, 'subjects', `Subject offerings updated for ${c.name}.`);
      return { message: 'Class subjects saved.' };
    });
  }
  @Patch('enrollments/:enrollmentId/subjects') async enrollSubjects(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('enrollmentId') enrollmentId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, staff); parse(uuid, enrollmentId);
    const b = parse(z.object({ subjectIds, version: z.number().int().positive() }).strict(), body);
    return this.svc.idempotent(`${user.id}:enrollment-subjects:${schoolId}:${enrollmentId}`, key(req), b, async tx => {
      const e = await tx.enrollment.findFirst({ where: { id: enrollmentId, schoolId, version: b.version, status: 'active' }, include: { classroom: true, student: true } });
      if (!e) throw new ConflictException('Enrollment changed or its academic year is closed. Refresh and try again.');
      if (req.session.selectedRole === 'TEACHER' && !await isClassTeacher(tx, schoolId, e.classroom.yearId, e.classroomId, user.id)) throw new ForbiddenException('Only the assigned class teacher can edit these student subjects.');
      await setSubjects(tx, schoolId, e.id, e.classroomId, b.subjectIds);
      await tx.enrollment.update({ where: { id: e.id }, data: { version: { increment: 1 } } });
      await registryEvent(tx, schoolId, user.id, e.classroom.yearId, 'subjects', `${e.student.name}: subject enrollment updated.`, e.studentId);
      return { message: 'Student subjects saved.' };
    });
  }

  private async checkRows(tx: Prisma.TransactionClient, schoolId: string, yearId: string, rows: { row: number; values: Record<string, string> }[]): Promise<CheckedRow[]> {
    const classes = await tx.classroom.findMany({ where: { schoolId, yearId }, include: { subjects: { include: { subject: true } } } });
    const existing = new Set((await tx.student.findMany({ where: { schoolId, admissionNumber: { in: rows.map(r => r.values['admissionNumber']?.trim() || '') } }, select: { admissionNumber: true } })).map(s => s.admissionNumber));
    const counts = new Map<string, number>();
    for (const r of rows) { const n = r.values['admissionNumber']?.trim() || ''; counts.set(n, (counts.get(n) || 0) + 1); }
    return rows.map(r => {
      const v = r.values; const errors: string[] = [];
      let c = v['classroomId'] ? classes.find(c => c.id === v['classroomId']) : undefined;
      if (!v['classroomId'] && v['classroom']?.trim()) {
        const className = v['classroom'].trim().toLowerCase();
        const exactMatches = classes.filter(candidate => candidate.name.toLowerCase() === className);
        if (exactMatches.length === 1) c = exactMatches[0];
        else if (exactMatches.length === 0) {
          const compactName = className.replace(/\s+/g, '');
          const spacingMatches = classes.filter(candidate => candidate.name.toLowerCase().replace(/\s+/g, '') === compactName);
          if (spacingMatches.length === 1) c = spacingMatches[0];
        }
      }
      if (!c) errors.push('Class is missing or does not match this academic year.');
      const normalized: Record<string, any> = {};
      for (const field of Object.keys(studentProfile)) if (v[field] !== undefined) normalized[field] = v[field].trim();
      normalized['gender'] = ({ female: 'F', male: 'M', f: 'F', m: 'M' } as Record<string, string>)[(v['gender'] || '').trim().toLowerCase()] || v['gender'] || null;
      for (const date of ['dateOfBirth', 'admissionDate']) normalized[date] = v[date] || null;
      const profile = z.object(studentProfile).safeParse(normalized);
      if (!profile.success) errors.push(...profile.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
      const number = v['admissionNumber']?.trim() || '';
      if (existing.has(number)) errors.push('Admission number already exists in this school.');
      if ((counts.get(number) || 0) > 1) errors.push('Admission number is repeated in this file.');
      const ids: string[] = [];
      for (const token of (v['subjects'] || '').split(';').map(s => s.trim()).filter(Boolean)) {
        const offered = c?.subjects.find(o => o.subject.code.toLowerCase() === token.toLowerCase() || o.subject.name.toLowerCase() === token.toLowerCase());
        if (!offered) errors.push(`Subject '${token}' is not offered by the selected class.`); else if (!ids.includes(offered.subjectId)) ids.push(offered.subjectId);
      }
      if (profile.success && profile.data.dateOfBirth && profile.data.admissionDate && profile.data.admissionDate < profile.data.dateOfBirth) errors.push('Admission date is before birth date.');
      return { ...r, errors, ...(profile.success && c && !errors.length ? { data: { ...profile.data, classroomId: c.id, subjectIds: ids } } : {}) };
    });
  }
  @Post('imports/preview') async preview(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId);
    const b = parse(z.object({ yearId: uuid, filename: z.string().max(200), rows: z.array(importRow).min(1).max(5000).refine(rows => new Set(rows.map(r => r.row)).size === rows.length) }).strict(), body);
    await this.svc.rate(`registry-import:${schoolId}:${user.id}`, 30, 3600);
    return this.svc.idempotent(`${user.id}:import-preview:${schoolId}`, key(req), b, async tx => {
      await this.openYear(tx, schoolId, b.yearId);
      await tx.studentImport.deleteMany({ where: { schoolId, actorId: user.id, cursor: 0, expiresAt: { lt: new Date() } } });
      const checked = await this.checkRows(tx, schoolId, b.yearId, b.rows);
      const job = await tx.studentImport.create({ data: { schoolId, actorId: user.id, yearId: b.yearId, filename: b.filename, rows: JSON.parse(JSON.stringify(checked)), results: [], expiresAt: new Date(Date.now() + 86400000) } });
      return { id: job.id, total: checked.length, valid: checked.filter(r => !r.errors.length).length, rows: checked.map(({ data, ...r }) => r), expiresAt: job.expiresAt };
    });
  }
  @Get('imports') async importHistory(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    await this.access(req, schoolId);
    const q = parse(z.object({ yearId: uuid, page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25), q: z.string().trim().max(200).default('') }).strict(), query);
    const where = { schoolId, yearId: q.yearId, ...(q.q ? { filename: { contains: q.q, mode: 'insensitive' as const } } : {}) };
    const [jobs, total] = await this.svc.db.$transaction([
      this.svc.db.studentImport.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.svc.db.studentImport.count({ where }),
    ]);
    return { items: jobs.map(job => ({ id: job.id, filename: job.filename, createdAt: job.createdAt,
      total: (job.rows as any[]).length, processed: job.cursor,
      imported: (job.results as any[]).filter(r => r.status === 'imported').length,
      failed: (job.results as any[]).filter(r => r.status === 'failed').length,
      expired: job.expiresAt <= new Date() })), total, page: q.page, pageSize: q.pageSize };
  }
  @Get('imports/:jobId') async importStatus(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('jobId') jobId: string) {
    const { user } = await this.access(req, schoolId); parse(uuid, jobId);
    const job = await this.svc.db.studentImport.findFirst({ where: { id: jobId, schoolId, OR: [{ expiresAt: { gt: new Date() } }, { cursor: { gt: 0 } }] } });
    if (!job) throw new BadRequestException('Import preview expired or is unavailable. Upload the file again.');
    return { id: job.id, cursor: job.cursor, total: (job.rows as any[]).filter(r => !r.errors.length).length, results: job.results };
  }
  @Delete('imports/:jobId') async deleteImport(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('jobId') jobId: string) {
    const { user } = await this.access(req, schoolId); parse(uuid, jobId);
    return this.svc.atomic(async tx => {
      const job = await tx.studentImport.findFirst({ where: { id: jobId, schoolId } });
      if (!job) throw new BadRequestException('Import record not found.');
      const valid = (job.rows as unknown as CheckedRow[]).filter(row => !row.errors.length).length;
      if (job.cursor > 0 && job.cursor < valid) throw new ConflictException('Finish the import before removing its record.');
      await tx.studentImport.delete({ where: { id: jobId } });
      await tx.auditEvent.create({ data: { actorId: user.id, schoolId, action: 'STUDENT_IMPORT_RECORD_REMOVED', target: `${jobId}: ${job.filename}; imported students retained` } });
      return { message: 'Import record removed. Imported students remain in the school.' };
    });
  }
  @Post('imports/:jobId/commit') async commit(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('jobId') jobId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId); parse(uuid, jobId);
    const b = parse(z.object({ cursor: z.number().int().min(0) }).strict(), body);
    return this.svc.idempotent(`${user.id}:import-commit:${schoolId}:${jobId}`, key(req), b, async tx => {
      const job = await tx.studentImport.findFirst({ where: { id: jobId, schoolId, actorId: user.id, expiresAt: { gt: new Date() } } });
      if (!job) throw new BadRequestException('Import preview expired or is unavailable.');
      if (job.cursor !== b.cursor) throw new ConflictException('Import progress changed. Refresh its status before continuing.');
      await this.openYear(tx, schoolId, job.yearId);
      const valid = (job.rows as unknown as CheckedRow[]).filter(r => !r.errors.length);
      const chunk = valid.slice(job.cursor, job.cursor + 50);
      const checked = await this.checkRows(tx, schoolId, job.yearId, chunk);
      const results = job.results as any[];
      for (const r of checked) {
        if (r.errors.length) { results.push({ row: r.row, status: 'failed', errors: r.errors }); continue; }
        const { classroomId, subjectIds: ids, ...p } = r.data;
        const student = await tx.student.create({ data: { schoolId, ...profileData(p) } });
        const enrollment = await tx.enrollment.create({ data: { schoolId, studentId: student.id, classroomId } });
        await setSubjects(tx, schoolId, enrollment.id, classroomId, await defaultSubjectIds(tx, schoolId, classroomId, ids));
        await registryEvent(tx, schoolId, user.id, job.yearId, 'import', `${student.name} registered from ${job.filename}, row ${r.row}.`, student.id);
        results.push({ row: r.row, status: 'imported', studentId: student.id });
      }
      const cursor = job.cursor + chunk.length;
      await tx.studentImport.update({ where: { id: job.id }, data: { cursor, results } });
      return { id: job.id, cursor, total: valid.length, results, done: cursor === valid.length };
    });
  }

  @Get('issues') async issues(@Req() req: Request, @Param('schoolId') schoolId: string, @Query() query: unknown) {
    const { user, memberships } = await this.access(req, schoolId, staff);
    const b = parse(z.object({ yearId: uuid, status: z.enum(['open', 'resolved']).optional(), assignmentId: uuid.optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) }).strict(), query);
    const manager = user.platformAdmin || memberships.some(m => ['HEADMASTER', 'REGISTRAR', 'ACADEMIC'].includes(m.role));
    const scopes = !manager ? await this.svc.db.teachingAssignment.findMany({ where: {
      schoolId, ...(b.assignmentId ? { id: b.assignmentId } : {}), membership: { userId: user.id, active: true, role: 'TEACHER' }, classroom: { yearId: b.yearId },
    }, select: { classroomId: true, subjectId: true } }) : [];
    const where: Prisma.RosterIssueWhereInput = { schoolId, ...(b.status ? { status: b.status } : {}),
      ...(manager && b.assignmentId ? { assignmentId: b.assignmentId } : {}),
      assignment: { classroom: { yearId: b.yearId }, ...(!manager ? { OR: scopes.map(a => ({ classroomId: a.classroomId, ...(a.subjectId ? { subjectId: a.subjectId } : {}) })) } : {}) } };
    const [total, items] = await this.svc.db.$transaction([this.svc.db.rosterIssue.count({ where }), this.svc.db.rosterIssue.findMany({ where, include: { assignment: { include: { classroom: true, subject: true, membership: { select: { user: { select: { name: true } } } } } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (b.page - 1) * b.pageSize, take: b.pageSize })]);
    return { total, items };
  }
  @Post('issues') async report(@Req() req: Request, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, ['TEACHER']);
    const b = parse(z.object({ assignmentId: uuid, studentId: uuid.nullable().default(null), issueType: z.enum(['missing_student', 'wrong_class', 'wrong_subject', 'other']), description: z.string().trim().min(10).max(2000) }).strict(), body);
    return this.svc.idempotent(`${user.id}:roster-issue:${schoolId}`, key(req), b, async tx => {
      const a = await tx.teachingAssignment.findFirst({ where: { id: b.assignmentId, schoolId, membership: { userId: user.id, active: true } }, include: { classroom: true } });
      if (!a) throw new BadRequestException('Choose your assignment in this school.');
      if (b.studentId && !await tx.enrollment.findFirst({ where: { schoolId, studentId: b.studentId, classroomId: a.classroomId, status: 'active', ...(a.subjectId ? { subjects: { some: { subjectId: a.subjectId } } } : {}) } })) throw new BadRequestException('Select a student on this roster, or describe a missing student without selecting one.');
      const issue = await tx.rosterIssue.create({ data: { ...b, schoolId, reportedBy: user.id } });
      await tx.teachingAssignment.update({ where: { id: a.id }, data: { confirmedAt: null } });
      await registryEvent(tx, schoolId, user.id, a.classroom.yearId, 'roster_issue', `Roster correction requested for ${a.classroom.name}.`, b.studentId || undefined);
      return issue;
    });
  }
  @Patch('issues/:issueId') async resolve(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('issueId') issueId: string, @Body() body: unknown) {
    const { user } = await this.access(req, schoolId, [...managers, 'ACADEMIC']); parse(uuid, issueId);
    const b = parse(z.object({ version: z.number().int().positive(), status: z.enum(['open', 'resolved']), resolution: z.string().trim().min(10).max(2000) }).strict(), body);
    return this.svc.idempotent(`${user.id}:resolve-issue:${schoolId}:${issueId}`, key(req), b, async tx => {
      const issue = await tx.rosterIssue.findFirst({ where: { id: issueId, schoolId, version: b.version }, include: { assignment: { include: { classroom: { include: { year: true } } } } } });
      if (!issue) throw new ConflictException('Issue changed. Refresh before saving.');
      const updated = await tx.rosterIssue.update({ where: { id: issue.id }, data: { status: b.status, resolution: b.resolution, resolvedBy: b.status === 'resolved' ? user.id : null, resolvedAt: b.status === 'resolved' ? new Date() : null, version: { increment: 1 } } });
      await registryEvent(tx, schoolId, user.id, issue.assignment.classroom.yearId, 'roster_issue', `Roster issue ${b.status}: ${b.resolution}`, issue.studentId || undefined);
      return updated;
    });
  }
  @Post('assignments/:assignmentId/confirm') async confirm(@Req() req: Request, @Param('schoolId') schoolId: string, @Param('assignmentId') assignmentId: string) {
    const { user } = await this.access(req, schoolId, ['TEACHER']); parse(uuid, assignmentId);
    return this.svc.idempotent(`${user.id}:roster-confirm:${schoolId}:${assignmentId}`, key(req), {}, async tx => {
      const a = await tx.teachingAssignment.findFirst({ where: { id: assignmentId, schoolId, membership: { userId: user.id, active: true } }, include: { classroom: true } });
      if (!a) throw new BadRequestException('Choose your assignment in this school.');
      if (await tx.rosterIssue.count({ where: { schoolId, status: 'open', assignment: { classroomId: a.classroomId, ...(a.subjectId ? { subjectId: a.subjectId } : {}) } } })) throw new ConflictException('Resolve outstanding roster issues before confirming.');
      await tx.teachingAssignment.update({ where: { id: a.id }, data: { confirmedAt: new Date() } });
      await registryEvent(tx, schoolId, user.id, a.classroom.yearId, 'roster_confirmation', `Student roster confirmed for ${a.classroom.name}.`);
      return { message: 'Student roster confirmed.' };
    });
  }
}
