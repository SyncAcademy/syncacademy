-- Backfill open-year active enrollments that have no individual subject rows.
-- Existing student-specific selections remain untouched.
INSERT INTO "EnrollmentSubject" ("schoolId", "enrollmentId", "subjectId")
SELECT enrollment."schoolId", enrollment.id, offering."subjectId"
FROM "Enrollment" AS enrollment
JOIN "Classroom" AS classroom
  ON classroom.id = enrollment."classroomId"
 AND classroom."schoolId" = enrollment."schoolId"
JOIN "AcademicYear" AS academic_year
  ON academic_year.id = classroom."yearId"
 AND academic_year."schoolId" = classroom."schoolId"
JOIN "ClassSubject" AS offering
  ON offering."schoolId" = classroom."schoolId"
 AND offering."classroomId" = classroom.id
WHERE enrollment.status = 'active'
  AND academic_year.closed = false
  AND NOT EXISTS (
    SELECT 1
    FROM "EnrollmentSubject" AS existing
    WHERE existing."schoolId" = enrollment."schoolId"
      AND existing."enrollmentId" = enrollment.id
  )
ON CONFLICT ("schoolId", "enrollmentId", "subjectId") DO NOTHING;
