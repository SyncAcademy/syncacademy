# ShuleLink — Full System Specification & Implementation Guide

**Purpose of this file:** This is the single source of truth for building ShuleLink. It is written for an AI coding agent (e.g. Claude Code) to read fully before writing any code, and to reference continuously during implementation. It covers every module, every role's functionality, every user flow, and every page/route needed for the MVP. Nothing here is optional filler — treat every section as a real requirement unless explicitly marked "future / out of scope."

---

## 0. Instructions for the AI Agent

1. **Read this entire document before writing code.** Do not implement a module in isolation without understanding how it connects to the others (student ↔ enrollment ↔ class ↔ subject ↔ teaching assignment ↔ assessment ↔ report ↔ communication is one continuous chain — see Section 5).
2. **There is no mobile app.** ShuleLink is a single responsive web application. Every role — including teachers — uses the web app. Do not scaffold a separate mobile client, React Native project, or app-store deliverable. The "Teacher" experience must simply be a mobile-first, touch-friendly set of web pages inside the same app, per the responsive rules in Section 12.
3. **Some pages already have designs.** Before creating any new UI for a page, check the repository for existing design files/components for that page (e.g. a `/designs`, `/figma-exports`, or existing component library). If a design exists, implement functionality against it — do not redesign it. If no design exists for a page listed in Section 8, build it using the design tokens and responsive rules in Section 12 so it feels consistent with the rest of the product.
4. **Multi-tenancy is non-negotiable.** Every database table that belongs to a school must carry a `school_id`. Every query in every school-scoped route must filter by the authenticated user's `school_id`. A School Administrator, Registrar, Academic Officer, or Teacher must never be able to read or write another school's data, even by guessing an ID. Only Super Admin routes operate across schools.
5. **Build in MVP module order** (Section 6) unless told otherwise — later modules depend on earlier ones (e.g. reports depend on approved assessments, which depend on teaching assignments, which depend on students and classes existing).
6. **Do not build future/out-of-scope features** (Section 14) unless explicitly asked. Do, however, shape the data model so those features can be added later without a rewrite (e.g. leave room for an `Attendance` table keyed on `enrollment_id`).
7. **Every mutating action on data listed as audit-relevant (Section 11) must write an audit log entry.** This is not optional — it is core to ShuleLink's accountability positioning.
8. **When a requirement is ambiguous, use the default stated in this document rather than stopping to ask**, unless the ambiguity would send you in a fundamentally wrong direction.

---

## 1. Product Summary

ShuleLink is a multi-school (multi-tenant) SaaS platform for school management and parent communication, built primarily to solve one problem: **academic reports currently depend on students to carry them home, and often don't arrive.** ShuleLink instead sends reports directly to a verified parent/guardian via WhatsApp or SMS, with delivery and viewing tracked.

Beyond report delivery, the platform manages the full academic lifecycle: students, parents/guardians, classes, subjects, teachers, teaching assignments, academic years, enrollments, promotions, transfers, results entry, and academic approval — all scoped per school, with a Super Admin layer running the platform as a business (schools, subscriptions, leads).

**Core philosophy:** the school owns its data; every employee gets only the access their role needs; teachers work from official student records instead of creating their own; the Registrar owns the student database; administrators control the school; ShuleLink controls the platform; parents get information via WhatsApp/SMS without installing anything.

**Primary differentiator (must be preserved architecturally, not just described in marketing):** the *relationship-driven academic workflow*. A teacher never creates or free-types a student list. The Registrar establishes Student → Class → Subject. The School Admin/Academic Officer establishes Teacher → Class → Subject (teaching assignment). The system derives "which students does this teacher see" automatically from those two relationships. This must be enforced at the data/query level, not just the UI level.

---

## 2. Tech Stack

- **Frontend:** Next.js with TypeScript, Tailwind CSS. Single responsive web app — no separate mobile codebase.
- **Backend:** Next.js API routes / server actions for the MVP (co-located with frontend). Can be split into dedicated services later if scale requires it — do not over-engineer this up front.
- **Database:** PostgreSQL. Recommended managed hosting: Supabase or Neon.
- **ORM:** Prisma.
- **Auth:** Auth.js (or an equivalent secure auth library) supporting role-based sessions for Super Admin, School Admin, Registrar, Academic Officer, Teacher.
- **File/document storage:** Cloudflare R2 or Amazon S3, **private by default** — reports and documents must never be publicly reachable by direct URL. Access only via generated secure/expiring links or authenticated API access.
- **WhatsApp:** Official WhatsApp Business Platform or an authorized WhatsApp Business API provider (e.g. Twilio, MessageBird, 360dialog — pick one BSP and abstract it behind a `MessagingProvider` interface so it can be swapped).
- **SMS:** A Tanzanian/East African bulk SMS provider, used as fallback when WhatsApp delivery fails or is unavailable. Abstract behind the same `MessagingProvider` interface.
- **Hosting:** Vercel for the web app.
- **Analytics (optional, platform-level only):** PostHog or similar — must not expose individual student data.

---

## 3. Core Architecture Principles

1. **Multi-tenant, single shared application.** One codebase and one database serve all schools; logical isolation via `school_id`, not separate deployments per school.
2. **Students are permanent; enrollments are yearly.** A student's core profile (`Student`) never gets recreated or deleted at year-end. Each academic year produces a new `Enrollment` row (class, subjects, status) linked to that same student. This is what allows full multi-year academic history (e.g. Form 1 in 2024 → Form 4 in 2027, all queryable).
3. **Relationships drive access, not manual lists.** Teacher visibility into students is always derived from `TeachingAssignment` (teacher × class × subject × year) joined against `Enrollment` + `EnrollmentSubject`. Never let a teacher's dashboard be backed by a manually curated list.
4. **Everything sensitive is approval-gated before parents see it.** Marks: Teacher submits → Academic Officer approves/returns. Reports: only generated from approved marks, and only sent to parents after being marked "approved for release."
5. **Every report reaches a parent via a secure, trackable, non-public link** — never a raw PDF attachment with no tracking, never a publicly-guessable URL.
6. **Immutable history over destructive edits.** Transfers, promotions, and mark corrections must preserve the "before" state (via status fields and `ResultChangeHistory`/audit log), not overwrite and lose it.
7. **Codes + verification, not codes alone, for staff onboarding.** A school invitation code alone must never be sufficient to create a live staff account — phone/email verification and School Admin approval are both required.

---

## 4. Roles & Access Matrix

| Role | Scope | Can do | Cannot do |
|---|---|---|---|
| **Super Admin** (ShuleLink company) | Whole platform, cross-school | Create schools, create first School Admin per school, generate school codes, manage subscriptions/plans, view business metrics per school and platform-wide, manage the leads/CRM pipeline, platform settings/support | View/edit a school's student, parent, or academic data; act as if they were a school's own admin |
| **School Administrator** | One school | Manage school configuration, academic years, classes, subjects; invite & approve/reject/deactivate staff; review & release reports (one-click send); export school data to Excel; view school dashboard & subscription info; manage communication settings | Access another school's data; create their own account without Super Admin having created the school first |
| **Registrar / Admissions Officer** | One school | Register/edit students, manage parents/guardians (incl. phone verification), assign class & subjects at registration, run bulk Excel/CSV import, handle transfers in/out, respond to teacher-reported roster issues | Enter or approve academic marks; release reports to parents; manage subscriptions |
| **Academic Officer** | One school | Review teacher submissions, approve/return marks, manage exam/academic structures, prepare reports for release, view result change history | Register students; manage staff invitations; release final reports to parents (unless also given School Admin release rights per school configuration) |
| **Teacher** (web portal, not a separate app) | Their own teaching assignments only | View only their assigned class+subject combinations; view/confirm the official roster for each; enter and submit marks; flag roster problems (never edit rosters directly); see their own submission status | See students/classes/subjects outside their assignments; edit the student database; edit marks after submission (must go through correction workflow) |
| **Parent / Guardian** | Their own children only | Receive WhatsApp/SMS messages; open secure report links; nothing else — no login/app required | Access any ShuleLink login/dashboard; see any other student's data |

---

## 5. Data Model

Design as relational tables in PostgreSQL via Prisma. Field lists below are the minimum required fields — add technical fields (timestamps, soft-delete flags, etc.) as needed, but do not drop any listed field or relationship.

- **School** — id, name, code (unique), address, contact_email, contact_phone, logo_url, status (`trial|active|suspended|expired|cancelled`), created_at, subscription_id (FK)
- **SchoolInvitationCode** — id, school_id, role (`school_admin|registrar|academic_officer|teacher`), code (unique, secure), status (`active|used|expired|revoked`), expires_at, created_by, used_by_user_id, used_at
- **User** — id, school_id (nullable — null for Super Admin), role, full_name, email, phone, phone_verified (bool), email_verified (bool), password_hash, status (`pending_approval|active|inactive|rejected`), two_factor_enabled (bool, admins), created_at
- **Student** — id, school_id, student_number (unique per school), full_name, date_of_birth, gender, admission_date, own_phone (optional, distinct from guardian phone), status (`active|transferred_out|graduated|inactive`), created_by (registrar user_id), created_at
- **Guardian** — id, school_id, full_name, phone, phone_verified (bool), email (optional), created_at
- **StudentGuardian** (join) — student_id, guardian_id, relationship (e.g. mother/father/uncle), is_primary (bool)
- **AcademicYear** — id, school_id, label (e.g. "2026"), start_date, end_date, status (`draft|active|closed`)
- **Class** — id, school_id, name (e.g. "Form 3"), stream (optional, e.g. "Form 3A")
- **Subject** — id, school_id, name, code
- **ClassSubject** (join) — class_id, subject_id — which subjects are offered in which class
- **Enrollment** — id, student_id, academic_year_id, class_id, status (`active|promoted|repeated|transferred_out|completed`), enrollment_date
- **EnrollmentSubject** (join) — enrollment_id, subject_id — subjects this student takes this year
- **TeachingAssignment** — id, teacher_user_id, school_id, academic_year_id, class_id, subject_id, status (`active|inactive`) — supports many-to-many: one teacher, many class+subject combos; one class+subject combo, one or more teachers (for streams/shared responsibility)
- **RosterConfirmation** — id, teaching_assignment_id, confirmed_by (teacher), confirmed_at, status (`pending|confirmed|issue_reported`)
- **RosterIssueReport** — id, teaching_assignment_id, student_id (nullable if "missing student"), reported_by (teacher), issue_type (`missing_student|wrong_class|wrong_subject|other`), description, status (`open|resolved`), resolved_by (registrar/academic officer), resolved_at
- **Assessment** (a mark/result) — id, enrollment_id, subject_id, teaching_assignment_id, academic_year_id, term/semester, marks_value, grade, comments, status (`draft|submitted|approved|returned`), submitted_by, submitted_at, approved_by, approved_at, return_reason
- **ResultChangeHistory** — id, assessment_id, old_value, new_value, changed_by, changed_at, reason
- **Report** — id, enrollment_id, academic_year_id, term, status (`generated|approved|released`), file_url (private), secure_link_token, token_expires_at, generated_at, approved_by, approved_at, released_by, released_at
- **Communication** — id, report_id (nullable — also used for non-report messages), guardian_id, channel (`whatsapp|sms`), status (`created|sent|delivered|failed|viewed`), provider_message_id, sent_at, delivered_at, viewed_at, reminder_count, failure_reason
- **Subscription** — id, school_id, plan (`starter|standard|professional|enterprise`), billing_period (`monthly|yearly`), price, status (`trial|active|suspended|expired|cancelled`), start_date, renewal_date, active_student_count (cached), communication_allowance, communication_used
- **Lead** — id, school_name, location, contact_person, phone, email, estimated_students, status (`new|contacted|demo_scheduled|trial|negotiation|converted|not_interested`), notes, follow_up_date, owner_user_id (Super Admin staff), created_at
- **AuditLog** — id, school_id (nullable for platform-level actions), user_id, action, entity_type, entity_id, before (jsonb), after (jsonb), created_at
- **Notification** — id, user_id, type, message, related_entity_type, related_entity_id, read (bool), created_at
- **StudentTransfer** — id, student_id, type (`in|out`), other_school_name (free text, since not all schools are on ShuleLink), transfer_date, notes, processed_by

**Key derived query (must exist as a reusable function/service, not duplicated ad hoc):** *"Get the official student roster for a given TeachingAssignment"* = students whose current `Enrollment.class_id` matches the assignment's class AND whose `EnrollmentSubject` includes the assignment's subject, for the same `academic_year_id`.

---

## 6. Modules (MVP — build in this order)

### 6.1 Authentication & Authorization
- Role-based login for Super Admin, School Admin, Registrar, Academic Officer, Teacher.
- Staff registration only via a valid, unexpired `SchoolInvitationCode` tied to a specific school and role.
- After code entry: require phone or email verification (OTP) before the account can be marked `pending_approval`.
- School Admin must explicitly approve or reject `pending_approval` accounts before they become `active`.
- Password recovery flow.
- Two-factor authentication available for School Admin and Academic Officer accounts (recommended default-on for School Admin).
- Session management: ability to view/revoke active sessions (at least for admins).
- Every login attempt (success/failure) for admin-level roles should be logged.

### 6.2 Super Admin — Platform Administration
- Create a new School record (name, contact info, initial plan).
- System generates a unique school code / secure invitation code for that school.
- Super Admin creates the **first** School Administrator account for that school directly (not via self-registration) — this is the only staff account Super Admin ever creates directly; all other staff are invited by the School Admin (see 6.3).
- View/manage all schools: profile, subscription plan & status, active student count, staff count, reports generated, messages sent, communication usage, storage usage, payment status, created date.
- Manage subscriptions: activate, extend trial, suspend, cancel, change plan, view payment history (see 6.14).
- Platform-wide dashboard (see 6.13).
- Lead/CRM management (see 6.15).
- Platform-level audit log viewer.

### 6.3 Staff Invitation System (School-level)
- School Administrator generates role-specific invitation codes/links (Teacher / Registrar / Academic Officer) — each code tied to a role and school, with an expiry.
- Invited person registers using the code + their own phone/email, completes OTP verification.
- School Administrator sees a queue of `pending_approval` accounts and approves or rejects each.
- School Administrator can deactivate any staff account (e.g. when an employee leaves).
- This means Super Admin only ever creates the first School Admin — the school self-manages the rest of its staff from there on.

### 6.4 Student Registration & Database Management
- Registrar registers a student with: personal info (name, DOB, gender, admission date), student number (unique per school), parent/guardian info (one or more), class, subjects, optional own phone number (clearly distinguished from guardian phone).
- Student's core profile is permanent — it is never deleted or overwritten when a new academic year starts. Yearly changes live in `Enrollment`, not on `Student`.
- Registrar can edit student information and manage status (`active|transferred_out|graduated|inactive`).
- Supports multiple guardians per student, each independently verified (see 6.5).

### 6.5 Parent & Guardian Management + Verification
- Store guardian name, relationship to student, phone number, verification status, optional email.
- Phone verification via OTP (or another secure method) required before a number becomes "verified" and usable for WhatsApp/SMS.
- A student can have multiple guardians (e.g. mother + father), each independently verified; the school can control which guardians receive which types of communication (at minimum: report notifications).
- If a number fails verification or a message fails to deliver because of an invalid number, the Registrar must be notified to correct it (see 6.19 Notifications).

### 6.6 Class & Subject Management
- School Administrator creates classes (e.g. "Form 1", with optional stream like "Form 3A") and subjects.
- School Administrator defines which subjects are offered in which classes (`ClassSubject`).
- This module must exist and be populated before teaching assignments or enrollments can be meaningfully created.

### 6.7 Academic Year Management & Promotion
- School Administrator creates academic years (e.g. "2026") with start/end dates and a status (`draft|active|closed`).
- Enrollment records are created per student per academic year — never delete or overwrite the prior year's enrollment.
- **Promotion workflow:** at year-end, the system proposes each active student's next class based on their current class. An authorized School Admin/Academic Officer reviews and confirms the proposed promotions (bulk, with the ability to override individual students). Confirming creates new `Enrollment` rows for the new academic year while leaving all prior enrollments intact and unmodified.
- Students who complete the final class, or who have left the school, are **not** promoted — their `Enrollment.status` is set appropriately (`completed` or `transferred_out`) and they remain queryable as historical records.

### 6.8 Student Transfer Management
- **Transfer in:** Registrar registers or imports a new mid-year student, assigns current academic year + class + subjects, registers/links guardians, verifies guardian phone(s), and activates the enrollment.
- **Transfer out:** Registrar marks a student as transferred out. This must **not** delete the student or any historical data — it sets `Student.status = transferred_out` and creates a `StudentTransfer` record with date and notes. All historical enrollments/assessments/reports remain queryable by authorized staff.

### 6.9 Excel/CSV Import & Export
- **Import (Registrar):** provide a downloadable official ShuleLink template. Registrar uploads a filled Excel/CSV file. Before committing any data, the system validates and shows a preview summarizing: total rows, valid rows, and specific problems — duplicate student numbers, missing required fields, invalid phone numbers, unknown/unmatched classes or subjects. Example expected UX: "850 records uploaded — 838 valid, 7 duplicate student numbers, 5 missing parent information." Registrar can correct and re-attempt before final commit; only valid rows are importable, and the Registrar chooses whether to import valid rows now and fix the rest later.
- **Export (School Administrator):** "Export School Data" action lets the admin choose which entities to export (students, parents, classes, subjects, teachers, enrollments, etc.), scoped strictly to their own school — never another school's data. Every export must create an audit log entry (who exported what, when).

### 6.10 Teacher & Class Assignment (Teaching Assignments)
- School Administrator or Academic Officer creates `TeachingAssignment` records: one teacher × one class × one subject × one academic year.
- A teacher can have many assignments across many classes and subjects simultaneously (e.g. Math–Form1, Math–Form2, Physics–Form3 — all for the same teacher).
- A single class+subject combination can have more than one teacher assigned (e.g. to support streams, or shared responsibility) — do not model this as a strict one-to-one.
- Streams (e.g. Form 3A/3B/3C) must be representable as distinct `Class` rows so the correct sub-roster reaches the correct teacher.

### 6.11 Teacher Web Portal — Roster Confirmation & Academic Data Entry
- On logging in, a teacher sees a list of their own `TeachingAssignment`s only (e.g. "Form 1 – Mathematics – 42 students", "Form 3 – Physics – 35 students").
- Selecting an assignment shows the **official** roster, derived automatically from `Enrollment` + `EnrollmentSubject` — never a manually created or editable list.
- First time opening an assignment, the teacher is asked to confirm the roster is correct (`RosterConfirmation`). The teacher can confirm, or report an issue per student (missing student, wrong class, wrong subject, other) — this creates a `RosterIssueReport` routed to the Registrar/Academic Officer for resolution. The teacher never edits the student database directly.
- Teacher enters marks and comments per student for the selected assignment; work auto-saves as draft; the UI clearly shows which students still need marks.
- Teacher submits the completed set for review (`Assessment.status: draft → submitted`). After submission, the teacher cannot silently edit results — any correction must go through the correction/audit-logged workflow (see 6.12/6.9's `ResultChangeHistory`).

### 6.12 Academic Approval Workflow
- Academic Officer sees which teachers have submitted vs. not yet submitted, per class/subject/term.
- Academic Officer reviews submitted `Assessment`s and either **approves** them or **returns** them to the teacher with a reason for correction.
- Only after all required subjects for a student's term are approved does that student's report become eligible for generation/release.
- Any mark correction after initial approval must be recorded in `ResultChangeHistory` with old value, new value, who changed it, when, and why.

### 6.13 Report Generation
- Once required subjects are approved for a student/term, the system generates the student's report (PDF), including student info, subjects, marks, grades, comments, and any other school-configured fields.
- Reports are stored privately (never publicly accessible URLs) — see 6.16.

### 6.14 One-Click Report Distribution (WhatsApp/SMS)
- School Administrator (or authorized Academic Officer) selects a class/group/period and clicks **Send Reports**.
- System automatically: identifies each student in scope → finds their verified guardian(s) → generates/retrieves the secure report link → sends a WhatsApp message (falling back to SMS per school configuration if WhatsApp fails/unavailable) to each verified guardian.
- System records communication status per guardian per report: `created → sent → delivered → viewed` (or `failed`, with a reason).
- **Duplicate-send protection:** if a report has already been successfully delivered, the UI must clearly show that status before allowing the admin to resend — resending should be a deliberate, explicit action, not an accidental repeat click.
- If a guardian's number failed verification or delivery failed due to an invalid number, flag it for the Registrar to correct (see 6.19).

### 6.15 Secure Report Access
- Each report is tied to exactly one student and one school, and is only reachable via a secure token-based link (or authenticated in-app access) — never a plain public PDF URL.
- The system must support invalidating/expiring a report link (e.g. after a set period or on demand) to reduce risk from forwarded links.
- Parents need no login/account — the secure link itself is the access mechanism, and opening it records a `viewed` event.

### 6.16 Delivery Tracking & Reminders ("Parent Delivery Center")
- School Admin can see aggregate delivery stats per report run: prepared, approved, sent, delivered, viewed, and how many still need a reminder (e.g. "1,000 prepared, 1,000 approved, 1,000 sent, 982 delivered, 941 viewed, 41 need a reminder").
- System can identify which specific students'/guardians' reports have not been viewed within a configurable period and trigger/allow sending a reminder.
- This view should let the admin drill down to the specific student/guardian causing a gap, not just show a percentage.

### 6.17 School Dashboard (School Administrator)
- Overview metrics: active students, teachers, registered/verified parents, classes, subjects, pending teacher submissions, approved reports, reports sent/delivered/viewed, failed messages, and any other item requiring the admin's attention.
- Should make it easy to spot problems needing action (e.g. failed messages, unverified guardians, pending approvals).

### 6.18 Super Admin / Company Dashboard
- Per-school view: profile, plan, subscription status, active student count, teacher/staff counts, reports generated, messages sent, communication usage, storage usage, payment status, account creation date, current status (`trial|active|suspended|expired|cancelled`).
- Platform-wide view: total schools, total active students, total teachers, total messages sent, total reports generated, total active subscriptions, revenue metrics, trial schools, expired subscriptions.

### 6.19 Notifications
Required notification triggers (in-app at minimum; email/WhatsApp optional per channel availability):
- Teacher → notified when they have pending/unfinished marks.
- Academic Officer → notified when a teacher submits results.
- School Administrator → notified when reports are ready for approval/release, and before subscription expiry.
- Registrar → notified when student information needs correction, or when a guardian phone verification/delivery has failed.
- Parents → receive **only** the communications intended for them (report links, reminders, and any other school-approved messages) via WhatsApp/SMS — never an in-app notification, since parents have no account.

### 6.20 Subscription & Billing Management
- Each school has one `Subscription` record: plan, billing period, price, status, start date, renewal date, communication allowance, communication usage, active student count (only students with an active enrollment in the current academic year count toward billing — transferred-out/completed students do not).
- School Administrator can view their school's subscription details (read-only for the plan itself).
- Super Admin can activate plans, extend trials, suspend accounts, change plans, and view payment history.
- Automatic notification to School Admin before renewal/expiry (see 6.19).
- See Section 9 for the actual plan tiers/pricing to implement.

### 6.21 Lead Management (Super Admin CRM)
- Public marketing site includes a "school interest" form (school name, location, contact person, phone, email, estimated number of students).
- Submissions create a `Lead` in the Super Admin dashboard with status `new`.
- Super Admin staff can move a lead through `new → contacted → demo_scheduled → trial → negotiation → converted / not_interested`, with notes and follow-up dates, and an assigned owner.
- Converting a lead should link forward into creating the actual `School` record (6.2) to avoid re-entering the same info.

### 6.22 Audit Logging
- Log at minimum: student info changes, mark/result changes (with before/after), report approvals, report releases, staff account approvals/rejections/deactivations, data exports, and any subscription/plan change performed by Super Admin.
- Each entry: who, what action, what entity, before/after state where relevant, when, and (for school-scoped actions) which school.
- School Admins should be able to view their own school's audit log; Super Admin can view platform-level actions.

### 6.23 Security & Access Control (cross-cutting — enforce everywhere, not a standalone page)
- Every school-scoped table row carries `school_id`; every query in a school-scoped route filters by the authenticated user's school.
- Passwords hashed securely; sensitive documents never public; communications encrypted in transit.
- Teachers restricted strictly to their own `TeachingAssignment`-derived rosters.
- 2FA available (recommended default) for School Admin and Academic Officer.
- Rate-limit OTP/verification endpoints to prevent abuse.

### 6.24 Marketing / Landing Page
- Explains the problem ShuleLink solves, demonstrates main features, explains how it works, shows pricing, shows screenshots/demo, states benefits, and has a clear "Get Started" / "Request a Demo" CTA.
- Displays selected live platform stats (schools served, students managed, reports delivered, parents reached) — pulled automatically from real data, not hardcoded, and only shown once accurate and appropriate to publish.
- Contains the school interest form (feeds Lead module, 6.21).

---

## 7. User Flows (step by step)

**7.1 Super Admin onboards a new school**
1. Super Admin creates a School record (name, contact info, initial plan/trial).
2. System generates a unique school code / secure invitation reference.
3. Super Admin creates the first School Administrator account directly and shares login credentials/invite with the school contact.
4. School Administrator logs in for the first time and begins school setup (7.2).

**7.2 School Administrator initial setup**
1. Log in, complete profile/2FA setup.
2. Create the current Academic Year.
3. Create Classes (and streams if used) and Subjects; map subjects to classes.
4. Generate invitation codes for Registrar, Academic Officer, and Teacher roles and distribute them to staff.
5. Approve staff accounts as they complete registration + verification.
6. Configure communication settings (WhatsApp/SMS provider settings, allowances).

**7.3 Registrar registers a student manually**
1. Open "Register Student" form.
2. Enter personal info, student number, class, subjects.
3. Add one or more guardians with phone numbers.
4. Trigger OTP verification for each guardian phone.
5. Save — creates `Student` + current-year `Enrollment` + `EnrollmentSubject` rows + `Guardian`/`StudentGuardian` rows.

**7.4 Registrar bulk-imports students**
1. Download the official template.
2. Fill and upload the file.
3. System validates and shows a preview (valid rows vs. specific errors, per 6.9).
4. Registrar fixes source data or proceeds to import valid rows.
5. Confirm import — creates the same underlying records as 7.3, in bulk.

**7.5 Creating teaching assignments**
1. School Admin/Academic Officer opens Teaching Assignments.
2. Selects a teacher, class, subject, academic year → creates a `TeachingAssignment`.
3. Repeats for each combination (a teacher may end up with several).

**7.6 Teacher enters and submits marks**
1. Teacher logs in, sees their list of teaching assignments.
2. Selects an assignment; if first time, confirms the official roster or reports an issue.
3. Enters marks/comments per student; progress auto-saves.
4. Submits the completed set → status becomes `submitted`.

**7.7 Academic Officer approval**
1. Opens the submissions queue, filtered by class/subject/term.
2. Reviews a submission; either approves it or returns it to the teacher with a reason.
3. Once all required subjects for a student/term are approved, that student's report becomes eligible for generation.

**7.8 School Administrator releases reports**
1. Reports are generated for approved students/terms.
2. Admin selects a class/group/period and reviews the generated/approved reports.
3. Clicks **Send Reports**.
4. System resolves each student's verified guardian(s), generates/retrieves secure links, sends via WhatsApp (falling back to SMS as configured), and records delivery status per guardian.
5. Admin monitors the Parent Delivery Center for delivery/viewed status and sends reminders where needed (6.16).

**7.9 Parent receives and views a report**
1. Parent receives a WhatsApp (or SMS) message with a secure link.
2. Parent opens the link — no login required.
3. System records the `viewed` event and timestamp against that `Communication` record.

**7.10 Student transfer in (mid-year)**
1. Registrar registers or imports the student's known info.
2. Assigns current academic year, class, and subjects.
3. Registers/links guardian(s), verifies phone(s).
4. Activates the enrollment. Creates a `StudentTransfer` record (`type: in`).

**7.11 Student transfer out**
1. Registrar marks the student as transferred out, entering date/notes.
2. `Student.status` → `transferred_out`; a `StudentTransfer` (`type: out`) record is created.
3. All historical data remains intact and queryable by authorized staff; the student stops counting toward the school's billable active student count.

**7.12 Academic year-end promotion**
1. School Admin/Academic Officer opens the Promotion tool for the ending academic year.
2. System proposes each active student's next class.
3. Admin reviews, overrides individual students as needed, and confirms.
4. New `Enrollment` rows are created for the new academic year for promoted students; students completing their final class or already transferred out are excluded and their status set accordingly. Prior enrollments are never altered.

**7.13 Staff invitation and approval**
1. School Admin generates a role-specific invitation code/link.
2. Invitee registers using the code + their own phone/email.
3. Invitee completes OTP verification → account status `pending_approval`.
4. School Admin reviews and approves (or rejects) the account → status `active` (or `rejected`).

**7.14 Lead capture and conversion**
1. Prospective school submits the landing page interest form.
2. A `Lead` is created in the Super Admin CRM with status `new`.
3. Super Admin staff move it through the pipeline (contacted → demo scheduled → trial → negotiation).
4. On `converted`, Super Admin creates the actual `School` record (7.1), linking back to the originating lead for reporting.

---

## 8. Page / Route Inventory

*Note: pages marked "(design exists)" should already have a visual design somewhere in the repo/design files — verify before building new UI. Anything not marked that way needs a new page built to the design tokens in Section 12.*

### 8.1 Public Marketing Site
| Page | Route | Purpose |
|---|---|---|
| Home / Landing | `/` | Problem, features, how it works, CTA (design exists) |
| Pricing | `/pricing` | Plan tiers and pricing (design exists) |
| Request Demo / Contact | `/contact` or `/demo` | Interest form → creates a Lead |
| About | `/about` | Company info |

### 8.2 Shared Auth Pages
| Page | Route | Purpose |
|---|---|---|
| Login | `/login` | Role-aware login for all internal roles |
| Register via invitation | `/register?code=...` | Staff self-registration using a school invitation code |
| OTP Verification | `/verify` | Phone/email OTP step |
| Pending Approval | `/pending-approval` | Shown to staff awaiting School Admin approval |
| Forgot / Reset Password | `/forgot-password`, `/reset-password` | Standard recovery flow |

### 8.3 Super Admin Portal (prefix `/super-admin`)
| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/super-admin` | Platform-wide metrics (6.18) |
| Schools list | `/super-admin/schools` | All schools, status, plan |
| Create school | `/super-admin/schools/new` | Create school + first School Admin |
| School detail | `/super-admin/schools/[id]` | Profile, subscription, usage, staff, audit |
| Subscriptions/plans | `/super-admin/subscriptions` | Manage plans, trials, suspensions |
| Leads / CRM board | `/super-admin/leads` | Pipeline view of leads |
| Lead detail | `/super-admin/leads/[id]` | Notes, status, follow-up, convert-to-school |
| Platform audit log | `/super-admin/audit-log` | Platform-level actions |
| Platform settings | `/super-admin/settings` | System-level configuration |

### 8.4 School Portal (prefix `/school`, visibility per role per Section 4)
| Page | Route | Primary role(s) |
|---|---|---|
| Dashboard | `/school/dashboard` | School Admin (design exists) |
| Academic Years | `/school/academic-years` | School Admin |
| Promotion tool | `/school/academic-years/[id]/promote` | School Admin / Academic Officer |
| Classes & Subjects | `/school/classes-subjects` | School Admin |
| Staff list | `/school/staff` | School Admin |
| Invite staff | `/school/staff/invite` | School Admin |
| Pending staff approvals | `/school/staff/pending` | School Admin |
| Students list | `/school/students` | Registrar, School Admin (design exists) |
| Register student | `/school/students/new` | Registrar (design exists) |
| Student detail | `/school/students/[id]` | Registrar, School Admin, Academic Officer (read) |
| Import students | `/school/students/import` | Registrar |
| Transfers | `/school/students/transfers` | Registrar |
| Guardians | `/school/guardians` | Registrar |
| Teaching Assignments | `/school/teaching-assignments` | School Admin / Academic Officer |
| Submissions queue | `/school/academics/submissions` | Academic Officer |
| Submission review detail | `/school/academics/submissions/[id]` | Academic Officer |
| Result change history | `/school/academics/history` | Academic Officer, School Admin |
| Reports management | `/school/reports` | School Admin, Academic Officer (design exists) |
| Send Reports action | `/school/reports/send` | School Admin |
| Parent Delivery Center | `/school/reports/delivery` | School Admin |
| Communication settings | `/school/settings/communication` | School Admin |
| Subscription & billing | `/school/settings/subscription` | School Admin |
| Data export | `/school/settings/export` | School Admin |
| School audit log | `/school/settings/audit-log` | School Admin |
| Notifications | `/school/notifications` | All internal roles |
| Profile/settings | `/school/settings/profile` | All internal roles |

### 8.5 Teacher Web Portal (subset of `/school`, mobile-first responsive — no separate app)
| Page | Route | Purpose |
|---|---|---|
| My Teaching Assignments | `/school/teacher` | List of the teacher's own class+subject combinations |
| Roster confirmation | `/school/teacher/[assignmentId]/roster` | Confirm official roster or report an issue |
| Mark entry | `/school/teacher/[assignmentId]/marks` | Enter/save/submit marks per student |
| Submission status | `/school/teacher/[assignmentId]/status` | Draft/submitted/approved/returned status |
| Notifications | `/school/notifications` | Shared with other roles |
| Profile | `/school/settings/profile` | Shared with other roles |

---

## 9. Subscription Plans Reference (implement exactly, adjust only if told to)

| Plan | Active students | Monthly price | Yearly price |
|---|---|---|---|
| Starter | up to 300 | TSh 60,000 | ~TSh 600,000 |
| Standard | 301–1,000 | TSh 120,000 | ~TSh 1,200,000 |
| Professional | 1,001–2,500 | TSh 250,000 | ~TSh 2,500,000 |
| Enterprise | 2,500+ | Negotiated | Negotiated |

- Billing counts only students with an **active enrollment in the current academic year** — `transferred_out` and `completed` students never count toward the billable total.
- Each plan includes a WhatsApp/SMS communication allowance; usage above the allowance requires purchasing additional credits or upgrading plans. Track `communication_allowance` and `communication_used` on `Subscription` and warn the School Admin as usage approaches the limit.
- Yearly billing is priced at a discount relative to 12× the monthly rate.

---

## 10. Notifications Reference

| Recipient | Trigger |
|---|---|
| Teacher | Has pending/unfinished marks for an assignment |
| Academic Officer | A teacher submits results |
| School Administrator | Reports ready for approval/release; subscription nearing expiry |
| Registrar | Student info needs correction; guardian phone verification/delivery failed |
| Parent (via WhatsApp/SMS only, no in-app account) | Report available; reminder if unviewed after a configurable period |

---

## 11. Audit-Relevant Actions (must write to AuditLog)

Student info changes · mark/result changes (with before/after) · report approvals · report releases · staff account approve/reject/deactivate · data exports · subscription/plan changes (Super Admin) · student status changes (transfer in/out, promotion) · school creation and status changes.

---

## 12. Non-Functional Requirements: Responsive Design System

Apply consistently across marketing site, all dashboards, and the teacher web portal (no separate mobile design system needed since there is no separate app).

- **Base:** root font-size 16px (`1rem = 16px`). Use `rem` for typography and spacing; use `px` only for borders, icons, and other fixed visual details.
- **Typography scale:** body 1rem (16px); small text 0.875rem (14px); metadata 0.8125rem (13px); card headings ~1.125rem (18px); section headings 1.5rem (24px); page headings 2rem (32px); landing hero headings responsive via `clamp()`, roughly 3rem–3.5rem with a max cap.
- **Spacing scale (4px base):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px, expressed in rem in code.
- **Layout:** prefer CSS Grid/Flexbox `gap` over manual margins. Avoid fixed pixel widths on components — use percentages, `minmax()`, `max-width`, intrinsic sizing. Avoid fixed heights — use `min-height`; let content determine height.
- **Containers:** marketing content max-width ~1200–1280px; dashboard max-width ~1440px or more (tables need the room).
- **Breakpoints:** mobile <640px, tablet 640–1023px, desktop 1024–1279px, large desktop ≥1280px. Mobile-first CSS — build the smallest layout first, progressively enhance upward.
- **Touch targets:** at minimum 44–48px for buttons, inputs, checkboxes, dropdowns — this matters especially for the teacher portal, which will often be used on phones.
- **Tables on mobile:** never just shrink a desktop table — hide non-essential columns, use expandable rows, or switch to a card-per-record layout; keep it horizontally scrollable on tablet where genuinely needed.
- **Forms:** full-width fields on mobile; related fields can share a row on tablet/desktop; inputs at least 44–48px tall.
- **Sidebar:** ~240–280px fixed/semi-fixed on desktop; collapses to icon nav on tablet; becomes a drawer on mobile.
- **Border radius:** small controls 6–8px; buttons/inputs ~8px; cards/panels ~12px; large marketing sections 16–24px. Keep it restrained — the product should feel professional, not playful.
- **Borders:** stay at 1px; standard border color `#D9E2EC`.
- **Icons:** interface icons ~18–20px; nav icons ~20–22px; feature/empty-state icons ~32–48px.
- **Shadows:** subtle only — avoid a "floating cards" look; prefer a light shadow plus a subtle border.
- **Viewport units:** use `dvh` (not `vh`) for full-height mobile sections to avoid mobile browser address-bar jumpiness; reserve `vw`/`vh` for hero/full-screen sections only, never for ordinary typography or spacing.
- **Brand consistency:** the same design language (brand typography, color palette, spacing, component styling) must feel identical whether someone is a teacher on a small Android phone browser, a registrar on a laptop, or a School Admin on a large desktop monitor.

---

## 13. Competitive Positioning (context — informs product decisions, not a feature to build)

ShuleLink competes with existing Tanzania/East Africa school management platforms (e.g. ShuleSoft, Scholar, Shule SMS, ShuleXtra, Dshule, Karo). The strategy is **not** "more features than competitors" — it is differentiation through: the relationship-driven academic workflow (Section 3.3), a full accountability chain (who registered/verified/entered/approved/released/delivered — always answerable), fast onboarding via validated Excel import, one-click report distribution, no required parent app (WhatsApp/SMS only), and a focused teacher experience alongside a more powerful admin web platform. ShuleLink works alongside schools' existing WhatsApp groups rather than replacing them — groups remain for general community communication; ShuleLink owns structured, student-specific, private communication (primarily reports). Keep this framing in mind when making UX or workflow trade-off decisions — e.g. never let a shortcut in the UI undermine the relationship/approval chain, since that chain is the core value proposition.

---

## 14. Out of Scope for MVP (future roadmap — do not build now, but keep schema extensible)

Attendance management (would key off `Enrollment`) · School fee management & online payments · Full parent/teacher messaging beyond reports · Parent-facing performance dashboard · Online admissions · Digital certificates/official documents · School calendar & events · Advanced analytics · Native mobile apps for parents/teachers/admins (explicitly not planned — web stays the platform). Do not scaffold empty modules for these; just avoid modeling anything in a way that would block adding them later (e.g. don't hardcode assumptions that a student has only one enrollment ever, or that a report is the only kind of parent communication).

---

## 15. Glossary

- **Enrollment** — a student's class/subject/status record for one specific academic year; distinct from the permanent `Student` profile.
- **Teaching Assignment** — a teacher's authorization to teach a specific subject to a specific class in a specific academic year; the source of truth for what a teacher can see/do.
- **Roster** — the official, system-derived list of students for a teaching assignment; never manually maintained by the teacher.
- **Secure Report Link** — a private, tokenized, expirable URL that gives a parent access to exactly one student's report without a login.
- **Academic Officer** — the role responsible for reviewing and approving/returning teacher-submitted marks before a report can be released.
- **One-Click Report Distribution** — the School Admin action that resolves every eligible student's verified guardian(s) and sends their report link via WhatsApp/SMS in a single action.
- **Parent Delivery Center** — the delivery/viewing tracking view showing prepared → approved → sent → delivered → viewed counts and which parents still need a reminder.
- **Multi-tenant** — one shared application and database serving many schools, with data logically isolated by `school_id`.