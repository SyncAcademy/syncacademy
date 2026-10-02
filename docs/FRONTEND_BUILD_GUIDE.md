# ShuleLink Frontend Build Guide

## Purpose and scope

This guide is the implementation order for the **pages that do not yet exist** in `apps/web`. It is based on `school.MD`, while preserving the existing Angular/Ionic application and its established visual language.

The current frontend already has a landing page, login and registration pages, dashboard shell, student list/detail pages, a reports page, and several legacy dashboard pages. Do not rebuild those first. Some may need a later ShuleLink-specific refinement, but they are not part of this new-page queue.

Do not create attendance or finance pages for the ShuleLink MVP. They are explicitly out of scope in `school.MD`, even though legacy versions currently exist.

## Existing screens: role and scope audit

The existing `/dashboard` area is a generic school-management dashboard. It is **not** currently a headmaster-only dashboard and it does not yet enforce or even present different views for the ShuleLink roles. The sidebar identifies its user as `Super Admin`, but the navigation contains school-level screens. This must be corrected before it becomes the ShuleLink school portal.

Use the following decisions when refactoring existing screens. "Headmaster" maps to the `school_admin` role in `school.MD`.

| Existing screen | Current issue | ShuleLink decision |
|---|---|---|
| Dashboard overview | Mixes enrollment, finance, attendance, events, and academic activity. Finance and attendance are out of scope. | Refactor as the School Admin dashboard only: active students, staff, verified guardians, pending submissions, report delivery, failed messages, approvals, and subscription alerts. Academic Officer and Teacher need their own role-specific overview states. |
| Sidebar and dashboard shell | One fixed menu for every user; user card says `Super Admin`. | Refactor into role-aware navigation. School Admin, Registrar, Academic Officer, Teacher, and Super Admin must see different menus. |
| Students list | Contains fee-status columns, which are out of scope. | Keep as the student-list foundation. Show it to Registrar and School Admin; remove fee status and add enrollment/guardian information relevant to the MVP. |
| Student profile | Existing profile concept is useful, but it needs role-specific actions. | Keep and refine. Registrar can edit; School Admin has oversight; Academic Officer is read-only; Teacher should not reach it outside an assignment roster. |
| Teachers directory | Generic teacher directory and an unrestricted "Add Teacher" action. | Refactor into School Admin's Staff List. Staff are invited and approved; do not present direct arbitrary teacher creation. |
| Gradebook | Gives a broad gradebook with export/print actions and is available from the common sidebar. | Do not use as a headmaster screen. Replace its workflow with teacher-only Mark Entry and Academic Officer-only Submission Review. |
| Reports and analytics | Mixes enrollment, attendance, fee collection, and pass-rate analytics. | Refactor to report preparation/release/delivery only. It is for School Admin and Academic Officer, with release/send restricted to School Admin. Remove fee and attendance analytics. |
| Users and roles | Offers student users and editable standard role permissions. | Replace with Staff List, invitations, pending approvals, and deactivation. Roles are fixed by the MVP; parents and students do not have dashboard accounts. |
| School settings | Includes attendance and fee settings. | Keep school branding/contact, academic-year defaults, communication, and security. Remove attendance and fee settings. Split substantial areas into the intended settings routes. |
| Attendance | Entire module is out of scope. | Remove from ShuleLink navigation; do not extend it. |
| Finance | Entire module is out of scope. | Remove from ShuleLink navigation; do not extend it. |

### Required role navigation boundary

The finished app must not give every internal role the same dashboard menu:

- **School Admin / Headmaster:** dashboard, academic years, classes and subjects, staff administration, students (oversight), teaching assignments, reports/release/delivery, communication, subscription, export, audit log, notifications, profile.
- **Registrar:** students, registration, import, transfers, guardians, notifications, profile. No marks, report release, subscription, or staff controls.
- **Academic Officer:** academic submissions, result history, promotion, teaching assignments, report preparation, read-only student detail, notifications, profile. No student registration, staff invitation, or final report release.
- **Teacher:** own assignments, roster confirmation, mark entry, submission status, notifications, profile. No general student directory or school settings.
- **Super Admin:** only `/super-admin/...` pages for schools, subscriptions, leads, platform metrics, and platform audit. No school student or academic records.

Parents do not receive a dashboard; they only open secure report links.

## Existing style contract

Build every new page from the current application conventions:

- Angular standalone components inside `apps/web/src/app/features`.
- Ionic controls where they already fit the application; otherwise use semantic HTML and the existing SCSS pattern.
- `Inter` font; orange primary `#E87E24`; slate sidebar `#1E293B`; off-white page background `#F8F9FA`; 1px neutral borders; restrained 6px, 8px, and 12px radii.
- Reuse the dashboard layout, top bar, sidebar behavior, page heading, cards, filters, tables, badges, and form treatment already present in the existing dashboard pages.
- Keep responsive behavior mobile-first. At small sizes, tables become compact cards or retain only essential columns; teacher screens must be comfortable to use with touch.
- Use realistic local mock data and local-state actions only. Do not connect new pages to API endpoints yet.

Before adding a new component, inspect the closest existing page and reuse its layout and SCSS conventions. The aim is for the new work to look like the same product, not a second design system.

## Route transition

The existing application uses `/dashboard/...`; `school.MD` defines the intended product routes under `/school/...` and `/super-admin/...`.

For all new work, use the ShuleLink route structure below. Keep legacy `/dashboard` routes operational until the corresponding route has been built and reviewed. Once a replacement is accepted, redirect the old route rather than maintaining two independent pages.

## Build order

Build one phase completely before moving to the next. Each phase ends with mock interactions, responsive checks, and navigation links that allow the next phase to be demonstrated.

### Phase 0 - foundation (build before any feature page)

Create shared frontend-only building blocks:

- Role-aware navigation configuration for `school_admin`, `registrar`, `academic_officer`, `teacher`, and `super_admin`.
- Shared status badge, empty state, table toolbar/filter bar, confirmation dialog, page header, and responsive record-card components.
- A typed mock-data layer for schools, staff, students, guardians, enrollments, classes, subjects, assignments, assessments, reports, and messages.
- Frontend role switching for demos, clearly isolated from future authentication.

This is not a standalone page, but it prevents every feature from inventing its own styles or fake data shape.

### Phase 1 - school setup and staff administration

Start here because school configuration supplies the choices used by students, assignments, and academic workflows.

| New page | Intended route | Main UI |
|---|---|---|
| Academic years | `/school/academic-years` | List, active/draft/closed badges, create/edit year dialog |
| Classes and subjects | `/school/classes-subjects` | Class list, subject list, offered-subject mapping |
| Staff list | `/school/staff` | Staff directory, role/status filters, deactivate confirmation |
| Invite staff | `/school/staff/invite` | Role selector, invitation expiry, generated invitation state |
| Pending staff approvals | `/school/staff/pending` | Pending accounts, verification state, approve/reject actions |

### Phase 2 - student registration and guardians

The existing student list and profile are the visual references. Add only the missing pages and wire their mock actions back to those existing pages.

| New page | Intended route | Main UI |
|---|---|---|
| Register student | `/school/students/new` | Multi-section form: profile, guardians, enrollment, subjects; validation and save summary |
| Import students | `/school/students/import` | Template download, upload drop zone, validation preview, valid/error rows, import confirmation |
| Student transfers | `/school/students/transfers` | Transfer list plus transfer-in/out actions and historical-status display |
| Guardians | `/school/guardians` | Guardian directory, verification state, linked students, resend-verification action |

### Phase 3 - teaching assignments and teacher portal

This is the product's core workflow. Complete it before report release pages.

| New page | Intended route | Main UI |
|---|---|---|
| Teaching assignments | `/school/teaching-assignments` | Assignment list, filters, create/edit assignment dialog |
| Teacher assignments | `/school/teacher` | Mobile-first cards showing class, subject, roster count, and progress |
| Roster confirmation | `/school/teacher/:assignmentId/roster` | Official roster, confirmation, issue-report form; no roster editing |
| Mark entry | `/school/teacher/:assignmentId/marks` | Touch-friendly marks grid/cards, autosave state, completion progress, submit confirmation |
| Submission status | `/school/teacher/:assignmentId/status` | Draft/submitted/approved/returned timeline and return reason |
| Academic submissions queue | `/school/academics/submissions` | Teacher/class/subject/term filters and submission status list |
| Submission review | `/school/academics/submissions/:id` | Mark review, approve/return action, required return-reason form |
| Result change history | `/school/academics/history` | Audit-style, filterable list of corrections |

### Phase 4 - report release and parent delivery

Build after the mock assessment flow works, so report status has a believable source.

| New page | Intended route | Main UI |
|---|---|---|
| Send reports | `/school/reports/send` | Class/term selection, eligible-recipient summary, duplicate-send warning, explicit send confirmation |
| Parent Delivery Center | `/school/reports/delivery` | Prepared/sent/delivered/viewed metrics, guardian drill-down, reminder action |
| Communication settings | `/school/settings/communication` | Provider/fallback presentation, allowance display, channel defaults |

The existing reports page should later be refined to become `/school/reports`, with report status and links to these two new pages; do not duplicate that page now.

### Phase 5 - school settings and common account pages

| New page | Intended route | Main UI |
|---|---|---|
| Subscription and billing | `/school/settings/subscription` | Plan, usage, renewal, read-only billing summary |
| Data export | `/school/settings/export` | Entity selection, export scope summary, audit notice, confirmation state |
| School audit log | `/school/settings/audit-log` | Filterable action table with before/after detail drawer |
| Notifications | `/school/notifications` | Role-aware notification feed, read/unread state |
| Profile and settings | `/school/settings/profile` | Personal profile, password/2FA presentation, sessions placeholder |

### Phase 6 - missing shared auth and public pages

| New page | Intended route | Main UI |
|---|---|---|
| OTP verification | `/verify` | Phone/email code entry, resend countdown, success/error states |
| Pending approval | `/pending-approval` | Account pending state and next steps |
| Forgot password | `/forgot-password` | Email/phone request form |
| Reset password | `/reset-password` | New-password form and success state |
| Pricing | `/pricing` | Plan comparison from Section 9 of `school.MD` |
| Request demo/contact | `/contact` | School-interest form with submitted confirmation |
| About | `/about` | Company and product positioning |

The existing invitation registration page should be updated later to accept `/register?code=...`; this is an enhancement to an existing page, not a new page.

### Phase 7 - Super Admin portal

Build last because its detail pages consume the same shared components and mock entities created earlier.

| New page | Intended route | Main UI |
|---|---|---|
| Super Admin dashboard | `/super-admin` | Platform metrics and school-status cards |
| Schools list | `/super-admin/schools` | Searchable school list with plan/status filters |
| Create school | `/super-admin/schools/new` | School, initial plan, and first-admin setup form |
| School detail | `/super-admin/schools/:id` | School profile, usage, staff, subscription, audit tabs |
| Subscriptions | `/super-admin/subscriptions` | Plan and account-status management UI |
| Leads board | `/super-admin/leads` | Pipeline board/list with filters |
| Lead detail | `/super-admin/leads/:id` | Notes, follow-up, status, convert-to-school action |
| Platform audit log | `/super-admin/audit-log` | Cross-school platform actions |
| Platform settings | `/super-admin/settings` | Platform configuration placeholders |

## Definition of done for each page

A frontend page is complete only when it has:

1. A registered intended route and correct navigation entry for the relevant role.
2. Desktop, tablet, and mobile layouts that preserve usable controls and readable information.
3. Mock loading, empty, populated, and error states where applicable.
4. Local interactions for its primary actions, including confirmation for consequential actions such as submit, approve, reject, release, resend, deactivate, or export.
5. Accessible labels, keyboard operation, visible focus states, and no color-only status meaning.
6. No live backend integration, secrets, provider SDKs, or fake claims that an external action was actually sent.

## First implementation slice

Begin with Phase 0, then implement `/school/academic-years`, `/school/classes-subjects`, `/school/staff`, `/school/staff/invite`, and `/school/staff/pending`. This produces the configuration and staff-management foundation that every academic screen depends on, while allowing the existing student and report designs to remain intact.
