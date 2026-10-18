# SyncAcademy — End-to-End System Design & Architecture

This document is the authoritative technical design specification for SyncAcademy across the **Frontend (`apps/web`)**, **Backend (`apps/api`)**, **Database (`apps/api/prisma`)**, **Multi-Tenancy**, **Security**, **Performance**, **Multi-Channel Communications**, and **Architecture Decision Records (ADRs)**.

---

## 1. End-to-End System Topology

SyncAcademy is designed as a **modular, multi-tenant web platform** inside an npm workspaces monorepo. It avoids microservice sprawl and external message-broker dependencies (no Redis or Kafka required for MVP) by running three cohesive runtime components backed by **PostgreSQL 16**:

1. **Web Client (`apps/web`)**: Angular 18 + Ionic 8 single-page application serving role-based workspaces.
2. **REST & Realtime API Server (`apps/api` — `src/main.ts`)**: NestJS 10 HTTP server exposing `/api/*` REST endpoints and a Server-Sent Events (SSE) stream at `/api/realtime/stream`.
3. **Transactional Outbox Worker (`apps/api` — `src/worker.ts`)**: Background process polling the PostgreSQL `Outbox` table to dispatch emails, SMS, and WhatsApp messages reliably.

```mermaid
flowchart LR
    subgraph Clients["Client Browsers (Desktop & Mobile Web)"]
        SPA["Angular 18 + Ionic 8 SPA<br/>(apps/web)"]
        GuardianLink["Guardian Mobile Browser<br/>(Expiring Report Link)"]
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
    end

    SPA -->|HTTPS + Cookie + CSRF| CF
    GuardianLink -->|HTTPS Signed Token| CF
    CF -->|/api/*| API
    API -->|Prisma ORM| PG
    API -->|Presigned URLs| R2
    Worker -->|Poll Outbox & Log Delivery| PG
    Worker -->|Dispatch Email| SMTP
    Worker -->|Dispatch SMS| SMS
    Worker -->|Dispatch WhatsApp| WA
```

---

## 2. Frontend Design, UI Preservation & Layout Standards (`apps/web`)

### 2.1 Component & State Architecture
- **Framework**: Angular `^18.2.0` using **Standalone Components** (`standalone: true`), lazy-loaded routes (`loadComponent` in `src/app/app.routes.ts`), and **Angular Signals** (`signal`, `computed`).
- **UI System**: Custom SCSS design tokens (`src/styles.scss`) paired with `@ionic/angular ^8.0.0` and `ionicons ^7.0.0`.
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

### 2.3 Strict UI Preservation & Responsive Design Standards
The existing UI in `apps/web` is strictly protected—do not redesign screens, alter color palettes/typography, or replace components without explicit owner approval. All portal views adhere to these responsive standards:
- **Header & Column Containment**: Keep dashboard headers constrained beside the sidebar (`min-width: 0`, `max-width: 100%`, flex/grid wrapping) so titles and action buttons never overflow horizontally.
- **Resizable Desktop Sidebars**: Support user-resizable desktop sidebars between `270px` and `min(420px, 35vw)` via `--sidebar-size` and an accessible edge handle.
- **Compact Mobile Viewports**: Use the Ionic overlay menu capped to the viewport on mobile widths without forcing horizontal page scroll.
- **Scrollable Data Tables & Accessible Dialogs**: Wrap wide tables (marks sheets, student ledgers) in horizontal scroll containers (`min-width: 0`, `max-width: 100%`). Top-layer `<dialog>` modals use blurred backdrops, keyboard focus containment, and `Escape`/outside-click dismissal (blocked while a save is in flight).

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

1. **Stateful Opaque Sessions & CSRF Protection**:
   - Sessions are stored in PostgreSQL (`UserSession`) as SHA-256 hashes (`sessionTokenHash`) and delivered via `HttpOnly`, `SameSite=Lax` cookies (`syncacademy_session`, with `Secure` enabled in production).
   - State-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require an `x-csrf-token` header matching `UserSession.csrfTokenHash`.
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
- **`SmsProvider`**: Direct integration with Tanzanian SMS aggregators (**Beem Africa** or **NextSMS**) supporting local TZS billing, MNO routes (Vodacom, Airtel, Tigo/Mixx, Halotel), and custom Sender ID (`SYNCACADEMY`). Templates enforce GSM-7 encoding (`<= 160` chars).
- **`WhatsAppProvider`**: Meta WhatsApp Cloud API utility templates (`report_card_published_v1`, `attendance_absence_alert_v1`, `fee_payment_receipt_v1`) with localized parameter interpolation (`sw` / `en`).
- **`EmailProvider`**: Nodemailer SMTP (configured via encrypted `PlatformSetting` or env variables).

### 7.3 Transactional Outbox Integration & Failover
- Domain mutations and message enqueueing execute inside the same ACID transaction (`prisma.$transaction`).
- Background worker (`apps/api/src/worker.ts`) polls `Outbox` rows every `5000ms`, dispatches via the guardian's preferred channel, and automatically fails over to secondary channels (e.g., `WHATSAPP` -> `SMS` -> `EMAIL`) on permanent channel errors.
- Max 5 attempts with exponential backoff (`+30s`, `+2m`, `+10m`, `+1h`), with full delivery telemetry and unit costs (TZS) recorded in `CommunicationLog`.

### 7.4 Secure, Expiring Report-Access Links (`ReportAccessLink`)
Allows parents to view and download term report cards from an SMS, WhatsApp message, or Email without requiring pre-created portal passwords:
```prisma
model ReportAccessLink {
  id                  String    @id @default(cuid())
  schoolId            String
  reportCardId        String
  studentId           String
  guardianId          String
  tokenHash           String    @unique // SHA-256 of 256-bit URL token
  expiresAt           DateTime  // Default: +14 days
  revokedAt           DateTime?
  maxAccessCount      Int       @default(25)
  accessCount         Int       @default(0)
  requirePhoneLast4   Boolean   @default(true)
  createdAt           DateTime  @default(now())
}
```
- High-entropy 256-bit URL token (`/r/<token>`), unguessable and stored only as SHA-256 hash.
- Lightweight identity challenge: guardian enters the last 4 digits of their registered phone number before viewing the report card (rate-limited to 5 attempts per 15 minutes).
- Instant revocation by school headmasters/registrars and immutable audit logging on every access attempt.

---

## 8. Architecture Decision Records (ADRs)

- **ADR-001 (Frontend Stack)**: Retain **Angular 18 + Ionic 8** (`apps/web`) and strictly preserve the implemented UI portals rather than rewriting into another framework.
- **ADR-002 (Authentication)**: Use **PostgreSQL-backed opaque sessions (`UserSession`) + CSRF headers** instead of stateless JWTs in `localStorage`, enabling instant session revocation when staff memberships are suspended.
- **ADR-003 (Async Messaging & Outbox)**: Use the **PostgreSQL Transactional Outbox (`Outbox` + `worker.ts`)** instead of Redis/Kafka, guaranteeing atomic event enqueueing and low infrastructure cost.
- **ADR-004 (Multi-Tenancy)**: Use a **shared PostgreSQL schema discriminated by `schoolId`** with global `User` identity so staff and cross-school guardians can hold relationships across multiple schools.
- **ADR-005 (Academic Schema Unification)**: Complete consolidation of legacy academic tables (`Examination`, `Mark`, `ReportCard`) into the active normalized `Academic*` relational tables in Phase 2.
