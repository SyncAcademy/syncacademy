// ──────────────────────────────────────────────────────────────
// Teacher Feature — Shared TypeScript Models
// ──────────────────────────────────────────────────────────────

export type AssessmentStatus = 'draft' | 'submitted' | 'approved' | 'returned';
export type RosterConfirmationStatus = 'pending' | 'confirmed' | 'issue_reported';
export type RosterIssueType = 'missing_student' | 'wrong_class' | 'wrong_subject' | 'other';

// ── Teaching Assignment ──────────────────────────────────────

export interface TeacherAssignment {
  revision?: number; teachingId?: string; assessmentStatus?: string;
  createdAt?: string;
  classId?: string;
  subjectId?: string;
  gradingPolicy?: import('../../core/services/grading-policy.service').GradingPolicy;
  id: string;
  assessmentId?: string;
  assessmentName?: string;
  teacherId?: string;
  teacherName?: string;
  className: string;
  classStream: string | null;
  subjectName: string;
  subjectCode: string;
  academicYearId: string;
  academicYearLabel: string;
  studentCount: number;
  rosterStatus: RosterConfirmationStatus;
  assessmentProgress: AssessmentProgress;
}

export interface AssessmentProgress {
  total: number;
  completed: number;
  status: AssessmentStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  returnReason: string | null;
}

// ── Roster ──────────────────────────────────────────────────

export interface RosterStudent {
  id: string;
  studentNumber: string;
  fullName: string;
  gender: 'M' | 'F' | ''; 
  enrollmentStatus: 'active' | 'transferred_out' | 'withdrawn' | 'graduated';
}

export interface RosterIssueReport {
  studentId: string | null;
  issueType: RosterIssueType;
  description: string;
}

// ── Mark Entry ──────────────────────────────────────────────

export interface MarkEntry {
  gender?: 'M' | 'F' | '';
  studentId: string;
  studentNumber: string;
  fullName: string;
  marksValue: number | null;
  noMark?: boolean;
  grade: string | null;
  comments: string;
  lastSaved: string | null;
}

// ── Submission Timeline ─────────────────────────────────────

export interface SubmissionTimelineStep {
  status: AssessmentStatus;
  label: string;
  timestamp: string | null;
  active: boolean;
  completed: boolean;
  detail: string | null;
}

// ── Teacher Dashboard Stats ─────────────────────────────────

export interface TeacherDashboardStats {
  totalAssignments: number;
  pendingRosters: number;
  draftsInProgress: number;
  submittedForReview: number;
  approved: number;
  returned: number;
}

// ── Notifications ───────────────────────────────────────────

export interface TeacherNotification {
  id: string;
  type: 'roster_issue_resolved' | 'marks_returned' | 'marks_approved' | 'support_assigned' | 'reminder' | 'system';
  message: string;
  relatedAssignmentId: string | null;
  relatedSupportId?: string | null;
  read: boolean;
  createdAt: string;
}
