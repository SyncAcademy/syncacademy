import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { MarkEntry } from '../../teacher.models';
import { TeacherDemoStore, demoGrade } from '../../teacher-demo.store';
import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';

@Component({
  selector: 'app-teacher-marks', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherPageHeaderComponent, DialogFocusDirective],
  templateUrl: './teacher-marks.page.html', styleUrls: ['./teacher-marks.page.scss'],
})
export class TeacherMarksPage implements OnInit {
  store = inject(TeacherDemoStore);
  route = inject(ActivatedRoute);
  loading = signal(false);
  marks = signal<MarkEntry[]>([]);
  assignmentId = '';
  assignment = computed(() => this.store.assignments().find(a => a.id === this.assignmentId));
  assignmentLabel = computed(() => { const a = this.assignment(); return a ? `${a.classStream || a.className} ? ${a.subjectName}` : 'Assignment unavailable'; });
  readOnly = computed(() => this.store.readOnly() || !this.assignment() || ['submitted', 'approved'].includes(this.assignment()!.assessmentProgress.status) || this.assignment()!.rosterStatus !== 'confirmed');
  searchTerm = signal('');
  missingOnly = signal(false);
  showSubmitDialog = signal(false);
  autoSaveStatus = signal('');
  submitted = signal(false);
  filteredMarks = computed(() => this.marks().filter(m =>
    (!this.missingOnly() || !this.valid(m)) && (m.fullName + ' ' + m.studentNumber).toLowerCase().includes(this.searchTerm().toLowerCase())
  ));
  completedCount = computed(() => this.marks().filter(m => this.valid(m)).length);
  totalCount = computed(() => this.marks().length);
  progressPercent = computed(() => this.totalCount() ? Math.round(this.completedCount() / this.totalCount() * 100) : 0);
  canSubmit = computed(() => !this.readOnly() && this.totalCount() > 0 && this.completedCount() === this.totalCount());
  ngOnInit(): void {
    this.assignmentId = this.route.snapshot.paramMap.get('assignmentId') || '';
    this.marks.set(structuredClone(this.store.entries(this.assignmentId)));
  }
  valid(mark: MarkEntry): boolean { return demoGrade(mark.marksValue) !== null; }
  onSearchChange(value: string): void { this.searchTerm.set(value); }
  onMarkChange(id: string, value: string): void {
    if (this.readOnly()) return;
    const numeric = value === '' ? null : Number(value);
    this.marks.update(list => list.map(m => m.studentId === id ? { ...m, marksValue: numeric, grade: this.store.grade(this.assignmentId, numeric), lastSaved: new Date().toISOString() } : m));
    this.save();
  }
  onCommentChange(id: string, value: string): void {
    if (this.readOnly()) return;
    this.marks.update(list => list.map(m => m.studentId === id ? { ...m, comments: value, lastSaved: new Date().toISOString() } : m));
    this.save();
  }
  private save(): void {
    this.store.save(this.assignmentId, this.marks());
    this.autoSaveStatus.set('Changes retained in this demo session');
  }
  openSubmitDialog(): void { if (this.canSubmit()) this.showSubmitDialog.set(true); }
  confirmSubmit(): void {
    if (this.canSubmit() && this.store.submit(this.assignmentId)) this.submitted.set(true);
    this.showSubmitDialog.set(false);
  }
  cancelSubmit(): void { this.showSubmitDialog.set(false); }
  trackStudent(index: number, mark: MarkEntry): string { return mark.studentId; }
}
