# SyncAcademy — Product Overview, MVP Scope & Portal Workflows

## 1. Product Vision & Executive Summary

**SyncAcademy** is a multi-tenant education management SaaS platform built initially for Tanzanian primary and secondary schools. Its long-term vision is to provide **one connected education ecosystem** uniting school administrators, headmasters, registrars, bursars, class teachers, subject teachers, students, and families—including unified cross-school guardian accounts for parents with children enrolled across multiple SyncAcademy schools.

### Core Problems Solved
1. **Fragmented School Operations**: Unifies Admissions (Registrar), Academics (Academic Master & Teachers), Finance (Bursar), and Executive Oversight (Headmaster) on a single real-time database with immutable audit logs.
2. **Tanzanian Academic & NECTA Alignment**: Supports multi-term calendars (`Term 1`, `Term 2`, mid-term and annual assessments), NECTA-aligned grading scales (`A`–`F` divisions and points), and multi-stage marks approval (`DRAFT` -> `SUBMITTED` -> `ACADEMIC_APPROVED` -> `HEADMASTER_APPROVED` -> `PUBLISHED`).
3. **Multi-Channel Guardian Connectivity**: Reaches parents via **SMS**, **WhatsApp**, **Email**, and **secure, expiring report-access links** without requiring complex portal onboarding, while laying the foundation for a cross-school Parent Portal.

---

## 2. MVP Scope Matrix

| Domain | In-Scope MVP Capabilities | Status |
|---|---|---|
| **Super Admin & Tenant Onboarding** | Provision and suspend schools (`School`), convert prospective leads, invite school administrators, configure platform SMTP settings (`PlatformSetting`), and inspect platform audit logs. | **Implemented** (`/super-admin`) |
| **School Administration & Setup** | Configure school profile, academic years (`AcademicYear`), terms (`Term`), levels (`Level`), classes/streams (`SchoolClass`), subjects (`Subject`), staff invitations (`Invitation`), and role memberships (`SchoolMembership`). | **Implemented** (`/school-setup`) |
| **Student & Guardian Registry (Registrar)** | Manage student applications (`StudentApplication`), admissions (`Student`), CSV/`.xlsx` bulk imports, guardian contacts (`Guardian`, `StudentGuardian`), class enrollments (`Enrollment`), promotions (`PromotionRecord`), transfers (`TransferRecord`), and certificates (`CertificateRecord`). | **Implemented** (`/registrar`) |
| **Teacher Management & Assignments** | Assign Class Teachers (`CLASS_TEACHER`) to homeroom classes and Subject Teachers (`TEACHER`) to specific class-subject pairs (`TeacherSubjectAssignment`, `AcademicClassAssignment`). | **Implemented** (`/school-setup`, `/academic`, `/class-teacher`) |
| **Examinations, Marks & Automated Grading** | Create assessments (`AcademicExamItem`), configure grading scales (`AcademicGradingScale`), enter/validate marks (`AcademicScoreRecord`), compute automated grades/averages/positions, and enforce Academic Master and Headmaster approvals (`AcademicApprovalItem`). | **Implemented** (`/academic`, `/class-teacher`, `/headmaster`) |
| **Academic Reports & Report Cards** | Generate student term result summaries and printable/publishable report cards (`AcademicReportCardRecord`) once marks are approved. | **Implemented** (`/academic`, `/class-teacher`, `/headmaster`) |
| **Daily Attendance** | Record and review daily student attendance (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) by class and date (`AcademicAttendanceSession`, `AcademicAttendanceEntry`) with revision history. | **Implemented** (`/class-teacher`, `/academic`) |
| **Bursar & Student Fee Workflows** | Define class/term fee structures (`FeeStructure`), issue student invoices (`Invoice`), record installment payments and sequential receipts (`Payment`), and process fee adjustments (`BursarAdjustmentRequest`). | **Implemented** (`/bursar`) |
| **Parent Communication Engine** | PostgreSQL `Outbox` delivery for email, SMS and WhatsApp, guardian contact verification, and expiring OTP-protected report links (`ReportAccessLink`). Provider delivery requires configured credentials; parent account sign-in remains planned. | **Implemented with provider configuration** |

### Explicitly Out of Scope for Initial MVP
- Native iOS/Android mobile apps (the MVP is a responsive web application).
- Complex general-ledger accounting, payroll, and HR management.
- AI tutoring/content generation and full LMS video/quiz hosting.
- Heavyweight external infrastructure (Kafka, RabbitMQ, or microservices).

---

## 3. User Roles & Authorization Matrix

SyncAcademy separates **Global User Identity** (`User`) from **Tenant Authorization** (`SchoolMembership` scoped by `schoolId`, `MembershipRole`, and `MembershipStatus`).

| Role Enum | Role Title | Primary Portal Route | Core Responsibilities |
|---|---|---|---|
| `SUPER_ADMIN` | Platform Super Administrator | `/super-admin` after `/platform-access/login` | Sign in through the separate, manually entered administrator route with password and mandatory authenticator verification; then onboard/suspend schools, convert leads, invite school admins, manage platform SMTP settings, and audit platform activity. |
| `SCHOOL_ADMIN` | School Administrator / Director | `/school-setup`, `/academic` | Configure school profile, academic years, terms, levels, classes, subjects, grading scales, staff invitations, and teacher assignments. |
| `HEAD_TEACHER` | Headmaster / Principal | `/headmaster`, `/academic` | Executive oversight across academics, admissions, and finance; final approval (`HEADMASTER_APPROVED`) and publication of report cards; approval of fee adjustments. |
| `REGISTRAR` | Admissions & Records Officer | `/registrar` | Manage applications, student admissions, CSV/Excel imports, guardian records, class enrollments, promotions, transfers, and certificates. |
| `BURSAR` | School Bursar / Finance Officer | `/bursar` | Manage fee structures, student invoices, payments, receipts, and fee adjustment requests. |
| `CLASS_TEACHER` | Homeroom / Class Teacher | `/class-teacher` | Record daily class attendance, manage student subject selections for assigned class, enter marks for assigned subjects, and review class report cards. |
| `TEACHER` | Subject Teacher | `/class-teacher` (`/teaching-responsibilities`) | Enter and submit examination marks for assigned class-subject pairs and track syllabus topics. |
| `PARENT` | Guardian / Parent | Expiring Report Link / Future `/parent` | Receive SMS, WhatsApp, and Email notifications; view published report cards via expiring links; (Phase 4) cross-school Parent Portal. |
| `STUDENT` | Enrolled Student | Future `/student` | Core domain record (`Student`) for enrollment, attendance, marks, and report cards. |

| Capability / Domain Action | `SUPER_ADMIN` | `SCHOOL_ADMIN` | `HEAD_TEACHER` | `REGISTRAR` | `BURSAR` | `CLASS_TEACHER` | `TEACHER` | `PARENT` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Provision / Suspend Schools & Platform Settings | Yes | No | No | No | No | No | No | No |
| Manage School Staff Invitations | Yes | Yes | Yes | No | No | No | No | No |
| Configure Academic Years, Terms, Classes & Subjects | Yes | Yes | Yes | View | View | View | View | No |
| Assign Teachers to Classes & Subjects | Yes | Yes | Yes | No | No | View | View | No |
| Student Admissions, Imports, Promotions & Transfers | Yes | Yes | View/Approve | Yes | No | View Class | No | No |
| Enter & Submit Subject Marks | Yes | Yes | View | No | No | Assigned Only | Assigned Only | No |
| Approve Academic Results & Publish Report Cards | Yes | Academic | Final Approval | No | No | Submit Only | Submit Only | View Own Published |
| Record Class Attendance | Yes | Yes | View | View | No | Assigned Class | No | View Own Child |
| Manage Fee Structures, Invoices & Payments | Yes | View | View/Approve Adjustments | Payments/View | Yes | No | No | View Own Child |

---

## 4. End-to-End Portal Workflows

### 4.1 Super Admin Portal (`/super-admin`)
- **Platform administrator sign-in**: The school-role login does not offer `SUPER_ADMIN`. Administrators use `/platform-access/login` directly, verify with an authenticator app, and acknowledge recovery codes during first enrollment. There is no remember-device option or public link to this route. An administrator session expires after 15 minutes of inactivity or 8 hours total. When an authenticated request finds an expired session, the web app clears the old account state and returns the administrator to that sign-in route with one session notice. School-role users return to their role sign-in route.
- **Current public demo intake**: Visitors use `/request-demo` to submit school, applicant, and designated Headmaster details. The request enters the existing Leads Pipeline as `new` with source `website-demo-request`; submission creates no school or account. A Super Admin progresses the lead to `won`, reviews its details, and converts it to a school with a single-use Headmaster invitation. Existing manually entered leads continue to use their contact as the invitation recipient when no separate Headmaster is recorded.
- **Current public form security**: Contact and demo submissions share rolling email and IP limits. Super Admins inspect public form events and manage temporary IP restrictions in Public Form Security.
- **School Onboarding & Leads Conversion**: Register a school or convert a won lead into an active `School` tenant and queue a single-use Headmaster invitation in one transaction.
- **Lead attribution**: Record and filter lead sources including Website, Social Media, Friend or Relative, Referral, Event, Cold Outreach and Other.
- **Tenant Governance**: Search, filter, suspend, or reactivate schools with mandatory audit reasons; configure platform-wide SMTP settings and monitor `Outbox` email/notification delivery health.
- **School Registry Oversight**: Select a school from the Schools Directory, browse year-filtered class cards with active enrollment counts, then load a searched and paginated student roster only for the selected class. The Teacher Assignments view groups a teacher's subject and class-teacher responsibilities into one school- and academic-year-scoped card, with server-side search, filtering, and unique-teacher pagination. Class creation and teacher assignment remain available in the same school workspace.
- **Platform Audit Log**: Search and filter platform and security events by school, actor, category, action, outcome, severity, and date. Review event details on demand, view scoped activity summaries, and export matching results as a bounded, formula-safe CSV.

### 4.2 Headmaster & School Setup Portals (`/headmaster`, `/school-setup`)
- **Academic Year & School Configuration**: Create/edit academic years and terms, configure grading bands and pass marks, and close completed academic years once all assessments and submissions are approved.
- **Staff Lifecycle**: Invite Registrars, Academic Masters, Bursars, and Teachers; resend/revoke invitations; suspend memberships (immediately revoking active sessions while preserving historical records).
- **Executive Oversight**: Monitor school-wide finance totals, review assessment results across classes, inspect staff audit activity, and grant final approval to student report cards.

### 4.3 Registrar Portal (`/registrar`)
- **Admissions, Enrollments & Movements**: Process admission applications, register students and guardian contacts, enroll students into classes, transfer students between streams, and execute atomic year-to-year cohort progressions.
- **Two-Stage CSV / `.xlsx` Student Import**: Upload spreadsheets (up to 5 MB / 5,000 rows), map columns and explicit date formats, preview validation errors without mutating data, and confirm valid rows in resumable atomic batches of 50.
- **Subject Selections & Roster Issues**: Adjust student subject combinations and resolve teacher-reported roster issues.
- **Student Directory and Guardians (Current Implementation)**: Headmaster, Registrar, and Academic Master share the class-card directory and student profiles. Registration can link multiple guardians, including one guardian shared by siblings. These three roles can maintain guardian contacts and relationships and queue parent-account invitations by email or SMS for one guardian, selected students, a class, or all active students in the selected academic year. An invitation alone grants no record access; the guardian activates through the 48-hour token and then signs in to view actively linked children. Activation uses the invitation token without a separate phone-verification code; the six-digit SMS challenge is reserved for public report viewing.

### 4.4 Academic Master & Teacher Portals (`/academic`, `/class-teacher`)
- **Assessments & Marks Lifecycle**:
  1. Academic Master creates an assessment (`AcademicExamItem`) and allocates classes.
  2. Assigned Teacher confirms the class/subject roster, records marks (`0`–`100`) with optimistic draft revision checks, and submits completed marks (`SUBMITTED`).
  3. Academic Master reviews submissions in **Marks Review** and approves (`ACADEMIC_APPROVED`) or returns them with a reason.
  4. Headmaster reviews prepared student reports and approves/publishes (`HEADMASTER_APPROVED` / `PUBLISHED`) official report cards.
- **Attendance, Timetables & Planner**: Class teachers record daily attendance (with audited correction reasons); teachers track syllabus topics, exam slots, and student support plans.
- **Results Delivery (Current Implementation)**: Headmaster and Academic Master can send approved report cards to eligible guardians from a selected class or across the selected academic year. Registrar cannot publish results. Report links require a guardian OTP before viewing and cease working when the student-guardian relationship or report permission is deactivated.

### 4.5 Bursar Portal (`/bursar`)
- **Fee Creation & Application**: Create fee structures in whole Tanzanian Shillings (TZS) for `Term 1`, `Term 2`, or `Full year` across selected classes, and apply them atomically to charge all active, previously uncharged students.
- **Payments, Receipts, Voids & Corrections**: Record full or installment payments against specific fee charges, issue sequential receipts, apply scholarships/adjustments, void erroneous receipts in open years, or replace a payment via **Save correction & replace receipt** while preserving full audit history.

---

## 5. Product & Engineering Roadmap

- **Phase 0 (Completed)**: Comprehensive repository architecture, implementation, and security audit.
- **Phase 1 (Completed)**: Security credential remediation, repository cleanup of 0-byte scaffolds and one-off scripts, developer governance, and unified professional documentation.
- **Phase 2 (Completed)**: Guardian Identity, Multi-Channel Communication (`SmsProvider`, `WhatsAppProvider`, `EmailProvider` via PostgreSQL `Outbox`) and secure expiring report-access links.
- **Phase 3 (Completed)**: Architecture Discovery & Controlled Platform Expansion:
  - Teacher roster confirmation & registrar resolution workflow.
  - School subscriptions, tiered plans, billing cycles, and state machine (`trial` -> `active` -> `renewal_due` -> `grace_period` -> `restricted_access` -> `suspended`).
  - Payment provider abstraction; the mock provider is limited to tests and explicitly enabled development. A production payment gateway is not yet configured, and payment initiation fails closed.
  - Messaging credit wallet & ledger (separate SMS/WhatsApp balances, atomic credit reservation and release).
  - Bank statement reconciliation (safe CSV parsing, SHA-256 duplicate statement detection, and candidate matching engine).
  - Transactional student-guardian links with row locks and soft deactivation; multiple active guardians are supported.
  - Independent phone/email verification invalidation on contact changes.
  - OTP-secured report viewing sessions and authorized PDF downloads.
  - Security events telemetry with automatic secret redaction.
- **Phase 4**: Cloudflare Pages + R2 + Managed PostgreSQL production pilot deployment for Tanzanian schools and cross-school guardian access.

### Current Platform Operations: System Health

Authorized Super Admins can open System Health to inspect measured service conditions, request timings, database probes, process resources, gateway activity, and communication-worker queues. The page supports historical ranges, endpoint filtering/sorting, CSV export, saved alert thresholds and audited acknowledgements. Recovery checks resolve incidents automatically. School roles cannot access infrastructure diagnostics. Missing host/exporter measurements and external uptime coverage are explicitly marked unavailable; see [System Health monitoring](system-health.md).
