# Bursar portal

Entry route: `/bursar/page`. `/bursar` and `/bursar/dashboard` redirect to the overview. Uses the existing portal layout, responsive sidebar, compact academic-year selector, and shared interaction styling.

## Workflows

- **Fee Structure**: create fees by class, term, and academic year in whole TZS. Apply to active Registrar enrolments, with a preview of the student count and total. Each fee charges each student once. Reapplying includes only newly enrolled students. Applied fee structures are locked.
- **Student Accounts**: search and filter by class, term, and outstanding balance; inspect and print the complete year statement; record payments. Student names and class placement come from the shared registry. Existing financial entries survive student departures.
- **Payments & Receipts**: record cash, bank, and mobile-money payments already received. Non-cash payments require a unique active transaction reference. Payments cannot exceed the selected term balance. Receipts have unique identifiers and fixed student/payment details; print them from the receipt dialog. Voiding requires a reason, preserves the original entry, and restores the balance.
- **Adjustments**: discounts, scholarships, and credit/debit corrections with mandatory reasons. Credits cannot exceed unpaid fees. Entries are retained; corrections use compensating entries.
- **Financial Reports**: expected fees after adjustments, collected amounts excluding voids, outstanding balances, collection graphs by class, overdue balances, and CSV exports. Grouping follows current placement within the selected year. Overdue totals apply payments and credits against oldest dues per student/term; debit corrections are immediately due.

The ledger starts empty. Create and apply a fee, then record a payment to see collections and receipts. Year selection is independent of other staff dashboards. Closed years are read-only, including payment voids.

## Scope

This is a frontend demo consistent with the existing portals. Records persist in session storage in the current browser session. No money is collected, no banks are contacted, and receipts are labelled as demo records. Authentication, server-side authorization, durable transactions, multi-user receipt numbering, reconciliation, payment gateways, refunds/advance credits, and formal accounting integration require backend work.

## Checks

`npm.cmd run test:bursar-workflow --workspace=apps/web`

Covers validation, duplicate billing, locked fees, late enrolment, overpayment prevention, transaction references, receipt preservation/voiding, adjustments, overdue balances, independent academic-year selection, closed-year guards, and persistence.

The headmaster can monitor this same ledger at `/head/finance`, with independent year selection and no finance entry actions. See [headmaster oversight](HEADMASTER_OVERSIGHT.md).
