# SyncAcademy Backend — Agent Instructions (`apps/api/AGENTS.md`)

This document provides workspace-specific governance rules for `apps/api` (`@syncacademy/api`), supplementing the root [`AGENTS.md`](../../AGENTS.md).

---

## 1. Backend Architecture & Entrypoints

- **Framework**: NestJS 10 (`@nestjs/core ^10.0.0`) with Express (`@nestjs/platform-express`) and Prisma (`@prisma/client ^5.22.0`).
- **Runtime Entrypoints**:
  - `src/main.ts` -> `src/bootstrap.ts` (`createApiServer`): HTTP REST server listening on `PORT` (default `3000`).
  - `src/worker.ts` (`startWorker`): Background transactional outbox and notification dispatcher polling `Outbox` (`WORKER_POLL_MS`).
- **Core Active Modules & Controllers**:
  - `src/app.module.ts` — Root NestJS module registering all active controllers and services.
  - `src/api.controller.ts` — Health, auth, session management, super-admin school onboarding, staff invitations, platform settings, and public contact submissions.
  - `src/registry.controller.ts` — School setup, academic years/terms, levels, classes, subjects, teacher assignments, students, and guardians.
  - `src/registry-workflows.controller.ts` — Student applications, enrollments, promotions, transfers, certificates, and school overview stats.
  - `src/academic.controller.ts` — Academic portal workspace, grading scales, exams, marks entry, headmaster/academic approvals, attendance, and report cards.
  - `src/bursar.controller.ts` — Fee structures, invoices, payments, bursar adjustments, and financial analytics.
  - `src/realtime.gateway.ts` & `src/realtime-bus.ts` — Server-Sent Events (`/api/realtime/stream`) scoped by authenticated school membership.
  - `src/platform.service.ts` — Core business logic, session authentication, CSRF enforcement, RBAC checks, outbox enqueueing, and audit logging.
  - `src/database/database.service.ts` — Prisma client lifecycle management (`DatabaseService extends PrismaClient`).

---

## 2. Mandatory Multi-Tenant & RBAC Enforcement Rules

Every controller and service method in `apps/api/src/` must obey these security invariants:

1. **Authenticate Every Non-Public Endpoint**:
   - Call `await this.platform.requireAuthenticatedSession(req)` (or `this.platform.assertCsrf(req)` on state-mutating methods).
2. **Enforce School Membership & Role Authorization**:
   - Before reading or mutating any school-scoped resource (`:schoolId`), verify that the authenticated user is either `SUPER_ADMIN` or has an `ACTIVE` `SchoolMembership` for `schoolId` with an authorized `MembershipRole`.
   - **Warning (Known Phase 0 Audit Priority)**: When touching `RegistryController`, `RegistryWorkflowsController`, `AcademicController`, or `BursarController`, always verify that `assertSchoolAccess(viewer, schoolId, allowedRoles)` is executed before any Prisma query. Never allow an endpoint to rely solely on `requireAuthenticatedSession(req)` without checking `schoolId` membership and role.
3. **Include `schoolId` in All Prisma Queries**:
   - Never query or mutate a child record (`Student`, `Guardian`, `SchoolClass`, `Subject`, `Examination`, `Invoice`, `Payment`, `AttendanceRecord`, etc.) by `id` alone. Always filter by `{ id, schoolId }` or verify parent ownership inside an interactive transaction.
4. **Never Leak Sensitive Fields**:
   - Never return `User.passwordHash`, `PlatformSetting.smtpPassEncrypted`, raw session tokens, or raw invitation/reset tokens in HTTP responses.

---

## 3. Environment Configuration & Secrets

- Environment variables are validated via Zod in `src/config.ts` (`readConfig()`).
- Never hardcode fallback credentials or developer email addresses in `src/config.ts`, `src/api.controller.ts`, or `prisma/seed.ts`.
- Required runtime environment variables:
  - `DATABASE_URL`
  - `APP_ORIGIN`
  - `SESSION_SECRET` (minimum 32 characters)
  - `DATA_ENCRYPTION_KEY` (minimum 32 characters)
  - `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`

---

## 4. Database & Outbox Conventions

- **Schema**: `prisma/schema.prisma`
- **Migrations**: `prisma/migrations/**` (never edit or delete existing migration directories).
- **Outbox Enqueueing**:
  - When triggering emails, SMS, WhatsApp messages, or async notifications, insert an `Outbox` record inside the same `this.db.$transaction(...)` as the domain mutation.
  - Ensure `worker.ts` handlers are idempotent and update `Outbox.status`, `attempts`, `lastError`, and `CommunicationLog` delivery states cleanly.

---

## 5. Backend Build & Test Commands

Run these commands from the repository root before committing backend changes:

```bash
# Generate Prisma client and compile TypeScript
npm run prisma:generate --workspace=apps/api
npm run build --workspace=apps/api

# Run unit tests (no database required)
node --test apps/api/test/email-templates.test.cjs

# Run full integration test suite (requires PostgreSQL running on DATABASE_URL)
npm test --workspace=apps/api
```
