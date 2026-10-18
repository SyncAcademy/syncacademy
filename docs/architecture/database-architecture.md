# SyncAcademy — Database Architecture (`apps/api/prisma`)

## 1. Database Provider & ORM

- **RDBMS**: PostgreSQL 16
- **ORM**: Prisma (`^5.22.0`)
- **Schema Path**: `apps/api/prisma/schema.prisma`
- **Migration History**: 14 sequential SQL migrations in `apps/api/prisma/migrations/` (from `20260327000100_init_auth_platform` through `20260410153000_normalize_academic_portal_storage`).

---

## 2. Domain Model Inventory (39 Models, 19 Enums)

### 2.1 Identity, Access & Platform Governance
- `User` — Global user identity (`id`, `email`, `passwordHash`, `fullName`, `phone`, `status`, `isSuperAdmin`).
- `UserSession` — Server-side session store (`sessionTokenHash`, `csrfTokenHash`, `expiresAt`, `revokedAt`, `ipAddress`, `userAgent`).
- `PasswordResetToken` — Hashed single-use password reset tokens (`tokenHash`, `expiresAt`, `usedAt`).
- `School` — Tenant root record (`id`, `name`, `code`, `level`, `ownershipType`, `region`, `district`, `ward`, `status`, `setupCompleted`).
- `SchoolMembership` — Join table linking `User` to `School` with `MembershipRole` and `MembershipStatus`.
- `Invitation` — Tokenized email invitations for school admins and staff (`email`, `role`, `tokenHash`, `status`, `expiresAt`).
- `PlatformSetting` — Singleton (`id = "default"`) storing platform metadata and AES-256-GCM encrypted SMTP configuration (`smtpPassEncrypted`).
- `ContactSubmission` — Public website demo/contact inquiries (`status`, `notes`).
- `AuditLog` — Immutable security and operational audit trail (`actorId`, `schoolId`, `action`, `targetType`, `targetId`, `metadata`).

### 2.2 School Structure & Registrar Domain
- `AcademicYear` (`schoolId`, `name`, `startDate`, `endDate`, `isCurrent`, `status`) & `Term` (`academicYearId`, `name`, `startDate`, `endDate`, `isCurrent`, `status`).
- `Level` (`schoolId`, `name`, `code`, `orderIndex`) — e.g., Form 1–4 or Standard I–VII.
- `SchoolClass` (`schoolId`, `levelId`, `academicYearId`, `classTeacherId`, `name`, `stream`, `capacity`).
- `Subject` (`schoolId`, `levelId`, `name`, `code`, `isCore`).
- `TeacherSubjectAssignment` (`schoolId`, `teacherId`, `classId`, `subjectId`, `academicYearId`).
- `Student` (`schoolId`, `admissionNumber`, `firstName`, `middleName`, `lastName`, `gender`, `dateOfBirth`, `status`, `currentClassId`).
- `Guardian` (`schoolId`, `fullName`, `phone`, `email`, `relationship`, `occupation`, `address`) & `StudentGuardian` (`studentId`, `guardianId`, `relationship`, `isPrimary`, `canReceiveNotifications`).
- `Enrollment` (`schoolId`, `studentId`, `classId`, `academicYearId`, `status`).
- `StudentApplication`, `PromotionRecord`, `TransferRecord`, `CertificateRecord` — Registrar lifecycle records.

### 2.3 Academic & Examination Domain
The schema currently contains two sets of academic models introduced across migrations `0002` and `20260410153000`:
1. **Normalized Academic Portal Models (Active in `AcademicController`)**:
   - `AcademicGradingScale` (`schoolId`, `name`, `levelBand`, `isDefault`, `rulesJson`)
   - `AcademicClassAssignment` (`schoolId`, `teacherUserId`, `classId`, `subjectId`, `role`, `academicYear`, `term`)
   - `AcademicExamItem` (`schoolId`, `name`, `examType`, `academicYear`, `term`, `classId`, `subjectId`, `maxScore`, `status`)
   - `AcademicScoreRecord` (`schoolId`, `examId`, `studentId`, `score`, `grade`, `remark`, `status`)
   - `AcademicApprovalItem` (`schoolId`, `examId`, `classId`, `subjectId`, `stage`, `status`, `submittedBy`, `reviewedBy`)
   - `AcademicAttendanceSession` & `AcademicAttendanceEntry`
   - `AcademicReportCardRecord`
2. **Initial Relational Academic Models (`0002_core_school_foundation`)**:
   - `Examination`, `Mark`, `AttendanceRecord`, `ReportCard`.
   - *Architectural Note*: Unifying these two model sets into a single canonical relational structure is scheduled for Phase 2 (see [`docs/architecture/adr.md`](./adr.md)).

### 2.4 Bursar & Finance Domain
- `FeeStructure` (`schoolId`, `academicYearId`, `termId`, `levelId`, `name`, `amount`, `currency`, `isMandatory`).
- `Invoice` (`schoolId`, `studentId`, `feeStructureId`, `invoiceNumber`, `amountDue`, `amountPaid`, `status`, `dueDate`).
- `Payment` (`schoolId`, `invoiceId`, `studentId`, `recordedById`, `amount`, `paymentMethod`, `referenceNumber`, `receiptNumber`, `paidAt`).
- `BursarAdjustmentRequest` (`schoolId`, `invoiceId`, `studentId`, `requestedById`, `reviewedById`, `adjustmentType`, `amount`, `reason`, `status`).

### 2.5 Transactional Outbox & Communications
- `Outbox` (`id`, `schoolId`, `eventType`, `payload`, `status`, `attempts`, `nextAttemptAt`, `lastError`, `processedAt`).
- `CommunicationLog` (`id`, `schoolId`, `outboxId`, `channel`, `recipient`, `subject`, `bodyPreview`, `status`, `providerMessageId`, `errorMessage`, `sentAt`).
