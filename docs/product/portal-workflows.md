# SyncAcademy — Role Portal Workflows Guide

This document consolidates the end-to-end operational workflows across all active SyncAcademy portals (`apps/web`).

---

## 1. Super Admin Workflows (`/super-admin`)

- **School Onboarding & Lifecycle**:
  - Register a new school (`School` name, unique school code, region, ownership type) and automatically queue a single-use Headmaster/School Admin invitation in a single transaction.
  - Browse, search, filter, suspend, or reactivate schools in the directory with mandatory audit reasons.
- **Leads & Prospective School Conversion**:
  - Track prospective schools, follow-up dates, owners, and pipeline stages.
  - Convert a won lead into an active school tenant with one click, linking the lead record to the newly created `School` workspace and queuing the initial administrator invitation.
- **Platform Settings & System Health**:
  - Configure platform name, support email, administrator announcements, and encrypted runtime SMTP credentials (`PlatformSetting`).
  - Inspect platform-wide `AuditLog` events (with CSV export) and monitor `Outbox` email/notification queue health (`PENDING`, `FAILED`, `PROCESSED`).

---

## 2. Headmaster & School Setup Workflows (`/headmaster`, `/school-setup`)

- **School Profile & Academic Year Setup**:
  - Configure the registered school profile (name, region, level, address, phone, email, website) and grading scale bands/pass marks for the selected academic year.
  - Create or edit academic years (`AcademicYear`) and terms (`Term`), close completed academic years once all assessments and submissions are approved, or reopen a year when an authorized correction is required.
- **Staff Directory & Invitations**:
  - Invite Registrars, Academic Masters, Bursars, Class Teachers, and Subject Teachers via tokenized email invitations (`Invitation`).
  - Resend or revoke pending invitations and activate/suspend staff memberships (`SchoolMembership`). Suspending a staff member immediately revokes their active `UserSession` records while preserving historical records they authored.
- **Executive Oversight**:
  - **Finance Overview**: Inspect expected, collected, outstanding, and overdue fee totals, student balances, fee structures, payments, and approve/reject bursar adjustment requests.
  - **Academic Results & Progress**: Filter assessment marks by class, subject, and approval stage; monitor teacher submission progress, attendance, syllabus completion, student support plans, and exam timetables.
  - **Student Reports Approval**: Review, approve (`HEADMASTER_APPROVED`), and publish/print official term report cards prepared from approved subject results.

---

## 3. Registrar & Student Management Workflows (`/registrar`)

- **Admissions & Student Directory**:
  - Manage student admission applications (`StudentApplication`), accept/reject applicants, register students (`Student`) with unique school admission numbers, and record guardian contact details (`Guardian`, `StudentGuardian`).
  - Enroll students into classes (`Enrollment`), transfer students between streams/classes with recorded reasons, process withdrawals/graduations, and execute atomic year-to-year cohort progressions (`PromotionRecord`).
- **Bulk CSV / Excel (`.xlsx`) Student Import**:
  - Upload UTF-8 CSV or `.xlsx` spreadsheets (up to 5 MB / 5,000 rows) with worksheet selection, column mapping, explicit date-format selection (ISO, day-first, month-first), and class aliases.
  - **Two-Stage Preview & Batch Confirmation**: Server validation previews row-level errors (missing fields, duplicate admission numbers, invalid subjects) without mutating records. Confirmation processes valid rows in atomic batches of 50 with resumable server cursors.
- **Student Subject Selections & Roster Issues**:
  - View class subject offerings and adjust individual student subject combinations (e.g., optional subjects or A-Level combinations).
  - Resolve teacher-reported **Roster Issues** in the shared Registrar/Academic/Headmaster inbox so teachers can confirm their assessment rosters.

---

## 4. Academic Master & Teacher Workflows (`/academic`, `/class-teacher`)

- **Classes, Subjects & Teaching Assignments**:
  - Create school subjects (`Subject`), configure class subject offerings, and assign Subject Teachers (`TEACHER`) to specific class-subject pairs (`TeacherSubjectAssignment`, `AcademicClassAssignment`) and Class Teachers (`CLASS_TEACHER`) to homeroom classes.
- **Examinations & Marks Entry Lifecycle**:
  1. **Assessment Creation**: Academic Master creates an examination (`AcademicExamItem`) for a term and allocates target classes, generating draft subject submissions.
  2. **Roster Confirmation & Marks Entry**: The assigned teacher confirms the class/subject student roster, enters scores (`0`–`100`), and saves drafts (`AcademicScoreRecord`) with optimistic revision concurrency protection (preventing stale browser tabs from overwriting newer saves).
  3. **Submission & Multi-Stage Review**: Teacher submits completed marks (`SUBMITTED`). Academic Master reviews each submission in **Marks Review** and either approves it (`ACADEMIC_APPROVED`) or returns it with a reason for correction.
  4. **Report Card Generation**: Once assessment submissions are approved and closed, student term standings, divisions, averages, class positions, and report cards (`AcademicReportCardRecord`) are generated for Headmaster approval.
- **Class Teacher Responsibilities (`/class-teacher`)**:
  - Record daily class attendance (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`); corrections to saved attendance require a reason and preserve revision history.
  - Review consolidated class performance sheets, manage student subject selections for the assigned class, and inspect prepared student report cards.
- **Timetable, Curriculum Planner & Interventions**:
  - Schedule examination slots with room/class/invigilator clash detection, track syllabus topic completion, and record student academic support/intervention plans.

---

## 5. Bursar & Student Finance Workflows (`/bursar`)

- **Fee Structures (`FeeStructure`)**:
  - Create fee structures for one or multiple classes across **Term 1**, **Term 2**, or **Full year** in whole Tanzanian Shillings (TZS) with due dates inside the active academic year.
  - Applying a fee structure generates student charges (`Invoice`) atomically for all active, previously uncharged students in the selected class(es) without duplicating existing charges.
- **Student Accounts, Payments & Receipts (`Payment`)**:
  - Search student ledgers by class, name, or admission number to inspect expected fees, paid amounts, adjustments, and overdue balances.
  - Record full or installment payments against specific assigned fees (`CASH`, `BANK_TRANSFER`, `MOBILE_MONEY`, `CHEQUE`, `CARD`) and issue sequential, printable school-wide receipts.
- **Adjustments, Voids & Payment Corrections (`BursarAdjustmentRequest`)**:
  - Record scholarships, discounts, or debit adjustments with mandatory audit reasons.
  - Void erroneous receipts in open academic years (restoring fee availability and retaining the voided receipt in audit history) or replace an incorrectly entered payment via **Save correction & replace receipt**, linking the replacement receipt to the original record.
