import { SchoolApiService } from '../../core/services/school-api.service';
import { Injectable, effect, signal, inject, computed } from '@angular/core';
import { MOCK_ACADEMIC_YEARS, MOCK_CLASSES, MOCK_CLASS_SUBJECT_MAPPINGS, MOCK_PENDING_STAFF, MOCK_STAFF, MOCK_SUBJECTS, MOCK_TEACHING_ASSIGNMENTS } from './head-mock-data';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { StaffInvitation, SchoolClass } from './head.models';

@Injectable({ providedIn: 'root' })
export class HeadDemoStore {
  private readonly key = 'syncacademy.head-demo.v2';
  readonly api = inject(SchoolApiService);
  readonly yearContext = inject(AcademicYearService);
  readonly years = this.yearContext.years;
  readonly selectedYear = this.yearContext.headYear;
  readonly readOnly = computed(() => this.yearContext.readOnly('head'));
  readonly yearAssignments = computed(() => this.assignments().filter(a => a.academicYearId === this.selectedYear()?.id));
  readonly classes = signal<SchoolClass[]>([]);
  readonly yearClasses = computed(() => this.classes().filter(c => (c.academicYearId ?? 'ay-1') === this.selectedYear()?.id));
  readonly yearMappings = computed(() => this.mappings().filter(m => this.yearClasses().some(c => c.id === m.classId)));
  readonly subjects = signal<typeof MOCK_SUBJECTS>([]);
  readonly mappings = signal<typeof MOCK_CLASS_SUBJECT_MAPPINGS>([]);
  readonly staff = signal<typeof MOCK_STAFF>([]);
  readonly pending = signal<typeof MOCK_PENDING_STAFF>([]);
  readonly assignments = signal<typeof MOCK_TEACHING_ASSIGNMENTS>([]);
  readonly invitations = signal<StaffInvitation[]>([]);
  readonly notice = signal('');
  readonly storageAvailable = signal(true);
  constructor() { effect(()=> { const d=this.api.data();
 this.classes.set((d?.classes||[]).map((c:any)=>({id:c.id,name:c.name,stream:null,academicYearId:c.yearId,studentCount:c._count.enrollments,enrolmentStatus:c.year.closed?'closed':'open'})));
 this.staff.set((d?.members||[]).filter((m:any)=>['HEADMASTER','REGISTRAR','ACADEMIC','TEACHER','BURSAR'].includes(m.role)).map((m:any)=>({id:m.id,fullName:m.user.name,email:m.user.email,phone:'',role:({HEADMASTER:'school_admin',REGISTRAR:'registrar',ACADEMIC:'academic_officer',TEACHER:'teacher',BURSAR:'bursar'} as any)[m.role],status:m.active?'active':'inactive',phoneVerified:false,emailVerified:true,createdAt:m.createdAt})));
 this.assignments.set((d?.assignments||[]).map((a:any)=>({id:a.id,teacherId:a.membershipId,teacherName:a.membership.user.name,classId:a.classroomId,className:a.classroom.name,classStream:null,subjectId:'',subjectName:'',academicYearId:a.classroom.yearId,academicYearLabel:a.classroom.year.name,status:a.membership.active?'active':'inactive'})));
 this.invitations.set((d?.invitations||[]).filter((i:any)=>['HEADMASTER','REGISTRAR','ACADEMIC','TEACHER','BURSAR'].includes(i.role)).map((i:any)=>({id:i.id,role:({HEADMASTER:'school_admin',REGISTRAR:'registrar',ACADEMIC:'academic_officer',TEACHER:'teacher',BURSAR:'bursar'} as any)[i.role],name:i.name,email:i.email,code:'',link:'',status:i.acceptedAt?'used':i.revokedAt?'revoked':'active',expiresAt:i.expiresAt,createdAt:i.createdAt})));
 this.pending.set([]);
 }); }
  private initialMappings():typeof MOCK_CLASS_SUBJECT_MAPPINGS { return []; }
  private restore():null { return null; }
}
