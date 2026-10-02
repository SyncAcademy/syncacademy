# Class teachers and teacher performance

The existing teacher portal now supports subject teaching and an additional class-teacher responsibility without a separate login or dashboard.

## Academic Master setup

- `/academic/teaching-assignments` assigns active, approved teachers to subjects offered by a class. New allocations create draft submissions and registry-based rosters for open assessments; assigning a subsequently opened assessment also allocates these records. Duplicate active class/subject allocations and conflicting assessment ownership are rejected.
- `/academic/classes-subjects` has **Assign class teacher** on each class. An active teacher can be assigned, replaced, or removed independently for each academic year. Replacements end the earlier assignment, preserve its history, and immediately revoke its class-teacher access. Class structures copied into a new year do not inherit class teachers.
- The existing demo teacher **John Mwangi** is now represented in the shared staff directory with ID `demo-teacher`, so Academic Master assignments can address this teacher account. The demo still has a fixed teacher identity; production must resolve the logged-in teacher from authenticated identity.

## Teacher navigation

- `/teacher/subject-performance`: always available to teachers, with results limited to their subject/class assignments.
- `/teacher/my-class`: conditional class overview, active roster, attendance summaries, and follow-up flags for failed approved subjects or three recorded absences.
- `/teacher/my-class/attendance`: daily Present/Absent/Late/Excused register. All roster entries must have a status. Dates must be valid, non-future, and within the selected year. Corrections require reasons and append versions. Recorded dates preserve the original student roster after transfers or departures; history is inspectable on the page. Present and Late count as attended, Excused and Absent do not; unrecorded days are excluded.
- `/teacher/my-class/performance`: all subjects in the assigned class, including other teachers' results. Includes subject comparison, per-student assessment progress, grading-aware pass rates, and paginated result rows. Approved results are the default; other statuses are clearly provisional.

The **My Class** sidebar group appears only when the teacher has a class-teacher assignment for the selected year. Direct routes check the same role, and screens/data scopes react to reassignment or deactivation. Cross-subject viewing never grants marks editing; those operations continue to require ownership of the subject assessment.

New attendance dates use currently active Registrar enrolments whose joined date is on or before the date chosen. Historical rosters for dates never recorded cannot be fully reconstructed from the existing registry model. Production should use effective-dated enrolment/movement history for full retrospective attendance.

The headmaster can view class teachers, daily attendance counts, and assignment/attendance activity through the existing oversight pages. All selections remain independent across roles; closed years are view-only.

## Scope and checks

Class-teacher assignment history and attendance versions persist in session storage. This is a frontend demo, not a server authorization boundary or cross-user synchronization service. Backend identity, role enforcement, durable audit records, and concurrent updates remain integration work.

Run `npm.cmd run test:class-teacher --workspace=apps/web` for assignment/revocation, role-scoped results, mark ownership, subject allocation, roster/date validation, corrections, historical preservation, headmaster visibility, independent years, and persistence checks.
