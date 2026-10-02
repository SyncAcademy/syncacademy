// ──────────────────────────────────────────────────────────────
// Teacher Feature — Local Mock Data
// Realistic Tanzanian school data for UI development.
// ──────────────────────────────────────────────────────────────

import {
  TeacherAssignment,
  RosterStudent,
  MarkEntry,
  SubmissionTimelineStep,
  TeacherDashboardStats,
  TeacherNotification,
} from './teacher.models';

// ── Dashboard Stats ──────────────────────────────────────────

export const MOCK_TEACHER_STATS: TeacherDashboardStats = {
  totalAssignments: 5,
  pendingRosters: 1,
  draftsInProgress: 2,
  submittedForReview: 1,
  approved: 1,
  returned: 0,
};

// ── Assignments ──────────────────────────────────────────────

export const MOCK_TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  {
    id: 'ta-1',
    className: 'Form 1',
    classStream: 'Form 1A',
    subjectName: 'Mathematics',
    subjectCode: 'MATH',
    academicYearId: 'ay-1', academicYearLabel: '2026',
    studentCount: 45,
    rosterStatus: 'confirmed',
    assessmentProgress: {
      total: 45,
      completed: 45,
      status: 'approved',
      submittedAt: '2026-06-15T10:30:00',
      approvedAt: '2026-06-18T14:20:00',
      returnReason: null,
    },
  },
  {
    id: 'ta-2',
    className: 'Form 1',
    classStream: 'Form 1B',
    subjectName: 'Mathematics',
    subjectCode: 'MATH',
    academicYearId: 'ay-1', academicYearLabel: '2026',
    studentCount: 43,
    rosterStatus: 'confirmed',
    assessmentProgress: {
      total: 43,
      completed: 43,
      status: 'submitted',
      submittedAt: '2026-09-20T09:15:00',
      approvedAt: null,
      returnReason: null,
    },
  },
  {
    id: 'ta-3',
    className: 'Form 2',
    classStream: 'Form 2A',
    subjectName: 'Mathematics',
    subjectCode: 'MATH',
    academicYearId: 'ay-1', academicYearLabel: '2026',
    studentCount: 42,
    rosterStatus: 'confirmed',
    assessmentProgress: {
      total: 42,
      completed: 28,
      status: 'draft',
      submittedAt: null,
      approvedAt: null,
      returnReason: null,
    },
  },
  {
    id: 'ta-4',
    className: 'Form 3',
    classStream: null,
    subjectName: 'Physics',
    subjectCode: 'PHY',
    academicYearId: 'ay-1', academicYearLabel: '2026',
    studentCount: 48,
    rosterStatus: 'pending',
    assessmentProgress: {
      total: 48,
      completed: 0,
      status: 'draft',
      submittedAt: null,
      approvedAt: null,
      returnReason: null,
    },
  },
  {
    id: 'ta-5',
    className: 'Form 2',
    classStream: 'Form 2B',
    subjectName: 'Mathematics',
    subjectCode: 'MATH',
    academicYearId: 'ay-1', academicYearLabel: '2026',
    studentCount: 44,
    rosterStatus: 'confirmed',
    assessmentProgress: {
      total: 44,
      completed: 12,
      status: 'draft',
      submittedAt: null,
      approvedAt: null,
      returnReason: null,
    },
  },
];

// ── Roster ──────────────────────────────────────────────────

export const MOCK_ROSTER_STUDENTS: RosterStudent[] = [
  { id: 'st-1', studentNumber: 'SA-2026-001', fullName: 'Amina Hassan Mwalimu', gender: 'F', enrollmentStatus: 'active' },
  { id: 'st-2', studentNumber: 'SA-2026-002', fullName: 'Baraka Joseph Kimaro', gender: 'M', enrollmentStatus: 'active' },
  { id: 'st-3', studentNumber: 'SA-2026-003', fullName: 'Chausiku Said Ndege', gender: 'F', enrollmentStatus: 'active' },
  { id: 'st-4', studentNumber: 'SA-2026-004', fullName: 'Daudi Emmanuel Msuya', gender: 'M', enrollmentStatus: 'active' },
  { id: 'st-5', studentNumber: 'SA-2026-005', fullName: 'Esther Peter Mwanga', gender: 'F', enrollmentStatus: 'active' },
  { id: 'st-6', studentNumber: 'SA-2026-006', fullName: 'Farida Ali Kiswaga', gender: 'F', enrollmentStatus: 'active' },
  { id: 'st-7', studentNumber: 'SA-2026-007', fullName: 'Godfrey Richard Mahenge', gender: 'M', enrollmentStatus: 'active' },
  { id: 'st-8', studentNumber: 'SA-2026-008', fullName: 'Halima Omari Khamis', gender: 'F', enrollmentStatus: 'active' },
  { id: 'st-9', studentNumber: 'SA-2026-009', fullName: 'Ibrahim Salum Mnyukwa', gender: 'M', enrollmentStatus: 'active' },
  { id: 'st-10', studentNumber: 'SA-2026-010', fullName: 'Janet Charles Mushi', gender: 'F', enrollmentStatus: 'active' },
  { id: 'st-11', studentNumber: 'SA-2026-011', fullName: 'Kelvin Francis Maro', gender: 'M', enrollmentStatus: 'active' },
  { id: 'st-12', studentNumber: 'SA-2026-012', fullName: 'Lina Mathias Shirima', gender: 'F', enrollmentStatus: 'active' },
];

// ── Mark Entries ─────────────────────────────────────────────

export const MOCK_MARK_ENTRIES: MarkEntry[] = MOCK_ROSTER_STUDENTS.map((s, i) => ({
  studentId: s.id,
  studentNumber: s.studentNumber,
  fullName: s.fullName,
  marksValue: i < 8 ? [84, 72, 68, 56, 70, 88, 52, 40][i] : null,
  grade: i < 8 ? (['A', 'B', 'B', 'C', 'B', 'A', 'C', 'D'][i] || null) : null,
  comments: i < 5 ? 'Good progress this term.' : '',
  lastSaved: i < 8 ? '2026-09-20T14:30:00' : null,
}));

// ── Submission Timeline ─────────────────────────────────────

export const MOCK_SUBMISSION_TIMELINE_DRAFT: SubmissionTimelineStep[] = [
  { status: 'draft', label: 'Draft', timestamp: '2026-09-10T08:00:00', active: true, completed: false, detail: 'Marks entry in progress — 28 of 42 students completed.' },
  { status: 'submitted', label: 'Submitted', timestamp: null, active: false, completed: false, detail: null },
  { status: 'approved', label: 'Approved', timestamp: null, active: false, completed: false, detail: null },
];

export const MOCK_SUBMISSION_TIMELINE_SUBMITTED: SubmissionTimelineStep[] = [
  { status: 'draft', label: 'Draft', timestamp: '2026-09-10T08:00:00', active: false, completed: true, detail: 'All 43 marks entered.' },
  { status: 'submitted', label: 'Submitted for Review', timestamp: '2026-09-20T09:15:00', active: true, completed: false, detail: 'Awaiting review by Academic Officer.' },
  { status: 'approved', label: 'Approved', timestamp: null, active: false, completed: false, detail: null },
];

export const MOCK_SUBMISSION_TIMELINE_APPROVED: SubmissionTimelineStep[] = [
  { status: 'draft', label: 'Draft', timestamp: '2026-06-01T08:00:00', active: false, completed: true, detail: 'All 45 marks entered.' },
  { status: 'submitted', label: 'Submitted', timestamp: '2026-06-15T10:30:00', active: false, completed: true, detail: 'Reviewed by Academic Officer.' },
  { status: 'approved', label: 'Approved', timestamp: '2026-06-18T14:20:00', active: true, completed: true, detail: 'Marks approved. Report eligible for release.' },
];

// ── Notifications ───────────────────────────────────────────

export const MOCK_TEACHER_NOTIFICATIONS: TeacherNotification[] = [
  { id: 'tn-1', type: 'reminder', message: 'You have 2 assignments with incomplete marks. Please complete before the September 30 deadline.', relatedAssignmentId: 'ta-3', read: false, createdAt: '2026-09-25T08:00:00' },
  { id: 'tn-2', type: 'marks_approved', message: 'Your marks for Form 1A — Mathematics have been approved by the Academic Officer.', relatedAssignmentId: 'ta-1', read: false, createdAt: '2026-06-18T14:20:00' },
  { id: 'tn-3', type: 'roster_issue_resolved', message: 'The roster issue you reported for Form 3 — Physics has been resolved by the Registrar.', relatedAssignmentId: 'ta-4', read: true, createdAt: '2026-09-15T11:00:00' },
  { id: 'tn-4', type: 'system', message: 'Term 2 academic submissions deadline is September 30, 2026. Ensure all marks are submitted before then.', relatedAssignmentId: null, read: true, createdAt: '2026-09-01T09:00:00' },
  { id: 'tn-5', type: 'marks_returned', message: 'Your submission for Form 2A — Mathematics has been returned for corrections. See the return reason.', relatedAssignmentId: 'ta-3', read: true, createdAt: '2026-08-20T16:45:00' },
];
