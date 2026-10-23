# Implementation Plan: Mandatory MFA for Platform Administrators

**Date**: 2026-10-23  
**Spec**: User-provided read-only attachment, “SyncAcademy — Secure Platform Administrator Authentication with Mandatory MFA”

**Execution status**: Implementation tasks T001–T017 and local verification are complete. Production staging checks remain release gates.

## Summary

Isolate Platform Administrator sign-in from the public school-role login, add a manually entered `/platform-access/login` entry point, and require password plus RFC 6238 TOTP (or a one-time recovery code) before creating a fully authorized platform session. First-time setup must be challenge-bound and complete code verification and recovery-code acknowledgment before authentication. Enforce MFA assurance on every existing Super Admin REST and realtime path, including direct API requests and sessions created by legacy auth flows. Preserve school staff sign-in and existing password policy.

This is a brownfield change, not an authentication-system replacement. The active code uses Angular, NestJS, PostgreSQL-backed `express-session`, Prisma, `otplib`, `qrcode`, an existing AES-256-GCM encryption helper, a PostgreSQL-backed rate-bucket table, and existing audit/security-event infrastructure. Reuse these components. The `User` model already contains `platformAdmin`, `enabled`, `sessionVersion`, encrypted-MFA-secret storage, TOTP replay state, and hashed recovery-code storage. The session store is the PostgreSQL `session` table; it is not a Prisma `UserSession` model.

**Confirmed deployment contract:** use the repository’s existing `/api/v1` namespace, so the endpoint is `POST /api/v1/auth/platform/login` and sibling challenge endpoints remain under `/api/v1/auth/platform/`. No unversioned alias is exposed.

No Super Admin dashboard redesign, unrelated feature work, password-policy change, new frontend framework, MFA library, or custom cryptography is in scope.

## Technical Context

**Languages/frameworks in the working tree**: Angular 20.3.32; NestJS 11.2.6; Prisma 6.19.3; API TypeScript 5.6.3; Web TypeScript 5.9.3; PostgreSQL; Node.js. Do not upgrade or downgrade dependencies as part of this feature.

**Authentication and authorization**:
- `apps/api/src/main.ts`: `express-session`, `connect-pg-simple`, cookie name `sa.sid`, HttpOnly/SameSite=Lax, Secure in production, 8-hour rolling cookie, and same-origin/JSON/`X-Requested-With` checks on mutating requests.
- `apps/api/src/platform.service.ts`: shared password verification, `session()` regeneration, `user()` / `authorize()` / `administrator()` checks, rate limiting, challenge-bound TOTP enrollment and verification, recovery, replacement, and session-version validation. The ordinary login rejects `SUPER_ADMIN`; the dedicated flow creates a fully authorized platform session only after mandatory MFA.
- `apps/api/src/api.controller.ts`: `/api/v1` controller containing ordinary authentication endpoints and most platform-only REST routes. Other platform-only routes include `security-events.controller.ts`, `wallet.controller.ts`, `subscription.controller.ts`, and `monitoring/monitoring.controller.ts`.
- `apps/api/src/realtime.gateway.ts`: Socket.IO platform scope checks `PlatformService.administrator()` at connection and before delivery.
- `apps/web/src/app/core/services/auth.service.ts`, `core/guards/auth.guard.ts`, `app.routes.ts`, `features/auth/pages/login/`, and `features/super-admin/super-admin.routes.ts`: client auth state, shared role login, guarded routes, and the Super Admin dashboard route tree.

**Existing persistence/crypto**: `apps/api/prisma/schema.prisma` has `User.mfaSecret`, `mfaLastStep`, and `mfaRecovery`; the initial SQL migration already creates these fields. `WebSession` maps to the existing `session` table. `apps/api/src/security.ts` implements Argon2id password hashing, AES-256-GCM encryption through `DATA_ENCRYPTION_KEY`, SHA-256 digests, and random tokens. `otplib` and `qrcode` are already installed. `RateBucket` and serializable transaction/retry support already exist.

**Audit and notifications**: use `AuditLogService.recordSecurityEvent()` and/or the existing `AuditEvent` stream so events appear in the current Audit Log. Existing sanitization redacts password, token, secret, OTP/code, cookie, and session-like fields. Use the existing outbox/email path for recovery-use notifications; never place secret values in events or email.

**Testing**: `apps/api/test/auth.test.cjs` runs against a disposable PostgreSQL database and exercises real sessions, role authorization, MFA, recovery, rate limits, and logout. Focused security-hardening, audit-log, realtime, and monitoring tests, frontend portal checks, workspace builds, and the frontend typecheck are included in local verification.

**Storage/migration approach**: prefer reusing current MFA columns and helper implementations; no new schema columns are indicated by the inspected flow. Add a one-time, additive data migration to increment `sessionVersion` for existing platform administrators, revoking legacy sessions that may predate the new flow. If implementation discovers that new persisted state is essential, add it only with a reviewed Prisma schema change and additive migration; do not store plaintext TOTP/recovery data.

**Constraints**: no password reset or policy changes; no MFA bypass or trusted-device option; no admin discovery links; no change that makes MFA newly mandatory for school staff; production requires HTTPS; no production development bypass; no secrets in `.env.example` or logs. Use existing UI tokens and components for the dedicated page and do not redesign existing screens.

## Constitution Check

No `constitution.md` or project-topology artifact was found in the inspected `.github`/`docs` locations. The plan therefore applies repository governance and the current architecture documentation:

| Principle / constraint | Result |
|---|---|
| Preserve current Angular/NestJS/PostgreSQL architecture and reuse secure components | Pass: use existing session, Prisma, Argon2id, authenticated encryption, TOTP, rate-limit, audit, and outbox components. |
| Backend is the security boundary; no trust in frontend roles or hidden routes | Pass: challenge state and assurance are enforced in server-side session and centralized authorization checks. |
| School authentication and tenant boundaries remain intact | Pass: the isolated PostgreSQL suite verifies all supported school roles and dual-role account behavior. |
| Avoid unrelated UI redesign and dependency/framework additions | Pass: add only a dedicated auth workflow using current Angular patterns and branding. |
| No plaintext secrets, password-policy changes, or bypasses | Pass, with release gates for secret-redaction, session revocation, and MFA-negative tests. |
| Keep canonical docs aligned with the active runtime | Pass: the system and deployment docs now describe PostgreSQL-backed Express sessions, same-origin write checks, the versioned API, and mandatory platform MFA. |

## Applied Guidelines

- Follow the actual runtime called out by `docs/system-design-and-architecture.md` section 10: PostgreSQL-backed `express-session`, `/api/v1`, and the active `AppModule` controllers; do not create a parallel JWT/session architecture.
- Keep credentials and TOTP secrets server-side; use Argon2id for passwords, authenticated encryption for TOTP seeds, cryptographic randomness for recovery codes, hashes for recovery-code storage, atomic one-time consumption, and atomic TOTP time-step replay prevention.
- Reuse `PlatformService.rate()`/`RateBucket`, serializable transaction retries, `AuditLogService`, `Outbox`, Angular `AuthService`, and existing design tokens. Do not add dependencies without a reviewed necessity.
- UI work should preserve SyncAcademy branding, existing `AuthLayoutComponent`/`LogoComponent` patterns and accessible form behavior. No public page or navigation element should advertise the route.

## Confirmed Decisions

The user-provided security audit resolves the former owner gates. The exact values and rationale are recorded in `research.md`; no product or policy decision remains open.

1. Use only `/api/v1/auth/platform/*` endpoints.
2. Preserve `sa.sid`, PostgreSQL-backed `express-session`, and origin + `X-Requested-With` + JSON write checks.
3. Allow authenticator replacement after fresh password plus current TOTP or unused recovery code, then require verification of the replacement; rotate recovery codes, notify, audit, and revoke all account sessions. If all factors are lost, require a separate verified operational action by another active platform administrator; do not provide an app bypass.
4. Apply 15-minute idle, 8-hour absolute, five-minute challenge, five failed verification attempt limits, and no remember-device option.
5. Reuse AES-256-GCM with `DATA_ENCRYPTION_KEY`.
6. Require `enabled=true && platformAdmin=true`.
7. Target current manifests and runtime without dependency changes.

## Implementation Steps

### Phase 1: Setup and security contract

#### Step 1.1: Record the confirmed runtime contract
- **Requirements**: REQ-003, REQ-008, REQ-009, REQ-014
- **Design inputs**: `docs/system-design-and-architecture.md` section 10; `apps/api/src/main.ts`; `apps/api/src/platform.service.ts`; `apps/api/src/config.ts`; `research.md`
- **Description**: Record the user-selected contract and inventory every API/Socket.IO authorization path. Policy decisions are resolved; production-like migration and HTTPS/cookie checks remain release validation.

#### Step 1.2: Revoke pre-feature administrator sessions
- **Requirements**: REQ-008, REQ-009
- **Design inputs**: `User.sessionVersion`; `PlatformService.user()`; `express-session` PostgreSQL store.
- **Description**: Add a one-time data migration that increments `sessionVersion` on all `User.platformAdmin = true` accounts, invalidating existing sessions without deleting school sessions or modifying account passwords/MFA data. Deploy with no mixed old/new API replicas; rehearse and verify the migration on a production-like database before release. No structural Prisma change is planned unless implementation evidence requires one.

#### Step 1.3: Define restricted challenge/session state
- **Requirements**: REQ-004, REQ-005, REQ-008, REQ-009
- **Design inputs**: `apps/api/src/session.d.ts`; `PlatformService.session()` and existing `WebSession` store.
- **Description**: Define explicit server-side pending-admin challenge purpose, target user, expiration, and enrollment/recovery-ack stage. A pending challenge must not set the normal authenticated `userId`/`selectedRole`/MFA assurance state. Challenge completion must regenerate the session ID and destroy/expire the pending challenge.

### Phase 2: User story 1 — Private administrator entry and password step (P1)

#### Step 2.1: Remove public administrator discovery
- **Requirements**: REQ-001, REQ-003, REQ-013
- **Design inputs**: `apps/web/src/app/features/auth/pages/login/login.page.ts`; `apps/web/src/app/app.routes.ts`; `apps/api/src/api.controller.ts`.
- **Description**: Remove `SUPER_ADMIN` from the role-picker options and ordinary login request schema. Preserve Headmaster, Registrar, Academic Officer, Teacher, and Bursar options. Search all public navigation/content/generated sitemap configuration for administrator entry links; do not add a link or advisory text. The dedicated path remains manually enterable but is not an authorization boundary.

#### Step 2.2: Add dedicated administrator login screen and route
- **Requirements**: REQ-002, REQ-001
- **Design inputs**: `apps/web/src/app/app.routes.ts`; `features/auth/pages/login/`; existing `AuthLayoutComponent`, `LogoComponent`, design tokens.
- **Description**: Add `/platform-access/login` as a standalone route with professional branded “Platform Administration” login, email/password, show/hide toggle, validation, loading, and generic failure states. No registration, signup, reset bypass, public link, or remember-device control. Add distinct challenge, enrollment, TOTP, recovery-code display, and acknowledgement screens/states without changing the Super Admin dashboard.

#### Step 2.3: Implement isolated administrator password verification
- **Requirements**: REQ-003, REQ-004, REQ-010, REQ-012
- **Design inputs**: `apps/api/src/api.controller.ts`; `apps/api/src/platform.service.ts`; `apps/api/src/security.ts`; `apps/api/src/config.ts`.
- **Description**: Add the dedicated platform-login endpoint at the owner-approved path, initially recommended as `POST /api/v1/auth/platform/login`. Reuse normalized email, Argon2id verification (including dummy verification for unknown accounts), generic errors, and existing request validation. Accept only `platformAdmin && enabled`; deny school-only users, inactive accounts, and ordinary-role sessions. Rate-limit by IP and account using existing PostgreSQL rate buckets. Successful password verification creates only a short-lived, account-bound restricted challenge; it must not create a Super Admin session or return privileged identity data. Ordinary `/auth/login` must reject `SUPER_ADMIN`.

### Phase 3: User story 2 — Mandatory TOTP and first enrollment (P1)

#### Step 3.1: Implement account-bound TOTP enrollment
- **Requirements**: REQ-004, REQ-005, REQ-006, REQ-010
- **Design inputs**: `PlatformService.setupMfa()` / `verifyMfa()`; `security.ts`; `schema.prisma` existing `mfaSecret`, `mfaLastStep`, `mfaRecovery`; `session.d.ts`.
- **Description**: Allow enrollment only from the unexpired password-verified admin challenge. Generate the seed with `otplib`, produce standards-compatible provisioning URI/QR with existing `qrcode`, encrypt the seed with the approved key, and return the seed/QR only over a no-store response during pending setup. Confirm a six-digit code before activating MFA; enforce attempt limits and bounded clock skew. Never expose an enrolled seed again.

#### Step 3.2: Complete TOTP sign-in only after atomic verification
- **Requirements**: REQ-004, REQ-006, REQ-008, REQ-009
- **Design inputs**: `PlatformService.verifyMfa()`; `PlatformService.atomic()`; current `mfaLastStep`; `main.ts` session cookie configuration.
- **Description**: Add distinct pending-login TOTP verification. Atomically compare-and-advance `mfaLastStep` so expired, already-consumed, concurrent-reuse, wrong-user, and expired-challenge attempts fail. Only successful verification creates the normal `SUPER_ADMIN` session, after session-ID regeneration, with no remember-device state. Enforce the approved administrator idle/absolute timeouts without changing staff session semantics.

#### Step 3.3: Complete enrollment only after recovery-code acknowledgment
- **Requirements**: REQ-005, REQ-006, REQ-009
- **Design inputs**: `apps/web/src/app/features/platform-access/`; `PlatformService` enrollment flow; existing `User.mfaRecovery`.
- **Description**: Generate cryptographically random one-time recovery codes after enrollment verification, store only their hashes, display them only once, and keep the server challenge restricted until explicit acknowledgment that codes were saved. On acknowledgment, finalize a regenerated authenticated session. Ensure refresh/back navigation cannot retrieve codes again or skip acknowledgment.

### Phase 4: User story 3 — Recovery and authenticator replacement (P1)

#### Step 4.1: Implement password-plus-recovery-code sign-in and notification
- **Requirements**: REQ-007, REQ-010, REQ-011
- **Design inputs**: `PlatformService.recoverMfa()`; `PlatformService.atomic()`; `AuditLogService`; existing mail/outbox services.
- **Description**: Allow a recovery code only within a valid password-verified admin challenge. Consume exactly one hash atomically, deny replay/concurrent reuse, rate-limit by account and IP, emit a security audit event, and notify the account owner through the existing outbox/email path. The email must not contain a login link or replacement code. Password-reset endpoints may update a password but must never create an authenticated admin session or disable MFA.

#### Step 4.2: Implement only the owner-approved reset/replacement workflow
- **Requirements**: REQ-007, REQ-008, REQ-011
- **Design inputs**: Owner decision 3; platform invitation/account management; `AuditLogService`.
- **Description**: Implement authenticator replacement after fresh password plus current TOTP or unused recovery code, then verify a new authenticator and acknowledge newly rotated recovery codes. Revoke sessions, notify and audit. If every factor is lost, require separate verified operational recovery by another active platform administrator; do not add an application bypass.

### Phase 5: User story 4 — MFA assurance on every privileged path (P1)

#### Step 5.1: Enforce admin assurance centrally across REST and realtime
- **Requirements**: REQ-003, REQ-008, REQ-009, REQ-013
- **Design inputs**: `PlatformService.user()`, `authorize()`, `administrator()`; all `ApiController` platform routes; `security-events.controller.ts`; `wallet.controller.ts`; `subscription.controller.ts`; `monitoring/monitoring.controller.ts`; `realtime.gateway.ts`.
- **Description**: Centralize the invariant that a platform request requires a current, enabled platform-admin account, `SUPER_ADMIN` role, valid server-side session, and successful MFA for that session. Apply it to every existing platform REST endpoint, platform workspace/API data, direct database/action route, and Socket.IO platform subscription/reconnect/delivery. Pending setup or login challenges cannot use `/auth/me` or any protected feature as an authenticated session. Audit password-reset, invitation acceptance, ordinary login, logout, and any legacy/renewal path for alternate privilege creation. Scope MFA-pending/setup flags to platform sessions only; a platform administrator who also holds a school membership must retain school-role access without gaining platform authority or having a new school MFA requirement imposed.

#### Step 5.2: Preserve session, CSRF, logout, and account-status controls
- **Requirements**: REQ-008, REQ-009, REQ-012, REQ-013, REQ-014
- **Design inputs**: `apps/api/src/main.ts`; `session.d.ts`; `PlatformService.session()` / `user()` / `logout()`; `config.ts`.
- **Description**: Retain HttpOnly/SameSite cookies, production Secure cookies, existing origin/content-type protections, CSRF policy after the owner resolves the documented mismatch, session rotation, logout destruction, version invalidation, no-store responses, and production HTTPS enforcement. Refuse account-switch/role-claim manipulation and make password reset/re-authentication preserve MFA. Keep current 15-character administrator password policy and Argon2id verification unchanged.

### Phase 6: Cross-cutting security, verification, and rollout

#### Step 6.1: Add complete security audit and abuse controls
- **Requirements**: REQ-010, REQ-011, REQ-014
- **Design inputs**: `PlatformService.rate()`; `RateBucket`; `AuditLogService`; `security-events.controller.ts`; `main.ts`.
- **Description**: Cover admin password attempts, invalid/repeated TOTP, challenge expiry/reuse, enrollment, recovery-code use, reset/replacement, unauthorized access, logout, and session revocation. Record outcome, administrator ID when known, timestamp, and bounded IP/user-agent metadata. Verify no password, TOTP code/seed, QR payload, recovery code, cookie, or raw session token appears in logs, API error detail, audit metadata, or client storage. Add no-store headers to sensitive challenge/setup responses. No security-sensitive development bypass may exist in production.

#### Step 6.2: Document configuration and deployment order
- **Requirements**: REQ-006, REQ-009, REQ-014
- **Design inputs**: `apps/api/src/config.ts`; `.env.example`; `docs/development-and-deployment.md`; migration/release procedure.
- **Description**: Document only required variables with placeholders (reuse `DATA_ENCRYPTION_KEY` unless the owner approves a separate key). Validate HTTPS and Secure cookie behavior in production. Document migration preflight, forced admin session invalidation, staged rollout without old/new API overlap, rollback implications, admin enrollment/onboarding, and monitoring for lockouts. Never write secrets into `.env.example`.

#### Step 6.3: Verify attack cases and school-auth regression
- **Requirements**: REQ-001 through REQ-015
- **Design inputs**: `apps/api/test/auth.test.cjs`; `apps/api/test/security-hardening.test.cjs`; `apps/api/test/audit-log.test.cjs`; `apps/api/test/realtime-platform.cjs`; `apps/web/scripts/check-super-admin.mjs`; CI workflow.
- **Description**: Extend the isolated-PostgreSQL integration suite for every required positive and negative case (see Testing Strategy), add frontend checks for public role-list removal and direct dedicated-route access with no public link, and verify all existing school roles and workflows remain unaffected. Run Prisma generation/migrations, API and web builds, focused auth/security/audit/realtime tests, frontend Super Admin checks, and CI-equivalent checks before release.

## Project Structure

```text
apps/
  api/
    prisma/
      migrations/202610230001_platform_admin_mfa_session_revoke/migration.sql
      schema.prisma                         # only if reviewed schema changes prove necessary
    src/
      api.controller.ts                     # ordinary login exclusion + platform auth endpoints
      platform.service.ts                   # challenge, TOTP, recovery, session and authz invariants
      session.d.ts                          # restricted challenge state
      main.ts                               # cookie/CSRF/no-store policy as approved
      config.ts                             # validate only approved security configuration
      security.ts                           # reuse existing crypto; do not add custom primitives
      audit-log.service.ts                  # reuse audit path/sanitization if extension needed
      realtime.gateway.ts                   # platform session assurance
      security-events.controller.ts
      wallet.controller.ts
      subscription.controller.ts
      monitoring/monitoring.controller.ts
    test/
      auth.test.cjs                         # isolated PostgreSQL end-to-end coverage
      security-hardening.test.cjs
      audit-log.test.cjs
      realtime-platform.cjs
  web/
    src/app/
      app.routes.ts
      core/services/auth.service.ts
      core/guards/auth.guard.ts
      features/auth/pages/login/login.page.ts
      features/platform-access/              # new manual-entry admin login/MFA screens
    scripts/
      check-platform-admin-auth.mjs          # public-route and admin-flow regression checks
    package.json                             # wire focused browser/static checks into CI
.env.example
docs/development-and-deployment.md
.github/workflows/ci.yml                    # only if the new focused check is not in existing CI commands
```

## Testing Strategy

- **appType**: SPA + REST API + Socket.IO with PostgreSQL-backed sessions.
- **Critical user journeys**:
  1. Public school-role picker has exactly the five supported school roles; `/platform-access/login` has no public inbound link and works when entered directly.
  2. Eligible enabled admin signs in with password, enrolls an authenticator, confirms a valid setup code, acknowledges one-time recovery codes, then reaches the existing dashboard.
  3. Enrolled admin signs in with password and valid TOTP; password-only, invalid, expired, replayed, concurrent-reuse, wrong-account, and expired-challenge attempts never reach protected APIs.
  4. Recovery code works only after password verification, is consumed once, emits audit/notification, and cannot be replayed; account reset/replacement cannot bypass MFA.
  5. Direct REST, Socket.IO, refresh/session reload, alternate login, account-switch, and manipulated frontend role paths are denied without authenticated MFA assurance; school staff login and permissions remain unchanged.
- **Primary validation stack**: existing Node test runner + API integration test against disposable PostgreSQL, Prisma migration deploy/generate, Angular/Nest builds, existing security/audit/realtime suites, frontend verification scripts, and CI/CodeQL.
- **Fallback matrix**:
  - `infra-tier`: disposable PostgreSQL database and actual API process (as in `apps/api/test/auth.test.cjs`) → no mocked database substitute for transaction/replay/recovery acceptance tests. If PostgreSQL is unavailable, unit/static checks are incomplete and cannot satisfy the release gate.
  - `browser-tier`: Angular build plus focused route/DOM check using existing repository harness → manual 320px/desktop checks where browser automation is unavailable. Lack of browser automation does not replace the automated API integration tests.
- **Environment requirements**: Node/npm versions supported by the working tree, PostgreSQL 16, disposable isolated test database, environment configuration from `.env.example`, test-only `APP_ORIGIN`, and CI/browser runtime already used by the repository.
- **Known gaps**: integration tests do not prove Cloudflare proxy configuration or real production secret-manager behavior. Migration behavior is verified against the isolated PostgreSQL test database; HTTPS/cookie and proxy configuration still require staging verification.
- **Test data strategy**: use the existing isolated `syncacademy_auth_test` database guard; unique test identities/UUIDs; never execute truncation or migrations against the development/production database. Create both platform-admin and school-only fixtures, including disabled admin and multi-role account cases.
- **Acceptance criteria**: all 20 security checks in the supplied audit, existing staff role auth tests, builds, focused API checks, and CI workflow checks pass; no unresolved product or policy decision; migration invalidates legacy admin sessions; secret scan/log inspection finds no secrets. Production staging checks remain a release gate.
- **Validation review expectations**: reviewer traces each `REQ` to plan items/tasks/tests; checks the full REST/socket route inventory, one-time state transitions and transaction behavior, session expiry/revocation, generic errors, audit redaction, deployment ordering, and that no public discovery or school-auth regression was introduced.

## Task Breakdown

### Phase 1: Setup and security contract

- [x] T001 [Plan:1.1] Record decisions D1–D7 in `research.md`; confirm the API path, same-origin write contract, replacement/lost-factor policy, session lifetimes, encryption key, active-account rule, and current runtime versions.
- [x] T002 [Plan:1.2] Add `apps/api/prisma/migrations/202610230001_platform_admin_mfa_session_revoke/migration.sql`; verify in a rolled-back transaction on `syncacademy_auth_test` that platform-admin versions increment and school-only versions do not change.
- [x] T003 [Plan:1.3] Define explicit pre-auth platform challenge stages and expirations in `apps/api/src/session.d.ts`; keep challenge state separate from authenticated identity and MFA assurance.

### Phase 2: User story 1 — Private administrator entry and password step

- [x] T004 [US1] [Plan:2.1] Remove `SUPER_ADMIN` from public role selection and ordinary login; verify the five school roles and absence of public admin links.
- [x] T005 [US1] [Plan:2.2] Add the manually entered `/platform-access/login` route and dedicated branded Angular flow without signup or remember-device controls.
- [x] T006 [US1] [Plan:2.3] Add `/api/v1/auth/platform/login` with isolated password/challenge logic, enabled-platform-admin checks, generic failures, limits, and no authenticated session before MFA.

### Phase 3: User story 2 — Mandatory TOTP and first enrollment

- [x] T007 [US2] [Plan:3.1] Implement short-lived account-bound enrollment with encrypted TOTP seeds, QR setup, and hashed recovery-code storage using existing primitives.
- [x] T008 [US2] [Plan:3.2,5.1] Implement TOTP verification and replay prevention; create the MFA-assured `SUPER_ADMIN` session only after successful verification and enforce the selected session limits.
- [x] T009 [US2] [Plan:3.3] Add Angular enrollment, six-digit verification, one-time recovery-code display, and explicit acknowledgment; keep the challenge restricted until acknowledgment succeeds.

### Phase 4: User story 3 — Recovery and authenticator replacement

- [x] T010 [US3] [Plan:4.1] Implement password-plus-recovery-code sign-in with atomic one-time hash consumption, audit, and outbox notification that contains no credentials or codes.
- [x] T011 [US3] [Plan:4.2] Implement user-selected replacement after fresh password plus current TOTP or unused recovery code; verify the new authenticator, rotate codes, notify, audit, and revoke all account sessions. No automatic/email-only lost-factor bypass is available.

### Phase 5: User story 4 — MFA assurance on every privileged path

- [x] T012 [US4] [Plan:5.1] Enforce MFA assurance and account status at the REST and Socket.IO boundaries, deny pending challenges, and preserve dual-role school-only sessions.
- [x] T013 [US4] [Plan:5.2] Enforce admin session rotation, 15-minute idle/8-hour absolute limits, logout, account-version checks, and existing same-origin protections without changing school-role session behavior or password policy.

### Phase 6: Cross-cutting security, verification, and rollout

- [x] T014 [Plan:6.1] Add secret-safe MFA/security audit events and abuse limits; verify audit detail redaction and bounded security events.
- [x] T015 [Plan:6.2] Document current key requirements, Secure-cookie behavior, enrollment/replacement/lost-factor policy, migration, and no-mixed-version cutover in `.env.example` and `docs/development-and-deployment.md`; leave local `.env` untouched.
- [x] T016 [Plan:6.3] Extend isolated PostgreSQL auth, recovery, audit, and realtime coverage for bypasses, replay, expiry, concurrency, recovery, revocation, and school-role regressions.
- [x] T017 [Plan:6.3] Add and CI-wire the frontend administrator-auth check; run Prisma generation, API/web builds, focused API suites, portal checks, and CI-equivalent validation.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|---|---|---|---|
| REQ-001 | Remove administrator entry from all public role selection, navigation, sitemap, and public API role choices. | 2.1, 2.2 | `login.page.ts`, `app.routes.ts`, public-navigation/sitemap scan, `api.controller.ts` ordinary login schema |
| REQ-002 | Provide manually entered dedicated administrator login and MFA/enrollment UI. | 2.2, 3.3 | `features/platform-access/`, `app.routes.ts`, route/UI check |
| REQ-003 | Separate admin password API; accept only active platform administrators with generic validation/errors. | 2.3, 5.1 | `api.controller.ts`, `platform.service.ts`, auth integration tests |
| REQ-004 | Require TOTP for every new administrator sign-in; no password-only or trusted-device access. | 1.3, 2.3, 3.1, 3.2, 5.1 | challenge/session model, platform endpoints/service, REST and Socket.IO tests |
| REQ-005 | Secure first enrollment and require recovery-code save acknowledgment before access. | 1.3, 3.1, 3.3 | `session.d.ts`, platform challenge service, platform-access Angular feature, enrollment tests |
| REQ-006 | Encrypt TOTP seeds, hash recovery codes, prevent replay/concurrency, and limit attempts. | 3.1, 3.2, 4.1, 6.1 | `security.ts`, `platform.service.ts`, existing `User` fields, PostgreSQL concurrency/replay tests |
| REQ-007 | Provide one-time recovery, notification, and only owner-approved secure reset/replacement. | 4.1, 4.2 | `platform.service.ts`, outbox/email, audit events, recovery/reset tests |
| REQ-008 | Require a valid MFA-assured platform session for every privileged REST, UI-data, and realtime path. | 1.3, 3.2, 5.1, 5.2 | `PlatformService` checks, all privileged controllers, `realtime.gateway.ts`, route-inventory tests |
| REQ-009 | Separate pending challenge from authenticated session; rotate, expire, revoke, and invalidate legacy sessions. | 1.2, 1.3, 3.2, 5.2 | session typings/service, `main.ts`, one-time migration, expiry/revocation tests |
| REQ-010 | Apply account/IP rate controls, generic errors, and challenge/replay abuse protections. | 2.3, 3.1, 4.1, 6.1 | `PlatformService.rate()`, `RateBucket`, abuse tests |
| REQ-011 | Audit auth/MFA/recovery/security events without recording secrets. | 4.1, 4.2, 6.1 | `AuditLogService`, audit/security event integration, redaction tests |
| REQ-012 | Preserve current admin password policy and password verification. | 2.3, 5.2 | existing `password` schema and `security.ts`; no reset/policy migration |
| REQ-013 | Preserve school staff authentication, roles, membership checks, and school permissions. | 2.1, 5.1, 5.2, 6.3 | ordinary auth controller/service, role login and workflow regression tests |
| REQ-014 | Use secure deployment configuration, HTTPS in production, and no production bypass. | 1.1, 5.2, 6.1, 6.2 | `config.ts`, `main.ts`, `.env.example`, deployment docs, production config checks |
| REQ-015 | Pass required automated security and regression tests/builds. | 6.3 | `apps/api/test/auth.test.cjs`, security/audit/realtime suites, frontend check, CI |
