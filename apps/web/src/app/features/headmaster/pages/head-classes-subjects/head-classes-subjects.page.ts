import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
import { inject } from '@angular/core';
import { HeadStore } from '../../head.store';
import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { RecordCardComponent } from '../../shared/record-card.component';
import { SchoolClass, Subject, ClassSubjectMapping } from '../../head.models';
export type ClassesSubjectsTab = 'classes' | 'subjects' | 'mappings';
export type DialogMode = 'class' | 'subject' | 'mapping';

@Component({
  selector: 'app-head-classes-subjects',
  standalone: true,
  imports: [
    DialogFocusDirective,
    CommonModule,
    FormsModule,
    HeadPageHeaderComponent,
    TableToolbarComponent,
    EmptyStateComponent,
    RecordCardComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './head-classes-subjects.page.html',
  styleUrls: ['./head-classes-subjects.page.scss'],
})
export class HeadClassesSubjectsPage implements OnInit {
  store = inject(HeadStore);
  // Required signals
  mappingToRemove = signal<string | null>(null);
  mappingNotice = signal('');
  activeTab = signal<ClassesSubjectsTab>('classes');
  loading = signal<boolean>(true);
  classes = this.store.yearClasses;
  subjects = this.store.subjects;
  mappings = this.store.yearMappings;
  constructor() { effect(() => { this.store.selectedYear(); this.closeDialog(); this.mappingToRemove.set(null); }); }
  showDialog = signal<boolean>(false);
  dialogMode = signal<DialogMode>('class');

  // Supporting state signals
  searchQuery = signal<string>('');
  page = signal(1);
  readonly pageSize = 25;
  error = signal<string | null>(null);
  isEditing = signal<boolean>(false);
  editingId = signal<string | null>(null);
  formError = signal<string | null>(null);

  // Form models
  classForm = signal<{ name: string; stream: string; studentCount: number }>({
    name: '',
    stream: '',
    studentCount: 0,
  });

  subjectForm = signal<{ name: string; code: string }>({
    name: '',
    code: '',
  });

  mappingForm = signal<{ classId: string; subjectId: string }>({
    classId: '',
    subjectId: '',
  });

  // Filtered computed signals
  filteredClasses = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.classes();
    if (!q) return list;
    return list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.stream && c.stream.toLowerCase().includes(q))
    );
  });

  filteredSubjects = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.subjects();
    if (!q) return list;
    return list.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
    );
  });

  filteredMappings = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.mappings();
    if (!q) return list;
    return list.filter(
      m =>
        m.className.toLowerCase().includes(q) ||
        (m.classStream && m.classStream.toLowerCase().includes(q)) ||
        m.subjectName.toLowerCase().includes(q)
    );
  });
  activeCount = computed(() => this.activeTab() === 'classes' ? this.filteredClasses().length : this.activeTab() === 'subjects' ? this.filteredSubjects().length : this.filteredMappings().length);
  pages = computed(() => Math.max(1, Math.ceil(this.activeCount() / this.pageSize)));
  pageClasses = computed(() => this.filteredClasses().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  pageSubjects = computed(() => this.filteredSubjects().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  pageMappings = computed(() => this.filteredMappings().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    setTimeout(() => {
      try {
        this.loading.set(false);
      } catch (err) {
        this.error.set('Failed to load classes and subjects data.');
        this.loading.set(false);
      }
    }, 500);
  }

  onTabKey(event: KeyboardEvent, current: ClassesSubjectsTab): void {
    const tabs: ClassesSubjectsTab[] = ['classes', 'subjects', 'mappings'];
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (tabs.indexOf(current) + direction + 3) % 3;
    this.setActiveTab(tabs[next]);
    document.getElementById(`tab-${tabs[next]}`)?.focus();
  }
  setActiveTab(tab: ClassesSubjectsTab): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.page.set(1);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.page.set(1);
  }

  get searchPlaceholder(): string {
    switch (this.activeTab()) {
      case 'classes':
        return 'Search classes by name or stream...';
      case 'subjects':
        return 'Search subjects by name or code...';
      case 'mappings':
        return 'Search mappings by class or subject...';
    }
  }

  // Dialog actions
  openAddDialog(mode: DialogMode): void {
    if (this.store.readOnly()) return;
    this.dialogMode.set(mode);
    this.isEditing.set(false);
    this.editingId.set(null);
    this.formError.set(null);

    if (mode === 'class') {
      this.classForm.set({ name: '', stream: '', studentCount: 0 });
    } else if (mode === 'subject') {
      this.subjectForm.set({ name: '', code: '' });
    } else if (mode === 'mapping') {
      const firstClass = this.classes()[0];
      const firstSubject = this.subjects()[0];
      this.mappingForm.set({
        classId: firstClass ? firstClass.id : '',
        subjectId: firstSubject ? firstSubject.id : '',
      });
    }

    this.showDialog.set(true);
  }

  openEditClass(c: SchoolClass): void {
    if (this.store.readOnly()) return;
    this.dialogMode.set('class');
    this.isEditing.set(true);
    this.editingId.set(c.id);
    this.formError.set(null);
    this.classForm.set({
      name: c.name,
      stream: c.stream ?? '',
      studentCount: c.studentCount,
    });
    this.showDialog.set(true);
  }

  openEditSubject(s: Subject): void {
    if (this.store.readOnly()) return;
    this.dialogMode.set('subject');
    this.isEditing.set(true);
    this.editingId.set(s.id);
    this.formError.set(null);
    this.subjectForm.set({
      name: s.name,
      code: s.code,
    });
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.formError.set(null);
    this.editingId.set(null);
  }

  saveDialog(): void {
    if (this.store.readOnly()) return;
    const mode = this.dialogMode();

    if (mode === 'class') {
      const form = this.classForm();
      if (!form.name.trim()) {
        this.formError.set('Class name is required.');
        return;
      }

      if (this.classes().some(c => c.id !== this.editingId() && c.name.toLowerCase() === form.name.trim().toLowerCase() && (c.stream || '').toLowerCase() === form.stream.trim().toLowerCase())) {
        this.formError.set('This class and stream already exist.'); return;
      }
      if (this.isEditing() && this.editingId()) {
        this.store.classes.update(list =>
          list.map(c =>
            c.id === this.editingId()
              ? {
                  ...c,
                  name: form.name.trim(),
                  stream: form.stream.trim() || null,
                  studentCount: c.studentCount,
                }
              : c
          )
        );
      } else {
        const newClass: SchoolClass = {
          id: 'c-' + Date.now(),
          enrolmentStatus: 'draft', capacity: 60,
          academicYearId: this.store.selectedYear()!.id,
          name: form.name.trim(),
          stream: form.stream.trim() || null,
          studentCount: 0,
        };
        this.store.classes.update(list => [newClass, ...list]);
      }
    } else if (mode === 'subject') {
      const form = this.subjectForm();
      if (!form.name.trim()) {
        this.formError.set('Subject name is required.');
        return;
      }
      if (!form.code.trim()) {
        this.formError.set('Subject code is required.');
        return;
      }

      if (this.subjects().some(subject => subject.id !== this.editingId() && subject.code === form.code.trim().toUpperCase())) {
        this.formError.set('This subject code already exists.'); return;
      }
      if (this.isEditing() && this.editingId()) {
        this.subjects.update(list =>
          list.map(s =>
            s.id === this.editingId()
              ? {
                  ...s,
                  name: form.name.trim(),
                  code: form.code.trim().toUpperCase(),
                }
              : s
          )
        );
      } else {
        const newSubject: Subject = {
          id: 's-' + Date.now(),
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
        };
        this.subjects.update(list => [newSubject, ...list]);
      }
    } else if (mode === 'mapping') {
      const form = this.mappingForm();
      if (!form.classId) {
        this.formError.set('Please select a class.');
        return;
      }
      if (!form.subjectId) {
        this.formError.set('Please select a subject.');
        return;
      }

      const selectedClass = this.classes().find(c => c.id === form.classId);
      const selectedSubject = this.subjects().find(s => s.id === form.subjectId);

      if (!selectedClass || !selectedSubject) {
        this.formError.set('Invalid class or subject selection.');
        return;
      }

      // Check if mapping already exists
      const exists = this.mappings().some(
        m => m.classId === form.classId && m.subjectId === form.subjectId
      );
      if (exists) {
        this.formError.set('This subject is already assigned to this class.');
        return;
      }

      const newMapping: ClassSubjectMapping = {
        id: 'cs-' + Date.now(),
        classId: selectedClass.id,
        className: selectedClass.name,
        classStream: selectedClass.stream,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
      };
      this.store.mappings.update(list => [newMapping, ...list]);
    }

    this.store.mappings.update(list => list.map(m => ({ ...m,
      className: this.classes().find(c => c.id === m.classId)?.name ?? m.className,
      classStream: this.store.classes().find(c => c.id === m.classId)?.stream ?? m.classStream,
      subjectName: this.subjects().find(subject => subject.id === m.subjectId)?.name ?? m.subjectName,
    })));
    this.store.assignments.update(list => list.map(a => ({ ...a,
      className: this.classes().find(c => c.id === a.classId)?.name ?? a.className,
      classStream: this.store.classes().find(c => c.id === a.classId)?.stream ?? a.classStream,
      subjectName: this.subjects().find(subject => subject.id === a.subjectId)?.name ?? a.subjectName,
    })));
    this.closeDialog();
  }

  confirmRemoveMapping(): void {
    if (this.store.readOnly()) return;
    this.store.mappings.update(list => list.filter(m => m.id !== this.mappingToRemove()));
    this.mappingToRemove.set(null);
  }

  removeMapping(mappingId: string): void {
    if (this.store.readOnly()) return;
    const mapping = this.mappings().find(m => m.id === mappingId);
    if (mapping && this.store.assignments().some(a => a.classId === mapping.classId && a.subjectId === mapping.subjectId)) {
      this.mappingNotice.set('This subject is used by a teaching assignment. Keep the mapping to preserve the academic structure.'); return;
    }
    this.mappingNotice.set('');
    this.mappingToRemove.set(mappingId);
  }
}
