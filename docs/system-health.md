# System Health monitoring

## Access and architecture

The existing `/super-admin/system` route is protected by the session/MFA role guard. APIs use `PlatformService.administrator`; no new authentication scheme was added. School roles cannot read infrastructure data or mutate thresholds. Public readiness remains separate.

`MonitoringModule` owns a bounded in-process request histogram and a 30-second collector. HTTP completion callbacks only update counters; they never write to the database. The collector uses a separate PostgreSQL connection (max 1, 2-second statement timeout), and failures are isolated from school requests. Prisma error events increment a counter without retaining messages. WebSocket hooks count accepted connections, disconnects, rejected connections and delivered invalidations. The actual communication worker writes a heartbeat every 15 seconds and reports execution counters and rate-limit cleanup.

Only route templates, counts, timings, status, instance labels and incident audit identifiers are stored. URLs, query parameters, SQL text, request bodies, credentials and school/person records are not captured.

## Protected APIs

All paths start with `/api/v1/system-health`:

- `GET /`: cached current collection, settings and recently observed API instances.
- `GET /history?range=15m|1h|6h|24h|7d|30d`: serving-instance observations downsampled to approximately 180 intervals.
- `GET /endpoints?range=...`: serving-instance request aggregates, at most 256 route groups.
- `GET /alerts?range=...`: active incidents plus recent history, capped at 200.
- `POST /alerts/:id/acknowledge`: persists acknowledgement and actor with an AuditEvent transaction.
- `PATCH /settings`: strict validated thresholds, retention and browser refresh preferences; audited server-side.

Recovery is automatic after the configured consecutive healthy checks. There is deliberately no action to falsely mark an unhealthy service recovered. Warning/critical checks must persist for the same consecutive threshold before opening an incident. Open incidents are unique per service and instance. Database-outage alert transitions are buffered in bounded process memory until storage recovers; a process crash during that outage can lose this buffer.

## Database migration and bounds

`202610200001_system_monitoring` adds five metadata tables:

- MonitorSample: one aggregate observation per instance per 30 seconds.
- MonitorEndpoint: one aggregate histogram per active route/instance/five-minute bucket. The historical `hour` column name holds the bucket timestamp.
- MonitorSetting: one shared configuration row.
- MonitorAlert: incidents and acknowledgement metadata; partial unique index permits one open incident per service/instance.
- MonitorWorker: latest heartbeat per worker instance.

Retention defaults to 31 days, configurable 1-31. Expired samples, endpoint aggregates and resolved alerts are removed hourly; stale worker rows are removed after one day. This bounds observations to approximately 89,280 rows per API instance at maximum retention (plus one cleanup interval). Endpoint cardinality is capped at 256 per collection; excess routes share an overflow bucket. No per-request records are stored. Retention limits data age, not a fixed byte quota; provision capacity for instance count and actual route traffic. History is aggregated by PostgreSQL, not downloaded in full. Historical and endpoint reads are cached for 30 seconds per allowed range, with concurrent requests coalesced (at most 12 cache keys). Raw observations remain at 30-second resolution within retention. There is no indefinite archive. Unresolved incidents stay until recovery.

P50/P95/P99 are exact for collection intervals with at most 512 requests, using bounded in-memory timings. Median uses the middle pair for even counts; P95/P99 use nearest rank. Individual timings are discarded after aggregation and are never persisted or returned. Higher volumes and persisted endpoint aggregates use histogram upper bounds capped by a known maximum (or total duration for legacy data); these are labeled "At most". History P95 is the maximum interval P95 value or upper bound, not a recomputed range percentile. A flag distinguishes exact history from bounds. Endpoint filters use five-minute bucket boundaries and can include up to five extra minutes at the range boundary. Monitoring and readiness requests are excluded from API traffic instrumentation.

## Deployment

Run `scripts/deploy-lan.ps1` to build both API and web, apply migrations with the existing migrate service and update API/worker/web together. Runtime provisioning automatically grants access to the new tables, while AuditEvent remains append-only. This is an additive migration; no school tables or auth data change.

Each API replica MUST have a unique stable `MONITOR_INSTANCE_ID`. The single-instance Compose default is `api-primary`; override it per replica before scaling. Workers use the same variable in their own heartbeat table and must also have unique worker IDs if scaled. Hostname is the fallback outside Compose. Never run two API processes with the same ID against one database. Connection totals sum fresh (under 90 seconds) observed instances; stale and missing instances are not counted as healthy. Detailed process metrics and history describe the serving API instance, not fleet-wide CPU/RAM. Use sticky admin routing or a dedicated admin instance for consistent historical selection behind a load balancer. PostgreSQL realtime transport should be configured before scaling school invalidations across instances.

No extra secrets or npm monitoring dependencies are needed. The dashboard polls summaries and alerts at the saved interval (minimum 30 seconds); history/endpoints are fetched at most every two minutes unless manually refreshed. Polling pauses while hidden, concurrent refreshes are coalesced, and timers/listeners are destroyed on navigation. The collector continues independently of the page.

## Honest limitations and optional infrastructure

- CPU is process CPU / one wall-clock core and may exceed 100%; heap utilization is used V8 heap / V8 limit. RSS is also shown. Host CPU/RAM and container memory quotas are **unavailable** without an exporter/cgroup integration.
- Filesystem usage is the filesystem visible to the API, not the database volume or complete physical host.
- PostgreSQL probe latency is not general query latency. Activity counters only cover sessions visible to the runtime role. `pg_read_all_stats` may be granted by an operator if broader visibility is required; this implementation does not silently grant elevated privileges. SQL text is never queried or returned. Connection capacity is this database's connections / server maximum, not whole-cluster occupancy. Prisma pool utilization is unavailable; the session pool is separately measured.
- Database operation failures count Prisma error events since API start. PostgreSQL rollback counts are displayed separately and are not mislabeled as errors. Slow-query counts are instantaneous visible queries over one second; historical completed slow-query analysis requires an approved `pg_stat_statements` integration.
- Application uptime and observed health are not externally measured uptime. Coverage explicitly reports missing intervals. Full API/DB outages can also prevent database-backed session authorization. Configure an **independent external uptime probe** against public readiness and store observations outside this application for complete outage/SLA measurements. External availability remains unavailable in the UI.
- WebSocket reconnections are unavailable as a separate metric because the current protocol does not securely distinguish reconnects from new connections. Connection counts and failures are measured. No user/socket IDs are persisted.
- Email, SMS and WhatsApp dispatch plus rate-limit cleanup are the discovered worker tasks. Per-channel outbox counts and configured provider modes are displayed. Accepted/mock dispatch is explicitly distinguished from confirmed provider delivery. There is no report scheduler or academic queue. Execution duration and success/failure counters reset with the worker; retained delivery counts come from Outbox. No fixed next scheduled execution exists for the continuously polled queue.
- Alerts are available in the dashboard; outbound alert notifications are not enabled. The existing mail flow encrypts user invitation/reset payloads and is intentionally not repurposed for infrastructure notifications without recipient configuration.
- If monitoring persistence fails, the page displays current/stale data and marks history unavailable. No fabricated historical points or success values fill gaps.

## Verification

- `npm.cmd run build --workspace apps/api`
- `npm.cmd run build --workspace apps/web`
- `npm.cmd run test:monitoring --workspace apps/api`: uses only `syncacademy_monitor_test`, provisioned in Docker by default; set MONITOR_TEST_DATABASE_URL to a test-capable admin connection when Docker is not used. Tests real sessions/MFA, all staff-role denials, real sockets/request metrics, history, safe output, settings validation, acknowledgement auditing, bounded histograms and failed database probes/recovery.
- `npm.cmd run test:monitoring --workspace apps/web`: headless Chrome at 1440, 820, 390 and 320px; isolated UI fixtures test controls, filtering/sorting, range loading, coalescing, stale-data recovery, acknowledgement, settings and keyboard chart interaction.
- The current `lint` script runs TypeScript checking (`tsc --noEmit`); no ESLint rules are configured. Production builds report existing bundle-size, ExcelJS CommonJS and unused-import warnings.

Reference semantics: https://nodejs.org/api/process.html and https://www.postgresql.org/docs/17/monitoring-stats.html.

## Idle intervals and chart interpretation

A completed collection interval with zero ordinary API requests is `idle`. Latency, percentiles and response percentages remain null because no requests were available to measure; the dashboard labels this "No requests". Monitoring/readiness calls are excluded to avoid measuring the monitoring page itself. An interval with requests and zero server failures correctly has a 0% error rate.

Historical responses include explicit empty time buckets with `observations: 0` and `requestState: missing`. These are coverage gaps, not zero-valued measurements. API intervals with observed zero requests are labeled idle separately. All charts share time-proportional positioning, labeled scales, point markers (including isolated measurements) and distinct idle/missing shading. Lines never interpolate across unavailable values. Tooltips default to the latest observed interval and describe idle or missing states without misleading unit suffixes. WebSocket failure trends sum interval failures rather than joining lifetime counters across process restarts.

CPU sampling starts with an explicit warmup baseline and waits for a complete normal interval (minimum 25 seconds, nominally 30). Short first-process samples no longer produce misleading spikes beside 30-second averages. Historical short startup samples are preserved and annotated. A sustained 200% value still correctly means approximately two CPU cores in a process metric normalized to one core; it is not 200% of total host capacity.
