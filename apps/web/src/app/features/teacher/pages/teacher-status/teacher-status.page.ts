import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { TeacherStore } from '../../teacher.store';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { SubmissionTimelineStep } from '../../teacher.models';
@Component({
  selector: 'app-teacher-status',
  standalone: true,
  imports: [CommonModule, RouterModule, TeacherPageHeaderComponent],
  templateUrl: './teacher-status.page.html',
  styleUrls: ['./teacher-status.page.scss'],
})
export class TeacherStatusPage implements OnInit {
  store = inject(TeacherStore);
  found = signal(true);
  isAssessment = signal(false);
  isEditable = signal(false);
  loading = signal<boolean>(true);
  assignmentId = '';
  assignmentLabel = signal<string>('');
  timeline = signal<SubmissionTimelineStep[]>([]);
  marks = computed(() => this.store.entries(this.assignmentId));
  submittedMarks = computed(() => ['submitted','approved','returned'].includes(this.store.assignments().find(a => a.id === this.assignmentId)?.assessmentProgress.status ?? ''));
  scoredCount = computed(() => this.marks().filter(m => typeof m.marksValue === 'number').length);
  average = computed(() => { const scores=this.marks().flatMap(m => typeof m.marksValue === 'number' ? [m.marksValue] : []); return scores.length ? scores.reduce((sum,score)=>sum+score,0)/scores.length : null; });

  constructor(private route: ActivatedRoute) {effect(()=>{this.store.state();this.store.remote.loading();this.ngOnInit();});}

  ngOnInit(): void {
    this.assignmentId = this.route.snapshot.paramMap.get('assignmentId') || '';
    const assignment = this.store.assignments().find(a => a.id === this.assignmentId);
    this.found.set(!!assignment);
    this.isAssessment.set(!!assignment?.assessmentId);
    if (assignment?.assessmentId) {
      const progress = assignment.assessmentProgress;
      this.assignmentLabel.set(`${assignment.classStream || assignment.className} / ${assignment.subjectName}`);
      this.isEditable.set(!this.store.readOnly() && ['draft', 'returned'].includes(progress.status));
      this.timeline.set([
        { status: 'draft', label: 'Mark entry', timestamp: null, active: progress.status === 'draft', completed: progress.status !== 'draft', detail: `${progress.completed} of ${progress.total} marks completed.` },
        { status: 'submitted', label: 'Submitted for review', timestamp: progress.submittedAt, active: progress.status === 'submitted', completed: ['approved','returned'].includes(progress.status), detail: progress.status === 'submitted' ? 'Awaiting Academic Master review.' : null },
        { status: progress.status === 'returned' ? 'returned' : 'approved', label: progress.status === 'returned' ? 'Returned for correction' : 'Academic approval', timestamp: progress.approvedAt, active: ['approved','returned'].includes(progress.status), completed: progress.status === 'approved', detail: progress.returnReason || (progress.status === 'approved' ? 'Subject marks approved. Report release depends on all required subjects.' : 'The Academic Master will review the submission.') },
      ]);
    }
    this.loading.set(this.store.remote.loading() || this.store.api.loading());
  }
}
