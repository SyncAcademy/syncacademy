import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const uuid = z.string().uuid();
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v && v <= new Date().toISOString().slice(0, 10), 'Use a valid date, no later than today.');
export const phone = z.string().trim().max(25).transform(v => v.replace(/[ ()-]/g, '')).refine(v => !v || /^\+?[0-9]{7,15}$/.test(v), 'Use 7–15 digits, optionally starting with +.');
export const contactFields = { admissionDate: dateOnly.nullable().optional(), ownPhone: phone.default(''), guardianName: z.string().trim().max(150).default(''), guardianPhone: phone.default('') };
export const studentProfile = { name: z.string().trim().min(2).max(150), admissionNumber: z.string().trim().min(1).max(40), gender: z.enum(['M', 'F']).nullable().optional(), dateOfBirth: dateOnly.nullable().optional(), address: z.string().trim().max(500).default(''), ...contactFields };
export const subjectIds = z.array(uuid).max(50).refine(v => new Set(v).size === v.length, 'Subjects must be unique.');
export const parse = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> => { const result = schema.safeParse(input); if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')); return result.data; };
export const profileData = (p: z.output<z.ZodObject<typeof studentProfile>>) => ({ ...p, dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null, admissionDate: p.admissionDate ? new Date(p.admissionDate) : null });

export async function validateSubjects(tx: Prisma.TransactionClient, schoolId: string, classroomId: string, ids: string[]) {
  if (ids.length !== await tx.classSubject.count({ where: { schoolId, classroomId, subjectId: { in: ids } } })) throw new BadRequestException('Choose only subjects offered by the destination class.');
}
export async function setSubjects(tx: Prisma.TransactionClient, schoolId: string, enrollmentId: string, classroomId: string, ids: string[]) {
  await validateSubjects(tx, schoolId, classroomId, ids);
  await tx.enrollmentSubject.deleteMany({ where: { schoolId, enrollmentId } });
  if (ids.length) await tx.enrollmentSubject.createMany({ data: ids.map(subjectId => ({ schoolId, enrollmentId, subjectId })) });
  await tx.teachingAssignment.updateMany({ where: { schoolId, classroomId }, data: { confirmedAt: null } });
}
/** New enrollments inherit their class offerings unless an explicit non-empty selection is provided. */
export async function defaultSubjectIds(tx: Prisma.TransactionClient, schoolId: string, classroomId: string, selected: string[] = []) {
  if (selected.length) return selected;
  const offerings = await tx.classSubject.findMany({ where: { schoolId, classroomId }, select: { subjectId: true } });
  return offerings.map(row => row.subjectId);
}
/** Newly offered subjects become defaults for current active students without overwriting their individual choices. */
export async function addClassSubjectsToEnrollments(tx: Prisma.TransactionClient, schoolId: string, classroomId: string, subjectIds: string[]) {
  if (!subjectIds.length) return;
  const enrollments = await tx.enrollment.findMany({ where: { schoolId, classroomId, status: 'active' }, select: { id: true } });
  if (!enrollments.length) return;
  await tx.enrollmentSubject.createMany({
    data: enrollments.flatMap(enrollment => subjectIds.map(subjectId => ({ schoolId, enrollmentId: enrollment.id, subjectId }))),
    skipDuplicates: true,
  });
  await tx.enrollment.updateMany({
    where: { schoolId, id: { in: enrollments.map(enrollment => enrollment.id) } },
    data: { version: { increment: 1 } },
  });
  await tx.teachingAssignment.updateMany({ where: { schoolId, classroomId, subjectId: { in: subjectIds } }, data: { confirmedAt: null } });
}
export async function classTeacherIds(tx: Prisma.TransactionClient, schoolId: string, yearId: string): Promise<{ classId: string; teacherId: string }[]> {
  const workspace = await tx.academicWorkspace.findFirst({ where: { schoolId, yearId }, select: { data: true } });
  const state = workspace?.data as any;
  return (state?.classTeachers ?? []).filter((assignment: any) => !assignment.endedAt && assignment.teacherId).map((assignment: any) => ({
    classId: assignment.classId as string,
    teacherId: assignment.teacherId as string,
  }));
}
export async function isClassTeacher(tx: Prisma.TransactionClient, schoolId: string, yearId: string, classroomId: string, userId: string) {
  return (await classTeacherIds(tx, schoolId, yearId)).some(assignment => assignment.classId === classroomId && assignment.teacherId === userId);
}
/** Legacy whole-class assignments keep their scope; subject assignments see only enrolled students. */
export async function teacherEnrollmentScope(tx: Prisma.TransactionClient, schoolId: string, userId: string): Promise<Prisma.EnrollmentWhereInput> {
  const assignments = await tx.teachingAssignment.findMany({ where: { schoolId, membership: { userId, active: true, role: 'TEACHER', user: { enabled: true } } }, select: { classroomId: true, subjectId: true } });
  return { schoolId, AND: [{ OR: [{ status: 'active' }, { classroom: { year: { closed: true } } }] }], OR: assignments.map(a => ({ classroomId: a.classroomId, ...(a.subjectId ? { subjects: { some: { schoolId, subjectId: a.subjectId } } } : {}) })) };
}
export async function registryEvent(tx: Prisma.TransactionClient, schoolId: string, actorId: string, yearId: string, kind: string, message: string, studentId?: string) {
  const event = await tx.registryEvent.create({ data: { schoolId, actorId, yearId, kind, message, studentId } });
  await tx.auditEvent.create({ data: { schoolId, actorId, action: 'REGISTRY_' + kind.toUpperCase(), target: studentId || event.id } });
}
