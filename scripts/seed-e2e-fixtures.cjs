const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { passwordHash } = require('../apps/api/dist/security');
const { randomUUID } = require('node:crypto');

async function seed() {
  const db = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://syncacademy:test@127.0.0.1:55432/syncacademy_auth_test',
      },
    },
  });

  const password = 'SyncPass123!';
  const hash = await passwordHash(password);

  console.log('Seeding End-to-End Test Fixtures...');

  // 1. School Alpha
  let schoolA = await db.school.findFirst({ where: { code: 'SA-E2E-ALPHA' } });
  if (!schoolA) {
    schoolA = await db.school.create({
      data: {
        name: 'School Alpha E2E',
        code: 'SA-E2E-ALPHA',
        region: 'Dar es Salaam',
      },
    });
  }

  let yearA = await db.academicYear.findFirst({ where: { schoolId: schoolA.id, name: '2026' } });
  if (!yearA) {
    yearA = await db.academicYear.create({
      data: {
        schoolId: schoolA.id,
        name: '2026',
        startsAt: new Date('2026-01-01'),
        endsAt: new Date('2026-12-31'),
        terms: [{ key: 'term-1', name: 'Term 1', startsAt: '2026-01-01', endsAt: '2026-06-30' }],
      },
    });
  }

  let classroomA = await db.classroom.findFirst({ where: { schoolId: schoolA.id, yearId: yearA.id, name: 'Grade 1' } });
  if (!classroomA) {
    classroomA = await db.classroom.create({
      data: { schoolId: schoolA.id, yearId: yearA.id, name: 'Grade 1' },
    });
  }

  // 2. School Beta (Isolated Tenant)
  let schoolB = await db.school.findFirst({ where: { code: 'SB-E2E-BETA' } });
  if (!schoolB) {
    schoolB = await db.school.create({
      data: {
        name: 'School Beta E2E',
        code: 'SB-E2E-BETA',
        region: 'Arusha',
      },
    });
  }

  let yearB = await db.academicYear.findFirst({ where: { schoolId: schoolB.id, name: '2026' } });
  if (!yearB) {
    yearB = await db.academicYear.create({
      data: {
        schoolId: schoolB.id,
        name: '2026',
        startsAt: new Date('2026-01-01'),
        endsAt: new Date('2026-12-31'),
        terms: [{ key: 'term-1', name: 'Term 1', startsAt: '2026-01-01', endsAt: '2026-06-30' }],
      },
    });
  }

  let classroomB = await db.classroom.findFirst({ where: { schoolId: schoolB.id, yearId: yearB.id, name: 'Grade 2' } });
  if (!classroomB) {
    classroomB = await db.classroom.create({
      data: { schoolId: schoolB.id, yearId: yearB.id, name: 'Grade 2' },
    });
  }

  // 3. Students in School Alpha
  let childA1 = await db.student.findFirst({ where: { schoolId: schoolA.id, admissionNumber: 'STD-ALPHA-01' } });
  if (!childA1) {
    childA1 = await db.student.create({
      data: { schoolId: schoolA.id, name: 'Alpha Student One', admissionNumber: 'STD-ALPHA-01' },
    });
    await db.enrollment.create({
      data: { schoolId: schoolA.id, studentId: childA1.id, classroomId: classroomA.id, status: 'active', createdAt: new Date('2026-01-01') },
    });
  }

  let childA2 = await db.student.findFirst({ where: { schoolId: schoolA.id, admissionNumber: 'STD-ALPHA-02' } });
  if (!childA2) {
    childA2 = await db.student.create({
      data: { schoolId: schoolA.id, name: 'Alpha Student Two', admissionNumber: 'STD-ALPHA-02' },
    });
    await db.enrollment.create({
      data: { schoolId: schoolA.id, studentId: childA2.id, classroomId: classroomA.id, status: 'active', createdAt: new Date('2026-01-01') },
    });
  }

  // 4. Student in School Beta
  let childB1 = await db.student.findFirst({ where: { schoolId: schoolB.id, admissionNumber: 'STD-BETA-01' } });
  if (!childB1) {
    childB1 = await db.student.create({
      data: { schoolId: schoolB.id, name: 'Beta Student One', admissionNumber: 'STD-BETA-01' },
    });
    await db.enrollment.create({
      data: { schoolId: schoolB.id, studentId: childB1.id, classroomId: classroomB.id, status: 'active', createdAt: new Date('2026-01-01') },
    });
  }

  // 5. Parent Alpha User (Linked to childA1 & childA2)
  let parentUserA = await db.user.findFirst({ where: { email: 'alpha.parent@example.test' } });
  if (!parentUserA) {
    parentUserA = await db.user.create({
      data: {
        email: 'alpha.parent@example.test',
        name: 'Parent Alpha',
        passwordHash: hash,
        enabled: true,
      },
    });
  } else {
    await db.user.update({ where: { id: parentUserA.id }, data: { passwordHash: hash, enabled: true } });
  }

  await db.parentAccount.upsert({
    where: { userId: parentUserA.id },
    create: { userId: parentUserA.id, loginPhone: '255788111222', verifiedAt: new Date() },
    update: { loginPhone: '255788111222', verifiedAt: new Date() },
  });

  let guardianA = await db.guardian.findFirst({ where: { schoolId: schoolA.id, userId: parentUserA.id } });
  if (!guardianA) {
    guardianA = await db.guardian.create({
      data: { schoolId: schoolA.id, name: 'Parent Alpha', phone: '255788111222', email: 'alpha.parent@example.test', userId: parentUserA.id },
    });
  }

  await db.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: childA1.id, guardianId: guardianA.id } },
    create: { schoolId: schoolA.id, studentId: childA1.id, guardianId: guardianA.id },
    update: { active: true },
  });
  await db.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: childA2.id, guardianId: guardianA.id } },
    create: { schoolId: schoolA.id, studentId: childA2.id, guardianId: guardianA.id },
    update: { active: true },
  });

  // 6. Parent Beta User (Linked to childB1 in School Beta ONLY)
  let parentUserB = await db.user.findFirst({ where: { email: 'beta.parent@example.test' } });
  if (!parentUserB) {
    parentUserB = await db.user.create({
      data: {
        email: 'beta.parent@example.test',
        name: 'Parent Beta',
        passwordHash: hash,
        enabled: true,
      },
    });
  } else {
    await db.user.update({ where: { id: parentUserB.id }, data: { passwordHash: hash, enabled: true } });
  }

  await db.parentAccount.upsert({
    where: { userId: parentUserB.id },
    create: { userId: parentUserB.id, loginPhone: '255788333444', verifiedAt: new Date() },
    update: { loginPhone: '255788333444', verifiedAt: new Date() },
  });

  let guardianB = await db.guardian.findFirst({ where: { schoolId: schoolB.id, userId: parentUserB.id } });
  if (!guardianB) {
    guardianB = await db.guardian.create({
      data: { schoolId: schoolB.id, name: 'Parent Beta', phone: '255788333444', email: 'beta.parent@example.test', userId: parentUserB.id },
    });
  }

  await db.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: childB1.id, guardianId: guardianB.id } },
    create: { schoolId: schoolB.id, studentId: childB1.id, guardianId: guardianB.id },
    update: { active: true },
  });

  // 7. Teacher Alpha User (Class Teacher in School Alpha)
  let teacherUserA = await db.user.findFirst({ where: { email: 'teacher.alpha@example.test' } });
  if (!teacherUserA) {
    teacherUserA = await db.user.create({
      data: { email: 'teacher.alpha@example.test', name: 'Teacher Alpha', passwordHash: hash, enabled: true },
    });
  } else {
    await db.user.update({ where: { id: teacherUserA.id }, data: { passwordHash: hash, enabled: true } });
  }

  let memberA = await db.membership.findFirst({ where: { userId: teacherUserA.id, schoolId: schoolA.id } });
  if (!memberA) {
    memberA = await db.membership.create({
      data: { userId: teacherUserA.id, schoolId: schoolA.id, role: 'TEACHER', active: true },
    });
  } else {
    await db.membership.update({ where: { id: memberA.id }, data: { role: 'TEACHER', active: true } });
  }

  // 8. Teacher Beta User (Member of School Beta ONLY)
  let teacherUserB = await db.user.findFirst({ where: { email: 'teacher.beta@example.test' } });
  if (!teacherUserB) {
    teacherUserB = await db.user.create({
      data: { email: 'teacher.beta@example.test', name: 'Teacher Beta', passwordHash: hash, enabled: true },
    });
  } else {
    await db.user.update({ where: { id: teacherUserB.id }, data: { passwordHash: hash, enabled: true } });
  }

  let memberB = await db.membership.findFirst({ where: { userId: teacherUserB.id, schoolId: schoolB.id } });
  if (!memberB) {
    memberB = await db.membership.create({
      data: { userId: teacherUserB.id, schoolId: schoolB.id, role: 'TEACHER', active: true },
    });
  } else {
    await db.membership.update({ where: { id: memberB.id }, data: { role: 'TEACHER', active: true } });
  }

  // 9. Academic Workspace for School Alpha
  let wsA = await db.academicWorkspace.findFirst({ where: { schoolId: schoolA.id, yearId: yearA.id } });
  const wsData = {
    assessments: [],
    submissions: [],
    slots: [],
    syllabus: [],
    support: [],
    audit: [],
    reports: [],
    attendance: [
      {
        id: randomUUID(),
        classId: classroomA.id,
        date: '2026-03-01',
        revision: 1,
        teacherId: teacherUserA.id,
        teacherName: 'Teacher Alpha',
        entries: [
          { studentId: childA1.id, status: 'Present', note: 'Prompt' },
          { studentId: childA2.id, status: 'Present', note: 'Prompt' }
        ],
      },
    ],
    classTeachers: [
      { classId: classroomA.id, teacherId: teacherUserA.id },
    ],
    notifications: [],
    policy: {},
  };

  if (!wsA) {
    wsA = await db.academicWorkspace.create({
      data: { schoolId: schoolA.id, yearId: yearA.id, data: wsData },
    });
  } else {
    await db.academicWorkspace.update({
      where: { yearId: yearA.id },
      data: { data: wsData },
    });
  }

  console.log('Fixtures seeded successfully!');
  console.log('Parent Alpha:', '255788111222', '/', password);
  console.log('Parent Beta:', '255788333444', '/', password);
  console.log('Teacher Alpha:', 'teacher.alpha@example.test', '/', password);
  console.log('Teacher Beta:', 'teacher.beta@example.test', '/', password);

  await db.$disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

