CREATE TABLE "ParentResultPublication" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "yearId" UUID NOT NULL,
  "classId" UUID NOT NULL,
  "reportCardId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'staff_report_link',
  "withdrawnAt" TIMESTAMP(3),
  "withdrawnByUserId" UUID,
  "withdrawalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentResultPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentResultPublication_schoolId_reportCardId_key"
  ON "ParentResultPublication"("schoolId", "reportCardId");
CREATE INDEX "ParentResultPublication_schoolId_studentId_yearId_publishedAt_id_idx"
  ON "ParentResultPublication"("schoolId", "studentId", "yearId", "publishedAt", "id");
ALTER TABLE "ParentResultPublication"
  ADD CONSTRAINT "ParentResultPublication_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentResultPublication"
  ADD CONSTRAINT "ParentResultPublication_studentId_schoolId_fkey"
  FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentResultPublication"
  ADD CONSTRAINT "ParentResultPublication_yearId_schoolId_fkey"
  FOREIGN KEY ("yearId", "schoolId") REFERENCES "AcademicYear"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentResultPublication"
  ADD CONSTRAINT "ParentResultPublication_classId_schoolId_fkey"
  FOREIGN KEY ("classId", "schoolId") REFERENCES "Classroom"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reconcile only reports with an existing non-revoked share link and an approved
-- report snapshot. Expiry and link-specific revocation do not withdraw publication.
INSERT INTO "ParentResultPublication" (
  "id", "schoolId", "studentId", "yearId", "classId", "reportCardId", "publishedAt", "source"
)
SELECT gen_random_uuid(), source."schoolId", source."studentId", source."yearId",
       source."classId", source."reportCardId", source."publishedAt", 'historical_link_reconciliation'
FROM (
  SELECT DISTINCT ON (link."schoolId", link."reportCardId")
    link."schoolId", link."studentId", classroom."yearId", classroom."id" AS "classId",
    link."reportCardId", link."createdAt" AS "publishedAt"
  FROM "ReportAccessLink" link
  JOIN "Classroom" classroom
    ON classroom."id" = CASE
      WHEN split_part(link."reportCardId", ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN split_part(link."reportCardId", ':', 2)::uuid
      ELSE NULL
    END
   AND classroom."schoolId" = link."schoolId"
  JOIN "AcademicWorkspace" workspace
    ON workspace."schoolId" = link."schoolId"
   AND workspace."yearId" = classroom."yearId"
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(workspace."data"->'reports', '[]'::jsonb)) report
  WHERE link."revokedAt" IS NULL
    AND split_part(link."reportCardId", ':', 3) = link."studentId"::text
    AND report->>'id' = link."reportCardId"
    AND report->>'status' = 'approved'
    AND report->>'academicApproved' = 'true'
  ORDER BY link."schoolId", link."reportCardId", link."createdAt"
) source;
