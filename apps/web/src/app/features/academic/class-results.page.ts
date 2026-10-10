import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { RegistrarStore } from '../registrar/registrar.store';
import { TeacherClassStore } from '../teacher/teacher-class.store';
import { TeacherStore } from '../teacher/teacher.store';
import { AcademicStore, Assessment } from './academic.store';
import { HeadOversightStore } from '../headmaster/head-oversight.store';

interface SubjectMark { subject: string; mark: number | null; noMark: boolean; grade: string | null; passed: boolean; }
interface StudentResult { id: string; name: string; number: string; marks: SubjectMark[]; average: number | null; position: number | null; selected: SubjectMark | null; }

@Component({
  selector: 'app-class-results', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './class-results.page.html', styleUrls: ['./class-results.page.scss'],
})
export class ClassResultsPage {
  @ViewChild('studentPanel') studentPanel?: ElementRef<HTMLElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly years = inject(AcademicYearService);
  private readonly registry = inject(RegistrarStore);
  private readonly teacher = inject(TeacherStore);
  private readonly academic = inject(AcademicStore);
  private readonly head = inject(HeadOversightStore);
  private readonly classTeacher = inject(TeacherClassStore);
  private readonly params = toSignal(this.route.paramMap);
  private readonly data = toSignal(this.route.data);
  readonly role = computed<'academic' | 'head' | 'teacher'>(() => this.data()?.['audience'] ?? 'academic');
  readonly classId = computed(() => this.params()?.get('classId') ?? '');
  readonly year = computed(() => this.role() === 'head' ? this.years.headYear() : this.role() === 'teacher' ? this.years.teacherYear() : this.years.academicYear());
  readonly classes = computed(() => this.role() === 'teacher' ? this.classTeacher.classes() : this.role() === 'head' ? this.head.classes() : this.academic.classes());
  readonly classroom = computed(() => this.classes().find(c => c.id === this.classId()));
  readonly className = computed(() => this.classroom()?.stream || this.classroom()?.name || 'Class results');
  readonly backLink = computed(() => this.role() === 'head' ? '/head/academic-results' : this.role() === 'teacher' ? '/teacher/my-class/performance' : '/academic/academic-reports');
  readonly classRoute = computed(() => this.role() === 'head' ? '/head/academic-results/class' : this.role() === 'teacher' ? '/teacher/my-class/performance' : '/academic/academic-reports/class');
  readonly selectedTerm = signal('');
  readonly assessments = computed(() => this.academic.forYear(this.year()?.id ?? '').assessments.filter(assessment => !this.selectedTerm() || assessment.term === this.selectedTerm()));
  readonly selectedAssessmentId = signal(this.route.snapshot.queryParamMap.get('assessmentId') ?? '');
  readonly assessment = computed<Assessment | undefined>(() => this.assessments().find(a => a.id === this.selectedAssessmentId()) ?? this.assessments()[0]);
  readonly scope = signal<'approved' | 'all'>(this.route.snapshot.queryParamMap.get('scope') === 'all' ? 'all' : 'approved');
  readonly view = signal<'overall' | 'subject'>('overall');
  readonly subject = signal('');
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = 25;
  readonly assignments = computed(() => this.teacher.state().assignments.filter(a =>
    a.academicYearId === this.year()?.id && a.classId === this.classId() && a.assessmentId === this.assessment()?.id &&
    (this.role() !== 'teacher' || this.classTeacher.classAssignments().some(own => own.id === a.id)) &&
    (this.scope() === 'all' || a.assessmentProgress.status === 'approved')));
  readonly subjects = computed(() => [...new Set(this.assignments().map(a => a.subjectName))].sort());
  readonly selectedSubject = computed(() => this.subjects().includes(this.subject()) ? this.subject() : this.subjects()[0] ?? '');
  readonly visibleSubjects = computed(() => this.view() === 'subject' ? (this.selectedSubject() ? [this.selectedSubject()] : []) : this.subjects());
  readonly tableWidth = computed(() => Math.max(640, 380 + this.visibleSubjects().length * 132));
  readonly exporting = signal(false);
  readonly exportError = signal('');
  readonly roster = computed(() => this.registry.enrolmentsFor(this.year()?.id ?? '')
    .filter(enrolment => enrolment.classId === this.classId() && (enrolment.status === 'active' || this.year()?.status === 'closed'))
    .map(enrolment => ({ id: enrolment.studentId, name: enrolment.studentName, number: this.registry.student(enrolment.studentId)?.number ?? '' }))
    .sort((a,b) => a.name.localeCompare(b.name)));
  readonly results = computed<StudentResult[]>(() => {
    const assignments = this.assignments();
    const marks = this.teacher.state().marks;
    const subject = this.selectedSubject();
    const rows: StudentResult[] = this.roster().map(student => {
      const entries: SubjectMark[] = assignments.map(assignment => {
        const entry = (marks[assignment.id] ?? []).find(m => m.studentId === student.id);
        const mark = typeof entry?.marksValue === 'number' && entry.marksValue >= 0 && entry.marksValue <= 100 ? entry.marksValue : null;
        return { subject: assignment.subjectName, mark, noMark: !!entry?.noMark, grade: mark === null ? null : this.teacher.grade(assignment.id, mark), passed: mark !== null && mark >= this.teacher.policyFor(assignment).passMark };
      }).sort((a,b) => a.subject.localeCompare(b.subject));
      const selected = entries.find(entry => entry.subject === subject) ?? null;
      const scores = this.view() === 'subject' ? (selected?.mark === null || selected?.mark === undefined ? [] : [selected.mark]) : entries.flatMap(entry => entry.mark === null ? [] : [entry.mark]);
      return { ...student, marks: entries, selected, average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null, position: null };
    });
    const ranked = rows.filter(row => row.average !== null).sort((a,b) => b.average! - a.average! || a.name.localeCompare(b.name));
    ranked.forEach((row,index) => { row.position = index && row.average === ranked[index-1].average ? ranked[index-1].position : index + 1; });
    return rows.sort((a,b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.name.localeCompare(b.name));
  });
  readonly visible = computed(() => this.results().filter(row => `${row.name} ${row.number}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.visible().length / this.pageSize)));
  readonly pageRows = computed(() => this.visible().slice((this.page()-1)*this.pageSize, this.page()*this.pageSize));
  readonly numericMarks = computed(() => this.results().flatMap(row => this.view() === 'subject' ? row.selected?.mark === null || row.selected?.mark === undefined ? [] : [row.selected.mark] : row.marks.flatMap(mark => mark.mark === null ? [] : [mark.mark])));
  readonly average = computed(() => this.numericMarks().length ? this.numericMarks().reduce((sum,mark)=>sum+mark,0)/this.numericMarks().length : null);
  readonly subjectSummary = computed(() => this.subjects().map(subject => {
    const entries = this.results().flatMap(row => row.marks.filter(mark => mark.subject === subject && mark.mark !== null));
    return { subject, count: entries.length, average: entries.length ? entries.reduce((sum,entry)=>sum+entry.mark!,0)/entries.length : null };
  }));
  readonly completedStudents = computed(() => this.results().filter(row => row.average !== null).length);
  markFor(student: StudentResult, subject: string): SubjectMark | null { return student.marks.find(mark => mark.subject === subject) ?? null; }
  subjectAverage(subject: string): number | null { return this.subjectSummary().find(row => row.subject === subject)?.average ?? null; }
  changeClass(id: string): void { if (this.classes().some(c => c.id === id)) void this.router.navigate([this.classRoute(), id], { queryParams: { assessmentId: this.assessment()?.id, scope: this.scope() }, queryParamsHandling: 'merge' }); this.page.set(1); }
  setView(view: 'overall' | 'subject'): void { this.view.set(view); this.page.set(1); }
  setSubject(subject: string): void { this.subject.set(subject); this.page.set(1); if (this.view() === 'subject') requestAnimationFrame(() => this.studentPanel?.nativeElement.scrollIntoView({ behavior:'smooth', block:'start' })); }
  searchFor(value: string): void { this.search.set(value); this.page.set(1); }
  markLabel(mark: SubjectMark | null): string { return mark?.mark !== null && mark?.mark !== undefined ? String(mark.mark) : mark?.noMark ? '-' : '—'; }
  async exportExcel(): Promise<void> {
    if (this.exporting() || !this.classroom()) return;
    this.exporting.set(true); this.exportError.set('');
    try {
      const module = await import('exceljs');
      const ExcelJS = module.default || module;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(this.className().replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'Class results');
      const subjects = this.visibleSubjects();
      sheet.addRow(['Student name', ...subjects, 'Position', 'Average']);
      for (const student of this.results()) sheet.addRow([
        `${student.name} (${student.number})`,
        ...subjects.map(subject => { const mark = this.markFor(student, subject); return mark?.mark ?? (mark?.noMark ? '-' : ''); }),
        student.position ?? '', student.average ?? '',
      ]);
      sheet.addRow(['Subject average', ...subjects.map(subject => this.subjectAverage(subject) ?? ''), '', this.average() ?? '']);
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9A4B0D' } };
      sheet.getRow(sheet.rowCount).font = { bold: true };
      sheet.getColumn(1).width = 28;
      for (let index = 2; index <= subjects.length + 3; index++) sheet.getColumn(index).width = 15;
      sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
      const bytes = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.className().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${this.assessment()?.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() ?? 'results'}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { this.exportError.set('Could not export this class. Try again.'); }
    finally { this.exporting.set(false); }
  }
}
