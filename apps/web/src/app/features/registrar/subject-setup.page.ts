import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrarStore } from './registrar.store';
import { TeacherPickerComponent } from '../../shared/teacher-picker.component';

@Component({ selector: 'app-subject-setup', standalone: true, imports: [CommonModule, FormsModule, TeacherPickerComponent], styleUrls: ['./registrar.page.scss'], styles: [`
  .subject-create-form { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto; gap:12px; align-items:end; margin-top:18px; }
  .subject-create-form .field { min-width:0; margin:0; }
  .subject-create-form .action-btn { width:auto; min-width:120px; min-height:44px; align-self:end; white-space:nowrap; }
  @media(max-width:480px) { .subject-create-form { grid-template-columns:minmax(0,2fr) minmax(0,1fr); } .subject-create-form .action-btn { grid-column:1 / -1; justify-self:start; } }
`], template: `
<h2>Subjects & class offerings</h2><p>Define the subjects available to each class. Registrars use these offerings when assigning student subjects.</p>
<div class="context-row"><strong>{{ store.year()?.label }}</strong><span>{{ api.schoolName() }}</span></div>
@if (error()) { <p class="portal-notice portal-notice--error" role="alert">{{ error() }}</p> } @if (notice()) { <p class="portal-notice" role="status">{{ notice() }}</p> }
<section class="panel"><h3>School subjects</h3><div class="class-chips">@for (s of subjects(); track s.id) { <span class="badge">{{ s.code }} · {{ s.name }}</span> } @empty { <p>No subjects configured.</p> }</div>
@if (canManage()) { <form (ngSubmit)="add()" class="subject-create-form"><label class="field">Subject name<input name="subjectName" required minlength="2" maxlength="100" [(ngModel)]="name"></label><label class="field">Code<input name="code" required maxlength="20" [(ngModel)]="code"></label><button class="action-btn" [disabled]="busy() || !name.trim() || !code.trim()">Add subject</button></form> }</section>
<section class="panel"><h3>Subjects offered by a class</h3><label class="field">Class<select [(ngModel)]="classId" (ngModelChange)="choose()" [disabled]="busy()"><option value="">Choose a class</option>@for (c of store.classes(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select></label>
@if (classId) { @for (s of subjects(); track s.id) { <label class="context-row"><input type="checkbox" [checked]="selected.includes(s.id)" (change)="toggle(s.id)" [disabled]="!canManage() || closed() || busy()">{{ s.name }} ({{ s.code }})</label> } @if (canManage()) { <button class="action-btn action-btn--primary" [disabled]="closed() || busy()" (click)="save()">Save class subjects</button> } }</section>
@if (canManage()) { <section class="panel"><h3>Assign a teacher to a subject</h3><p>Choose a class above, then assign an active teacher to one of its saved subjects.</p><app-teacher-picker [teachers]="teachers()" [selectedId]="teacherId" (selectedIdChange)="teacherId = $event" [disabled]="busy()" /><label class="field">Subject<select [(ngModel)]="subjectId"><option value="">Choose a subject</option>@for (o of offered(); track o.subjectId) { <option [value]="o.subjectId">{{ o.subject.name }}</option> }</select></label><button class="action-btn" [disabled]="busy() || !teacherId || !subjectId || !classId" (click)="assign()">Assign teacher</button>
@for (a of assignments(); track a.id) { <p>{{ a.membership.user.name }} · {{ a.subject?.name || 'Whole-class assignment' }}</p> }
</section> }
` })
export class SubjectSetupPage {
  readonly store = inject(RegistrarStore); readonly api = this.store.api; readonly subjects = signal<any[]>([]); readonly offerings = signal<any[]>([]);
  readonly busy = signal(false); readonly error = signal(''); readonly notice = signal(''); name = ''; code = ''; classId = ''; selected: string[] = []; teacherId = ''; subjectId = ''; private generation = 0; private lastContext = '';
  private readonly context = computed(() => `${this.api.schoolId()}|${this.store.year()?.id || ''}`);
  constructor() { effect(() => { const context=this.context(); this.api.data(); untracked(() => { if(context!==this.lastContext){this.classId = ''; this.selected = []; this.teacherId = ''; this.subjectId = ''; this.notice.set(''); this.lastContext=context;} void this.load(); }); }); }
  canManage() { return !!this.api.data()?.permissions?.academic; }
  closed() { return !this.store.year(); }
  teachers(): {id:string;fullName:string;email:string}[] { return (this.api.data()?.members || []).filter((m: any) => m.active && m.user.enabled && m.role === 'TEACHER').map((m:any)=>({id:m.id,fullName:m.user.name,email:m.user.email})); }
  assignments(): any[] { return (this.api.data()?.assignments || []).filter((a: any) => a.classroomId === this.classId); }
  offered() { return this.offerings().filter(o => o.classroomId === this.classId); }
  choose() { this.selected = this.offered().map(o => o.subjectId); this.subjectId = ''; }
  toggle(id: string) { this.selected = this.selected.includes(id) ? this.selected.filter(s => s !== id) : [...this.selected, id]; }
  async load() { const generation = ++this.generation; this.subjects.set([]); this.offerings.set([]); this.error.set(''); if (!this.store.year() || !this.api.schoolId() || !this.api.data()) return; try { const data: any = await this.api.auth.request('GET', `schools/${this.api.schoolId()}/registry/subjects?yearId=${this.store.year()!.id}`); if (generation === this.generation) { this.subjects.set(data.subjects); this.offerings.set(data.offerings); this.choose(); } } catch (e) { if (generation === this.generation) this.error.set(this.api.auth.error(e)); } }
  private async write(path: string, data: any):Promise<boolean> { if (this.busy()) return false; this.busy.set(true); this.error.set(''); const generation = this.generation; try { await this.api.write(path, data); if (generation === this.generation) { await this.load(); this.notice.set('Saved successfully.'); } return true; } catch (e) { if (generation === this.generation) this.error.set(this.api.auth.error(e)); return false; } finally { this.busy.set(false); } }
  async add() { if(await this.write('registry/subjects', { name: this.name, code: this.code })) { this.name=''; this.code=''; } }
  save() { return this.write('registry/class-subjects', { classroomId: this.classId, subjectIds: this.selected }); }
  assign() { return this.write('assignments', { classroomId: this.classId, membershipId: this.teacherId, subjectId: this.subjectId }); }
}
