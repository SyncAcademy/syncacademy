import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalizes phone number to E.164 digits-only format (255XXXXXXXXX).
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned.slice(1);
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '255' + cleaned.slice(1);
  }
  return cleaned;
}

export async function backfillLegacyGuardians() {
  console.log('--- Starting Safe Guardian Backfill ---');
  
  // Find all students with legacy guardian information
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { guardianPhone: { not: '' } },
        { guardianName: { not: '' } },
      ],
    },
    select: {
      id: true,
      schoolId: true,
      admissionNumber: true,
      name: true,
      guardianName: true,
      guardianPhone: true,
    },
  });

  console.log(`Found ${students.length} students with legacy guardian fields.`);

  let createdGuardians = 0;
  let linkedRelationships = 0;
  let skippedStudents = 0;

  for (const student of students) {
    const rawPhone = student.guardianPhone?.trim();
    const rawName = student.guardianName?.trim() || `Guardian of ${student.name}`;
    const normalizedPhone = normalizePhone(rawPhone);

    if (!normalizedPhone || normalizedPhone.length < 9) {
      console.warn(`[Skip] Student ${student.admissionNumber} (${student.name}): invalid phone "${rawPhone}"`);
      skippedStudents++;
      continue;
    }

    try {
      // Find or create Guardian in the student's school
      let guardian = await prisma.guardian.findUnique({
        where: {
          schoolId_phone: {
            schoolId: student.schoolId,
            phone: normalizedPhone,
          },
        },
      });

      if (!guardian) {
        guardian = await prisma.guardian.create({
          data: {
            schoolId: student.schoolId,
            name: rawName,
            phone: normalizedPhone,
            preferredChannel: 'SMS',
            preferredLanguage: 'sw',
          },
        });
        createdGuardians++;
      }

      // Link to student if relationship doesn't already exist
      const existingLink = await prisma.studentGuardian.findUnique({
        where: {
          studentId_guardianId: {
            studentId: student.id,
            guardianId: guardian.id,
          },
        },
      });

      if (!existingLink) {
        await prisma.studentGuardian.create({
          data: {
            schoolId: student.schoolId,
            studentId: student.id,
            guardianId: guardian.id,
            relationship: 'Guardian',
            isPrimary: true,
            canReceiveReports: true,
            canReceiveFinanceAlert: true,
            canReceiveAttendanceAlert: true,
          },
        });
        linkedRelationships++;
      }
    } catch (err) {
      console.error(`[Error] Failed to backfill for student ${student.admissionNumber}:`, err.message);
    }
  }

  console.log(`--- Backfill Complete ---`);
  console.log(`Guardians Created: ${createdGuardians}`);
  console.log(`Student-Guardian Links Created: ${linkedRelationships}`);
  console.log(`Skipped (invalid/empty phone): ${skippedStudents}`);

  return { createdGuardians, linkedRelationships, skippedStudents };
}

if (process.argv[1]?.endsWith('backfill-guardians.mjs')) {
  backfillLegacyGuardians()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('Fatal backfill error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
