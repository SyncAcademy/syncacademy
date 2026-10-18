# SyncAcademy — Backend Architecture (`apps/api`)

## 1. Runtime Structure

The SyncAcademy backend (`apps/api`) is a TypeScript application built on **NestJS 10** and **Prisma 5**, compiled to `apps/api/dist/` and executed as two distinct processes sharing the same codebase:

1. **HTTP API Server (`src/main.ts` -> `src/bootstrap.ts`)**:
   - Configures CORS (`APP_ORIGIN`, `credentials: true`), JSON/raw body parsing, security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`), and global error handling (`HttpErrorFilter`).
2. **Background Worker (`src/worker.ts`)**:
   - Polls the PostgreSQL `Outbox` table every `WORKER_POLL_MS` (default `5000ms`), claims pending jobs (`PENDING` -> `PROCESSING`), dispatches emails via Nodemailer (`PlatformSetting` or env SMTP config), records `CommunicationLog` entries, and retries transient failures with exponential backoff.

---

## 2. Active Controllers & Endpoint Domains

All active controllers are registered in `apps/api/src/app.module.ts`:

### 2.1 `ApiController` (`src/api.controller.ts`) — `/api`
- `GET /api/health` — Database connectivity and runtime health check.
- `GET /api/auth/session` — Returns current authenticated user, active school memberships, and CSRF token.
- `POST /api/auth/login` — Validates credentials (`argon2id`), applies IP/email rate limiting, and creates a `UserSession` cookie (`syncacademy_session`).
- `POST /api/auth/logout` — Revokes the current `UserSession` and clears cookies.
- `POST /api/auth/password-reset/request` & `POST /api/auth/password-reset/confirm` — Tokenized password reset flow via `Outbox` email.
- `GET /api/auth/invitations/:token` & `POST /api/auth/invitations/accept` — Inspects and accepts staff/school-admin invitations (`Invitation`).
- `GET /api/platform-settings` & `PUT /api/platform-settings` — Super Admin runtime configuration (including AES-256-GCM encrypted SMTP credentials) and `POST /api/platform-settings/test-email`.
- `GET /api/schools`, `POST /api/schools`, `PATCH /api/schools/:schoolId`, `DELETE /api/schools/:schoolId` — Super Admin school lifecycle management.
- `GET /api/invitations`, `POST /api/invitations`, `POST /api/invitations/:invitationId/resend`, `POST /api/invitations/:invitationId/revoke` — Staff invitation management.
- `GET /api/audit-logs` — Platform audit log inspection (`SUPER_ADMIN`).
- `POST /api/contact-submissions`, `GET /api/contact-submissions`, `PATCH /api/contact-submissions/:submissionId` — Public landing-page inquiries and Super Admin triage.

### 2.2 `RegistryController` (`src/registry.controller.ts`) — `/api`
- School setup and directory endpoints for `AcademicYear`, `Term`, `Level`, `SchoolClass`, `Subject`, `TeacherSubjectAssignment`, `Student`, and `Guardian` under `/api/schools/:schoolId/*` and `/api/academic-years/*`, `/api/levels/*`, `/api/classes/*`, `/api/subjects/*`, `/api/students/*`, `/api/guardians/*`.

### 2.3 `RegistryWorkflowsController` (`src/registry-workflows.controller.ts`) — `/api`
- Registrar workflow endpoints under `/api/schools/:schoolId/registrar/*`:
  - Student admission applications (`applications`, `applications/:id/status`, `applications/:id/admit`)
  - Class enrollments (`enrollments`)
  - Student promotions (`promotions`)
  - Student transfers (`transfers`)
  - Completion/leaving certificates (`certificates`)
  - School overview metrics (`/api/schools/:schoolId/overview`)

### 2.4 `AcademicController` (`src/academic.controller.ts`) — `/api/schools/:schoolId/academics`
- Full academic portal state (`GET /workspace`) and granular endpoints for:
  - Grading scales (`grading-scales`)
  - Teacher class/subject assignments (`assignments`)
  - Examinations (`exams`)
  - Marks entry and validation (`scores`, `exams/:examId/marks`)
  - Multi-stage approvals (`approvals`, `approvals/:approvalId`)
  - Attendance sessions and student attendance records (`attendance`)
  - Automated report card generation and publication (`report-cards`)

### 2.5 `BursarController` (`src/bursar.controller.ts`) — `/api/schools/:schoolId/bursar`
- Financial fee operations:
  - `GET /workspace` — Consolidated bursar portal state
  - Fee structures (`fee-structures`)
  - Student invoices (`invoices`)
  - Payment recording and receipt numbering (`payments`)
  - Fee adjustment requests and Headmaster approval (`adjustments`)

### 2.6 `RealtimeController` (`src/realtime.gateway.ts`) — `/api/realtime/stream`
- Server-Sent Events stream delivering real-time domain mutation notifications to authenticated browsers scoped by `schoolId`.
