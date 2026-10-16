# Scalability validation

The current changes reduce selected read payloads and allow invalidations to reach multiple API processes. They do not establish a production capacity limit. Academic commands still read and update one year-level JSONB document; unrelated writes can contend on that row. See [the storage migration plan](ACADEMIC_STORAGE_MIGRATION.md).

## Read paths

- `GET schools/:id/workspace?view=summary` omits students and enrollment subjects, preserves authorized counts and reference data, and returns `studentsComplete: false`. Audited dashboard, student-subject and teacher marks routes select this response. Detail and unknown routes retain full workspace reads. A navigation regression check verifies that an in-flight summary cannot populate a detail route.
- `GET schools/:id/academics?yearId=...&view=marks&submissionId=...` projects one submission and its assessment inside PostgreSQL. It excludes archives, attendance and reports and applies the existing teacher authorization projection. Marks saves request a bounded receipt; matching revisions update that view without a follow-up GET. Stale receipts and idempotent replays reload the bounded view.
- `GET schools/:id/registry/student-subjects` accepts `page`, `pageSize` and `q`, returning a total and a bounded roster. Search and pagination run on the server. A live refresh retains an open edit's original enrollment version.

## Shared live updates

Set `REALTIME_TRANSPORT=postgres` on every participating API process. Each uses a dedicated PostgreSQL LISTEN connection plus its existing application/session pools. For a transaction pooler, set `REALTIME_DATABASE_URL` to a direct connection to the same database; the provided Docker Compose configuration uses the direct database service through `DATABASE_URL`.

The bus carries invalidation metadata only. Each API rechecks its local sockets' session and selected-role authority before sending events. School clients receive only `area` and, where applicable, `yearId`; platform events require platform administrator authority. Events coalesce for 50 ms. Listener reconnection invalidates local clients so they fetch current authorized state.

LISTEN/NOTIFY is not a durable event log. Publication occurs after the successful HTTP response; a crash or publication failure can lose a notice. Academic and platform clients also reconcile periodically. This transport is not a replacement for the transactional outbox described in the migration plan. The existing Compose deployment still has one API service; enabling the transport alone does not deploy replicas or a load balancer.

## Validation commands

From the repository root (use `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`):

```text
npm.cmd run build --workspace=@syncacademy/api
node --test apps/api/test/auth.test.cjs
node apps/web/scripts/check-concurrent-drafts.mjs
node apps/web/scripts/check-school-sync.mjs
node apps/web/scripts/check-super-admin.mjs
node apps/web/scripts/check-academic-workflow.mjs
node apps/web/scripts/check-head-oversight.mjs
node apps/web/scripts/check-class-teacher.mjs
npm.cmd run build --workspace=syncacademy-web
```

The integration suite resets `syncacademy_auth_test` and starts APIs on ports 3101 and 3102. Run it only with the disposable test database configured and those ports available. Its second-process test covers platform authorization, cross-process school/platform delivery, failed-write silence, session revocation, listener recovery and socket reconnection.

Draft checks cover stale marks, attendance and subject selections, repeated saves, save-then-submit, and attendance date/class guards. These are Angular service/component checks, not visual browser or network-latency measurements.

On 15 October 2026, the final integration run passed 35/35 tests with no skips in 72.9 seconds. All six client checks above and both production builds passed. The Angular build retains its existing bundle-size, unused SaEditor and ExcelJS CommonJS warnings. The final integration log is `.tmp/scalability-integration-final.log`. No deployment was performed.

## Synthetic workload

The benchmark rewrites the configured local database name to `syncacademy_scale_test`, uses port 3103, applies migrations there and inserts synthetic schools. It creates short-lived test sessions rather than logging in. It never resets the live school database. Synthetic rows remain in the disposable database after each run, so repeated runs accumulate data. Use a fresh disposable database for comparable measurements.

The database must either already exist and permit migrations/inserts, or the local database account must have permission to create it. Provision this disposable database using a database owner; do not grant database-creation privileges to the production runtime account.

Small fixture check:

```text
node scripts/benchmark-multischool.cjs --run --schools 2 --students 120 --subjects 2 --assessments 2 --days 2 --users-per-school 2 --rounds 1
```

Planned scale workload:

```text
node scripts/benchmark-multischool.cjs --run --schools 12 --students 2400 --users-per-school 2 --rounds 3
```

The script exercises marks reads/saves, subject search, full and summary workspaces, academic overview, attendance and reports. It writes `.tmp/multischool-benchmark.json` with per-operation p50/p95/p99/max, status counts, response sizes, and sampled API memory/database connections/lock waits. Conflicts are counted separately from other HTTP failures. `REQUEST_METRICS=true` enables API request and five-second runtime metrics; request logs use route templates rather than payloads or query values.

This workload uses loopback HTTP and excludes browsers, TLS, WAN latency and login. Samples collected while other tests run are unsuitable for performance comparison. Transaction retry counts, query plans, deliberately contested same-submission writes and browser paint latency need separate measurements before capacity sign-off.

On 15 October 2026 the smoke attempt stopped before seeding because the configured account lacked permission to create `syncacademy_scale_test`. No latency, throughput or capacity results were produced by that attempt.

## Continuation: existing disposable database and large-document failure

On hosts without database-creation privileges, `--integration-database` explicitly selects the already provisioned `syncacademy_auth_test`. It appends synthetic fixtures, applies the existing test migrations, and refuses to run while integration APIs are reachable on 3101/3102. Do not run integration tests concurrently: their reset deletes these fixtures. No production permissions need changing. Benchmark sessions now use the same timestamp conversion as connect-pg-simple, fixing immediate expiry with the local non-UTC PostgreSQL time zone. Authentication is checked before sampling and non-conflict HTTP failures set a failing exit status.

```text
node scripts/benchmark-multischool.cjs --run --integration-database --schools 2 --students 1800 --subjects 8 --assessments 3 --days 90 --users-per-school 2 --rounds 1
node scripts/benchmark-academic.cjs --synthetic
node scripts/benchmark-academic.cjs --synthetic --controllers
node scripts/benchmark-marks-save.cjs --concurrent
```

The read-only commands use the first fixture identified in `.tmp/multischool-benchmark.json` and reject a non-test database. The marks command probe also requires that report and **rolls back by default**; this mode disables serialization retries to expose individual transaction failures. Explicit `--commit --concurrent` instead commits synthetic-only writes with normal retries and intentionally races the same submission: one winner per school and stale-revision 409s are expected. Use `--marks-only` with `benchmark-multischool.cjs` to isolate independent submission saves. Run measurements separately from builds/tests. The two-school workload is a diagnostic gate, not a substitute for the planned 12-school capacity validation.

The first large run used 31,050,464-byte documents. All four marks saves, all four attendance saves and all four report commands failed with HTTP 500. The marks rollback probe identified P2028 transaction expiry in all four attempts, taking 30.2–41.6 seconds. The new bounded marks persistence path reduced the same four rollback probes to 7.1–9.2 seconds with all succeeding and 13,731-byte receipts. Attendance and report command implementations remain unchanged. See [the performance log](PERFORMANCE_OPTIMIZATION.md) for final checks, HTTP measurements, limitations and artifact paths.

Committed probes additionally exposed raw SQL serialization errors (`P2010` / SQLSTATE `40001`). The existing bounded retry policy now handles these alongside `P2034`; stale drafts still receive 409 and unrelated errors are not retried. The final integration suite passed **36/36** in 97.6 seconds, including forced PostgreSQL serialization, retry limits and exactly-once committed effects.

The final `--marks-only` HTTP run passed all four reads and four independent saves over fresh 31 MB workspaces. Saves were 13,731 bytes, p50 11,900 ms and max 20,211 ms; peak sampled API RSS was 114,982,912 bytes. See `.tmp/performance-marks-http-final.json`. This isolates marks and is not a replacement for the failing mixed attendance/report workload or the planned 12-school/browser capacity gates. Functional browser checks and both production builds passed; production-size browser latency remains unmeasured.
