import { effect } from '@angular/core';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { TeacherStore } from '../../teacher.store';
import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { RosterStudent, RosterIssueReport, RosterIssueType } from '../../teacher.models';
@Component({
  selector: 'app-teacher-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherPageHeaderComponent, DialogFocusDirective],
  templateUrl: './teacher-roster.page.html',
  styleUrls: ['./teacher-roster.page.scss'],
})
export class TeacherRosterPage implements OnInit {
  store = inject(TeacherStore);
  found = signal(true);
  issueError = signal('');
  issues = signal<any[]>([]);
  issuePage = signal(1); issueTotal = signal(0); busy = signal(false); private generation = 0;
  rosterReadOnly = computed(() => !this.store.activeTeacher() || !this.store.selectedYear());
  loading = signal<boolean>(true);
  students = signal<RosterStudent[]>([]);
  assignmentId = '';
  assessmentRoster=computed(()=>!!this.store.assignments().find(a=>a.id===this.assignmentId)?.assessmentId);
  assessmentLocked=computed(()=>['submitted','approved'].includes(this.store.assignments().find(a=>a.id===this.assignmentId)?.assessmentProgress.status??''));
  assignmentLabel = signal<string>('');
  confirmed = signal<boolean>(false);
  showIssueForm = signal<boolean>(false);
  showConfirmDialog = signal<boolean>(false);

  // Issue report form
  issueStudentId = signal<string | null>(null);
  issueType = signal<RosterIssueType>('missing_student');
  issueDescription = signal<string>('');
  issueSubmitted = signal<boolean>(false);

  searchTerm = signal<string>('');
  page=signal(1);

  issueTypes: { value: RosterIssueType; label: string }[] = [
    { value: 'missing_student', label: 'Missing Student' },
    { value: 'wrong_class', label: 'Wrong Class' },
    { value: 'wrong_subject', label: 'Wrong Subject' },
    { value: 'other', label: 'Other Issue' },
  ];

  filteredStudents = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.students();
    return this.students().filter(s =>
      s.fullName.toLowerCase().includes(term) ||
      s.studentNumber.toLowerCase().includes(term)
    );
  });
  pages=computed(()=>Math.max(1,Math.ceil(this.filteredStudents().length/25)));
  visibleStudents=computed(()=>this.filteredStudents().slice((this.page()-1)*25,this.page()*25));

  constructor(private route:ActivatedRoute){effect(()=>{this.store.api.data();const id=this.route.snapshot.paramMap.get('assignmentId')||'';this.assignmentId=id;const a=this.store.assignments().find(a=>a.id===id);this.loading.set(this.store.api.loading() || this.store.remote.loading());this.found.set(!!a);this.students.set(this.store.roster(id));this.assignmentLabel.set(a ? a.className + ' / ' + a.subjectName : '');this.confirmed.set(a?.rosterStatus === 'confirmed');if(a)void this.loadIssues();});}

  ngOnInit():void {}

  onSearchChange(val: string): void {
    this.searchTerm.set(val);
    this.page.set(1);
  }

  openConfirmDialog(): void {
    if (this.rosterReadOnly() || this.busy()) return;
    this.showConfirmDialog.set(true);
  }

  async confirmRoster() {
    if (this.rosterReadOnly() || this.busy() || !this.found()) return;
    this.busy.set(true); this.issueError.set(''); const school = this.store.api.schoolId();
    try { if(this.store.assignments().find(a=>a.id===this.assignmentId)?.assessmentId){const error=await this.store.confirmRoster(this.assignmentId);if(error){this.issueError.set(error);return;}}else await this.store.api.write('registry/assignments/' + this.assignmentId + '/confirm', {}); if (school === this.store.api.schoolId()) { this.confirmed.set(true); this.showConfirmDialog.set(false); } }
    catch(e) { this.issueError.set(this.store.api.auth.error(e)); } finally { this.busy.set(false); }
  }

  cancelConfirm(): void {
    if(this.busy())return;
    this.showConfirmDialog.set(false);
  }

  toggleIssueForm(): void {
    if (this.rosterReadOnly() || this.busy()) return;
    this.showIssueForm.update(v => !v);
  }

  async loadIssues() {
    const generation = ++this.generation; const school = this.store.api.schoolId(); const year = this.store.selectedYear()?.id;
    const assignment=this.store.assignments().find(a=>a.id===this.assignmentId);
    if (!school || !year || !assignment) { this.issues.set([]); this.issueTotal.set(0); return; }
    try { const result: any = await this.store.api.auth.request('GET', 'schools/' + school + '/registry/issues?' + new URLSearchParams({yearId: year, assignmentId: assignment.teachingId ?? assignment.id, page: String(this.issuePage())})); if (generation === this.generation) { this.issues.set(result.items); this.issueTotal.set(result.total); this.issueError.set(''); } }
    catch(e) { if (generation === this.generation) this.issueError.set(this.store.api.auth.error(e)); }
  }
  async submitIssue() {
    if (this.rosterReadOnly() || this.busy()) return;
    if (this.issueDescription().trim().length < 10) { this.issueError.set('Describe the issue in at least 10 characters.'); return; }
    this.busy.set(true); this.issueError.set(''); const school = this.store.api.schoolId();
    try {
      await this.store.api.write('registry/issues', { assignmentId: this.store.assignments().find(a=>a.id===this.assignmentId)?.teachingId ?? this.assignmentId, studentId: this.issueType() === 'missing_student' ? null : this.issueStudentId(), issueType: this.issueType(), description: this.issueDescription().trim() });
      if (school !== this.store.api.schoolId()) return;
      this.issueDescription.set(''); this.issueSubmitted.set(true); this.showIssueForm.set(false); this.issuePage.set(1); await this.loadIssues();
    } catch(e) { this.issueError.set(this.store.api.auth.error(e)); } finally { this.busy.set(false); }
  }
}
