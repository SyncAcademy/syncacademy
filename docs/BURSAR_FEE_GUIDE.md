# Register and collect student fees

1. Sign in as **Bursar**, select the school and academic year, and use the header's **Apply** button if the selection has not yet been applied. A closed year can be viewed but cannot accept fee changes or payments.
2. Confirm that the Registrar has registered/imported the students and enrolled them in the correct classes. The bursar manages their financial accounts; student registration is the Registrar's responsibility.
3. Open **Fee Structures → Create Fee**. Select one or more classes (or Select all) and the period, enter the fee name, amount in whole Tanzanian shillings and due date, then save. Amounts are grouped with commas as you type (for example, `500,000`) and saved as whole numbers. The due date must fall within the selected academic year. Example: Form 1 A, Term 1, Tuition, TZS 500,000.
4. A fee row is created for each selected class. On each fee row, select **Apply**, review the confirmation and save. This creates a TZS 500,000 charge for every active, previously uncharged student in the selected class. Creating the fee alone does not charge students. Repeat for other classes and fee types such as meals or transport.
5. Open **Student Accounts**. Search for a student and inspect **Ledger**. Check expected fees, paid amount, outstanding balance and overdue amount. For example, a TZS 500,000 charge with no payment has a TZS 500,000 balance.
6. Select **Pay** beside a student, or open **Payments & Receipts > Record Payment**. Browse the student list by class or search by name/admission number with **Whole school - All classes** selected. Select the student, then select the assigned fee card (for example, Meals - Term 1). Its period is selected automatically. Enter the installment amount, payment date, method and reference, then choose **Record payment & create receipt**. Bank transfers and mobile money require a reference. A payment cannot exceed either the fee's remaining amount or the period's outstanding balance. The receipt identifies the fee.
7. View or print the saved receipt in **Payments & Receipts**. Check **Student Accounts** and **Financial Reports** to confirm the new balance and collected totals.

For a discount or scholarship, use **Adjustments**, select the student and term, and give the amount and a clear reason. A debit correction increases the amount owed. If a receipt is wrong, use **Void** with a reason in an open year; the original receipt remains in the audit history.

Fee periods are **Term 1**, **Term 2**, and **Full year**. Full year creates one annual charge, not two term charges. Record payments and adjustments against Full year for that charge; installments are allowed. All-period balances include term and annual charges once each. Existing legacy Term 3 records remain readable and included in totals.

If a new student joins after a fee was applied, apply the same fee again. Existing charges are not duplicated; only eligible students without that fee are charged. Applied fee structures cannot be edited; use an adjustment for an individual correction.

The student CSV import does not import fee charges or previous payments. Those must be entered through the finance workflow. Guardian accounts and phone verification remain outside the current scope.

## Dialog behavior

Forms open above the header and sidebar with a blurred background. Use the mouse wheel, touchpad, touch swipe or keyboard to scroll within a long form; scrollbar tracks are hidden. Click outside, press Escape, or use Cancel to close. Dismissal is temporarily blocked while a save is in progress. Unsaved entries are discarded when a form is dismissed.

Verified using the shared production dialog directive and CSS in headless Chrome at desktop (1280 × 800) and mobile (390 × 700) sizes: 11 checks per viewport cover top-layer placement, header coverage, bounds, blur, scrolling, outside dismissal, inside clicks and focus restoration. Screenshots were reviewed. All 29 API integration tests passed, including fee application, duplicate prevention, partial payment totals, scholarship adjustment, receipt void/replacement and historical access. The production web build was deployed to the local app and its served styles and API health were checked.

Student Accounts > Ledger shows each applied fee, the amount explicitly paid to that fee, the amount currently available to pay, period totals and transaction history. New payments store the chosen fee. Historical payments without a fee remain unallocated; they are not reassigned automatically. Period-level adjustments and historical payments cap the amount available to pay, so available amounts across fee cards should not be added together. Voiding a fee payment restores both its fee availability and the period balance.

Registrars can use **Student Accounts** and **Payments & Receipts**, search students, view historical records and receipts, and record payments in open years. Fee creation/application, adjustments and receipt voiding remain restricted to bursars and headmasters. Registrar finance pages use the registrar header's academic-year selection.

Multi-class fee creation is atomic: if any selected class is invalid or already has that fee, nothing is created. Up to 100 classes can be selected in one request.

Payment workflow validation: 29 API integration tests pass, including fee allocation, fee overpayment rejection, period/student validation, void restoration and registrar permissions. Browser checks exercise the real Angular payment template at desktop and mobile sizes, including student search, fee selection, installment validation and viewport fit.

## Correct an incorrectly entered payment

In **Payments & Receipts**, find a valid payment and select **Edit**. Registrars, bursars and headmasters can correct payments in an open year. The form starts with the existing details. Change the student, assigned fee, amount, date, method or reference, enter a reason of at least 10 characters, and select **Save correction & replace receipt**.

The original receipt is marked Corrected and remains viewable with the reason and replacement receipt number. The new receipt links back to the original. Only the replacement contributes to balances. Validation failures leave the original unchanged; retrying the same save cannot issue duplicate receipts. Voided/corrected receipts and closed academic years cannot be edited. For an older unallocated payment, choose the correct assigned fee before saving.
