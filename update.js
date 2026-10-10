const fs = require('fs');

// 1. Prisma schema
let schema = fs.readFileSync('d:/syncacademy-mvp/apps/api/prisma/schema.prisma', 'utf8');
schema = schema.replace(
  '  registryEvents RegistryEvent[]\r\n  @@unique([id, schoolId])',
  '  registryEvents RegistryEvent[]\r\n  feeStructures FeeStructure[]\r\n  @@unique([id, schoolId])'
);
schema = schema.replace(
  '  movementsTo RegistryEvent[] @relation("MovementTo")\r\n  @@unique([id, schoolId])',
  '  movementsTo RegistryEvent[] @relation("MovementTo")\r\n  feeStructures FeeStructure[]\r\n  @@unique([id, schoolId])'
);
schema = schema.replace(
  '  registryEvents RegistryEvent[]\r\n  @@unique([id, schoolId])',
  '  registryEvents RegistryEvent[]\r\n  charges StudentCharge[]\r\n  payments Payment[]\r\n  adjustments Adjustment[]\r\n  @@unique([id, schoolId])'
);
fs.writeFileSync('d:/syncacademy-mvp/apps/api/prisma/schema.prisma', schema);
console.log('Schema updated.');

// 2. api.controller.ts
let api = fs.readFileSync('d:/syncacademy-mvp/apps/api/src/api.controller.ts', 'utf8');
api = api.replace(
  "const registrar = staffManager || roles.includes('REGISTRAR'); const academic = staffManager || roles.includes('ACADEMIC');",
  "const registrar = staffManager || roles.includes('REGISTRAR'); const academic = staffManager || roles.includes('ACADEMIC');\n    const bursar = user.platformAdmin || roles.includes('HEADMASTER') || roles.includes('BURSAR');"
);

const fetchCode = `    const subjects = registrar || academic ? await this.svc.db.subject.findMany({ where: { schoolId: id }, orderBy: { name: 'asc' } }) : [];
    const classSubjects = registrar || academic ? await this.svc.db.classSubject.findMany({ where: { schoolId: id }, include: { subject: true } }) : [];
    
    let financeSummaryData = null;
    if (bursar) {
      const [{ _count: feesCount }, { _sum: chargedSum }, { _sum: paidSum }, { _sum: adjSum }] = await Promise.all([
        this.svc.db.feeStructure.aggregate({ where: { schoolId: id }, _count: true }),
        this.svc.db.studentCharge.aggregate({ where: { schoolId: id }, _sum: { amount: true } }),
        this.svc.db.payment.aggregate({ where: { schoolId: id, voidAt: null }, _sum: { amount: true } }),
        this.svc.db.adjustment.aggregate({ where: { schoolId: id }, _sum: { amount: true } })
      ]);
      // simple student owing count approximation
      const owingStudents = await this.svc.db.$queryRaw\`
        SELECT COUNT(DISTINCT "studentId")::int as count
        FROM (
          SELECT "studentId",
                 SUM(amount) as charges,
                 COALESCE((SELECT SUM(amount) FROM "Payment" p WHERE p."studentId" = c."studentId" AND p."schoolId" = \${id}::uuid AND p."voidAt" IS NULL), 0) as paid,
                 COALESCE((SELECT SUM(amount) FROM "Adjustment" a WHERE a."studentId" = c."studentId" AND a."schoolId" = \${id}::uuid), 0) as adjustments
          FROM "StudentCharge" c
          WHERE c."schoolId" = \${id}::uuid
          GROUP BY "studentId"
        ) AS s
        WHERE charges + adjustments - paid > 0
      \`;
      financeSummaryData = {
        fees: feesCount || 0,
        charged: chargedSum.amount || 0,
        paid: paidSum.amount || 0,
        adjustments: adjSum.amount || 0,
        studentsOwing: (owingStudents && owingStudents[0] && owingStudents[0].count) || 0
      };
    }`;

api = api.replace(
  `    const subjects = registrar || academic ? await this.svc.db.subject.findMany({ where: { schoolId: id }, orderBy: { name: 'asc' } }) : [];
    const classSubjects = registrar || academic ? await this.svc.db.classSubject.findMany({ where: { schoolId: id }, include: { subject: true } }) : [];`,
  fetchCode
);

api = api.replace(
  'return { school, years, classes, students, studentCount, registryAdmissions, registryIssues, subjects, classSubjects, members, invitations, assignments, audit, permissions: { staffManager, registrar, academic } };',
  'return { school, years, classes, students, studentCount, registryAdmissions, registryIssues, subjects, classSubjects, members, invitations, assignments, audit, financeSummary: bursar ? financeSummaryData : null, permissions: { staffManager, registrar, academic, bursar } };'
);
fs.writeFileSync('d:/syncacademy-mvp/apps/api/src/api.controller.ts', api);
console.log('ApiController updated.');
