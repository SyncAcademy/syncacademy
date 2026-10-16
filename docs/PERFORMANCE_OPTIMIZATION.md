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

### Audit recheck on 15 October 2026

On resuming, the workspace already contained additional frontend edits that were not present during the earlier audit: a captured `draftRevision` in the marks page, an attendance dirty guard, and a student-subjects school-revision listener. This audit preserves those edits and does not claim authorship or deployment of them. The earlier findings describe the earlier implementation; these newer changes are only partial protection:

- Attendance now preserves dirty input values, but AttendanceService.save still takes the newest stored revision, rather than a revision captured with the draft. Old inputs can therefore be sent with a newer revision.
- StudentSubjectsPage now listens for school changes, but saves `student.version` from the refreshed list while keeping editingSubjects separately. It needs a captured edit version to prevent a live list refresh from giving an old selection a new version.
- Marks now captures a draft revision, but the save-success path does not explicitly advance it before a following save/submit. The effect checks dirty/saving with untracked reads; correctness must not depend on its scheduling relative to save completion.

Existing school synchronization, academic workflow and class-teacher client checks passed. Those checks do not establish the correctness of these newly identified draft scenarios. No runtime source was changed or deployed by this audit recheck.
Final recheck: all 34 API integration tests passed (110.7 seconds), including the simultaneous profile/marks tests, school isolation, reconnect and session revocation. Output is retained locally in .tmp/websocket-audit-tests.log. Three-role save-to-event timings were 166 ms for submission, 140 ms for review and 196 ms for attendance. These validate server behavior and event delivery, not unsaved browser draft safety.

### Implementation continuation on 15 October 2026

The workspace now includes draft-version protection for marks, attendance and student subjects, bounded submission reads, server-paginated subject rosters, compact school dashboard reads, platform live updates and an optional PostgreSQL invalidation bus. The earlier audit findings above describe the prior code. The dedicated draft checks pass for stale input preservation, repeat saves, save-then-submit, date/class guards and refreshed enrollment versions.

This continuation corrected a regression where internal bus routing fields were emitted in school socket payloads. The client contract remains {area, yearId?}. Integration listeners now distinguish academic notices from preceding school notices and reject assertions through their promises rather than producing uncaught asynchronous failures. The test listener connection is explicitly pinned to the disposable database.

Additional checks verify that the compact school response preserves authorized counts/reference data, denies foreign-school access, and cannot overwrite a detail route after navigation. All six client checks listed in [Scalability validation](SCALABILITY_VALIDATION.md) passed. API TypeScript and Angular production builds passed; the web build retains the 737.49 kB initial bundle warning, unused SaEditor warning and ExcelJS CommonJS warning.

The synthetic benchmark smoke attempt could not create its disposable database with the configured database account. No workload was seeded and no capacity result was produced. The validation document records setup commands, transport behavior and remaining measurement gates. No deployment or academic storage migration was performed in this continuation.

Final verification: the PostgreSQL integration suite passed 35/35, with zero failures or skips, in 72.9 seconds. The final log is .tmp/scalability-integration-final.log. Three-role save-to-event checks measured submission/review/attendance at 170/140/132 ms in this local functional run; these are not browser latency or capacity results.

## Measured continuation, 15–16 October 2026

### Preserved work and environment

Reviewed this log and existing changes first. Preserved the overview/marks projections, summary school endpoint, paginated subject rosters, draft protection, finance queries and Socket.IO/PostgreSQL invalidation work already present. Docker is unavailable in this session; the configured Windows PostgreSQL instance is not the populated Kigoma Docker database. Earlier Kigoma figures remain historical. No real school was seeded, reset or edited.

The benchmark's explicit `--integration-database` option appends synthetic fixtures to the already provisioned `syncacademy_auth_test` and refuses to run alongside integration APIs. No database-creation privileges were granted. Fixed synthetic session expiry on the database's Africa/Nairobi time zone by using connect-pg-simple's timestamp conversion; added authentication preflight, startup diagnostics and failing exit status for non-conflict HTTP errors. Initial 401 samples are excluded. The subsequent two-school/120-student smoke had no non-conflict errors and one attendance 409. Conflicts are recorded separately, not automatically assumed to be expected stale drafts.

### Bounded marks saving

The existing marks view rejected every save patch and downloaded the submission again. Optional `view: 'marks'` command receipts now contain the authorized changed submission without archives or unrelated audit/notifications. Angular applies one only for the same context/submission, matching workspace base revision, and no active load. The regression check reproduced **one follow-up GET before and zero after**, including the saving client's socket notice. Stale or wrong-submission receipts and idempotent replay acknowledgements retain the authorized bounded refresh. Other views retain their patch contracts.

This does not eliminate every full post-save download. Commands without patches, including allocation, class approval and support lifecycle operations, can still refresh a full view. Other connected clients receive invalidations and reload their current authorized view; they do not receive record-level streaming updates.

The larger workload exposed a server bottleneck too: all four concurrent marks saves over two 31,050,464-byte workspaces returned HTTP 500. An always-rolled-back probe confirmed **P2028 transaction expiry in all four attempts**, taking 30,187/31,735/37,425/41,575 ms.

Explicit bounded marks saves now read the selected submission/assessment, execute the **same marks validation**, and merge the submission and audit entry inside PostgreSQL. This preserves unknown root fields, other submissions, reports, notifications, selected roster archives and audit history. Submission/document revision checks, serialization retries, idempotency and authorization remain. No timeout increase or storage migration was made. This follows the existing support-save technique. Submit/review receipts can be bounded, but their persistence remains the original full-document path.

The identical four rollback probes succeeded in **9,221/9,190/7,059/7,058 ms**, with 13,731-byte receipts. These exclude HTTP/session lookup and disable serialization retries; they are not capacity or sub-second-save results. Reproduce with `node scripts/benchmark-marks-save.cjs --concurrent` after creating disposable fixtures. Logs: `.tmp/performance-marks-before.log` and `.tmp/performance-marks-after.log`.

### Initial reads and dashboard measurements

The first large HTTP run used **two schools, 1,800 students each, eight subjects, three assessments, 90 attendance days, two clients per school, one round**. Four samples per operation means p95/p99 equal the observed maximum, not reliable tail estimates. Loopback HTTP, sessions, authorization and JSON transfer are included; browser painting, WAN, TLS and proxy gzip are excluded. These are synthetic documents, not new Kigoma measurements.

| Read | p50 ms | Maximum ms | Maximum response bytes |
| --- | ---: | ---: | ---: |
| Selected marks | 779 | 914 | 14,219 |
| Academic full | 4,895 | 10,730 | 31,069,206 |
| Academic overview | 2,529 | 8,279 | 662,759 |
| Academic revision | 19 | 3,894 | 14 |
| School workspace | 3,383 | 5,810 | 1,688,065 |
| School summary | 924 | 3,770 | 160,977 |
| Paginated subject search | 4,306 | 4,566 | 34,580 |

The existing projections reduce academic response bytes by **97.9% for overview and 99.95% for selected marks**, and school summary bytes by **90.5%**. Unmigrated results, attendance, reports and exports retain full reads; no consumer was silently switched to incomplete data.

Three separate sequential read-only DB measurements gave median read/serialization/parse times of **2,951/208/336 ms** for full, **1,607/6/9 ms** for overview, and **558/<1/<1 ms** for marks (rounded zero for the last serialization/parse measurements). JSON sizes were 31,050,464 / 643,967 / 14,024 bytes; gzip level 5 produced 718,558 / 43,025 / 2,599 bytes. Synthetic repetition compresses especially well; these are not observed browser transfers. Log: `.tmp/performance-payloads.log`. `benchmark-academic.cjs` now includes marks and summary paths and supports `--synthetic`, preserving historical Kigoma mode.

The first mixed run also failed **all four attendance saves and all four report commands** with HTTP 500. Attendance p50/max were 18,195/20,381 ms; reports 21,707/25,690 ms. Peak sampled API RSS was **2,904,002,560 bytes**, heap 770,619,736 bytes; database connections/active queries peaked at 12/5. No lock wait happened to be sampled; this does not establish absence of contention. Artifacts: `.tmp/performance-large.json` and `.tmp/performance-large.log`. The marks fix does not repair attendance/report persistence. The 12-school capacity gate remains open because this smaller gate already fails.

### Service and synchronization audit

- Academic visible-page polling remains a small revision check every 30 seconds, covering missed invalidations/direct database changes. Matching marks receipts now avoid the redundant bounded GET as well. School coalescing, late-response guards, summary/detail navigation guards, reconnect reconciliation and finance invalidation remain intact.
- Registrar filters/pages still request summary and subject references beside the bounded list. This is repeated work, but a browser-level cache benefit and complete invalidation policy have not been established; no cache was added on that basis. Platform visible-page polling remains a recovery fallback. The landing-page interval is a slideshow, not API polling.
- Submission, Academic Master return/class approval, attendance, support and school writes already use authorized invalidations. Headmasters observe authorized changes; class approval remains an Academic Master operation. No new approval authority or announcement workflow was invented.
- A loaded integration run passed the new marks checks but failed a positive reconnect assertion after its fixed 100 ms sleep. Positive delivery checks now await the existing five-second bounded event promises. Socket behavior was not weakened. Origin rejection, selected-role/membership authorization, school isolation, logout, reconnect and cross-process delivery remain required tests.

No dependencies, indexes, migrations, Redis, backend cache, pool-size changes or additional infrastructure were introduced. The existing optional PostgreSQL bus was retained. [The storage migration plan](ACADEMIC_STORAGE_MIGRATION.md) remains a proposal. The overall optimization is **not complete**: attendance/report writes, remaining full detail consumers, production browser latency and broad capacity still need work. No deployment was performed.

### Verification of this continuation

- API TypeScript build passed. Final PostgreSQL integration suite passed **36/36**, zero failures/skips, in **97.6 seconds** after the raw SQL retry correction. It verifies bounded receipt equality, preserved archives/audit/other submissions/reports, mixed bounded/original concurrent marks writes, forced database serialization conflicts, retry limits, authorization, replay behavior and existing school/socket workflows. Three-role submission/review/attendance save-to-event timings were **201/158/237 ms**; reconnect grading delivery was 1,343 ms on the stress-padded test record. Log: `.tmp/performance-final-integration.log`.
- Eight Angular checks passed: school sync, super admin, academic workflow, head oversight, class teacher, concurrent drafts, bursar workflow and registrar workflow. Updated the registrar test's outdated mock to supply the current identity signal. The academic request-count regression was rerun after adding self-notice reconciliation coverage.
- Angular production build passed, output to `apps/web/.tmp/codex-web-build` to preserve existing tracked deployment artifacts. Existing warnings remain: 737.49 kB initial bundle against 500 kB warning budget, unused SaEditor and ExcelJS CommonJS. Log: `.tmp/performance-web-build.log`.
- The browser harness initially exited under sandboxing, then exposed a missing academic revision signal in its old mock. Added that fixture signal and reran headless Chrome outside the sandbox. Results passed **45 desktop, 45 mobile, 26 support, 33 notifications and 37 feedback checks**. Screenshots are under `apps/web/.tmp/academic-browser`; log `.tmp/performance-browser.log`. These are small-fixture rendering/workflow checks, **not** production-size browser performance measurements.

### Committed-write follow-up and retry correction

The first post-change mixed HTTP run was deliberately retained even though it failed: **two of four marks saves succeeded and two returned 500**. All four attendance saves and all four report commands still returned 500; peak sampled RSS was 2,821,488,640 bytes, with two lock-waiting connections sampled. Artifacts: `.tmp/performance-large-after.json` / `.log`. A cold API startup timeout before that run produced no latency results; the harness startup allowance and diagnostics were expanded without changing application timeouts.

An explicit committed probe (`benchmark-marks-save.cjs --concurrent --commit`, disposable fixtures only) identified the marks failures as **Prisma P2010 / PostgreSQL SQLSTATE 40001**, not a business validation failure. Raw SQL reports serialization conflicts differently from Prisma model updates. The transaction helper previously retried only P2034. It now also retries exactly P2010/40001 under the existing three-retry limit; exhausted raw serialization conflicts become 409 and other raw SQL errors are unchanged. A regression test forces two real PostgreSQL snapshots to compete, verifies exactly-once committed changes after retry, and checks retry exhaustion and unrelated-error propagation.

The repeated committed same-submission probe then produced the correct two successful writes (**5,124/9,085 ms**) and two stale-revision **409s** (**5,956/9,772 ms**), with no 500s. Logs: `.tmp/performance-marks-commit-before.log` and `.tmp/performance-marks-commit-after.log`. Rollback-only probes cannot reveal this committed serialization case; they must not be used alone for concurrency sign-off.

Sequential, read-only controller measurements on the post-change synthetic fixture (Academic Master role; authorization included, HTTP/session lookup excluded) gave:

| Controller | Three runs, ms | Bytes | Queries per call |
| --- | --- | ---: | ---: |
| Full school workspace | 960 / 879 / 690 | 1,759,947 | 26 |
| School summary | 218 / 149 / 115 | 232,859 | 21 |
| 25-student page | 79 / 66 / 68 | 71,313 | 11 |
| Registry summary | 41 / 17 / 18 | 5,828 | 5 |

Enrollment-subject query times were 54/52/34 ms. These results support retaining the existing batched query and selective summary endpoint. They do not justify another index or backend cache. The synthetic fixture has no representative finance payment history, so it cannot replace the earlier populated-school finance plan measurements. Log: `.tmp/performance-controllers.log`.

### Final independent-marks HTTP gate

After the retry correction and **36/36** integration pass, ran fresh two-school fixtures with the same 1,800 students/eight subjects/three assessments/90 attendance days and `--marks-only`. All **four selected reads returned 200 and four independent submission saves returned 201**, with zero conflicts or errors. Reads measured p50/max **1,173/1,276 ms** and 14,219 bytes; saves measured **11,900/20,211 ms** (minimum 6,888 ms) and **13,731 bytes**. Total measured workload duration was 21,490 ms. Four samples do not establish a production latency distribution.

Peak sampled API RSS/heap were **114,982,912 / 35,672,144 bytes**, database connections/active queries/lock-waiting connections **10/5/2**. This is a marks-only workload and its memory peak must not be compared as if it were the same mixed workload as the earlier 2.9 GB result. It verifies committed marks saving with HTTP, authorization, sessions and retries; it does **not** certify concurrent attendance/report processing or meet a sub-second write target. The full mixed workload has not been re-certified after the retry correction; its earlier attendance/report failures remain unaddressed.

Artifacts: `.tmp/performance-marks-http-final.json` and `.tmp/performance-marks-http-final.log`. Reproduce with:

```text
node scripts/benchmark-multischool.cjs --run --integration-database --marks-only --schools 2 --students 1800 --subjects 8 --assessments 3 --days 90 --users-per-school 2 --rounds 1
```

Next justified work is bounded attendance-register reads/writes and class/assessment-scoped report generation, with history/permission/output equivalence tests before cutover. Broader independent-row storage still follows the existing migration proposal. No timeout/pool increase, cache or index is substituted for that unresolved document-processing work.
