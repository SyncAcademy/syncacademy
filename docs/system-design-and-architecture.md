# SyncAcademy — End-to-End System Design & Architecture

This document is the authoritative technical design specification for SyncAcademy across the **Frontend (`apps/web`)**, **Backend (`apps/api`)**, **Database (`apps/api/prisma`)**, **Multi-Tenancy**, **Security**, **Performance**, **Multi-Channel Communications**, and **Architecture Decision Records (ADRs)**.

The current parent mobile API, invitation activation, bearer-session contract, tenant checks, worker leasing, parent FCM device registration, push delivery, and measured scaling limits are documented in [Parent mobile backend](parent-mobile-backend.md). The dual-application mobile architecture, native hardware key vault (Android Keystore and iOS Keychain), encrypted IndexedDB offline storage, and store readiness compliance are documented in [Mobile Architecture, Store Readiness & Security Hardening](mobile-architecture-and-store-readiness.md). A general class lesson timetable remains a planned integration.

---

## 1. End-to-End System Topology

### Current implementation: public school intake

`POST /api/v1/demo-requests` validates a public demo request, applies PostgreSQL-backed public form limits, deduplicates identical school/applicant requests over 24 hours, creates a `PlatformLead`, and queues an acknowledgment in the transactional outbox. `POST /api/v1/contact` uses the same protection service. Public form attempts are stored as hashed email and IP identifiers; restricted and accepted events are visible only to Super Admins through `/api/v1/platform/public-forms/activity`. Authorized administrators can block or unblock an IP for public form submissions through `/api/v1/platform/public-forms/blocks`, with audit records. The worker removes expired blocks and public form telemetry after the configured retention period.

The existing `/api/v1/platform/leads/:leadId/convert` path provisions a school only after a Super Admin has moved an unconverted lead to `won`. It uses the lead's designated Headmaster contact for the pending invitation. Legacy leads without that contact retain their previous applicant invitation behavior. Conversion checks school code and matching school name and region, and the existing idempotency transaction prevents repeat provisioning.

The lead activity table records submissions, edits, stage changes, conversion, internal notes, contact attempts, and demo milestones. Super Admins add activities through `POST /api/v1/platform/leads/:leadId/activities`; each entry is returned with the lead list for the existing details panel.

SyncAcademy is designed as a **modular, multi-tenant web platform** inside an npm workspaces monorepo. It avoids microservice sprawl and external message-broker dependencies (no Redis or Kafka required for MVP) by running three cohesive runtime components backed by **PostgreSQL 16**:

1. **Web Client (`apps/web`)**: Angular 18 + Ionic 8 single-page application serving role-based workspaces.
2. **REST & Realtime API Server (`apps/api` — `src/main.ts`)**: NestJS 10 HTTP server exposing `/api/*` REST endpoints and a Server-Sent Events (SSE) stream at `/api/realtime/stream`.
3. **Transactional Outbox Worker (`apps/api` — `src/worker.ts`)**: Background process polling the PostgreSQL `Outbox` table to dispatch emails, SMS, WhatsApp, and parent push notifications reliably.
4. **Parent Mobile App**: Flutter application for protected parent records, in-app Alerts, and Firebase Cloud Messaging notification registration and tap routing.

```mermaid
flowchart LR
    subgraph Clients["Client Browsers (Desktop & Mobile Web)"]
        SPA["Angular 18 + Ionic 8 SPA<br/>(apps/web)"]
        GuardianLink["Guardian Mobile Browser<br/>(Expiring Report Link)"]
        ParentApp["Flutter Parent App"]
    end

    subgraph Edge["Edge / Reverse Proxy"]
        CF["Cloudflare DNS / WAF / Pages<br/>(or Local Nginx Reverse Proxy)"]
    end

    subgraph Backend["Application Compute Layer (apps/api)"]
        API["NestJS 10 API Server<br/>(/api/* + /api/realtime/stream)"]
        Worker["Outbox Background Worker<br/>(apps/api/src/worker.ts)"]
    end

    subgraph Data["Data & Storage Layer"]
        PG[("PostgreSQL 16<br/>(Tenant Data + Sessions + Outbox)")]
        R2[("Cloudflare R2 / S3<br/>(Report PDFs & School Assets)")]
    end

    subgraph Providers["External Messaging Providers"]
        SMTP["SMTP / Transactional Email"]
        SMS["SMS Gateway<br/>(Beem Africa / NextSMS)"]
        WA["WhatsApp Business API"]
        FCM["Firebase Cloud Messaging"]
    end

    SPA -->|HTTPS + Cookie + CSRF| CF
    GuardianLink -->|HTTPS Signed Token| CF
    ParentApp -->|HTTPS + Parent Bearer Session| CF
    CF -->|/api/*| API
    API -->|Prisma ORM| PG
    API -->|Presigned URLs| R2
    Worker -->|Poll Outbox & Log Delivery| PG
    Worker -->|Dispatch Email| SMTP
    Worker -->|Dispatch SMS| SMS
    Worker -->|Dispatch WhatsApp| WA
    Worker -->|Generic protected alert + notification ID| FCM
    FCM -->|Android / APNs| ParentApp
```

---

## 2. Frontend Design, UI Preservation & Layout Standards (`apps/web`)

### 2.1 Component & State Architecture
- **Framework**: Angular `^18.2.0` using **Standalone Components** (`standalone: true`), lazy-loaded routes (`loadComponent` in `src/app/app.routes.ts`), and **Angular Signals** (`signal`, `computed`).
- **UI System**: Custom SCSS design tokens (`src/styles.scss`) paired with `@ionic/angular ^8.0.0` and `ionicons ^7.0.0`.
- **Application startup**: `AppComponent` displays a responsive SVG graduation-cap preloader while the initial router navigation is unresolved. The cap float and two-second loading-ring rotation use independent CSS transforms; successful, canceled, or failed navigation fades the overlay out over 500ms, with a bounded initialization watchdog and reduced-motion support.
- **Core State Services (`src/app/core/services/`)**:
  - `AuthService` (`auth.service.ts`) — Bootstraps `/api/auth/session`, manages login/logout/invitations/password-reset, and attaches `withCredentials: true` + `x-csrf-token` headers.
  - `SchoolService` (`school.service.ts`) — Manages active tenant context (`schoolId`), directory queries, bursar finance state, and live SSE invalidation streams (`/api/realtime/stream`).
  - `AcademicOperationsService` (`academic-operations.service.ts`) — Manages grading scales, assessments, marks entry, approvals, attendance, and report cards (`/api/schools/:schoolId/academics/*`).
  - `RegistrarOperationsService` (`registrar-operations.service.ts`) — Manages admissions, enrollments, promotions, transfers, and certificates (`/api/schools/:schoolId/registrar/*`).

### 2.2 Active Route Map
| Route Path | Component | Route Guards | Target Roles |
|---|---|---|---|
| `/` | `LandingPageComponent` | Public | Visitors, prospective schools |
| `/auth`, `/login` | `AuthPageComponent` | Public | All authenticating staff |
| `/accept-invitation` | `AcceptInvitationPageComponent` | Public (Token) | Invited admins & staff |
| `/reset-password` | `ResetPasswordPageComponent` | Public (Token) | Staff resetting passwords |
| `/super-admin` | `SuperAdminPageComponent` | `authGuard`, `superAdminGuard` | `SUPER_ADMIN` |
| `/school-setup`, `/school-admin` | `SchoolSetupPageComponent` | `authGuard`, `schoolSetupGuard` | `SCHOOL_ADMIN`, `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/registrar` | `RegistrarPageComponent` | `authGuard`, `registrarGuard` | `REGISTRAR`, `SCHOOL_ADMIN`, `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/bursar` | `BursarPageComponent` | `authGuard`, `bursarGuard` | `BURSAR`, `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/headmaster`, `/head-oversight` | `HeadOversightPageComponent` | `authGuard`, `headTeacherGuard` | `HEAD_TEACHER`, `SUPER_ADMIN` |
| `/academic`, `/academic-setup` | `AcademicSetupPageComponent` | `authGuard` | `SCHOOL_ADMIN`, `HEAD_TEACHER`, `CLASS_TEACHER`, `TEACHER` |
| `/class-teacher`, `/teaching-responsibilities`, `/teacher` | `TeachingResponsibilitiesPageComponent` | `authGuard` | `CLASS_TEACHER`, `TEACHER`, `SCHOOL_ADMIN`, `HEAD_TEACHER` |

*(Note: Six unrouted legacy prototype components under `src/app/features/{academic,bursar/fee-guide,parent,student,teacher,teachers}` are preserved intact pending owner decision.)*

### 2.3 Strict UI Preservation & Responsive Layout Standards
The existing UI in `apps/web` is strictly protected—do not redesign screens, alter color palettes/typography, or replace components without explicit owner approval. All portal views adhere to these responsive standards:
- **Header & Column Containment**: Keep dashboard headers constrained beside the sidebar (`min-width: 0`, `max-width: 100%`, flex/grid wrapping) so titles and action buttons never overflow horizontally.
- **Resizable Desktop Sidebars**: Support user-resizable desktop sidebars between `270px` and `min(420px, 35vw)` via `--sidebar-size` and an accessible edge handle.
- **Compact Mobile Viewports**: Use the Ionic overlay menu capped to the viewport on mobile widths without forcing horizontal page scroll.
- **Scrollable Data Tables & Accessible Dialogs**: Wrap wide tables (marks sheets, student ledgers) in horizontal scroll containers (`min-width: 0`, `max-width: 100%`). Top-layer `<dialog>` modals use blurred backdrops, keyboard focus containment, and `Escape`/outside-click dismissal (blocked while a save is in flight).

### 2.4 Design Governance, Workflow & Canonical Designing-Skills Integration
For new user-facing workflows, components, or layout refinements, SyncAcademy enforces rigorous design engineering standards:

1. **Canonical Design-Skills Source**:
   - Primary design engineering repository: [`https://github.com/realmadede/Designing-Skills.git`](https://github.com/realmadede/Designing-Skills.git).
   - Pinned reviewed revision: `2d228630ba1446365f614a108cb8252f1feda202`.
   - External scripts or commands must never be executed automatically.
2. **Skill Selection & Compatibility Rubric**:
   - Select skills according to task relevance and Angular 18 + SCSS compatibility:
     - `skills/mobile-native/SKILL.md`: Mobile web polish (dynamic viewport units `100dvh`, removing 300ms tap delay via `touch-action: manipulation`, safe area insets `env(safe-area-inset-bottom)`, preventing iOS font zoom on inputs `< 16px`).
     - `skills/break-ui/SKILL.md`: Adversarial UI stress-testing with realistic worst-case data (Tanzanian multi-part names like "Mwanahamisi Abdallah Ndibalema", unbreakable email addresses, missing avatars, extreme TZS currency figures, zero-item empty states, 320px container widths, 200% browser zoom).
     - `skills/animate/SKILL.md` & `skills/animation-performance/SKILL.md`: 60fps composited animations (`transform` and `opacity` only, correct easing curves, zero layout thrashing).
     - `skills/emil-design-eng/SKILL.md` & `skills/apple-design/SKILL.md`: Subtle borders, semi-transparent shadows, and hierarchy.
   - **Excluded Frameworks**: React, React Native, Expo, Swift, Tailwind, or competing UI libraries (e.g., `animate-expo`, `write-swift`, `ask-sonner` are strictly excluded).
3. **Design System Preservation**:
   - The established design tokens, colors, gradients, typography, and class conventions in `apps/web/src/styles.scss` remain authoritative. External skills inform technique, polish, and edge-case handling—they do not replace SyncAcademy's brand or visual language.
4. **Design Proposal & Change Approval Requirements**:
   - Any new screen or component addition requires a design proposal specifying: component hierarchy, responsive breakpoint plan (320px to 1440px), accessibility compliance, and an adversarial worst-case data plan.
   - Strict product owner approval is required before touching existing active portal layouts or stylesheets.
5. **Responsive Testing Standards**:
   - Must be verified at 320px (compact mobile), 768px (tablet), 1024px (desktop), and 1440px (wide desktop). Zero horizontal page scrolling on mobile.
6. **Accessibility Requirements**:
   - WCAG 2.1 AA compliance: minimum 4.5:1 text contrast ratio, visible keyboard focus indicators, explicit `aria-label` attributes on icon-only buttons, and `<dialog>` keyboard containment.
7. **UI Acceptance Criteria**:
   - Zero TypeScript compile errors (`ng build`).
   - Passes all 8 automated portal workflow verification scripts.
   - Passes adversarial worst-case data checks without clipping or broken layouts.

---

## 3. Backend Design & Controller Architecture (`apps/api`)

### 3.1 Runtime Entrypoints & Core Services
- `src/main.ts` -> `src/bootstrap.ts` (`createApiServer`): Configures CORS (`APP_ORIGIN`, `credentials: true`), security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`), and global exception handling (`HttpErrorFilter`).
- `src/worker.ts` (`startWorker`): Polls `Outbox` every `WORKER_POLL_MS`, claims pending events atomically, dispatches messages, writes `CommunicationLog` records, and applies exponential backoff on transient failures.
- `src/platform.service.ts` (`PlatformService`): Central service handling session validation, CSRF checks, RBAC enforcement, transactional outbox enqueueing, and `AuditLog` persistence.
- `src/database/database.service.ts` (`DatabaseService`): Prisma client lifecycle wrapper.

### 3.2 REST Controller Inventory (`src/app.module.ts`)
1. **`ApiController` (`src/api.controller.ts`)**: Health (`/api/health`), session auth (`/api/auth/*`), password resets, invitation acceptance, platform settings (`/api/platform-settings`), Super Admin school management (`/api/schools`), staff invitations (`/api/invitations`), audit logs (`/api/audit-logs`), and public contact inquiries (`/api/contact-submissions`).
2. **`RegistryController` (`src/registry.controller.ts`)**: School setup and directory CRUD for `AcademicYear`, `Term`, `Level`, `SchoolClass`, `Subject`, `TeacherSubjectAssignment`, `Student`, and `Guardian`.
3. **`RegistryWorkflowsController` (`src/registry-workflows.controller.ts`)**: Registrar operations under `/api/schools/:schoolId/registrar/*` (`applications`, `enrollments`, `promotions`, `transfers`, `certificates`) and `/api/schools/:schoolId/overview`.
4. **`AcademicController` (`src/academic.controller.ts`)**: Academic workspace, grading scales, teacher assignments, exams, marks entry/validation, multi-stage approvals, attendance, and report cards under `/api/schools/:schoolId/academics/*`.
5. **`BursarController` (`src/bursar.controller.ts`)**: Financial workspace, fee structures, student invoices, payments/receipts, and fee adjustment requests under `/api/schools/:schoolId/bursar/*`.
6. **`RealtimeController` (`src/realtime.gateway.ts`)**: Tenant-scoped Server-Sent Events stream at `/api/realtime/stream`.

---

## 4. Database Schema & Multi-Tenancy Design (`apps/api/prisma`)

### 4.1 Shared-Database, Shared-Schema Multi-Tenancy
SyncAcademy uses **PostgreSQL 16 + Prisma 5** (`apps/api/prisma/schema.prisma`, 39 models, 19 enums across 14 migrations). Every school is a tenant root (`School.id`), and all tenant-owned tables carry a mandatory `schoolId` column with composite indexes starting with `schoolId`.

```mermaid
erDiagram
    User ||--o{ UserSession : "authenticates"
    User ||--o{ SchoolMembership : "holds role in"
    School ||--o{ SchoolMembership : "authorizes"
    School ||--o{ AcademicYear : "defines"
    School ||--o{ SchoolClass : "organizes"
    School ||--o{ Student : "enrolls"
    School ||--o{ Guardian : "contacts"
    Student ||--o{ StudentGuardian : "linked to"
    Guardian ||--o{ StudentGuardian : "cares for"
    School ||--o{ AcademicExamItem : "schedules"
    AcademicExamItem ||--o{ AcademicScoreRecord : "records marks"
    School ||--o{ FeeStructure : "charges"
    FeeStructure ||--o{ Invoice : "bills"
    Invoice ||--o{ Payment : "collects"
    School ||--o{ Outbox : "queues async events"
    Outbox ||--o{ CommunicationLog : "tracks delivery"
```

### 4.2 Tenant Isolation & Authorization Invariants
1. **Explicit Membership Check**: Every request targeting `:schoolId` must verify that the authenticated viewer is either `SUPER_ADMIN` or holds an `ACTIVE` `SchoolMembership` for that exact `schoolId` with an authorized `MembershipRole`.
2. **Composite Query Scoping**: Every Prisma read, update, or delete on a child model must constrain both `id` and `schoolId` (`where: { id, schoolId }`) to prevent cross-tenant IDOR.
3. **Teacher Assignment Scoping**: `CLASS_TEACHER` and `TEACHER` users may only modify marks or attendance for classes and subjects assigned to them in `TeacherSubjectAssignment` / `AcademicClassAssignment`.

---

## 5. Security Architecture & Credential Governance

1. **Stateful Sessions & Same-Origin Write Protection**:
   - The current runtime stores Express sessions in PostgreSQL (`session`) and delivers the session identifier in an `HttpOnly`, `SameSite=Lax` cookie named `sa.sid` (`Secure` in production).
   - State-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) must pass the configured same-origin, `X-Requested-With`, and JSON content-type checks in `apps/api/src/main.ts`.
2. **Cryptography**:
   - Passwords are hashed using **Argon2id** (`apps/api/src/security.ts`).
   - Sensitive database settings (`PlatformSetting.smtpPassEncrypted`) are encrypted at rest using **AES-256-GCM** keyed by `DATA_ENCRYPTION_KEY`.
3. **Zero Committed Secrets & History Remediation**:
   - All environment variables are validated at startup via **Zod** in `apps/api/src/config.ts`.
   - In Phase 1 (commit `e4adfa8`), all previously committed SMTP credentials and personal developer emails were removed from tracked files. The compromised Google App Password must be revoked in Google Account settings.
   - If the repository owner approves scrubbing historical commit `66d6d71`, run `git filter-repo --replace-text` on a mirror clone and force-push cleaned branches/tags.

---

## 6. Performance, Concurrency & Scalability Design

- **Realtime Invalidation & Client Coalescing**:
  - Domain writes publish lightweight school-scoped invalidation notices over `RealtimeBus` (supporting multi-instance PostgreSQL `LISTEN / NOTIFY` via `REALTIME_TRANSPORT=postgres`).
  - Frontend services coalesce concurrent reads and use revision checks (`workspaceRevision`) plus revision-bound save patches to avoid redundant full-workspace downloads.
- **Optimistic Concurrency (`HTTP 409 Conflict`)**:
  - Student profiles, enrollment movements, marks submissions, and attendance registers enforce version/revision checks inside serializable transactions so stale browser tabs cannot overwrite newer committed records.
- **Query & Storage Scalability**:
  - Finance balance summaries use school-scoped grouped CTEs rather than correlated per-student subqueries.
  - Academic portal storage uses normalized relational tables (`AcademicExamItem`, `AcademicScoreRecord`, `AcademicApprovalItem`, `AcademicAttendanceSession`, `AcademicReportCardRecord`) indexed by `schoolId`.
  - Super Admin school workspaces request summary views for school, year, and class cards without loading student records or the full teaching-assignment relation set. Student rosters are fetched through the school-scoped registry endpoint only after a class is selected, with server-side search and pagination constrained by academic year and active class enrollment.
  - The Super Admin Teacher Assignments view uses `GET /api/v1/schools/:id/teacher-assignments` with a required school-owned `yearId`, optional name/class/subject/role filters, and page sizes of 12, 20, 24, or 48. The API paginates unique teacher memberships before returning each selected teacher's year-scoped subject/class assignments and active class-teacher responsibilities; school access is authorized at the API boundary.

---

## 7. Guardian Identity & Multi-Channel Communication Architecture

### 7.1 Cross-School Guardian Data Model
In Tanzanian schools, parents frequently have children enrolled across multiple SyncAcademy primary and secondary schools. SyncAcademy separates the local guardian school directory contact (`Guardian`) from global parent identity (`User`), joined to students via `StudentGuardian`:

```mermaid
erDiagram
    User ||--o{ Guardian : "claims verified identity (userId)"
    School ||--o{ Guardian : "maintains school record (schoolId)"
    Guardian ||--o{ StudentGuardian : "links to"
    Student ||--o{ StudentGuardian : "belongs to"
    School ||--o{ Student : "enrolls (schoolId)"
    Guardian ||--o{ ReportAccessLink : "recipient of"
    Student ||--o{ ReportAccessLink : "published report card"
```

- **Additive Schema Extensions**:
  - `Guardian`: `userId` (links to global `User`), `phoneE164`, `whatsappPhoneE164`, `preferredChannel` (`SMS`, `WHATSAPP`, `EMAIL`), `preferredLanguage` (`sw` / `en`), `phoneVerifiedAt`, `optOutSms`, `optOutWhatsapp`.
  - Multiple guardians per student (`StudentGuardian.isPrimary`, `canReceiveNotifications`), and multiple students across schools linked to one verified guardian identity.

### 7.2 Pluggable Provider Abstractions (SMS, WhatsApp, Email)
All communication channels implement a unified interface under `apps/api/src/communication/`:
- **`SmsProvider`**: Direct integration with Tanzanian SMS aggregators (**NextSMS** as primary, or Beem Africa) supporting local TZS billing, direct MNO routes (Vodacom, Airtel, Tigo/Mixx, Halotel), and custom Sender ID (`SYNCACADEMY`).
  - Implemented in `apps/api/src/communication/providers/nextsms-sms.provider.ts`.
  - Base URL: `https://messaging-service.co.tz`
  - Authentication: Bearer token (`Authorization: Bearer <token>`) or RFC2045-MIME Basic auth.
  - Endpoints: Single SMS `POST /api/sms/v2/text/single`, Multi SMS `POST /api/sms/v2/text/multi`, Test Single SMS `POST /api/sms/v2/test/text/single` (free testing mode).
  - Character encoding: GSM-7 (160 single / 153 concatenated) and UCS-2 (70 single / 67 concatenated).
  - Phone normalization: E.164 digits-only format (`255XXXXXXXXX`).
  - Anti-flooding filters: NextSMS enforces a default limit of 20 varied messages and 6 identical messages per hour to a single recipient.
- **`WhatsAppProvider`**: NextSMS WhatsApp Gateway (`POST /api/whatsapp/v2/text/single`, Test mode `/api/whatsapp/v2/test/text/single`).
  - Implemented in `apps/api/src/communication/providers/nextsms-whatsapp.provider.ts`.
  - Requires pre-registered WhatsApp account and approved templates in NextSMS dashboard (`Channels -> WhatsApp Channel -> WhatsApp Gateway`).
  - Supports template parameter interpolation (`attributes`), document/PDF attachments (`document`), and recipient mapping.
  - Fallback indication: Code 111 (`REJECTED_MISSING_OUTLET`) triggers automatic fallback to SMS.
- **`EmailProvider`**: 
  - **Resend** (`apps/api/src/communication/providers/resend-email.provider.ts`): Primary transactional email provider supporting modern API key authentication, verified sending domains, and Svix webhook signatures.
  - **Nodemailer SMTP** (`apps/api/src/communication/providers/smtp-email.provider.ts`): Fallback email provider reading credentials from `PlatformSetting` or environment variables.
- **`MockCommunicationProvider`**: In-memory test provider (`apps/api/src/communication/providers/mock-communication.provider.ts`) for deterministic unit and workflow tests without network traffic.

### 7.3 Delivery Reports, Webhooks & Transactional Outbox Integration
- **NextSMS & Resend Webhook Integration (`apps/api/src/webhook.controller.ts`)**:
  - NextSMS callbacks require the configured `NEXTSMS_WEBHOOK_VERIFY_TOKEN`; requests are rejected if it is absent.
  - Delivery reports: `POST /api/v1/webhooks/nextsms/delivery` updates `CommunicationLog` status (`DELIVERED`, `READ`, `UNDELIVERABLE`, `REJECTED`, etc.).
  - Inbound WhatsApp replies: `POST /api/v1/webhooks/nextsms/inbound` parses customer messages and automatically executes opt-out regulations on keywords (`STOP`, `SIMAMA`, `ONDOA`, `UNSUBSCRIBE`).
  - Resend email webhooks: `POST /api/v1/webhooks/resend` handles `email.delivered`, `email.bounced`, `email.complained`.
  - Webhooks are exempt from browser Origin and CSRF token restrictions. NextSMS uses its configured shared token; Resend verifies the Svix HMAC signature over the captured raw body and rejects timestamps outside a five-minute window. Missing verification configuration fails closed.
- **Transactional Outbox Integration (`worker.ts`)**:
  - Domain state changes (e.g. report card publishing, fee payment receipting) and outbox rows are committed in a single ACID transaction (`prisma.$transaction`).
  - Worker polls outbox every second, dispatches via the target channel (`SMS`, `WHATSAPP`, `EMAIL`), updates `CommunicationLog` telemetry, and applies exponential backoff on retryable errors. If WhatsApp delivery encounters non-retryable issues, it automatically falls back to SMS. Messages exceeding 8 attempts are transitioned to dead-letter state (`failedAt`).

### 7.4 Secure, Expiring Report-Access Links (`ReportAccessLink`) & Public Mobile Viewer
Allows parents to view and download term report cards from an SMS, WhatsApp message, or Email without requiring pre-created portal passwords:
- High-entropy 256-bit URL token (`/r/<token>`), unguessable and stored only as SHA-256 hash in `ReportAccessLink.tokenHash`.
- Guardian identity challenge: a verified 6-digit SMS OTP is required before viewing the report card (rate-limited to 10 attempts per 10 minutes). An active student-guardian relationship with report permission is checked again at access time.
- Public mobile web route `/r/:token` (`apps/web/src/app/features/public/report-viewer.page.ts`) adhering to mobile-native polish (safe-area insets, responsive results table, NECTA-aligned grades, print styling).
- School staff can publish report links with notifications in bulk (`POST /api/v1/schools/:schoolId/reports/publish-with-links`) and instantly revoke active links with reason tracking (`POST /api/v1/schools/:schoolId/reports/links/:linkId/revoke`).
- Current implementation: Headmaster and Academic Master may publish only approved academic workspace reports for actively enrolled students, scoped to one class or all classes in an academic year. The Registrar is denied at the API boundary. `GET /api/v1/schools/:schoolId/reports/publish-options?yearId=...` lists available assessments.
- Current implementation: Headmaster, Academic Master, and Registrar may queue parent-account invitations through the parent invitation endpoints for a guardian, student selection, class, or school year. Shared guardians are deduplicated. Invitations use the encrypted outbox and a hashed 32-character activation token; viewing a link does not consume it, and a separate activation OTP is not used. Invitation alone grants no student-record access.

---

## 8. Architecture Decision Records (ADRs)

- **ADR-001 (Frontend Stack)**: Retain **Angular 18 + Ionic 8** (`apps/web`) and strictly preserve the implemented UI portals rather than rewriting into another framework.
- **ADR-002 (Authentication)**: Use **PostgreSQL-backed opaque sessions (`UserSession`) + CSRF headers** instead of stateless JWTs in `localStorage`, enabling instant session revocation when staff memberships are suspended.
- **ADR-003 (Async Messaging & Outbox)**: Use the **PostgreSQL Transactional Outbox (`Outbox` + `worker.ts`)** instead of Redis/Kafka, guaranteeing atomic event enqueueing and low infrastructure cost.
- **ADR-004 (Multi-Tenancy)**: Use a **shared PostgreSQL schema discriminated by `schoolId`** with global `User` identity so staff and cross-school guardians can hold relationships across multiple schools.
- **ADR-005 (Academic Schema Unification)**: Complete consolidation of legacy academic tables (`Examination`, `Mark`, `ReportCard`) into the active normalized `Academic*` relational tables in Phase 2.
- **ADR-006 (Payment Provider Safety Boundary)**: School subscription and credit purchases use a pluggable `PaymentProvider`. The mock provider is enabled only for tests or when explicitly enabled in development. No production payment provider is configured in the current implementation, so payment initiation fails closed rather than confirming invoices or credit purchases automatically.
- **ADR-007 (Messaging Credit Wallet with Atomic Reservation)**: Enforce a dedicated two-phase messaging credit lifecycle (`RESERVATION` -> `CONSUMPTION` / `RELEASE`) with row-level locks on `SchoolCreditWallet` to strictly prevent credit overdraft across high-volume notification bursts.
- **ADR-008 (Bank Statement Reconciliation & Heuristic Matching)**: Process Bursar bank and mobile money CSV statements via SHA-256 duplicate detection and a multi-tier matching engine (exact reference: 100%, date + amount + student identifier: 85-95%) with Bursar confirmation and dispute controls.

---

## 9. Phase 3 — Controlled Platform Expansion

Phase 3 introduces enterprise operational modules expanding administrative oversight, billing, messaging solvency, and financial reconciliation while enforcing strict multi-tenant isolation and security corrections.

### 9.1 Mandatory Architecture Corrections

1. **Transactional Student-Guardian Relationships**:
   - Enforced in `apps/api/src/guardian.controller.ts` using `SELECT ... FOR UPDATE` row locks on the `Student` record within a PostgreSQL transaction.
   - Historical relationships and communication logs are permanently preserved: unlinking a parent sets `active: false` rather than deleting rows.
   - Cross-school isolation is strictly verified: both student and guardian records must belong to the caller's authorized `schoolId`.
   - Multiple active guardians can be linked to one student, and one guardian can be linked to siblings. Parent sign-in is implemented in the mobile app. A parent invitation alone never grants account access; activation links the account only to the school guardian with an active student relationship.
2. **Contact Change and Report Challenge Invalidation**:
   - Phone and email verification states are isolated.
   - When a guardian's phone number changes, outstanding SMS challenges are deleted and `phoneVerifiedAt` is cleared.
   - When an email address changes, email verification challenges are invalidated while preserving unrelated phone verification.
   - Parent activation uses its expiring invitation token; six-digit SMS codes are only used by the public report-viewer challenge.
3. **OTP-Secured Report Access Sessions & Authorized PDF Downloads**:
   - Standalone `phone_last4` challenge is deprecated in favor of verified 6-digit OTP codes.
   - Successful challenge verification returns a cryptographically secure 32-byte session token (`sessionTokenHash` stored in database).
   - Downloading official report card PDFs (`GET /api/v1/public/reports/:token/pdf`) requires an active, verified session token.
   - Revoking a report link immediately clears active viewer session hashes and denies further downloads.

### 9.2 Teacher Roster Confirmation & Registrar Resolution Workflow

Extends student class enrollment with a formal verification and attendance sanity check:
- **Assigned Teacher Scoping**: Teachers can only retrieve and confirm rosters for classrooms explicitly assigned to them in `TeachingAssignment` or homeroom class teacher roles.
- **Student Status Transitions**:
  - `PENDING` -> `CONFIRMED`: Teacher confirms student is active in class.
  - `PENDING` -> `FLAGGED_ISSUE`: Teacher flags student with documented reason (e.g., student absent since term opening or suspected transfer).
  - `FLAGGED_ISSUE` -> `RESOLVED`: Registrar reviews issue, updates student record or class allocation, and marks resolved.
  - `RESOLVED` -> `CONFIRMED`: Teacher re-confirms student following resolution.
- **Headmaster Oversight**: Real-time progress indicators showing confirmation completion rates across all classrooms.

### 9.3 School Subscriptions, Billing State Machine & Payment Webhooks

- **Tiered Plans (`SubscriptionPlan`)**:
  - `BASIC_ANNUAL`: Core student management, academic reports, and 250 messaging credits (up to 300 students).
  - `STANDARD_ANNUAL`: Adds bursar ledger, bank reconciliation, and 750 messaging credits (up to 800 students).
  - `PREMIUM_ANNUAL`: Enterprise scale, priority support, and 2,000 messaging credits (up to 3,000 students).
- **Subscription State Machine**:
  - `trial` (30 days complimentary access) -> `active` (upon confirmed invoice payment).
  - `active` -> `renewal_due` (within 14 days of expiration).
  - `renewal_due` -> `grace_period` (14 days past expiration; full access maintained with warning).
  - `grace_period` -> `restricted_access` (non-destructive restriction: marks entry and reporting restricted, but historical records remain accessible).
  - `suspended`: Administrative freeze initiated by Super Admin.
- **Invoicing & Payments**:
  - Sequential invoice numbers (`INV-SUB-YYYY-SEQ`).
  - Pluggable `PaymentProvider` abstraction with `MockPaymentProvider` available only in isolated tests or explicitly enabled development environments.
  - A real production payment provider is not yet configured. Production payment initiation returns a service-unavailable response and cannot mark subscriptions or credit purchases paid through the mock.

### 9.4 Messaging Credit Wallet & Atomic Ledger Architecture

- **Dedicated Channel Balances (`SchoolCreditWallet`)**:
  - Separate balances for `SMS` and `WhatsApp` units.
  - Pre-packaged top-up bundles (`CreditPackage`) with automated sequential billing (`INV-CRD-YYYY-SEQ`).
- **Two-Phase Credit Reservation Lifecycle (`CreditLedger`)**:
  - **Phase 1 (Reservation)**: Prior to dispatching batch outbox messages, the worker or service executes `SELECT ... FOR UPDATE` and atomically decrements available credits, recording a `RESERVATION` entry. If credits are insufficient, the job is rejected with an overdraft prevention error.
  - **Phase 2 (Consumption / Release)**:
    - On provider delivery success: Ledger entry is transitioned to `CONSUMED`.
    - On permanent provider failure or invalid recipient: Reserved credits are refunded to the school wallet balance and recorded as `RELEASE`.

### 9.5 Bank Statement Reconciliation & Candidate Matching Engine

- **Safe Statement Ingestion**:
  - Accepts standard CSV statements from Tanzanian banks (CRDB, NMB, NBC) and mobile money aggregators (M-Pesa, Airtel Money, Tigo Pesa).
  - SHA-256 file content hashing prevents accidental duplicate uploads.
- **Three-Tier Candidate Matching Engine**:
  1. *Tier 1 (Exact Reference Match)*: Statement reference matches school payment reference or receipt number (100% confidence score).
  2. *Tier 2 (Heuristic Amount & Student Match)*: Transaction amount matches recorded fee payment, date within ±3 days, and student admission number or student surname identified in description (85-95% confidence score).
  3. *Tier 3 (Unmatched)*: Flagged for Bursar review or manual linkage.
- **Audit & Dispute Workflow**:
  - Bursar can confirm candidate matches or flag erroneous bank entries as `DISPUTED` with documented resolution notes.

### 9.6 Security Events Telemetry & Secret Redaction

- **Centralized Event Stream (`SecurityEvent`)**:
  - Categorized telemetry: `AUTHENTICATION`, `AUTHORIZATION`, `MFA`, `OTP`, `REPORT_ACCESS`, `WEBHOOK`, `FINANCIAL`, `WALLET`, `INTEGRITY`.
  - Severity classification: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Zero-Secret Leakage Guarantee**:
  - Automatic recursive redaction replaces sensitive keys, including password, token, secret, OTP, authorization, cookie, CSRF, credential, API-key, private-key, and session fields, with `[REDACTED]` before database insertion.
- **Access Scoping**:
  - Headmaster and School Admin can inspect security events strictly belonging to their `schoolId`.
  - Super Admin has platform-wide query capabilities for threat detection and compliance auditing.

### 9.7 Super Admin Audit Log

- **Unified event view**: `GET /api/v1/audit` combines immutable `AuditEvent` records with `SecurityEvent` telemetry. The API applies search, actor, school, category, action, outcome, severity and UTC date-range filters before returning a page; accepted page sizes are 10, 20, 50 and 100 (the Super Admin UI defaults to 20).
- **Summary and filter options**: `GET /api/v1/audit/summary` returns bounded-period totals, failed authentication and high-risk counts, optionally scoped to a school. `GET /api/v1/audit/filter-options` returns bounded school and action choices for the filters.
- **Event details and export**: `GET /api/v1/audit/:source/:eventId` returns one event's details, with recursively redacted security metadata. `GET /api/v1/audit/export` exports only events matching the same filters and rejects more than 5,000 results. CSV cells are quoted and spreadsheet-formula prefixes are neutralized.
- **Authorization and privacy**: Platform-wide views require Super Admin authorization. School-scoped views are authorized against the selected school at the API boundary. List results omit resource identifiers and event payloads; details are loaded only on demand. Security-event details are redacted before persistence and again before presentation.
- **Frontend behavior**: The Super Admin page preserves filters and pagination in URL query parameters, supports combined filters and server-side pagination, and does not download the complete event stream to paginate locally.

## 10. Current Implementation: Platform Authentication and Administrative System Health

The active runtime uses the controllers in `src/app.module.ts`, PostgreSQL-backed `express-session` authentication, `/api/v1` routes and the Socket.IO gateway in `src/realtime.gateway.ts`. Earlier diagrams and opaque-session/SSE descriptions above describe a different architecture revision and must not be used to introduce a second authentication system into this runtime.

Platform administrators use the manually entered `/platform-access/login` route and versioned `/api/v1/auth/platform/*` endpoints. The public school-role login excludes `SUPER_ADMIN`. Platform access requires an enabled account with `platformAdmin=true`, a password, and TOTP or a one-time recovery code; new authenticator enrollment completes only after code verification and recovery-code acknowledgment. TOTP secrets use the existing AES-256-GCM `DATA_ENCRYPTION_KEY`; recovery codes are stored as hashes and consumed atomically. Authenticator replacement requires a fresh password and current TOTP or recovery code, verifies the new authenticator, rotates recovery codes, records audit/outbox notifications, and revokes account sessions. If all factors are lost, there is no automatic or email-only bypass.

Platform sessions have a 15-minute idle limit, an 8-hour absolute limit, and no remember-device option. Pending MFA challenges expire after five minutes and allow at most five verification failures. `PlatformService` checks MFA assurance and account `sessionVersion` for privileged REST and Socket.IO access; account disablement and authenticator replacement publish user-scoped invalidation events. Same-origin write protection remains in `main.ts`.

The protected monitoring module at `/api/v1/system-health` reuses `PlatformService.administrator` and its selected-role/MFA checks. It collects bounded route-template histograms, process resource measurements, time-limited PostgreSQL probes, gateway counters and communication-worker heartbeats. An additive migration creates aggregate observation, endpoint, incident, settings and heartbeat tables; no tenant data is copied into telemetry. All ordinary school roles are denied access at the backend boundary.

See [System Health monitoring](system-health.md) for current endpoints, aggregation and retention rules, metric scopes, incident recovery, multi-instance configuration and infrastructure measurements that remain unavailable without independent instrumentation.

---

## 11. Current Implementation: School Branding System, Controlled Theme Studio, and Public Resolution

### 11.1 Additive Schema and Tenant Identity Invariants

`School.id` (UUID) remains the immutable internal tenant key used across all foreign keys, session authorizations, academic records, and financial ledgers. `School.code` remains the internal school code. Migration `202610270001_school_identity_and_branding` extends `School` additively with the following columns:

- `slug` (`String? @unique`): Public URL identifier (`School_slug_key` unique index, `School_slug_format_check`, and `School_slug_reserved_check` database constraints).
- `logoStorageKey` (`String?`): Internal object storage key for the school's normalized PNG logo (`School_logoStorageKey_format_check`).
- `publishedTheme` (`Json?`): Currently active versioned `SchoolThemeDocument` (`School_publishedTheme_object_check`).
- `draftTheme` (`Json?`): Unpublished draft `SchoolThemeDocument` for branding editing and preview (`School_draftTheme_object_check`).
- `previousPublishedTheme` (`Json?`): Prior published `SchoolThemeDocument` snapshot enabling atomic rollback (`School_previousPublishedTheme_object_check`).
- `themeVersion` (`Int @default(0)`): Monotonically increasing published theme version counter (`School_themeVersion_nonnegative_check`).

Existing and newly provisioned schools remain valid with `slug = null`, `publishedTheme = null`, `draftTheme = null`, and `themeVersion = 0`, falling back automatically to `DEFAULT_SCHOOL_THEME_DOCUMENT`. The official school display name continues to be read directly from `School.name` and is never duplicated inside theme documents.

### 11.2 Public Slug Validation, Reserved Names, and Super Admin Governance

Public slugs are validated server-side in `apps/api/src/school-branding.ts` (`validateSchoolSlug`) and enforced at the database layer:

- **Format**: Lowercase ASCII letters, digits, and single internal hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), bounded to 3 to 50 characters.
- **Reserved Names**: Centralized in `RESERVED_SCHOOL_SLUGS` (`isReservedSchoolSlug`), blocking platform, routing, and infrastructure identifiers (`admin`, `api`, `www`, `auth`, `login`, `logout`, `parent`, `parents`, `teacher`, `teachers`, `academic`, `bursar`, `registrar`, `head`, `headmaster`, `super-admin`, `platform`, `platform-access`, `public`, `help`, `support`, `status`, `health`, `assets`, `static`, `schools`, `s`, `r`, `accept-invitation`, `reset-password`, `school-setup`, `school-admin`, `head-oversight`, `academic-setup`, `class-teacher`, `teaching-responsibilities`, `system-health`, `webhooks`, `realtime`, `socket-io`, `workspace`, etc.).
- **Authorization**: Only authenticated Super Admins (`PlatformService.administrator`) may assign, change, or clear a school's slug via `PATCH /api/v1/schools/:schoolId/slug` (or `PATCH /api/v1/platform/schools/:schoolId/slug`). Headmasters and other school staff are denied slug modification at the controller and schema boundary.
- **Audit Trail and Redirect Implications**: Every slug assignment or update records `SCHOOL_SLUG_ASSIGNED` or `SCHOOL_SLUG_CHANGED` in `AuditEvent` with `previousSlug -> newSlug` (visible only to Super Admins).

### 11.3 Controlled School Branding Configuration, WCAG 2.2 AA Contrast, and Lifecycle

The School Branding System in `apps/api/src/school-branding.ts` and `apps/api/src/school-branding.controller.ts` supports both the concise branding payload (`{ schemaVersion: 1, colors: { primary, secondary }, welcomeMessage }`) and the full versioned `SchoolThemeDocument` (`schemaVersion: 1`, bounded to 16 KB):

- **Controlled Branding Fields**:
  - `colors.primary` and `colors.secondary`: Strict 6-digit hexadecimal colors (`^#[0-9A-Fa-f]{6}$`) normalized to uppercase `#RRGGBB`. The unified default primary color across backend and frontend is `#B45309` (`5.02:1` contrast against `#FFFFFF`), and the default secondary color is `#1E293B` (`14.63:1` against `#FFFFFF`). Semantic system colors (`success: #10B981`, `warning: #D97706`, `error: #EF4444`, `info: #2563EB`) remain standardized across the platform so operational alerts retain consistent meaning.
  - `welcomeMessage`: Optional plain-text welcome message up to 280 characters, rejecting control characters, HTML tags, external URLs, and scripts.
- **WCAG 2.2 AA Contrast Validation & Secondary Surface Adaptation (NV-05)**:
  - `enforceThemeAccessibilityInvariants` validates that `primary` achieves at least `4.5:1` contrast against `#FFFFFF` (with zero hardcoded exemptions).
  - For `secondary`, `resolveSecondarySurfaceContract` (`resolveSecondarySurfaceTokens` on the frontend) evaluates contrast against the actual **composited surface and hover overlay backgrounds** (`compositeOverlayHex` with `0.08` active surface overlay and `0.12` hover overlay). Dark sidebars must maintain `>= 4.5:1` against `#FFFFFF` and `#E2E8F0` across base, active surface, and hover states; light sidebars must maintain `>= 4.5:1` against `#0F172A` and `#334155`. Ambiguous mid-tones (such as `#757575`) that fail once overlaid are strictly rejected. Accessible high-contrast `:focus-visible` keyboard outlines are enforced on all sidebar navigation elements.
  - When `primary` and `secondary` are identical or have low mutual contrast (`< 1.8:1`), `--school-active-nav-border` and `--school-active-nav-indicator` automatically provide a high-contrast border and indicator so active sidebar navigation items remain visually distinct from inactive items.
- **Draft, Preview, Atomic Publish, Non-Manager Quarantine, and Rollback Lifecycle (NV-01, NV-02, NV-03)**:
  - All authenticated branding mutation, validation, import, and logo endpoints enforce per-user rate limiting and optional `expectedThemeVersion` (`X-Expected-Theme-Version` header on logo upload) optimistic concurrency control, returning `409 Conflict` if another administrator modified the school's branding concurrently.
  - `PATCH /api/v1/schools/:schoolId/branding/draft` (`PATCH /api/v1/schools/:schoolId/theme/draft`): Saves validated changes to `draftTheme` for Super Admin or own-school Headmaster without affecting live users.
  - `GET /api/v1/schools/:schoolId/branding/preview` (`GET /api/v1/schools/:schoolId/theme/preview`): Returns the resolved draft preview contract and `--school-*` / `--sa-*` CSS custom property map.
  - **Quarantine of Draft Data (NV-03)**: `formatAuthenticatedSchoolBranding` accepts `{ includeDraft: boolean }`. Non-manager staff (teachers, registrars, bursars) only receive published branding (`primaryColor`, `secondaryColor`, `welcomeMessage`, `publishedTheme`); draft secondary colors and draft themes are strictly stripped (`draft = null`, `previousPublished = null`), preventing unauthorized visibility of unpublished school brand drafts.
  - `POST /api/v1/schools/:schoolId/branding/publish` (`POST /api/v1/schools/:schoolId/theme/publish`) and `PATCH /api/v1/schools/:schoolId/branding`: Atomically promote `draftTheme` and any unexpired `stagedLogoKey` via `commitStagedLogo` to `publishedTheme` and `logoStorageKey` in a single database transaction, retire any superseded logo, increment `themeVersion`, clear `draftTheme`, and log `SCHOOL_THEME_PUBLISHED`. If the publish fails (e.g., version conflict), the staged logo object is not deleted on the error path, preserving it for administrator retry until background TTL expiry (NV-01). Active logos (`School.logoStorageKey`) are never targeted for error cleanup.
  - `POST /api/v1/schools/:schoolId/branding/reset` (`POST /api/v1/schools/:schoolId/theme/reset`): Completely restores default SyncAcademy branding by clearing `publishedTheme`, `draftTheme`, and `logoStorageKey` (`null`), retiring the previous logo key, incrementing `themeVersion`, and logging `SCHOOL_BRANDING_RESET`.
  - `POST /api/v1/schools/:schoolId/theme/rollback`: Atomically restores `previousPublishedTheme` to `publishedTheme`, increments `themeVersion`, and logs `SCHOOL_THEME_ROLLED_BACK`.
- **Mandatory Application Branding Rules**:
  - **Super Admin (`/super-admin`, `/platform-access`)**: Always retains original SyncAcademy branding (`--portal-accent: #b45309`), including before the initial Angular `NavigationEnd` event completes.
  - **School Staff Web Workspace (`/head`, `/teacher`, `/academic`, `/register`, `/bursar`)**: Applies the active school's published branding (`--school-primary`, `--school-secondary`, derived `--school-secondary-*` and `--school-active-nav-*` tokens, `--portal-accent`, school logo, school name, and welcome message) via `SchoolBrandingService` (`apps/web/src/app/core/services/school-branding.service.ts`) while preserving SyncAcademy's layout, navigation, and component geometry. Web staff routes ignore sticky `localStorage` or query-string `parent` flavor overrides, and native Capacitor builds wait for `PlatformAppService.isInitialized()` before applying school tokens.
  - **Teacher Mobile Application (`appFlavor === 'teacher'`)**: Applies the active school's published branding and identity.
  - **Parent Mobile Application (`appFlavor === 'parent'`, `/parent`, `GET /api/v1/schools/:schoolId/theme/parent-identity`)**: Always retains the original SyncAcademy visual identity (`themeTokensApplied: false`, `globalBrandLocked: true`). Switching between children enrolled in different schools never alters global Parent application theme tokens.
- **Branding Management UI, School Switching Cleanup, & Live Preview**:
  - Headmaster School Settings (`apps/web/src/app/features/headmaster/pages/settings/`) provides a dedicated **School Branding** card with **A. School Identity** (logo upload/replace/remove with `object-fit: contain`), **B. School Colors** (`primary` and `secondary` color pickers, HEX inputs, and live WCAG 2.2 AA contrast badges), **C. Welcome Message** (280-character counter), an isolated **Live Preview** bound to the exact same `--preview-secondary-*` and `--preview-active-*` tokens as the live staff sidebars, and **Save Draft**, **Publish Branding**, and **Restore Default Branding** actions. Switching the active `schoolId` immediately revokes staged `blob:` preview URLs and clears unsaved form state.

### 11.4 School Logo Validation (SVG, PNG, WebP), Normalization, Storage, and Delivery

School logo handling remains a separate image asset managed in `apps/api/src/announcement-media.ts`:

- **Upload Validation & Sanitization (`validateSchoolLogoUpload` & `sanitizeAndValidateSchoolLogoSvg`)**:
  - `PUT /api/v1/schools/:schoolId/branding/logo` (scoped via method-restricted `express.raw` middleware so `GET` and `DELETE` requests are never buffered as raw payloads) accepts raw binary **SVG (`image/svg+xml`)**, **PNG (`image/png`)**, and **WebP (`image/webp`)** uploads up to 2 MB (`maxSchoolLogoBytes`, 256 KB max for SVG).
  - Magic bytes are verified against `Content-Type` to reject MIME/extension spoofing.
  - Uploaded SVG files undergo strict quote-aware XML/AST validation (`sanitizeAndValidateSchoolLogoSvg`) with explicit element, attribute, XML entity (`decodeAndValidateXmlEntities`), root dimension/unit (`px`, `pt`, `pc`, `mm`, `cm`, `in`, `%` up to `2048px`), `viewBox`, and style property allowlists. Any SVG containing `<!DOCTYPE`, `<!ENTITY` (XXE), `<![CDATA[`, `<script>`, `<use>`, `<symbol>`, `on*` event handlers, `<foreignObject>`, `<iframe>`, `<image>`, `<style>`, `<a>`, `href`/`xlink:href`, external URLs (`http://`, `https://`, `//`), `javascript:`, `data:` (including entity-encoded or whitespace-obfuscated URIs), deep nesting (`> 16`), excessive element counts (`> 500`), or dimensions exceeding `2048px` is rejected with `400 Bad Request`.
  - Validated SVGs are rasterized with a dynamically scaled DPI (`resolveSvgRasterDensity`, NV-04). Root `<svg>` attributes (`width`, `height`, and `viewBox`) are parsed, supporting explicit physical units (`px`, `pt`, `pc`, `mm`, `cm`, `in`). When dimensions are missing or percentage-based, `viewBox` coordinates establish the intrinsic aspect ratio and dimension boundaries, scaling raster density (72 to 144 DPI) so pre-resize dimensions never exceed `2048px`. All SVG, PNG, and WebP logos are normalized through Sharp (`failOn: 'error'`) using a dedicated `schoolLogoProcessing` concurrency pool (`max = 4`, isolated from announcement media processing) into a clean, metadata-stripped PNG raster (`fit: 'inside'`, maximum `512x512`, preserving transparency and original aspect ratio). Raw uploaded SVG is never served as active inline markup.
- **School-Scoped Object Keys & Staging Lifecycle (NV-01 & NV-02)**:
  - Normalized logos are stored at `school-logos/<school-id>/<random-uuid>.png` independent of `School.slug`.
  - Migration `202611030001_school_logo_staging_lifecycle` adds the `SchoolLogoObject` model tracking lifecycle statuses (`STAGED`, `COMMITTED`, `RETIRED`, `PURGED`) with database check constraints on status, key format, and school-prefix ownership.
  - Staged logos are recorded with `recordStagedLogo`, bounding each school to at most 20 unexpired pending uploads.
  - Staged logos carry a configurable TTL (`SCHOOL_LOGO_STAGING_TTL_MINUTES`, default 1440 minutes / 24 hours). If a publish attempt encounters a conflict (`409 Conflict`), the staged file is retained so the user can retry without re-uploading. Active logos (`School.logoStorageKey`) are never targeted for error cleanup.
  - Superseded logos are moved to `RETIRED` on commit and deleted safely via `releaseRetiredLogo`, which verifies the key is not currently referenced by `School.logoStorageKey`.
  - Abandoned staged uploads (`STAGED` past `expiresAt`) and retired files are reclaimed idempotently by background worker cleanup (`cleanupSchoolLogos` in `apps/api/src/worker.ts`) using lease-based concurrency locking.
- **Public & Authenticated Cache-Safe Serving**: Both `GET /api/v1/public/schools/:slug/logo` (public) and `GET /api/v1/schools/:schoolId/branding/logo` (authenticated school members) serve the normalized PNG with `Content-Type: image/png`, `Content-Disposition: inline; filename="school-logo.png"`, `X-Content-Type-Options: nosniff`, and `ETag`. Requests carrying a versioned `?v=<12-char-hash>` query parameter return `Cache-Control: public, max-age=31536000, immutable` because every logo change generates a new `logoStorageKey` and a new `?v=` hash; unversioned requests return `Cache-Control: public, max-age=300, stale-while-revalidate=60`. Origin requests for deactivated schools or deleted logos immediately return `404 NotFoundException`, while any previously cached immutable `?v=<hash>` response in browser or CDN caches ages out or is purged via standard CDN cache invalidation.

### 11.5 Public Branding Resolution, General School Directory Redaction, and Tenant Security Boundary

- **Public Endpoints**: `GET /api/v1/public/schools/:slug/branding`, `GET /api/v1/public/schools/:slug/theme`, and `GET /api/v1/public/schools/:slug/logo`.
- **Public & Directory Response Boundary**: Public responses expose only published identity and theme fields (`name`, `slug`, `logoUrl`, `primaryColor`, `secondaryColor`, `welcomeMessage`, `colorContract`, `themeVersion`, `isCustomTheme`, `theme`). General school directory, provisioning, status, and lead-conversion endpoints (`GET /api/v1/schools`, `POST /api/v1/schools`, `PATCH /api/v1/schools/:id`, `POST /api/v1/platform/leads/:leadId/convert`) strip `logoStorageKey`, `draftTheme`, `previousPublishedTheme`, `publishedTheme`, and `themeVersion` so full theme JSON documents are served only by dedicated branding/theme endpoints. Public endpoints never expose `School.id`, `School.code`, `logoStorageKey`, `draftTheme`, `previousPublishedTheme`, staff, students, memberships, finance, subscriptions, or security events.
- **Unknown and Suspended Schools**: `resolveSchoolByPublicSlug` queries `where: { slug, active: true }` and returns a controlled `404 NotFoundException` (`School branding is unavailable.`) for unknown or suspended schools.
- **Tenant Resolution vs. Authorization**: Public slug resolution provides display branding only (`authorized: false`) and never grants authentication or tenant authorization.
