import { effect } from '@angular/core';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { TeacherDemoStore } from '../../teacher-demo.store';
import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { RosterStudent, RosterIssueReport, RosterIssueType } from '../../teacher.models';
import { MOCK_ROSTER_STUDENTS, MOCK_TEACHER_ASSIGNMENTS } from '../../teacher-mock-data';

@Component({
  selector: 'app-teacher-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherPageHeaderComponent, DialogFocusDirective],
  templateUrl: './teacher-roster.page.html',
  styleUrls: ['./teacher-roster.page.scss'],
})
export class TeacherRosterPage implements OnInit {
  store = inject(TeacherDemoStore);
  found = signal(true);
  issueError = signal('');
  issues = computed(() => this.store.state().issues.filter(i => i.assignmentId === this.assignmentId));
  loading = signal<boolean>(true);
  students = signal<RosterStudent[]>([]);
  assignmentId = '';
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

  constructor(private route:ActivatedRoute){effect(()=>{this.store.api.data();const id=this.route.snapshot.paramMap.get('assignmentId')||'';this.assignmentId=id;const a=this.store.assignments().find(a=>a.id===id);this.found.set(!!a);this.students.set(this.store.roster(id));this.assignmentLabel.set(a?.className||'');this.loading.set(this.store.api.loading());});}

  ngOnInit():void {}

  onSearchChange(val: string): void {
    this.searchTerm.set(val);
  }

  openConfirmDialog(): void {
    if (this.store.readOnly()) return;
    this.showConfirmDialog.set(true);
  }

  confirmRoster(): void {
    if (this.store.readOnly()) return;
    if (!this.found()) return;
    this.store.confirmRoster(this.assignmentId);
    this.confirmed.set(true);
    this.showConfirmDialog.set(false);
  }

  cancelConfirm(): void {
    this.showConfirmDialog.set(false);
  }

  toggleIssueForm(): void {
    if (this.store.readOnly()) return;
    this.showIssueForm.update(v => !v);
  }

  submitIssue(): void {
    if (this.store.readOnly()) return;
    if (this.issueDescription().trim().length < 10) { this.issueError.set('Describe the issue in at least 10 characters.'); return; }
    this.store.reportIssue(this.assignmentId, { studentId: this.issueStudentId(), issueType: this.issueType(), description: this.issueDescription().trim() });
    this.issueError.set('');
    this.issueDescription.set('');
    this.issueSubmitted.set(true);
    this.showIssueForm.set(false);
    setTimeout(() => this.issueSubmitted.set(false), 3000);
  }
}
