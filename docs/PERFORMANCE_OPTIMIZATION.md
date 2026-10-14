# Performance investigation and targeted changes

## Baseline on the local Kigoma school

Read-only measurements on 13 October 2026 found 1,800 students, 83 class records across years, and six academic workspaces. The 2026 workspace occupies about 14 MB as PostgreSQL JSONB but expands to 46,016,123 bytes of JSON. Converting that value to text took 1,501 ms in `psql`. A simple student count took 4.8 ms, a year-specific enrollment count 38.6 ms, and a 25-row student list with its current sort took 2.8 ms in `EXPLAIN (ANALYZE, BUFFERS)`. The academic lookup and audit list already use suitable indexes. These measurements do not include HTTP transfer or browser rendering.

The Angular academic service previously downloaded the entire workspace every 30 seconds while visible. It could also download it twice after a save because the shared school refresh and the save handler both triggered academic loading. Other users had no push notification and had to wait for polling or refresh their page.

## Changes

- The authenticated `GET /api/v1/schools/:schoolId/academics/revision?yearId=...` returns only the workspace revision. Full academic responses include `workspaceRevision`. The revision query took 5.2 ms through `psql` and 0.17 ms of PostgreSQL execution time in the measured plan.
- Angular retains the active academic response in memory. Its visible-page 30-second check requests the small revision and downloads the full record only when it changed. Reconnects also reconcile the school state. Concurrent loads for the same context are coalesced, including the duplicate path after an academic save.
- Refreshing the shared school snapshot no longer triggers a full academic download while the same school and year remain selected.
- NestJS Socket.IO uses the existing signed server session, checks the request origin and school membership, and rechecks the session and membership before sending each event. Successful school writes emit a small school-scoped invalidation after the HTTP response finishes, after the database operation has returned. Academic events go only to connected Headmasters, Academic Masters, and Teachers; clients refetch through their existing authorized REST endpoints. Failed writes do not emit updates.
- Nginx now supports WebSocket upgrades and gzip. In a local compression measurement, the 46,016,125-byte 2026 JSON stream compressed to 2,052,717 bytes at gzip level 5, about 95.5% smaller. The actual browser transfer depends on HTTP headers and client behavior.

No index was added: measured lookups were already fast, and another index would add write cost. No backend cache was added because reference-table queries were not a demonstrated bottleneck; the revision check avoids stale cached academic data without introducing invalidation complexity. Existing data, API fields, and role rules remain in place.

## Verification and limits

The API integration suite covers committed-event delivery to Headmaster and Teacher sessions, failed-write silence, school isolation, unauthorized room rejection, reconnection, and logout invalidation. Angular and API production builds check the client and server integration. The local Docker deployment remains a single API instance; multiple API replicas would require a shared Socket.IO adapter and compatible session routing. Initial loading of the large academic workspace still processes the full JSON, and the existing student workspace list is not yet consumed through server-side pagination by every screen. Those need separate page-level profiling before changing the current record and UI contracts.

For local deployment, `APP_ORIGIN` must match the address used in the browser; restart the API after it changes. On 13 October 2026 this computer had `192.168.0.106`, so the site was verified at `http://192.168.0.106:8080`. The previously requested `192.168.0.108` was not assigned to the host. To use that address again, restore it in the host or router network configuration and update `APP_ORIGIN` accordingly.

## Continuation verified on 14 October 2026

### Phase 1: selective academic overview

Added an optional `view=overview` to the existing academic GET. Explicitly audited dashboard/setup/staff routes request this view; marks, attendance, reports, exports and unknown routes retain the original full response. SQL projects the required JSON fields before transfer and replaces submission entries/history with aggregate counts, sums and pass statistics. Existing role projection still applies. Report counts remain permission scoped. Frozen assessment grading policies are respected.

On the existing 2026 data, compact JSON decreased from 42,955,889 to 4,905,019 bytes (88.6%); gzip decreased from 2,142,933 to 331,759 bytes (84.5%). The earlier 46 MB figure used PostgreSQL's spaced text representation. Three sequential local measurements gave full/overview median DB-read times of 10,565/5,724 ms, serialization 759/99 ms and parsing 1,032/168 ms. Host timing varied substantially: these are in-process measurements, not HTTP or browser timings. Overview/full equality, grading and role tests passed during this phase, along with API and Angular production builds.

### Phase 2: post-save refresh

Marks, submission, review, attendance, topic, notification and grading saves can return a revision-bound patch containing only affected records and required audit/notification metadata. Angular applies it only when the current school, year, view and base revision match, with no conflicting load. Other cases retain the authorized refresh fallback. Cached idempotent responses deliberately return only saved status, avoiding replay of private records after permissions change. Grading saves and command persistence avoid returning the entire JSONB value from Prisma. Academic writes skip the redundant shared school download except relational class/assignment changes. Assignment-scope changes still refresh authorization projections. Integration and academic client checks passed during this phase.

This improves the saving user's transfer. Other connected users receive metadata invalidations and fetch the authorized current view; their updates are not record-level streaming. General academic commands still read/process the full stored document on the server. No claim is made that every save avoids a full download.

### Phase 3: client requests, rendering and real-time reconciliation

School snapshot reads coalesce and queue one follow-up when changes arrive during a read. Late responses cannot overwrite another school/user/role or logged-out state. Socket listeners are removed on replacement, and old connection callbacks cannot act on the new session. Reconnect reconciles school state and checks academic revision. Finance year caches invalidate on relevant school changes, including in-flight loads. Teacher grade rendering uses a computed assignment Map: a synthetic 99,000-mark/1,980-assignment comparison reduced lookup work from 1,198–1,554 ms to 3–12 ms with identical results.

Client checks passed for school synchronization, academic workflows, bursar workflows and head oversight. These cover queued writes, request coalescing, logout/school switching, reconnect, permissions and finance cache invalidation. The production Angular build passed; existing warnings remain for the approximately 737 kB initial bundle versus its 500 kB warning budget, unused SaEditor and ExcelJS CommonJS.

### Phase 4: measured school dashboard queries

An additional actual bottleneck was found after the earlier fast individual lookups. The dashboard's correlated finance calculation repeatedly scanned payments and adjustments for 1,800 students. Replacing it with school-scoped grouped CTEs preserved the balance formula and non-void payment rule. EXPLAIN ANALYZE reduced execution from 11,853.415 to 638.711 ms and shared buffer hits from 573,674 to 2,555, with the same 1,727 owing students.

Prisma's nested enrollment-subject query also generated a 55,856-character composite-key IN expression, taking about 12–16 seconds. The workspace now batches subjects using the authorized enrollment IDs plus schoolId, then reconstructs the same response shape. No new index or schema change was needed.

After both fixes, three sequential controller runs measured 1,669/1,450/1,454 ms for the school workspace, compared with approximately 20,676–23,140 ms before these fixes. Response size remained 4,538,523 bytes. Enrollment-subject queries took 106/82/141 ms. The existing 25-student endpoint measured 94/87/59 ms (63,538 bytes), and registry summary 28/32/25 ms (12,280 bytes). Authorization runs in these benchmarks, but HTTP transport/session-store and browser rendering are excluded. Reproduce with `node scripts/benchmark-academic.cjs --docker-local --controllers`; omit `--controllers` for academic payload measurements. Benchmarks are read-only.

### Requirements audit and remaining limitations

- Existing registry student, admission, event and audit endpoints already provide bounded server pagination. The shared school snapshot and academic detail/results/attendance/report consumers still depend on full collections. Their client pagination does not reduce network payload. This requirement is only partly complete.
- A safe subsequent migration is additive class/assessment endpoints with server aggregates and paginated details; compare authorized results against the current endpoint, migrate one screen and its exports at a time, and retain full GET until dependent stores are migrated. Attendance latest-state and correction history must remain distinguishable. No broad academic architecture rewrite was attempted.
- Existing small teacher lists (40 teachers) and fast registry/reference queries do not justify a new backend cache. Some registrar reference reads still repeat with page changes; no additional cache was introduced without an end-to-end benefit measurement. Angular retains active academic/finance state with invalidation.
- Existing lazy routes remain. No blanket change to change detection or virtual scrolling was justified by a browser profile. The lookup hot spot above was independently measured.
- Teacher submission, academic review, attendance and school writes use the existing socket invalidation path. Academic Master class approval and Headmaster permission restrictions are unchanged. No school announcement publishing workflow exists in the inspected controllers, so no new announcement feature or fictional synchronization test was added.
- No new dependencies, indexes, migrations, Redis, backend cache or pool-size changes were added in this continuation. Existing connection pools remain unchanged.
- The deployment is one API instance. Multi-replica synchronization, broad multi-school load tests and guaranteed sub-second detail-screen rendering remain unverified. Concurrent role/socket tests are functional tests, not a capacity benchmark.

The original optimization request is therefore not entirely complete: large detail endpoints and browser-level rendering/capacity measurements remain. The implemented phases target demonstrated bottlenecks while retaining the existing contracts and records.

### Final verification for this continuation

The isolated PostgreSQL integration suite passed **34/34**, zero failed/skipped, in 184.4 seconds. It includes batched enrollment-subject response equality, grouped finance balance correctness, school isolation, existing academic/report permissions, revision patches and replay behavior. Socket checks cover anonymous/wrong-origin rejection, verified role membership, foreign-school room rejection, failed-write silence, reconnect, logout and membership revocation. Three simultaneous authenticated roles received teacher submit/review/attendance invalidations; measured save-to-event delivery was 401/273/177 ms respectively. These are local integration event timings, not browser-paint latency.

Client verification commands: `node apps/web/scripts/check-school-sync.mjs`, `check-academic-workflow.mjs`, `check-bursar-workflow.mjs` and `check-head-oversight.mjs` (all under the same scripts directory); all passed. API TypeScript build passed. Tests use the disposable `syncacademy_auth_test` database; the existing school records were preserved.

The original performance targets are not all met: registry controller summary is below 300 ms and the 25-row list below 200 ms in the measured runs, but the shared dashboard workspace remains about 1.5 seconds and the academic overview several seconds. Network/browser timings and large concurrent-school capacity remain unmeasured. Existing loading/error/success behavior is retained; no optimistic administrative success or unrelated UI redesign was introduced.

### Docker deployment

API and Angular production builds and both Docker image builds passed on 14 October 2026. Recreated the API/web services using existing database volumes and without running migrations. The API is healthy; the landing page, `/auth/login` and `/api/v1/health/ready` all returned HTTP 200 at **http://192.168.1.3:8080**. APP_ORIGIN matches this current LAN address (the earlier addresses above are historical). No browser visual/performance check was performed. Existing Angular bundle/CommonJS warnings remain as recorded above.

## Support-plan save timeout fix (14 October 2026)

A reported generic support-save failure was reproduced against the existing large 2026 workspace using an always-rolled-back transaction. Prisma raised P2028 at the full-document upsert: 38,527 ms had elapsed against the 15,000 ms transaction limit; total command time was 40,164 ms. No diagnostic support plan was committed.

Support creation now validates the same academic year, enrolled student, subject and active teacher, then appends only the support/notification/audit JSON fields inside PostgreSQL. It returns a revision-bound support patch, avoiding a full post-save download when the client revision matches. Existing teacher visibility, notifications, idempotency and transaction isolation are retained. No timeout increase, schema change or dependency was introduced. The identical rollback probe completed successfully in 3,522 ms after the change. PostgreSQL still rewrites the JSONB value internally; the eliminated cost is transferring, parsing and reserializing the entire academic workspace in the application. Other support lifecycle commands retain their existing implementation.
Verification for the support fix: API build, academic client checks, and all 34 PostgreSQL integration tests passed (183.6 seconds). Regression checks cover support patch revisions, retry deduplication, teacher permissions, invalid date/student rejection and unchanged academic collections. Rebuilt and deployed the API Docker image; no database migrations or record resets were performed.

## WebSocket coverage and concurrent editing audit (14 October 2026)

The socket infrastructure works for authenticated school sessions, but is not universal website synchronization. Successful writes below `/api/v1/schools/:id/...` emit school invalidations; academic commands emit academic invalidations to Headmaster/Academic/Teacher roles. The shared school snapshot, academic store and finance year cache react to those notices. Registrar list effects depend on refreshed school data. Reconnect revalidates shared state. Public pages do not need private school sockets; Super Admin platform endpoints/stores have no equivalent platform-wide live invalidation path. Direct database/external changes do not emit socket events; academic revision polling is an additional fallback for that store.

A confirmed coverage gap is `StudentSubjectsPage`: its own class/roster requests react to school/year/role selection, but not to school revision notices. Another user's subject changes can therefore remain stale there until reloading. Open Registrar detail dialogs retain their original snapshot; a refreshed list does not silently replace the edit form.

Concurrency is a separate concern from event delivery:

- Personal student profiles are writable by Registrar/Headmaster, not Teachers. The request carries the version originally loaded. A conditional version update allows only one competing save; the loser receives HTTP 409 and must reopen the current record. There is no automatic field-by-field merge, even when users change different fields.
- Marks carry a revision per assessment/class/subject submission; two edits to different students in the same submission still share that revision. Attendance carries a revision per class/date. Stale revisions are rejected. Serializable transactions and bounded serialization retries protect simultaneous database writes. Independent records can both persist if authorized and within transaction limits.
- New live-database integration assertions race Registrar versus Headmaster on one student profile and Teacher versus Academic Master on one marks submission; each produces one success and one 409 and retains the winner's value. The test database is disposable; no real student was edited.
- Important unresolved client gap: TeacherMarksPage preserves dirty mark rows on live refresh, but TeacherStore.save obtains the latest store revision at save time rather than the revision associated with the draft. A dirty old draft can therefore be submitted with a newer revision, bypassing the intended stale-edit protection. The direct API race test does not cover or disprove this browser issue. Draft revision must be captured with the loaded rows and retained until explicit reload or successful save.
- Important unresolved client gap: TeacherClassPage's attendance effect rebuilds entries and clears the reason whenever saved attendance/roster changes, without a dirty guard. A live refresh can discard unsaved attendance inputs. It needs draft preservation, captured base revision, and an explicit conflict/reload flow.
- Not every settings action has an expected revision (for example grading settings). Such actions are serialized, but the later accepted save can replace the earlier setting. Socket delivery does not implement record locking or collaborative editing.

This turn is an audit plus additional regression tests, not a claim that these newly identified client gaps have been repaired. No application code or deployment was changed during this audit. The existing single-API-instance and browser-level verification limitations still apply.
