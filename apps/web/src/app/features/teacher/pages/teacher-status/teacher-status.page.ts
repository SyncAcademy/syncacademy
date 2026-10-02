import { Component, OnInit, signal, inject } from '@angular/core';
import { TeacherDemoStore } from '../../teacher-demo.store';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TeacherPageHeaderComponent } from '../../shared/teacher-page-header.component';
import { SubmissionTimelineStep } from '../../teacher.models';
import { MOCK_TEACHER_ASSIGNMENTS, MOCK_SUBMISSION_TIMELINE_DRAFT, MOCK_SUBMISSION_TIMELINE_SUBMITTED, MOCK_SUBMISSION_TIMELINE_APPROVED } from '../../teacher-mock-data';

@Component({
  selector: 'app-teacher-status',
  standalone: true,
  imports: [CommonModule, RouterModule, TeacherPageHeaderComponent],
  templateUrl: './teacher-status.page.html',
  styleUrls: ['./teacher-status.page.scss'],
})
export class TeacherStatusPage implements OnInit {
  store = inject(TeacherDemoStore);
  found = signal(true);
  isEditable = signal(false);
  loading = signal<boolean>(true);
  assignmentId = '';
  assignmentLabel = signal<string>('');
  timeline = signal<SubmissionTimelineStep[]>([]);

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.assignmentId = this.route.snapshot.paramMap.get('assignmentId') || '';
    const assignment = this.store.assignments().find(a => a.id === this.assignmentId);
    this.found.set(!!assignment);
    if (assignment) {
      const progress = assignment.assessmentProgress;
      this.assignmentLabel.set(`${assignment.classStream || assignment.className} ? ${assignment.subjectName}`);
      this.isEditable.set(!this.store.readOnly() && ['draft', 'returned'].includes(progress.status));
      this.timeline.set([
        { status: 'draft', label: 'Mark entry', timestamp: null, active: progress.status === 'draft', completed: progress.status !== 'draft', detail: `${progress.completed} of ${progress.total} marks completed.` },
        { status: 'submitted', label: 'Submitted for review', timestamp: progress.submittedAt, active: progress.status === 'submitted', completed: ['approved','returned'].includes(progress.status), detail: progress.status === 'submitted' ? 'Awaiting Academic Officer review.' : null },
        { status: progress.status === 'returned' ? 'returned' : 'approved', label: progress.status === 'returned' ? 'Returned for correction' : 'Academic approval', timestamp: progress.approvedAt, active: ['approved','returned'].includes(progress.status), completed: progress.status === 'approved', detail: progress.returnReason || (progress.status === 'approved' ? 'Subject marks approved. Report release depends on all required subjects.' : 'The Academic Officer will review the submission.') },
      ]);
    }
    setTimeout(() => this.loading.set(false), 400);
  }
}
