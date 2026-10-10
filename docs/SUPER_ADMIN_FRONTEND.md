# Super Admin workflows

The active `/super-admin` routes use authenticated, platform-administrator-only API endpoints and PostgreSQL records. School registration creates a school and queues a single-use Headmaster invitation. The Schools directory supports paginated browsing and suspension/reactivation with an audit reason.

The Leads pipeline saves prospective schools, follow-up dates, owners and stages. A won lead can be converted once by choosing a unique school code; conversion creates the school and queues a Headmaster invitation for the lead contact in one transaction. Converted leads link to the school workspace. Platform Settings saves the platform name, support email and administrator announcement, and manages Super Admin invitations. The Overview and Audit Log read live school counts and recent audit events. System Health checks database availability and counts queued, failed and sent invitation/password-reset emails.

Schools, leads, invitations, audit history, import history and school workspaces expose search and pagination. Schools can be filtered by status; leads by stage and source; audit events by actor, action and date. The platform header searches schools and leads across records beyond the current page. Audit CSV export fetches every matching page. School dashboards paginate their large record lists after filtering, while retaining full-year data for totals and mark drafts. The inactive subscription and billing prototype is not part of the live dashboard; platform billing awaits plan prices and a payment provider. Report delivery and provider-level monitoring are deferred.

## Verification

`npm.cmd run test:super-admin -w syncacademy-web` checks the frontend store's lead and settings flow. `apps/api/test/platform-operations.cjs` runs within the isolated PostgreSQL integration suite and verifies authorization, conversion, settings persistence and health counts.
