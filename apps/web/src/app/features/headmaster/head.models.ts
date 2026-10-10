// ──────────────────────────────────────────────────────────────
// Headmaster Feature — Shared TypeScript Models
// ──────────────────────────────────────────────────────────────

export type StaffRole = 'school_admin' | 'registrar' | 'academic_officer' | 'teacher' | 'bursar';
export type StaffStatus = 'active' | 'inactive' | 'pending_approval' | 'rejected';
export type AcademicYearStatus = 'draft' | 'active' | 'closed';
export type AssignmentStatus = 'active' | 'inactive';
export type InvitationStatus = 'active' | 'used' | 'expired' | 'revoked';
export type ReportStatus = 'generated' | 'approved' | 'released';
export type CommunicationStatus = 'created' | 'sent' | 'delivered' | 'failed' | 'viewed';
export type SubscriptionPlan = 'starter' | 'standard' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled';

// ── Staff ────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface PendingStaffMember {
  verificationNote?: string;
  id: string;
  fullName: string;
  email: string;
  phone: string;
  requestedRole: StaffRole;
  phoneVerified: boolean;
  emailVerified: boolean;
  submittedAt: string;
}

export interface StaffInvitation {
 name?:string; email?:string;
  id: string;
  role: StaffRole;
  code: string;
  link: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

// ── Academic Structure ───────────────────────────────────────

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  terms: AcademicTerm[];
}

export interface AcademicTerm { key: string; name: string; startsAt: string; endsAt: string; }

export interface SchoolClass {
  enrolmentStatus?: 'draft' | 'open' | 'closed';
  capacity?: number;
  academicYearId?: string;
  id: string;
  name: string;
  stream: string | null;
  studentCount: number;
}

export function displayClassName(name: string): string {
  return name.replace(/(\d)\s+([A-Za-z])$/, '$1$2');
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface ClassSubjectMapping {
  id: string;
  classId: string;
  className: string;
  classStream: string | null;
  subjectId: string;
  subjectName: string;
}

// ── Teaching Assignments ─────────────────────────────────────

export interface TeachingAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  classStream: string | null;
  subjectId: string;
  subjectName: string;
  academicYearId: string;
  academicYearLabel: string;
  status: AssignmentStatus;
}

// ── Dashboard ────────────────────────────────────────────────

export interface DashboardStats {
  activeStudents: number;
  staffCount: number;
  verifiedGuardians: number;
  pendingSubmissions: number;
  reportsReadyForRelease: number;
  reportsSent: number;
  reportsDelivered: number;
  reportsViewed: number;
  failedMessages: number;
  pendingStaffApprovals: number;
  subscriptionDaysRemaining: number;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
}

// ── Reports ──────────────────────────────────────────────────

export interface ReportOverviewStats {
  generated: number;
  approved: number;
  released: number;
  sent: number;
  delivered: number;
  viewed: number;
  failed: number;
}

// ── Helpers ──────────────────────────────────────────────────

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  school_admin: 'Headmaster',
  registrar: 'Registrar',
  academic_officer: 'Academic Officer',
  teacher: 'Teacher', bursar:'Bursar',
};

export const INVITABLE_ROLES: StaffRole[] = ['school_admin', 'registrar', 'academic_officer', 'teacher', 'bursar'];

export const EXPIRY_OPTIONS = [
  { label: '5 minutes', minutes: 5 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: '12 hours', minutes: 720 },
  { label: '24 hours', minutes: 1440 },
  { label: '48 hours', minutes: 2880 },
  { label: '7 days', minutes: 10080 },
];
