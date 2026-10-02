# SyncAcademy backend implementation handoff

## 1. Purpose and approved direction

This document hands the backend work to the next implementing agent. It records the architecture approved by the project owner and the latest scope correction. Read this document before implementing backend features, together with any applicable repository instructions.

The owner wants a secure, responsive, scalable school-management system that:

- Preserves the existing Angular/Ionic web frontend.
- Supports multiple schools with strict separation of their data.
- Can later serve a parent mobile application through the same API.
- Runs locally with Docker Compose without requiring cloud accounts.
- Keeps unrelated features operating when an optional integration or background task fails.
- Uses TypeScript, PostgreSQL, Prisma, a modular NestJS API, and separate background workers.

**Latest scope correction: the web application will not have payments anywhere. Payment functionality is excluded from this implementation plan.** This includes online processing and manual payment-recording workflows, payment providers, payment webhooks, checkout, refunds, and receipts for payments. Do not use payment workflows as implementation milestones or examples.

Database transactions remain essential: the term means an atomic group of database changes, not a payment transaction. Apply transactions and idempotency to enrollment, invitations, report publication, imports, and other school operations.

The architecture is approved. Provider selection, precise permissions, capacity targets, and some business rules still require implementation decisions or targeted product clarification; this document does not pretend those choices have already been made.

## 2. Actual repository state

### Implementation update — 2026-09-28

Authentication and onboarding are now implemented. Read [AUTHENTICATION_IMPLEMENTED.md](AUTHENTICATION_IMPLEMENTED.md) for current startup commands, schema/security behavior, tests, and remaining work. The frontend has been upgraded to Angular 20. The NestJS API, Prisma migrations, database-backed sessions, invitation/reset flows, MFA, school and staff onboarding, enrollment, email worker, and Compose services are no longer scaffolds. The original portal layouts have been restored with real APIs for supported workflows and unavailable states for unfinished workflows. Read ORIGINAL_UI_BACKEND_INTEGRATION.md and preserve the original layout. Continue from this implementation rather than recreating it. Never seed demonstration records into the real database or overwrite existing bootstrap credentials.

The architecture sections below remain the broader plan; Redis/BullMQ, object storage/report workflows, parent-child relationships, and production hardening are not all implemented in this first increment.

### Original pre-implementation inventory (historical)

At the original handoff, before the implementation above:

- `apps/web` is an Angular 19 / Ionic 8 frontend. It is not Next.js.
- `apps/api` contains a NestJS-style scaffold. Key files such as `src/main.ts`, `src/app.module.ts`, the authentication service, and `prisma/schema.prisma` are empty.
- `apps/api/package.json` has package metadata but no implemented backend dependency/script setup.
- The root `docker-compose.yml` is empty. The API Dockerfile is only a placeholder.
- `packages/api-contracts` and `packages/shared-types` exist as starting points for shared contracts.
- Many frontend workflows currently use browser-local sample data. Some security labels and access records are simulations, not real authentication or authorization.
- The General Dashboard was explicitly deleted. Do not recreate it. Headmaster Settings was moved into `apps/web/src/app/features/headmaster/pages/settings`.
- The frontend login currently navigates to the Headmaster dashboard as demo behavior. Replace that with real authentication and an authorized landing destination.
- A successful frontend build is not proof that a backend or production security exists.

Inspect the repository again before editing. Preserve unrelated user changes. Existing folders and empty documentation files do not establish implemented capabilities.

### Existing portals

| Portal | Entry route | Intended users |
| --- | --- | --- |
| Super Admin | `/super-admin` | Platform owner and authorized platform administrators |
| Headmaster | `/head/dashboard` | Headmaster / school administrator |
| Academic Master | `/academic/dashboard` | Academic master / academic officer |
| Teacher | `/teacher` | Subject teachers; class teachers have additional class responsibilities |
| Registrar | `/register/page` | Admissions and student-records staff |
| Bursar | `/bursar/page` | Existing finance-office frontend; its remaining scope needs reconciliation with the no-payments decision |

### Reconcile older frontend finance features with the latest scope

The existing Bursar and Super Admin demos, Headmaster finance views, and older documents contain financial features that predate the owner's latest instruction. They are not authorization to implement payment backend functionality.

- Inventory and remove or hide payment entry points as part of frontend/backend scope alignment, including simulated payment actions.
- Do not create payment tables, services, endpoints, jobs, provider integrations, or tests.
- Review invoice, receipt, collection, revenue, balance, and billing UI that depends on the excluded workflows. Do not present fabricated financial metrics as live backend data.
- Platform school access, trials, and plan entitlements can remain nonfinancial concepts where required. Do not attach a payment system to them.
- Do not delete the entire Bursar portal or invent its replacement purpose without a targeted product decision. Clarify whether any non-payment fee-planning or finance reporting remains in scope. This does not block the core school-management backend.
- Update older documentation as affected workflows are changed. The owner's latest no-payments instruction supersedes earlier finance demos and this conversation's earlier examples.

## 3. Architecture

Build a **modular monolith** in the existing monorepo:

1. Angular/Ionic web application.
2. NestJS REST API with versioned routes.
3. A separately running worker process using the same business code where appropriate.
4. PostgreSQL as the authoritative datastore.
5. Redis for BullMQ and selected shared ephemeral state.
6. Private S3-compatible document storage.

The browser and future parent app both call the API. Neither connects directly to the database. Do not rewrite the frontend into Next.js or put backend logic into Angular.

The API and worker can use one built application image with different startup commands. Separate processes allow independent resource limits, restarts, and scaling; they do not require a microservice architecture.

```text
Web frontend -------\
                     > Versioned API ---> PostgreSQL
Future parent app --/       |                  |
                            |           Transactional outbox
                       Optional cache          |
                                         Outbox dispatcher
                                               |
                                         BullMQ / Redis
                                               |
                                            Worker
                                          /   |    \
                                  PostgreSQL Files Messaging providers
```

Keep modules organized by business responsibility. Suggested boundaries:

- Identity, sessions, memberships, and permissions.
- Schools, platform administration, onboarding, and entitlements.
- Academic years, terms, classes, subjects, and teaching assignments.
- Students, guardians, enrollment, and student records.
- Attendance.
- Assessments, marks, review, approval, and publication.
- Reports and private document access.
- Notifications, preferences, templates, and delivery tracking.
- Audit history.
- Leads and school onboarding conversion, where required by the existing frontend.

Controllers handle HTTP concerns. Services implement business rules and authorization-aware operations. Database access stays within clear module boundaries. Workers reuse business services rather than creating a second implementation of the same rules.

Do not initially introduce microservices, Kubernetes, Kafka, sharding, a separate database per module, GraphQL, or multiple competing ORMs. Revisit these only for a demonstrated requirement.

## 4. Database and data integrity

Use PostgreSQL and Prisma with checked-in, reviewable migrations. Local development runs PostgreSQL in Docker. Production can use managed PostgreSQL such as Supabase or Neon; the provider has not been selected. Keep provider-specific behavior behind configuration and adapters.

Design the schema before implementing all endpoints. Initial entities should cover:

- Schools and their lifecycle status.
- Users and school memberships; platform privileges must be distinct from school membership.
- Role assignments and scoped permissions.
- Academic years and terms.
- Students and student identifiers.
- Guardian records and verified student-guardian relationships.
- Classes, subjects, staff assignments, and enrollments.
- Attendance records.
- Assessments, marks, reviews, publication versions, and reports.
- File metadata and access relationships.
- Invitations and authentication/session metadata where owned by the application.
- Notification requests, delivery attempts, audit events, idempotency records, and outbox events.

Use foreign keys, not just application checks. Enforce school consistency on relationships, using composite foreign keys/constraints where appropriate. For example, a school's enrollment must not reference another school's class.

Examples of candidate uniqueness rules to confirm against the business model:

- Student admission number unique within a school.
- Enrollment unique within the applicable school/student/academic-year placement model.
- Attendance unique per enrollment and attendance session/date model.
- Mark unique per assessment and enrolled student.
- Provider event ID or operation key unique within its defined scope.

Class transfers and historical enrollment need an explicit design; do not impose a simplistic constraint that prevents valid transfers. Preserve historical reports and auditability instead of cascading away meaningful school records.

Store timestamps consistently and serialize them in ISO 8601. Distinguish date-only fields, such as date of birth, from instants. Use the configured school timezone for date boundaries and scheduled school operations.

### Indexing and efficient queries

- Index actual access patterns, especially school, academic year, status, class, and date combinations.
- Example: an enrollment lookup by school, year, and class may need a composite index on those columns.
- Index necessary foreign-key lookup paths explicitly; do not assume every foreign key receives an index automatically.
- Use `EXPLAIN ANALYZE` and representative data to verify slow queries.
- Paginate list endpoints, cap page sizes, select only needed fields, and avoid N+1 queries.
- Size connection pools for the total API and worker replica count, within the database connection budget.
- Keep transactions short. Never wait on email, SMS, object storage, or other remote services inside a database transaction.
- Run migrations through a controlled one-time deployment step, not independently from every API replica. Do not use destructive schema resets or `db push` as the production migration strategy.

## 5. School isolation and authorization

School isolation is a foundational requirement, not a later enhancement.

- School-owned records carry a school identifier.
- Derive the current user's authorized school context from verified identity and membership.
- Validate any requested school selection against membership. Never trust a request's `school_id` merely because the UI supplied it.
- Authorize every read, write, export, upload, download, background operation, and administrative action.
- Apply object-level and field-level permissions; hiding a frontend button is not authorization.
- A teacher accesses assigned subjects/classes, not every student in the school.
- A future parent accesses only verified linked children and data approved for parent publication.
- Super Admin access across schools must be explicit, limited by permission, and audited.
- Scope cache keys, search queries, file metadata, job payloads, and idempotency records to the correct school and permission context.
- Use explicit input DTOs and allowed update fields to prevent mass assignment of roles, ownership, or status.

Consider PostgreSQL row-level security as defense in depth. If implemented, verify behavior with connection pooling, transaction-scoped tenant context, workers, and privileged operations. It does not replace application authorization.

Write integration tests that attempt to read and modify School B's records while authenticated to School A, including guessed IDs, changed request fields, exports, files, and jobs.

## 6. Authentication and future parent identity

Choose an established authentication solution after checking browser sessions, mobile support, MFA, recovery, revocation, and local Docker operation. Auth.js is not a fixed requirement. Do not invent a custom authentication protocol.

The selected solution must work locally without mandatory paid cloud access. If it requires a separate identity service, provide a development container/configuration or a documented local-compatible setup. Never leave a production-accessible demo authentication bypass.

For the web:

- Use HTTPS in production and secure `HttpOnly` session cookies with appropriate `SameSite` behavior.
- Apply CSRF defenses to cookie-authenticated state-changing requests; `SameSite` alone is not the entire defense.
- Set session expiry, rotation where appropriate, logout/revocation, and account recovery rules.
- Require MFA for privileged platform administrators.
- Rate-limit login, invitation acceptance, and recovery endpoints.
- Do not log passwords, tokens, session identifiers, or recovery links.
- If the application owns passwords, use a vetted password-hashing implementation with appropriate parameters; never reversible encryption or plain hashes.

For the future parent app:

- Plan for OpenID Connect / OAuth authorization code flow with PKCE and the system browser.
- Store sensitive mobile credentials in OS-backed secure storage.
- Validate token issuer, audience, signature, expiry, and required scopes at the API.
- Support session/token revocation and appropriate refresh-token protections through the chosen identity solution.
- Parent login can be deferred for the MVP, but private student information must never become anonymously accessible. Passwordless access still requires authentication.
- Model verified guardian relationships now, including a guardian with multiple children or children in different schools.

Write a permission matrix before wiring every portal. Distinguish school role assignments from platform support/sales/administration privileges. Role selection submitted by a user must not grant privileged access.

## 7. API contracts and mobile readiness

- Use REST routes under `/api/v1` and publish OpenAPI documentation.
- Use the existing shared-contract packages where useful; avoid exposing Prisma models as public API contracts.
- Validate input at runtime. TypeScript types do not validate incoming JSON.
- Return predictable error codes, safe messages, validation details, and a request/correlation ID. Never return stack traces or database secrets.
- Define pagination, filtering, sorting, date formats, and stable identifiers consistently.
- Use backward-compatible evolution where possible; mobile clients may update slowly.
- Keep authorization and business rules on the server, independent of frontend state.
- For slow operations, return `202 Accepted` with a job identifier and a status endpoint rather than holding the request open.
- Use allowlisted CORS where needed, request/upload size limits, appropriate security headers, and safe reverse-proxy configuration.
- Configure trusted proxies explicitly so client-IP handling and rate limiting cannot be spoofed through arbitrary forwarding headers.
- Separate unpublished/internal academic data from fields available to parents.

Polling job status is sufficient initially. Add push delivery or real-time connections only for a defined product requirement. Preserve notification identifiers and read state so mobile support can be added later.

## 8. Idempotency, transactions, and concurrency

These are required correctness mechanisms even though payments are excluded.

### Idempotency

Use durable idempotency for retry-prone critical writes, such as student registration/enrollment, import submission, invitations, school provisioning, and report publication.

- Scope the key by authenticated principal/school and operation.
- Store a normalized request fingerprint and the resulting resource or response.
- Reserve the key atomically with a unique constraint, including a clear in-progress state.
- Same key and same request: return the original result without repeating side effects.
- Same key with a different request: return a conflict.
- Handle concurrent requests with the same key and crash recovery explicitly.
- Define retention and expiry. Domain uniqueness rules must still protect invariants after an idempotency record expires.
- Do not rely on browser button disabling, in-memory maps, or a cache as the only guarantee.

### Transactions

Example: registering a student should atomically save the required student/enrollment records, relevant audit event, and an outbox notification request. If a required part fails, roll back the group.

Example: publishing approved results should atomically record the publication state/version and the request for background report generation or notification.

### Concurrency

- Use version numbers or equivalent optimistic concurrency checks for marks and other editable records. Return a conflict when a user submits an outdated version instead of silently overwriting another user's changes.
- Use unique constraints for duplicate prevention.
- Use row locks or stronger transaction isolation where a cross-record invariant requires it.
- Retry transient deadlocks/write conflicts a bounded number of times when safe.
- Define and enforce closed-year and published-record edit rules server-side.
- Test simultaneous edits, duplicate requests, and client retries after uncertain network outcomes.

## 9. Background jobs and transactional outbox

Use BullMQ with Redis and a separately running worker for report generation, bulk imports, email, SMS, future push delivery, and scheduled tasks.

Write business changes and an outbox event in the same PostgreSQL transaction. An outbox dispatcher publishes committed events to the queue. A queue outage must not lose a successfully committed school's pending notification.

- Claim outbox entries safely across multiple dispatchers.
- Expect at-least-once delivery and possible duplicates; do not claim exactly-once processing.
- Give events/jobs stable identifiers and implement idempotent worker behavior.
- Avoid marking events delivered before successful queue submission.
- Configure durable queue storage and recovery/reconciliation for loss or ambiguous delivery.
- Use bounded exponential backoff with jitter for retryable failures.
- Respect provider throttling and retry-after instructions.
- Track pending, running, completed, and failed states as appropriate.
- Retain failed jobs/events for inspection and controlled retry; do not retry forever.
- Set worker concurrency, job timeouts/cancellation strategy, and resource limits.
- Separate expensive report jobs from communication work so one backlog cannot consume all worker capacity.
- Minimize sensitive student data in job payloads; prefer authorized record references.
- Document the semantics when a school is suspended or access changes while a job is queued.

Separate disposable cache storage from durable queue storage in production, or use a topology and eviction policy that cannot evict queue data. Redis logical database numbers alone do not provide memory or failure isolation.

## 10. Caching and rate limiting

Introduce caching based on measurements, not as a replacement for good queries.

- Suitable initial candidates include stable reference data and permitted dashboard summaries.
- Include school, academic year, relevant filters, and permission scope in cache keys.
- Define TTLs and invalidation on updates.
- Keep PostgreSQL authoritative. Do not let stale cache values decide critical write invariants or access revocation.
- On optional cache failure, use a bounded fallback to PostgreSQL and prevent a sudden flood of expensive queries.
- Use shared rate-limit state across API replicas, with limits by IP/account and by school or endpoint where appropriate.
- Protect expensive exports and job submission as well as login.
- Return useful `429` responses with retry guidance.
- Define failure behavior for the limiter. Sensitive authentication operations must not silently become unlimited when Redis is unavailable; use a safe bounded fallback or reject temporarily.

## 11. Files and document storage

Use private S3-compatible storage. R2 or S3 are production options; the provider is not selected. Provide a local compatible service/emulator for Docker development and put provider access behind a storage interface.

- Store file metadata and ownership/access relationships in PostgreSQL.
- Keep buckets private. Do not expose student reports through permanent public URLs.
- Before issuing a download link, authenticate the requester and check school, document, and child/assignment permissions.
- Use short-lived signed URLs. They are bearer credentials: anyone holding a valid link may use it until expiry.
- Do not log signed URLs or put secrets in object keys.
- Validate upload size, allowed type, actual content where appropriate, and ownership. Add scanning/quarantine for untrusted uploads as required by the accepted file types.
- Use opaque object keys and tenant-aware metadata; a school-specific path prefix alone is not authorization.
- Make report generation reproducible and version-aware, with clear status on failures.
- Do not use container-local disk as permanent shared document storage.

## 12. Failure isolation and operational visibility

Desired behavior:

| Failure | Expected behavior |
| --- | --- |
| SMS/email provider unavailable | Core record changes succeed when otherwise valid; delivery remains pending and retries safely. |
| Report worker crashes | API school operations continue; interrupted work can recover without duplicate published results. |
| Queue unavailable | Eligible changes and outbox requests commit; dispatch resumes after recovery. |
| Optional cache unavailable | Eligible reads use controlled database fallback. |
| Object storage unavailable | File/report operations show a retryable failure; unrelated operations continue. |
| PostgreSQL unavailable | Database-dependent operations fail safely and clearly; do not claim unsaved changes succeeded. |
| One API process crashes | It restarts; additional production instances can keep serving traffic. |

Use outbound request timeouts, bounded retries, circuit breakers where useful, resource limits, and graceful shutdown for both API and workers. Never retry non-idempotent side effects blindly.

Implement:

- Separate liveness and readiness endpoints.
- Readiness based on dependencies essential to the process; an optional SMS outage must not take the whole API out of service.
- Structured logs with request/job IDs and safe actor/school context.
- Metrics for API latency/errors, database pool pressure, queue age/depth, failed jobs, and provider failures.
- Restricted audit events with actor, school, action, target, timestamp, and safe change details. Audit storage must not be freely editable by normal application roles.
- Alerts that distinguish application failures from optional-provider failures.
- Backup schedules, restore exercises, and documented recovery objectives before production.

Docker Compose on one computer is not high availability. Production host/database failure requires hosting redundancy and recovery arrangements. Do not promise that every operation can continue during every dependency outage.

## 13. Docker and reproducible development

The required local experience is:

```bash
docker compose up --build
```

Or, in two steps:

```bash
docker compose build
docker compose up -d
```

`build` builds images; `up` starts the system. Docker and Compose should be the only required application runtimes on a contributor's computer.

Provide these services as needed:

- Web server/reverse proxy serving the Angular application and forwarding API requests.
- API.
- Worker/outbox processing.
- PostgreSQL with persistent storage.
- Redis with persistence appropriate to its queue role.
- Local private object storage.
- Local email capture; SMS and push use explicit development adapters.
- One-time migration service; a documented, idempotent development seed mechanism.
- A local identity service only if required by the selected authentication architecture.

Requirements:

- Provide `.env.example` and documented local defaults. Default Compose must run without production secrets or cloud accounts.
- Do not commit real secrets. Production configuration must reject unsafe development defaults.
- Pin compatible runtime/dependency/image versions and commit the package lockfile. Do not use `latest` as the reproducibility strategy.
- Use multi-stage builds, non-root application processes, and `.dockerignore` files.
- Wait for database health and successful migration completion before starting dependent application processes.
- Do not race migrations across replicas. Treat seed data separately from production migrations.
- Persist database, queue, and object data in named volumes.
- Expose only necessary local ports; do not expose database/cache publicly in production.
- Document startup, logs, shutdown, migration, seeding, and troubleshooting commands.
- Document destructive volume reset separately and clearly. Normal startup must never wipe data.
- Support Windows, macOS, and Linux hosts without depending on host-specific absolute paths.
- Keep cloud providers configurable so local and production environments use the same business behavior.

Health checks and restart policies help startup and recovery; they do not replace runtime connection retry logic or production orchestration. An unhealthy status alone is not a universal automatic restart mechanism.

## 14. Performance and scalability

Measure performance against an agreed workload. Do not claim the system is fast because a cache or a framework is installed.

- Establish expected schools, active users, students per school, report size, and peak concurrent operations.
- Define measurable p95/p99 latency and error-rate targets with the owner before promising capacity.
- Load-test representative data and realistic authorization checks.
- Keep heavy document generation and imports off the API request path.
- Paginate and cap result sizes; avoid shipping whole-school datasets to render a summary.
- Use stateless API replicas and shared session/rate-limit state where required.
- Scale workers independently from APIs and bound their database use.
- Serve static assets efficiently and avoid unnecessary API round trips.
- Keep the application and managed database in suitable nearby regions, selected for users and deployment constraints.
- Profile the database, application, and external calls before adding more infrastructure.

## 15. Implementation order and completion gates

### Phase 0: confirm scope and record decisions

- Audit existing placeholders, frontend models, and workflow documents.
- Record the no-payments scope and inventory conflicting frontend features.
- Write the role/permission matrix and initial data model.
- Choose compatible supported backend dependencies and the authentication approach.
- Record unresolved product rules without blocking independent foundational work.

### Phase 1: runnable foundation

- Implement NestJS startup, configuration validation, error handling, logging, and health endpoints.
- Add Prisma/PostgreSQL setup and the first migrations.
- Implement the Compose environment, migration ordering, local integrations, and development seed process.
- Add CI commands for build, lint/type checking, migrations, and backend tests.

Gate: a fresh checkout starts locally using Docker Compose and reaches healthy services without cloud accounts or a host Node/PostgreSQL installation.

### Phase 2: identity and tenancy

- Implement real authentication, memberships, permissions, sessions, and administrative bootstrap.
- Add school isolation and object-level authorization.
- Add login/recovery rate limiting and audit events.
- Replace the demo frontend login and unrestricted portal access with authenticated navigation and server-backed authorization.

Gate: an authorized user can sign in; unauthorized and cross-school requests are denied in automated tests.

### Phase 3: first complete vertical workflow

Use **Registrar student registration and enrollment** as the first real workflow:

1. Sign in as a Registrar belonging to a school.
2. Select an authorized academic year/class.
3. Submit validated student and enrollment information.
4. Save related records atomically with audit/outbox entries as needed.
5. Prevent duplicate creation on request retry and concurrent submission.
6. Retrieve the record through the API and show it in the frontend.
7. Refresh/restart and verify persistence.
8. Verify another school's user cannot access it.

Gate: this works end to end in Docker, with no browser-storage source of truth or fabricated success response.

### Phase 4: expand core school workflows

- Academic years, classes, subjects, and teaching assignments.
- Student/guardian records and enrollment changes.
- Attendance.
- Assessments, marks review, approval, publication, and edit-conflict handling.
- School onboarding and platform administration.
- Replace frontend demo stores incrementally with typed API clients and real loading/error/empty states.

Gate: each completed workflow has permission checks, tenant isolation, relevant integrity tests, and frontend integration before being called complete.

### Phase 5: asynchronous work and private documents

- Implement outbox dispatch, durable jobs, background reports/imports, and messaging adapters.
- Implement authorized uploads/downloads and delivery status.
- Verify recovery from worker crashes and queue/provider outages.

### Phase 6: production readiness and mobile foundation

- Perform load testing and address measured bottlenecks.
- Exercise backup/restore, graceful shutdown, dependency failure, and migration deployment.
- Add operational dashboards and alerts.
- Finalize deployment/secrets configuration and document mobile authentication/API contracts.
- Prepare parent identity relationships and publication permissions; a full parent app is not part of this backend milestone unless separately requested.

## 16. Verification and definition of done

Use real PostgreSQL integration tests for constraints, transactions, isolation, and concurrency rather than relying only on mocked repositories.

Required scenarios include:

- Fresh Docker startup and restart without data loss.
- Migration from an existing database version.
- Authentication, logout/revocation, and role enforcement.
- Cross-school access attempts on lists, individual records, edits, exports, and files.
- Duplicate enrollment/invitation/report requests, including simultaneous requests.
- Concurrent mark edits returning a conflict instead of losing data.
- Atomic rollback of failed multi-record operations.
- Outbox/queue retry after a dependency outage and duplicate event delivery.
- Report worker crash/restart without duplicate publication.
- Invalid, oversized, and unauthorized uploads.
- Expired/unauthorized document access.
- Rate limits across multiple API instances.
- Cache failure without cross-school data leakage or uncontrolled database overload.
- No payment endpoints or exposed payment UI in the aligned web scope.

For each increment, report what changed, relevant tests run, results, and remaining limitations. Do not call mock data production integration, frontend role labels security enforcement, or a Compose deployment highly available.

The first meaningful deliverable is: **a new developer can start everything with Docker, sign in, and complete a school-isolated student enrollment workflow backed by PostgreSQL.**

## 17. Implementation reference sources

These are reference resources, not a substitute for checking documentation for the exact dependency versions selected during implementation.

- NestJS queues: https://docs.nestjs.com/techniques/queues
- NestJS rate limiting: https://docs.nestjs.com/security/rate-limiting
- Prisma transactions/concurrency: https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions
- OWASP multi-tenant security: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- OWASP session management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Native application OAuth guidance: https://www.rfc-editor.org/info/rfc8252/
- Transactional outbox: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- Docker Compose startup order: https://docs.docker.com/compose/how-tos/startup-order/
- R2 signed URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
