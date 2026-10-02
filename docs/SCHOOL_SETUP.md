# School Setup (frontend MVP)

Open **Headmaster → Settings → Open School Setup**, route `/head/school-setup`.

The page provides a school-information form and eight readiness checks: school details, academic year, classes/subjects, active teacher accounts, subject/class-teacher allocations, class enrolments, fee structures, and reviewed grading. Checks derive from existing demo stores. Existing sample records can satisfy checks; the page explicitly identifies this. School information is stored in the current tab’s session storage; checklist records remain owned by their existing staff workflows.

Each action names the responsible role and opens that workspace in the same tab, explicitly selecting the headmaster’s chosen year for that role. Merely viewing the checklist does not change role selections. School details apply across years. Closed years can be reviewed; source workflows keep their existing edit guards.

The school-information form is an onboarding profile, not a backend school-creation action. It does not provision a tenant, create logins, send invitations, reset sample data, or introduce cross-tab synchronization. The older Settings form remains otherwise unchanged.

Validation: `npm.cmd run test:school-setup --workspace=apps/web`.
