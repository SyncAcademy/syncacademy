# Super admin frontend

The `/super-admin` area is a browser-local demo. It makes no backend requests, sends no invitations, collects no payments, and does not enforce the administrator roles shown in Settings.

## Available workflows

- Overview: active schools, normalized monthly recurring revenue, overdue invoices, trials ending within seven days, actionable alerts, onboarding, and newest-first activity.
- Schools: register a trial school, open school details, edit contact and onboarding information, suspend/reactivate with a reason, prepare a simulated administrator invitation, and view billing. Region counts live here.
- Subscriptions: change plan/billing cycle, extend trials, activate a trial and generate an invoice, view invoice/payment history, and record a simulated payment. School access status and invoice payments remain separate operations.
- Leads: add/edit leads, assign a follow-up owner/date, change stages, and convert a won lead into a trial school once.
- Audit log: search schools/actions/details, filter by actor/action/date, and export the filtered rows as CSV with exact timestamps.
- Settings: save platform name, support email, default trial length, SMS alert threshold, and an admin announcement; prepare and manage simulated administrator access records.
- Global search: find schools and leads, including from the page already open. Notifications use the same attention list as the overview.

Changes persist in `localStorage` under `syncacademy-super-admin-v1`. A visible notice identifies demo data, and storage failures show a warning. System telemetry remains sample data; no live monitoring is claimed. Clearing this specific browser storage key restores the sample dataset on reload.

## Verification

From the repository root:

```text
npm.cmd run test:super-admin --workspace=apps/web
npm.cmd run build --workspace=apps/web -- --configuration development
```

The workflow checks cover normalized revenue, payment idempotency, school and subscription transitions, trial extension, single lead conversion, duplicate administrator emails, audit ordering, and persistence/date restoration. Live authentication and backend authorization are deferred.
