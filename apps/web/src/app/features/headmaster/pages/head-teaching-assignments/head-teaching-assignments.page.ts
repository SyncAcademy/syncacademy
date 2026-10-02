import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
import { inject } from '@angular/core';
import { HeadDemoStore } from '../../head-demo.store';
import { Component, OnInit, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { RecordCardComponent } from '../../shared/record-card.component';
import {
  AcademicYear,
  AssignmentStatus,
  SchoolClass,
  StaffMember,
  Subject,
  TeachingAssignment,
} from '../../head.models';
import {
  MOCK_ACADEMIC_YEARS,
  MOCK_CLASSES,
  MOCK_STAFF,
  MOCK_SUBJECTS,
  MOCK_TEACHING_ASSIGNMENTS,
} from '../../head-mock-data';

@Component({
  selector: 'app-head-teaching-assignments',
  standalone: true,
  imports: [
    DialogFocusDirective,
    CommonModule,
    FormsModule,
    HeadPageHeaderComponent,
    StatusBadgeComponent,
    TableToolbarComponent,
    EmptyStateComponent,
    RecordCardComponent,
  ],
  templateUrl: './head-teaching-assignments.page.html',
  styleUrls: ['./head-teaching-assignments.page.scss'],
})
export class HeadTeachingAssignmentsPage implements OnInit {
  store = inject(HeadDemoStore);
  // Loading & Data signals
  readonly loading = signal<boolean>(true);
  readonly assignments = this.store.assignments;
  readonly errorMessage = signal<string | null>(null);

  // Filter signals
  readonly teacherFilter = signal<string>('');
  readonly classFilter = signal<string>('');
  readonly subjectFilter = signal<string>('');
  readonly yearFilter = signal<string>('');
  readonly searchQuery = signal<string>('');

  // Dialog & Modal signals
  readonly showDialog = signal<boolean>(false);
  readonly editingAssignment = signal<TeachingAssignment | null>(null);
  readonly formError = signal<string>('');

  // Dialog Form field signals
  readonly formTeacherId = signal<string>('');
  readonly formClassId = signal<string>('');
  readonly formSubjectId = signal<string>('');
  readonly formYearId = signal<string>('');
  readonly formStatus = signal<AssignmentStatus>('active');

  // Confirmation dialog signals
  readonly deleteConfirmOpen = signal<boolean>(false);
  readonly assignmentToDelete = signal<TeachingAssignment | null>(null);

  // Available options for Create/Edit dropdowns
  get availableTeachers(): StaffMember[] { return this.store.staff().filter(s => s.role === 'teacher' && s.status === 'active'); }
  get availableClasses(): SchoolClass[] { return this.store.yearClasses(); }
  get availableSubjects(): Subject[] {
    const offered = this.store.mappings().filter(m => m.classId === this.formClassId()).map(m => m.subjectId);
    return this.store.subjects().filter(s => offered.includes(s.id));
  }
  get availableYears(): AcademicYear[] { return this.store.years().filter(y => y.status !== 'closed' && y.id === this.store.selectedYear()?.id); }
  constructor() { effect(() => { this.store.selectedYear(); this.clearFilters(); this.closeDialog(); this.cancelDelete(); }); }
  changeClass(id: string): void { this.formClassId.set(id); this.formSubjectId.set(''); }

  // Filter options derived from unique values in mock / active assignments
  readonly teacherOptions = computed(() => {
    const source = this.store.yearAssignments();
    const names = new Set(source.map(a => a.teacherName));
    return Array.from(names).sort();
  });

  readonly classOptions = computed(() => {
    const source = this.store.yearAssignments();
    const classes = new Set(source.map(a => a.classStream || a.className));
    return Array.from(classes).sort();
  });

  readonly subjectOptions = computed(() => {
    const source = this.store.yearAssignments();
    const subjects = new Set(source.map(a => a.subjectName));
    return Array.from(subjects).sort();
  });

  readonly yearOptions = computed(() => {
    const source = this.store.yearAssignments();
    const years = new Set(source.map(a => a.academicYearLabel));
    return Array.from(years).sort();
  });

  // Computed indicator if any filter is applied
  readonly hasActiveFilters = computed(() => {
    return Boolean(
      this.teacherFilter() ||
      this.classFilter() ||
      this.subjectFilter() ||
      this.yearFilter() ||
      this.searchQuery()
    );
  });

  // Computed filtered list of assignments
  readonly filteredAssignments = computed(() => {
    const list = this.store.yearAssignments();
    const teacher = this.teacherFilter();
    const cls = this.classFilter();
    const subject = this.subjectFilter();
    const year = this.yearFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter(item => {
      if (teacher && item.teacherName !== teacher) {
        return false;
      }
      if (cls && (item.classStream || item.className) !== cls) {
        return false;
      }
      if (subject && item.subjectName !== subject) {
        return false;
      }
      if (year && item.academicYearLabel !== year) {
        return false;
      }
      if (query) {
        const matchesTeacher = item.teacherName.toLowerCase().includes(query);
        const matchesClass = item.className.toLowerCase().includes(query) ||
          (item.classStream && item.classStream.toLowerCase().includes(query));
        const matchesSubject = item.subjectName.toLowerCase().includes(query);
        const matchesYear = item.academicYearLabel.toLowerCase().includes(query);
        if (!matchesTeacher && !matchesClass && !matchesSubject && !matchesYear) {
          return false;
        }
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    setTimeout(() => {
      try {
        // Retain the shared frontend demo state.
        this.loading.set(false);
      } catch {
        this.errorMessage.set('Failed to load teaching assignments. Please retry.');
        this.loading.set(false);
      }
    }, 500);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  clearFilters(): void {
    this.teacherFilter.set('');
    this.classFilter.set('');
    this.subjectFilter.set('');
    this.yearFilter.set('');
    this.searchQuery.set('');
  }

  openCreateDialog(): void {
    if (this.store.readOnly()) return;
    this.editingAssignment.set(null);
    this.formTeacherId.set('');
    this.formClassId.set(this.availableClasses[0]?.id ?? '');
    this.formSubjectId.set('');
    const activeYear = this.availableYears.find(y => y.status === 'active') ?? this.availableYears[0];
    this.formYearId.set(activeYear?.id ?? '');
    this.formStatus.set('active');
    this.formError.set('');
    this.showDialog.set(true);
  }

  openEditDialog(assignment: TeachingAssignment): void {
    if (this.store.readOnly()) return;
    this.editingAssignment.set(assignment);
    this.formTeacherId.set(assignment.teacherId);
    this.formClassId.set(assignment.classId);
    this.formSubjectId.set(assignment.subjectId);
    this.formYearId.set(assignment.academicYearId);
    this.formStatus.set(assignment.status);
    this.formError.set('');
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editingAssignment.set(null);
    this.formError.set('');
  }

  saveAssignment(): void {
    if (this.store.readOnly()) return;
    const teacherId = this.formTeacherId();
    const classId = this.formClassId();
    const subjectId = this.formSubjectId();
    const yearId = this.formYearId();

    if (!teacherId || !classId || !subjectId || !yearId) {
      this.formError.set('Please select teacher, class, subject, and academic year.');
      return;
    }

    const teacher = this.availableTeachers.find(t => t.id === teacherId);
    const schoolClass = this.availableClasses.find(c => c.id === classId);
    const subject = this.availableSubjects.find(s => s.id === subjectId);
    const year = this.availableYears.find(y => y.id === yearId);

    if (!teacher || !schoolClass || !subject || !year) {
      this.formError.set('Invalid selection. Please verify the form inputs.');
      return;
    }

    const editing = this.editingAssignment();
    if (this.assignments().some(a => a.id !== editing?.id && a.teacherId === teacherId && a.classId === classId && a.subjectId === subjectId && a.academicYearId === yearId)) {
      this.formError.set('This teacher already has this class and subject for the selected year.'); return;
    }
    if (editing) {
      this.assignments.update(items =>
        items.map(item =>
          item.id === editing.id
            ? {
                ...item,
                teacherId: teacher.id,
                teacherName: teacher.fullName,
                classId: schoolClass.id,
                className: schoolClass.name,
                classStream: schoolClass.stream,
                subjectId: subject.id,
                subjectName: subject.name,
                academicYearId: year.id,
                academicYearLabel: year.label,
                status: this.formStatus(),
              }
            : item
        )
      );
    } else {
      const newAssignment: TeachingAssignment = {
        id: `ta-${Date.now()}`,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        classId: schoolClass.id,
        className: schoolClass.name,
        classStream: schoolClass.stream,
        subjectId: subject.id,
        subjectName: subject.name,
        academicYearId: year.id,
        academicYearLabel: year.label,
        status: this.formStatus(),
      };
      this.assignments.update(items => [newAssignment, ...items]);
    }

    this.closeDialog();
  }

  toggleStatus(assignment: TeachingAssignment): void {
    if (this.store.readOnly()) return;
    const nextStatus: AssignmentStatus = assignment.status === 'active' ? 'inactive' : 'active';
    this.assignments.update(items =>
      items.map(item =>
        item.id === assignment.id ? { ...item, status: nextStatus } : item
      )
    );
  }

  confirmDelete(assignment: TeachingAssignment): void {
    if (this.store.readOnly()) return;
    this.assignmentToDelete.set(assignment);
    this.deleteConfirmOpen.set(true);
  }

  handleDelete(): void {
    if (this.store.readOnly()) return;
    const target = this.assignmentToDelete();
    if (target) {
      this.assignments.update(items => items.filter(item => item.id !== target.id));
    }
    this.deleteConfirmOpen.set(false);
    this.assignmentToDelete.set(null);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.assignmentToDelete.set(null);
  }
}
