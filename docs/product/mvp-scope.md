# SyncAcademy — MVP Scope

## 1. Purpose of the MVP

The SyncAcademy Minimum Viable Product (MVP) is a responsive, web-first SaaS application designed for real-world school pilots and customer validation in Tanzanian primary and secondary schools.

---

## 2. In-Scope MVP Capabilities

| Domain | MVP Capabilities | Implementation Status |
|---|---|---|
| **Super Admin & Tenant Onboarding** | Provision new schools (`School`), manage school lifecycle status (`ACTIVE`, `SUSPENDED`), invite school administrators, configure platform-wide SMTP/notification settings, and monitor platform audit logs and contact inquiries. | **Implemented** (`/super-admin`, `ApiController`) |
| **School Administration & Setup** | Configure school profile, academic levels (`Level`), classes/streams (`SchoolClass`), subjects (`Subject`), academic years (`AcademicYear`), and terms (`Term`), and manage staff invitations and role memberships (`SchoolMembership`). | **Implemented** (`/school-setup`, `RegistryController`) |
| **Student & Guardian Management (Registrar)** | Manage student admissions applications (`StudentApplication`), register students (`Student`), link guardians (`Guardian`, `StudentGuardian`), enroll students into classes (`Enrollment`), process promotions (`PromotionRecord`), transfers (`TransferRecord`), and issue certificates (`CertificateRecord`). | **Implemented** (`/registrar`, `RegistryController`, `RegistryWorkflowsController`) |
| **Teacher Management & Assignments** | Onboard teachers, assign class teachers (`CLASS_TEACHER`) to homeroom classes, and assign subject teachers (`TEACHER`) to specific class-subject pairs (`TeacherSubjectAssignment`, `AcademicClassAssignment`). | **Implemented** (`/school-setup`, `/academic`, `/class-teacher`) |
| **Examinations, Marks Entry & Automated Grading** | Create term examinations (`Examination`), configure grading scales (`AcademicGradingScale`), enter and validate student marks (`Mark`, `AcademicScoreRecord`), compute automated grades/averages/positions, and enforce multi-step academic and headmaster approvals (`AcademicApprovalItem`). | **Implemented** (`/academic`, `/class-teacher`, `/headmaster`, `AcademicController`) |
| **Academic Reports & Report Cards** | Generate student term result summaries and printable/publishable report cards (`ReportCard`, `AcademicReportCardRecord`) once marks are approved. | **Implemented** (`/academic`, `/class-teacher`, `AcademicController`) |
| **Basic Attendance** | Record and review daily student attendance (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) by class and date (`AttendanceRecord`, `AcademicAttendanceSession`). | **Implemented** (`/class-teacher`, `/academic`, `AcademicController`) |
| **Bursar & Basic Fee Workflows** | Preserve implemented bursar capabilities: fee structures (`FeeStructure`), student invoices (`Invoice`), payment recording (`Payment`), and fee adjustment requests (`BursarAdjustmentRequest`). | **Implemented & Preserved** (`/bursar`, `BursarController`) |
| **Parent Communication Foundation** | Transactional email notifications via PostgreSQL `Outbox` (`worker.ts`), plus architectural foundation for SMS, WhatsApp, cross-school guardian accounts, and expiring report-access links. | **Email Implemented; Multi-Channel & Expiring Links Designed for Phase 2+** |
| **Security, Multi-Tenancy & Auditability** | Cookie-based DB sessions (`UserSession`), CSRF protection, Argon2id password hashing, AES-256-GCM credential encryption, tenant isolation by `schoolId`, and immutable audit logging (`AuditLog`). | **Implemented** (Tenant RBAC hardening prioritized for Phase 2) |

---

## 3. Out-of-Scope for Initial MVP

To maintain engineering focus during school pilots, the following are explicitly **excluded** from the initial MVP:

1. **Native Mobile Applications (iOS/Android)**: The MVP is a responsive web application (`apps/web`) accessible on desktop, tablet, and mobile browsers.
2. **Complex Accounting, Payroll & HR**: Full general-ledger accounting, tax compliance, staff payroll processing, and leave management are out of scope (only existing bursar student fee tracking is included).
3. **AI Tutoring & Automated Content Generation**: AI-assisted lesson planning, automated essay grading, and predictive analytics are deferred to post-MVP phases.
4. **Full Learning Management System (LMS)**: Video hosting, online student quizzes, and digital homework submission portals are out of scope for the initial pilot.
5. **Unnecessary Infrastructure Sprawl**: Kafka, RabbitMQ, microservices, and multi-cluster Kubernetes are excluded in favor of a modular NestJS monolith + PostgreSQL transactional outbox.
