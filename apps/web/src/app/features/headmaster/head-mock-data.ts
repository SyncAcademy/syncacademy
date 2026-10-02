// ──────────────────────────────────────────────────────────────
// Headmaster Feature — Local Mock Data
// Realistic Tanzanian school data for UI development.
// ──────────────────────────────────────────────────────────────

import {
  AcademicYear,
  ClassSubjectMapping,
  DashboardStats,
  PendingStaffMember,
  ReportOverviewStats,
  SchoolClass,
  StaffMember,
  Subject,
  TeachingAssignment,
} from './head.models';

// ── Dashboard ────────────────────────────────────────────────

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  activeStudents: 847,
  staffCount: 42,
  verifiedGuardians: 712,
  pendingSubmissions: 8,
  reportsReadyForRelease: 156,
  reportsSent: 623,
  reportsDelivered: 601,
  reportsViewed: 548,
  failedMessages: 14,
  pendingStaffApprovals: 3,
  subscriptionDaysRemaining: 45,
  subscriptionPlan: 'standard',
  subscriptionStatus: 'active',
};

// ── Academic Years ───────────────────────────────────────────

export const MOCK_ACADEMIC_YEARS: AcademicYear[] = [
  { id: 'ay-1', label: '2026', startDate: '2026-01-06', endDate: '2026-11-27', status: 'active' },
  { id: 'ay-2', label: '2025', startDate: '2025-01-06', endDate: '2025-11-28', status: 'closed' },
  { id: 'ay-3', label: '2024', startDate: '2024-01-08', endDate: '2024-11-29', status: 'closed' },
  { id: 'ay-4', label: '2027', startDate: '2027-01-04', endDate: '2027-11-26', status: 'draft' },
];

// ── Classes ──────────────────────────────────────────────────

export const MOCK_CLASSES: SchoolClass[] = [
  { id: 'c-1', name: 'Form 1', stream: 'Form 1A', studentCount: 45 },
  { id: 'c-2', name: 'Form 1', stream: 'Form 1B', studentCount: 43 },
  { id: 'c-3', name: 'Form 2', stream: 'Form 2A', studentCount: 42 },
  { id: 'c-4', name: 'Form 2', stream: 'Form 2B', studentCount: 44 },
  { id: 'c-5', name: 'Form 3', stream: null, studentCount: 48 },
  { id: 'c-6', name: 'Form 4', stream: null, studentCount: 46 },
];

// ── Subjects ─────────────────────────────────────────────────

export const MOCK_SUBJECTS: Subject[] = [
  { id: 's-1', name: 'Mathematics', code: 'MATH' },
  { id: 's-2', name: 'English Language', code: 'ENG' },
  { id: 's-3', name: 'Kiswahili', code: 'KIS' },
  { id: 's-4', name: 'Physics', code: 'PHY' },
  { id: 's-5', name: 'Chemistry', code: 'CHEM' },
  { id: 's-6', name: 'Biology', code: 'BIO' },
  { id: 's-7', name: 'History', code: 'HIST' },
  { id: 's-8', name: 'Geography', code: 'GEO' },
  { id: 's-9', name: 'Civics', code: 'CIV' },
  { id: 's-10', name: 'Book-keeping', code: 'BK' },
];

// ── Class-Subject Mappings ───────────────────────────────────

export const MOCK_CLASS_SUBJECT_MAPPINGS: ClassSubjectMapping[] = [
  { id: 'cs-1', classId: 'c-1', className: 'Form 1', classStream: 'Form 1A', subjectId: 's-1', subjectName: 'Mathematics' },
  { id: 'cs-2', classId: 'c-1', className: 'Form 1', classStream: 'Form 1A', subjectId: 's-2', subjectName: 'English Language' },
  { id: 'cs-3', classId: 'c-1', className: 'Form 1', classStream: 'Form 1A', subjectId: 's-3', subjectName: 'Kiswahili' },
  { id: 'cs-4', classId: 'c-1', className: 'Form 1', classStream: 'Form 1A', subjectId: 's-4', subjectName: 'Physics' },
  { id: 'cs-5', classId: 'c-5', className: 'Form 3', classStream: null, subjectId: 's-1', subjectName: 'Mathematics' },
  { id: 'cs-6', classId: 'c-5', className: 'Form 3', classStream: null, subjectId: 's-5', subjectName: 'Chemistry' },
  { id: 'cs-7', classId: 'c-6', className: 'Form 4', classStream: null, subjectId: 's-1', subjectName: 'Mathematics' },
  { id: 'cs-8', classId: 'c-6', className: 'Form 4', classStream: null, subjectId: 's-6', subjectName: 'Biology' },
  { id: 'cs-9', classId: 'c-3', className: 'Form 2', classStream: 'Form 2A', subjectId: 's-7', subjectName: 'History' },
  { id: 'cs-10', classId: 'c-3', className: 'Form 2', classStream: 'Form 2A', subjectId: 's-8', subjectName: 'Geography' },
];

// ── Staff ────────────────────────────────────────────────────

export const MOCK_STAFF: StaffMember[] = [
  { id: 'u-1', fullName: 'Amina Juma', email: 'amina.juma@shulelink.co.tz', phone: '+255 712 345 678', role: 'school_admin', status: 'active', phoneVerified: true, emailVerified: true, createdAt: '2024-08-15' },
  { id: 'u-2', fullName: 'Joseph Mwangi', email: 'j.mwangi@shulelink.co.tz', phone: '+255 713 456 789', role: 'registrar', status: 'active', phoneVerified: true, emailVerified: true, createdAt: '2024-09-01' },
  { id: 'u-3', fullName: 'Grace Kimaro', email: 'g.kimaro@shulelink.co.tz', phone: '+255 714 567 890', role: 'academic_officer', status: 'active', phoneVerified: true, emailVerified: true, createdAt: '2024-09-10' },
  { id: 'u-4', fullName: 'Hassan Bakari', email: 'h.bakari@shulelink.co.tz', phone: '+255 715 678 901', role: 'teacher', status: 'active', phoneVerified: true, emailVerified: true, createdAt: '2024-10-01' },
  { id: 'u-5', fullName: 'Fatma Said', email: 'f.said@shulelink.co.tz', phone: '+255 716 789 012', role: 'teacher', status: 'active', phoneVerified: true, emailVerified: false, createdAt: '2024-10-15' },
  { id: 'u-6', fullName: 'Daniel Lyimo', email: 'd.lyimo@shulelink.co.tz', phone: '+255 717 890 123', role: 'teacher', status: 'inactive', phoneVerified: true, emailVerified: true, createdAt: '2024-11-01' },
  { id: 'u-7', fullName: 'Neema Moshi', email: 'n.moshi@shulelink.co.tz', phone: '+255 718 901 234', role: 'teacher', status: 'active', phoneVerified: true, emailVerified: true, createdAt: '2025-01-10' },
  { id: 'u-8', fullName: 'Peter Massawe', email: 'p.massawe@shulelink.co.tz', phone: '+255 719 012 345', role: 'teacher', status: 'active', phoneVerified: true, emailVerified: true, createdAt: '2025-02-01' },
];

// ── Pending Staff ────────────────────────────────────────────

export const MOCK_PENDING_STAFF: PendingStaffMember[] = [
  { id: 'ps-1', fullName: 'Mary Kapinga', email: 'mary.kapinga@gmail.com', phone: '+255 720 111 222', requestedRole: 'teacher', phoneVerified: true, emailVerified: false, submittedAt: '2026-09-14' },
  { id: 'ps-2', fullName: 'John Mfaume', email: 'j.mfaume@yahoo.com', phone: '+255 721 222 333', requestedRole: 'teacher', phoneVerified: true, emailVerified: true, submittedAt: '2026-09-15' },
  { id: 'ps-3', fullName: 'Rehema Omary', email: 'rehema.o@outlook.com', phone: '+255 722 333 444', requestedRole: 'academic_officer', phoneVerified: false, emailVerified: true, submittedAt: '2026-09-16' },
];

// ── Teaching Assignments ─────────────────────────────────────

export const MOCK_TEACHING_ASSIGNMENTS: TeachingAssignment[] = [
  { id: 'ta-1', teacherId: 'u-4', teacherName: 'Hassan Bakari', classId: 'c-1', className: 'Form 1', classStream: 'Form 1A', subjectId: 's-1', subjectName: 'Mathematics', academicYearId: 'ay-1', academicYearLabel: '2026', status: 'active' },
  { id: 'ta-2', teacherId: 'u-4', teacherName: 'Hassan Bakari', classId: 'c-2', className: 'Form 1', classStream: 'Form 1B', subjectId: 's-1', subjectName: 'Mathematics', academicYearId: 'ay-1', academicYearLabel: '2026', status: 'active' },
  { id: 'ta-3', teacherId: 'u-5', teacherName: 'Fatma Said', classId: 'c-1', className: 'Form 1', classStream: 'Form 1A', subjectId: 's-2', subjectName: 'English Language', academicYearId: 'ay-1', academicYearLabel: '2026', status: 'active' },
  { id: 'ta-4', teacherId: 'u-7', teacherName: 'Neema Moshi', classId: 'c-5', className: 'Form 3', classStream: null, subjectId: 's-5', subjectName: 'Chemistry', academicYearId: 'ay-1', academicYearLabel: '2026', status: 'active' },
  { id: 'ta-5', teacherId: 'u-8', teacherName: 'Peter Massawe', classId: 'c-6', className: 'Form 4', classStream: null, subjectId: 's-6', subjectName: 'Biology', academicYearId: 'ay-1', academicYearLabel: '2026', status: 'active' },
  { id: 'ta-6', teacherId: 'u-6', teacherName: 'Daniel Lyimo', classId: 'c-3', className: 'Form 2', classStream: 'Form 2A', subjectId: 's-7', subjectName: 'History', academicYearId: 'ay-1', academicYearLabel: '2026', status: 'inactive' },
];

// ── Report Overview ──────────────────────────────────────────

export const MOCK_REPORT_STATS: ReportOverviewStats = {
  generated: 847,
  approved: 780,
  released: 623,
  sent: 623,
  delivered: 601,
  viewed: 548,
  failed: 14,
};
