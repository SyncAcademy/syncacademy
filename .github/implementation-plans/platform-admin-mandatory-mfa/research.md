# Platform Administrator MFA Decision Register

**Updated**: 2026-10-23  
**Source**: User-provided security audit and recovery requirements; current repository manifests, runtime, migration, and isolated test results.

## Confirmed implementation facts

- Installed project versions are Angular 20.3.32, NestJS 11.2.6, Prisma 6.19.3, API TypeScript 5.6.3, and Web TypeScript 5.9.3. No dependencies were added or changed for this work.
- The active API prefix is `/api/v1`. Sessions use PostgreSQL-backed `express-session`/`connect-pg-simple`, the fixed `sa.sid` cookie, and existing origin, `X-Requested-With`, and JSON checks on state-changing requests.
- Platform sign-in is separate from the school-role picker at `/platform-access/login`, with versioned `/api/v1/auth/platform/*` endpoints. Pending challenges do not authorize platform REST or Socket.IO access.
- Active platform accounts must have `enabled=true` and `platformAdmin=true`. MFA assurance and `sessionVersion` are checked at the backend boundary.
- Platform idle and absolute limits are 15 minutes and 8 hours. Challenges expire after five minutes and are limited to five verification failures. There is no remember-device control.
- TOTP seeds reuse the existing AES-256-GCM `DATA_ENCRYPTION_KEY`; recovery codes are hashed and consumed atomically. First enrollment requires a valid authenticator code and recovery-code acknowledgment.
- Authenticator replacement requires a fresh password and the current authenticator or an unused recovery code, validates the new authenticator, replaces recovery codes, notifies through the outbox, records audit events, and revokes account sessions. Lost-factor recovery has no automatic, email-only, or security-question bypass.
- The additive migration increments platform administrators' `sessionVersion` to invalidate legacy sessions. Realtime events use the shared `RealtimeBus` so the process handling account changes can invalidate sockets on other API instances.
- `apps/api/test/auth.test.cjs` rewrites its connection to `syncacademy_auth_test`, verifies the target database, and applies migrations there. The final run passed all 43 tests. `.env` was not read or edited.

## Confirmed decisions

### D1 — API endpoint path

Use the active versioned API namespace: `POST /api/v1/auth/platform/login` and sibling endpoints under `/api/v1/auth/platform/`. No unversioned compatibility alias is added.

### D2 — Session and same-origin write contract

Preserve PostgreSQL-backed `express-session`, the `sa.sid` cookie, and existing origin + `X-Requested-With` + JSON checks. Do not introduce a second session architecture or weaken the current write checks as part of MFA.

### D3 — Authenticator replacement and lost-factor recovery

Allow replacement only after a fresh password and the current TOTP or an unused recovery code, followed by verification of the new authenticator. Rotate recovery codes, audit and notify, and revoke all account sessions. When every factor is lost, there is no application bypass; recovery requires a separately verified operational action by another active platform administrator.

### D4 — Time limits and failed attempts

Use a 15-minute platform-admin idle limit, an 8-hour absolute limit, a five-minute challenge limit, at most five verification failures, and no remember-device option. School-role session behavior remains separate.

### D5 — TOTP encryption

Reuse `DATA_ENCRYPTION_KEY` and the existing AES-256-GCM helper so existing encrypted MFA values remain readable. Preserve this key across deployment and backup it through the production secret manager.

### D6 — Active administrator definition

Use `enabled=true && platformAdmin=true` as the active-account check. No separate suspended/inactive status is invented.

### D7 — Runtime and dependency source

Target the versions and behavior present in current package manifests and source. Do not upgrade dependencies for this feature. Canonical product, system, and deployment documentation now describe the implemented runtime and MFA behavior.

## Remaining release validation

No product or policy decision remains open. Before production release, rehearse the forward-only session-version migration on staging, confirm HTTPS/Secure cookies and proxy trust configuration, and verify the new release has replaced every old API replica before restoring administrator traffic.
