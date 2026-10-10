# Academic Master and Teacher workflows

The Academic Master works under `/academic/dashboard`; teachers use `/teacher/dashboard`. The selected academic year scopes every page. Authorized staff can read earlier years, including records entered by a predecessor. A closed year cannot be edited.

## Set up the academic year

1. Open **Classes & Subjects**. Create or copy classes for the year, set capacities, and choose each class's offered subjects. Create missing school subjects first.
2. Class offerings are assigned automatically to new students and to active students when you add an offering. Use **Student Subjects** to open a class card, review every active student, and adjust individual selections. The Registrar can also make these adjustments, but does not have to choose subjects during registration. Assessment rosters use the saved student selections.
3. Add teachers through the staff approval process, then use **Teaching Assignments** to assign each class subject to a teacher. Assign a class teacher when attendance and class oversight are needed.
4. Set the grading bands and pass mark under **Settings**. Submitted marks retain the policy that applied at submission, so later policy changes do not rewrite old results.

## Assessments and marks

1. In **Assessments**, create an assessment with a term and deadline, open it, then choose the existing classes that will take it. Select one class for a class exam or several for a shared assessment. Allocation creates draft subject submissions only for the selected classes; other classes can be added later.
2. The assigned teacher opens the assessment from the teacher dashboard, checks the student roster, and confirms it. A roster issue must be resolved through the registrar before marks can be submitted.
3. On **Enter Marks**, record marks from 0 to 100 and save the draft. A blank mark is incomplete. The page warns about unsaved changes and protects a valid draft during in-app navigation. It also offers **Discard local changes** when an older browser draft conflicts with a newer server version.
4. Submit complete marks. The teacher cannot edit a submitted or approved record. The Academic Master reviews each submission in **Marks Review**, then approves it or returns it with a reason. A returned submission can be corrected and submitted again.
5. Close the assessment after its assigned submissions are approved. Prepared student reports include only approved marks and the subjects enrolled by each student. Academic Master and Headmaster can open reports by class; the Headmaster can review, approve, and print them at `/head/reports`. Class teachers can view prepared reports for their assigned classes under **My Class / Student Reports**.

Marks, approval decisions, roster snapshots, report results, revisions, and audit entries are stored on the server for the school and academic year. New teachers can see the relevant previous records for their assigned class and subject. Concurrent edits use revisions to reject stale saves.

## Other pages

- **Timetable:** create exam slots with clash checks for class, room, and invigilator; remove an open slot and export the schedule.
- **Curriculum / Teacher Planner:** assign syllabus topics and let the subject teacher mark their own topics complete. The teacher planner also shows upcoming assessments and timetable slots.
- **Interventions:** record support plans for enrolled students and mark completed actions.
- **Academic Reports:** inspect results, averages, pass rates, and grade distributions with year, class, subject, and assessment filters.
- **Class Teacher:** a designated class teacher can record daily attendance, view class performance and results, and inspect prepared student reports by class. Corrected attendance retains a revision history and requires a reason.
- **Student Subjects:** the class teacher can review and edit subject selections for active students in their assigned class. Other teachers cannot change that class's selections. Closed years are read-only.
- **Notifications:** teachers receive saved review outcomes and can mark them read.

Guardian records, phone verification, and report delivery to guardians remain outside this scope. Names and phone numbers can remain on student records where the registrar needs them.

## Verification

From the repository root, run the API test suite with the isolated `syncacademy_auth_test` database, then run:

```powershell
node apps/web/scripts/check-academic-workflow.mjs
node apps/web/scripts/check-academic-browser.mjs
npm.cmd run build -w @syncacademy/api
npm.cmd run build -w syncacademy-web
```

The browser check uses an isolated Chrome profile and checks the assessment editor and teacher marks workflow at desktop and mobile widths.
