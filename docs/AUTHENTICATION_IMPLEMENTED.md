# Real authentication and onboarding

## What is live

The active Angular routes now use the NestJS API and PostgreSQL. There is no seeded school, student, staff identity, dashboard count, or browser-storage business database in these routes. The original portal layouts are restored. Supported actions use real APIs; unfinished workflows display unavailable states without sample records. See ORIGINAL_UI_BACKEND_INTEGRATION.md. Payment functionality is not exposed.

Implemented:

- Invitation-only account creation, Argon2id password hashing, PostgreSQL-backed opaque sessions, rotation, expiry, logout, and session-version revocation.
- Same-origin and custom-header checks for JSON mutations, strict request validation, safe errors, and shared database-backed authentication rate limits.
- Required password replacement for bootstrap accounts; mandatory Super Admin TOTP MFA and single-use recovery codes.
- School creation with its first Headmaster invitation in one transaction.
- Super Admin invitations for Headmaster, Registrar, Academic Master, Teacher, and Bursar; Headmasters can invite Registrar, Academic Master, Teacher, and Bursar; Academic Masters can invite Teachers only.
- Role-based invitation expiry presets are enforced by the API and carried into invitation emails. Existing invitations default to 48 hours.
- Academic years, classes, teacher-to-class assignments, and staff-managed student registration/enrollment are supported; only staff receive sign-in accounts.
- Every supported staff role can accept its invitation and sign in. Teachers see only students in assigned classes.
- Hashed, expiring, revocable invitation/reset tokens; resend invalidates the preceding token. Existing users must sign in as the invited account before accepting a new membership.
- Durable PostgreSQL outbox with encrypted pending email contents, leases, bounded retries, stale-link cancellation, and local SMTP delivery. Email provider failure does not undo enrollment or school creation.
- Audit events, atomic registration, idempotency keys, unique constraints, and school-consistent foreign keys.

This is the authentication/onboarding foundation, not a claim that every earlier prototype workflow has been migrated. Marks, attendance, report generation, broader settings, billing-independent Bursar duties, and advanced monitoring remain future increments. Unfinished workflows are explicitly unavailable.

## Start with Docker

Prerequisites: Docker Desktop / Docker Engine and Compose. Generate private local configuration once:

```sh
node scripts/setup-local.mjs
```

This command does not overwrite an existing `.env`. Alternatively, populate `.env` from `.env.example` with random secrets. Node is needed only for this convenience generator; all application runtimes run in containers.

```sh
docker compose up --build -d
```

- Application: http://localhost:8080/auth/login
- Local email viewer: http://localhost:8025
- PostgreSQL for local administration: localhost:55432, database `syncacademy`
- Configuration and generated credentials must never be committed.

The migration job uses the database owner. API and worker use `syncacademy_runtime`, which has no superuser, database creation, or role creation privileges, no access to migration records, and cannot update/delete audit records. Migrations grant runtime rights to newly added tables before dependent services start. Production should use a separate controlled migration credential and further deployment hardening.

Docker maintains its own PostgreSQL volume. A separately installed Windows PostgreSQL server is a different server/database. Do not assume records created in one are present in the other.

## Create the first Super Admin

Use your actual email and name. Bootstrap only works when no platform administrator exists. It will not overwrite an existing administrator or credential file.

```sh
# Run from the repository root; use an absolute host path for the volume if needed.
docker compose run --rm -e BOOTSTRAP_EMAIL=you@example.com -e BOOTSTRAP_NAME="Your Name" -e CREDENTIALS_DIRECTORY=/credentials -v "./.runtime:/credentials" api node dist/bootstrap.js
```

The generated temporary password is saved to `.runtime/admin.credentials.txt`, not printed to service logs. Open that private file to sign in. The first login requires a new password of at least 15 characters and authenticator setup. Save the displayed recovery codes in a password manager; each can be used once. Delete the temporary credential file after setup. All other sessions are revoked when a password is changed/reset.

## First school workflow

1. Sign in as Super Admin and complete account security setup.
2. Add a school, unique school code, region, Headmaster name, and Headmaster email.
3. Open the invitation in the email viewer, accept it, and set up the Headmaster account. Use a private browser window to test a different identity.
4. Sign in as Headmaster. Create an academic year and classes.
5. Invite staff. They accept their links and sign in with their own accounts.
6. Assign accepted Teachers to classes. A Teacher sees only assigned student records.
7. A Headmaster or Registrar registers and enrolls students for staff-managed school workflows. Students do not receive platform accounts.
8. Manage pending invitations and suspend/restore school memberships under People & invitations. Suspension revokes existing sessions.

There are no preset school codes, teachers, classes, or student records. Form choices come from the database. UI labels and the supported permission roles are intentionally defined in code.

## Gmail delivery

A Google App Password can authenticate SMTP. Add it privately in `.env`; never put it in source, chat, screenshots, or a committed configuration file.

```dotenv
SMTP_HOST=smtp.gmail.com
DOCKER_SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-address@gmail.com
SMTP_PASSWORD=YOUR_GOOGLE_APP_PASSWORD
MAIL_FROM=your-address@gmail.com
```

Recreate the worker after changing configuration:

```sh
docker compose up -d --force-recreate worker
```

Gmail delivery was not configured or tested without an App Password. Local SMTP tests do not send external emails. Gmail has sending limits and should eventually be replaced by a transactional provider as needed.

**An emailed localhost link only works on the same computer.** Before inviting remote people, deploy to an HTTPS address reachable by them and set `APP_ORIGIN` to that exact origin. Changing the email provider alone does not publish the application.

The local Compose file uses development HTTP and binds ports to localhost. Do not expose it publicly as-is. Production requires HTTPS termination, `NODE_ENV=production`, valid secure-cookie/proxy configuration, protected email/admin tooling, reviewed network exposure, backups, monitoring, and restore testing.

## Test and build

Verified locally on 2026-09-28: API and production frontend container builds pass; all 21 authentication/database tests and the local SMTP worker test pass. The Compose migration, restricted database role, real bootstrap login, forced security setup, logout, and clean database counts were checked. The real database initially contains one administrator, no schools, and no students. Browser visual verification was unavailable; HTTP and API checks passed. Frontend build warnings remain for the initial bundle size (715 kB against a 500 kB warning budget) and older Sass usage in retained prototypes.

Backend build:

```sh
npm run build --workspace=apps/api
```

Database integration tests require a disposable PostgreSQL database named `syncacademy_auth_test` on the configured server, owned by the migration test user. Tests verify the database name and clear only that disposable database. They must never be pointed at real school data.

```sh
node --env-file=.env --test apps/api/test/auth.test.cjs
node --env-file=.env --test apps/api/test/worker.test.cjs
```

Tests cover sessions, password replacement, MFA/recovery/replay protection, CSRF origin rejection, tenant isolation, role escalation prevention, all-role account acceptance/login, idempotency including concurrent requests, student enrollment atomicity, teacher/student visibility, invitation expiry/resend/revocation, existing-user acceptance, password recovery, session revocation, rate limiting, and delivery through local SMTP.

The worker test requires the local SMTP viewer on ports 1025/8025. Test accounts belong only to the disposable test database. The real application database should contain only the bootstrap administrator until the owner begins onboarding schools.

## Important operational details

- Dependency audit on 2026-09-28: `npm audit --omit=dev` reports no runtime findings. The full audit still reports five moderate findings in the Angular development-server dependency chain (`sockjs`/`uuid`). The Compose web image serves compiled files with Nginx and does not run that development server. Review upstream fixes before exposing any development server.
- The current authentication delivery worker processes the durable PostgreSQL outbox directly. Redis/BullMQ, separate report queues, and optional response caches are not installed in this first increment. The outbox boundary allows that expansion without changing account APIs.
- SMTP has at-least-once delivery semantics: a crash after delivery but before acknowledgment can duplicate an email. Links remain one-use; exactly-once email delivery is not promised.
- Failed delivery attempts stop after eight attempts. Resend an invitation after repairing SMTP to issue a fresh link; requesting password recovery again issues a new recovery link.
- Never run `docker compose down -v` unless deliberately deleting the local database. Ordinary restart/up preserves records.
- Browser storage is not an authentication credential store. Cookies are HttpOnly; the API rechecks current user and school permissions.
- Back up both the database and secret encryption key securely. Losing the encryption key prevents reading stored authenticator secrets and pending outbox contents.
- Account security setup and legitimate login work without SMTP. Invitations and password recovery require either the local email viewer or a working external provider.
- System-wide MFA recovery/rotation policy, production penetration review, full OpenAPI publication, and load/restore tests remain production-hardening work. Passing integration tests is not a security certification.
