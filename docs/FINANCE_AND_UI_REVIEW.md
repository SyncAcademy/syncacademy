# Finance, UI and staff continuity review — 5 October 2026

The bursar portal reads and writes the school database. Fees, charges, payments, voids and adjustments remain available to replacement bursars and headmasters. Access is based on active school membership, not the person who entered a transaction. Registrars and academics retain school registry history but do not gain finance access.

## Corrections

- Replaced interpolated finance SQL with Prisma queries. Account searches accept apostrophes safely; term filters are validated.
- Reports aggregate each student and term once. Multiple fees cannot multiply payment or adjustment totals. Class reports attribute a student's account to their latest enrollment in the selected year, falling back to their charge's class.
- Voided payments are excluded from collections and retained in the ledger. Overdue balances are calculated by term; debit corrections become overdue once that term has an overdue charge.
- Fee editing sends the fields accepted by the API. Applied fees remain locked; applying a fee to an empty class does not lock it. Repeat applications charge only previously uncharged active enrollments.
- Calendar dates, amount limits, references and fee due dates are validated. Closed years reject financial mutations, including receipt voids. Receipt sequences are school-wide to avoid collisions between similarly named academic years.
- Forms survive workspace refresh, prevent duplicate clicks, retain server errors, and close on context changes. Payment receipts use the ID returned by the save, not whichever transaction happens to appear first. A successful write followed by a refresh error is not presented as a failed payment.
- Finance caches are separated by user, role, school and year. Stale requests cannot populate another context.
- Added missing fees, accounts, payments and adjustments SVG symbols, explicit SVG sizing/strokes, consistent form controls, validation and disabled states, table panels, badges and receipt styles. Added loading/retry/success feedback and keyboard focus containment to finance dialogs. Corrected CSV/PDF labels and obsolete teacher messages.

## Historical records

- Bursar workspace includes ended enrollments and years without current classes.
- Headmasters and academics can assign a current teacher to a closed-year class/subject through Subject Setup. This gives read-only access to the archived roster, including graduated, withdrawn and transferred students, within the assignment's scope.
- A teacher can read predecessor roster issues for their assigned class and subject. Outstanding issues still block current roster confirmation.
- School import history appears on the import page for registrars and headmasters. Processed import jobs survive preview expiry and are readable by replacement staff. Only the original uploader can commit an unexpired preview. This is an import summary, not an embedded Excel viewer.
- Guardian records, accounts and phone verification remain out of scope. Existing name/phone contact fields remain supported.

## Validation

- API build and 29 isolated PostgreSQL integration tests passed. Added assertions for finance totals, idempotency, invalid dates, injection-shaped searches, role/school boundaries, closed years, replacement staff, historical teacher assignments and import/issue continuity.
- Frontend bursar, registrar, academic-year and head-oversight checks passed. Older demo-data assumptions in the last two checks were replaced with current server-backed projection checks.
- `node apps/web/scripts/check-ui-assets.mjs` validates 63 styled components, 78 sidebar references, existing stylesheets and UTF-8 source.
- Angular production build passed. Existing initial bundle-size and ExcelJS CommonJS warnings remain; unused standalone imports also produce warnings.
- Local API and web containers were rebuilt and restarted. API readiness and portal routes return HTTP 200; unauthenticated finance and registry requests return HTTP 401. Deployed SVG symbols and database runtime privileges passed checks. Integration fixtures were absent from the application database.
- Live browser visual inspection was not available in this session. The asset audit and template compilation do not establish pixel-perfect rendering on every screen size.

Finance reads currently load the selected year's ledger; very large schools may need server-side aggregation and pagination before scaling further. Academic assessment entry and other explicitly unavailable modules were not implemented as part of the finance/UI corrections.
