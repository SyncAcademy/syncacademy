import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolApiService } from '../../core/services/school-api.service';
import { AcademicDataService } from '../../core/services/academic-data.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { TeacherPickerComponent } from '../../shared/teacher-picker.component';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { HeadPageHeaderComponent } from '../headmaster/shared/head-page-header.component';
import { displayClassName } from '../headmaster/head.models';

@Component({
  selector: 'app-teaching-responsibilities', standalone: true,
  imports: [CommonModule, FormsModule, TeacherPickerComponent, DialogFocusDirective, HeadPageHeaderComponent],
  styleUrls: ['./academic.page.scss', './teaching-responsibilities.page.scss'],
  template: `
    <app-head-page-header title="Teaching Assignments" description="Manage subject teachers and class teachers for the selected academic year.">
      <button class="action-btn action-btn--primary" [disabled]="!ready() || busy()" (click)="openSubject()">Assign subject teacher</button>
    </app-head-page-header>
    @if (error() || api.error() || remote.error()) { <p class="portal-notice portal-notice--error" role="alert">{{ error() || api.error() || remote.error() }}</p> }
    @if (notice()) { <p class="portal-notice" role="status">{{ notice() }}</p> }
    <div class="filters responsibility-filters">
      <div class="responsibility-class-filter">
        <details class="responsibility-class-picker" #classPicker>
          <summary aria-label="Filter by class">{{ selectedFilterLabel() }}</summary>
          <div class="responsibility-class-menu">
            <input type="search" aria-label="Find a class" placeholder="Find a class" [ngModel]="classSearch()" (ngModelChange)="classSearch.set($event)">
            <div class="responsibility-class-options">
              <button type="button" [class.selected]="!classFilter()" (click)="chooseClass('', classPicker)">All classes</button>
              @for (c of matchingClasses(); track c.id) { <button type="button" [class.selected]="classFilter() === c.id" (click)="chooseClass(c.id, classPicker)">{{ label(c.name) }}</button> }
              @if (!matchingClasses().length) { <p>No matching classes</p> }
            </div>
          </div>
        </details>
      </div>
      <input class="responsibility-search" type="search" aria-label="Search teaching assignments" placeholder="Search teacher, subject, or class" [ngModel]="search()" (ngModelChange)="search.set($event); page.set(1)">
    </div>
    <section class="panel table-panel"><div class="table-scroll"><table><caption>Subject teachers</caption><thead><tr><th>Class</th><th>Subject</th><th>Teacher</th><th>Actions</th></tr></thead><tbody>
      @for (a of visibleAssignments(); track a.id) { <tr><td>{{ label(a.classroom.name) }}</td><td>{{ a.subject.name }}</td><td>{{ a.membership.user.name }} @if (!a.membership.active || !a.membership.user.enabled) { <span class="badge">Inactive</span> }</td><td><button class="action-btn" [disabled]="busy()" (click)="openSubject(a)">Change teacher</button></td></tr> }
      @empty { <tr><td colspan="4">No subject teachers match this view.</td></tr> }
    </tbody></table></div>
    <div class="pagination-bar responsibility-pagination" role="navigation" aria-label="Subject teacher pages"><span>Page {{ page() }} of {{ pages() }} · {{ assignments().length }} assignments</span><div class="pagination-actions"><button class="action-btn" [disabled]="page() <= 1" (click)="page.set(page()-1)">Previous</button><button class="action-btn" [disabled]="page() >= pages()" (click)="page.set(page()+1)">Next</button></div></div></section>
    <section class="panel table-panel class-teacher-panel">
      <header class="class-teacher-heading">
        <div><h3>Class teachers</h3><p>Each class has one class teacher. Changing this assignment does not affect subject teaching.</p></div>
        <span class="class-teacher-count">{{ visibleClasses().length }} {{ visibleClasses().length === 1 ? 'class' : 'classes' }}</span>
      </header>
      <div class="table-scroll"><table class="class-teacher-table"><thead><tr><th scope="col">Class</th><th scope="col">Class teacher</th><th scope="col">Action</th></tr></thead><tbody>
      @for (c of pagedClasses(); track c.id) { <tr><td data-label="Class"><span class="class-name">{{ label(c.name) }}</span></td><td data-label="Class teacher">@if (classTeacher(c.id); as assignment) { <span class="teacher-assigned">{{ assignment.teacherName }}</span> } @else { <span class="teacher-unassigned">Not assigned</span> }</td><td data-label="Action"><button class="action-btn class-teacher-action" [disabled]="busy() || !remote.hasData()" (click)="openClass(c)">{{ classTeacher(c.id) ? 'Change / remove' : 'Assign class teacher' }}</button></td></tr> }
      @empty { <tr><td class="class-teacher-empty" colspan="3">No classes are available for this academic year.</td></tr> }
      </tbody></table></div>
      @if (classPages() > 1) { <div class="pagination-bar responsibility-pagination class-teacher-pagination" role="navigation" aria-label="Class teacher pages"><span>Page {{ classPage() }} of {{ classPages() }}</span><div class="pagination-actions"><button class="action-btn" [disabled]="classPage() <= 1" (click)="classPage.set(classPage()-1)">Previous</button><button class="action-btn" [disabled]="classPage() >= classPages()" (click)="classPage.set(classPage()+1)">Next</button></div></div> }
    </section>
    @if (dialog()) {
      <dialog open class="modal-backdrop" appDialogFocus aria-modal="true" aria-labelledby="responsibility-title" (keydown.escape)="close()">
        <section class="modal-card wide"><div class="panel-heading"><h2 id="responsibility-title">{{ dialog() === 'class' ? 'Class teacher' : editing() ? 'Change subject teacher' : 'Assign subject teacher' }}</h2><button class="action-btn" [disabled]="busy()" (click)="close()">Close</button></div>
          @if (dialogError()) { <p class="portal-notice portal-notice--error" role="alert">{{ dialogError() }}</p> }
          <form class="editor-form" (ngSubmit)="save()">
            @if (dialog() === 'subject' && !editing()) {
              <label class="field">Class<select name="classroom" [(ngModel)]="classId" (ngModelChange)="subjectId = ''" required [disabled]="busy()"><option value="">Select class</option>@for(c of classes(); track c.id){<option [value]="c.id">{{label(c.name)}}</option>}</select></label>
              <label class="field">Subject<select name="subject" [(ngModel)]="subjectId" required [disabled]="busy()"><option value="">Select subject</option>@for(s of offeredSubjects(); track s.subjectId){<option [value]="s.subjectId">{{s.subject.name}}</option>}</select></label>
            } @else { <p><strong>{{ selectedClassName() }}</strong>@if(editing()){ · {{ editing().subject.name }}}</p> }
            <app-teacher-picker [teachers]="teachers()" [selectedId]="teacherId" (selectedIdChange)="teacherId = $event" [allowNone]="dialog() === 'class'" [disabled]="busy()" />
            <p>{{ dialog() === 'class' ? 'Choose No class teacher to remove this responsibility. Attendance and reports are preserved.' : 'The new teacher receives subject access. Recorded marks and syllabus history are preserved.' }}</p>
            <div class="actions"><button type="button" class="action-btn" [disabled]="busy()" (click)="close()">Cancel</button><button type="submit" class="action-btn action-btn--primary" [disabled]="busy() || (dialog() === 'subject' && (!teacherId || !classId || !subjectId))">{{busy() ? 'Saving…' : 'Save assignment'}}</button></div>
          </form>
        </section>
      </dialog>
    }
  `,
})
export class TeachingResponsibilitiesPage {
  readonly api=inject(SchoolApiService);
  readonly remote=inject(AcademicDataService);
  readonly years=inject(AcademicYearService);
  readonly year=computed(()=>this.api.role()==='HEADMASTER'?this.years.headYear():this.years.academicYear());
  readonly ready=computed(()=>!!this.year()&&!!this.api.data());
  readonly busy=signal(false); readonly error=signal(''); readonly notice=signal(''); readonly dialogError=signal('');
  readonly dialog=signal<'subject'|'class'|''>(''); readonly editing=signal<any>(null);
  readonly search=signal(''); readonly classFilter=signal(''); readonly classSearch=signal(''); readonly page=signal(1); readonly classPage=signal(1);
  readonly label=displayClassName;
  classId='';subjectId='';teacherId='';
  readonly classes=computed<any[]>(()=> (this.api.data()?.classes??[]).filter((c:any)=>c.yearId===this.year()?.id));
  readonly visibleClasses=computed(()=>this.classes().filter(c=>!this.classFilter()||c.id===this.classFilter()));
  readonly matchingClasses=computed(()=>this.classes().filter(c=>this.label(c.name).toLowerCase().includes(this.classSearch().trim().toLowerCase())));
  readonly classPages=computed(()=>Math.max(1,Math.ceil(this.visibleClasses().length/8)));
  readonly pagedClasses=computed(()=>this.visibleClasses().slice((this.classPage()-1)*8,this.classPage()*8));
  readonly teachers=computed(()=> (this.api.data()?.members??[]).filter((m:any)=>m.role==='TEACHER'&&m.active&&m.user.enabled).map((m:any)=>({id:m.id,fullName:m.user.name,email:m.user.email})));
  readonly assignments=computed<any[]>(()=> (this.api.data()?.assignments??[]).filter((a:any)=>a.subjectId&&a.classroom.yearId===this.year()?.id&&(!this.classFilter()||a.classroomId===this.classFilter())&&`${a.membership.user.name} ${a.subject.name} ${a.classroom.name}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly pages=computed(()=>Math.max(1,Math.ceil(this.assignments().length/25)));
  readonly visibleAssignments=computed(()=>this.assignments().slice((this.page()-1)*25,this.page()*25));
  constructor(){
    effect(()=>{const context=`${this.api.schoolId()}:${this.api.role()}:${this.year()?.id}`; untracked(()=>{this.dialog.set('');this.editing.set(null);this.error.set('');this.notice.set('');this.classFilter.set('');this.classSearch.set('');this.search.set('');this.page.set(1);this.classPage.set(1);});});
    effect(()=>{if(this.page()>this.pages())this.page.set(this.pages());});
    effect(()=>{if(this.classPage()>this.classPages())this.classPage.set(this.classPages());});
  }
  selectedFilterLabel(){return this.classFilter()?this.label(this.classes().find(c=>c.id===this.classFilter())?.name??'All classes'):'All classes';}
  chooseClass(id:string, picker:HTMLDetailsElement){this.classFilter.set(id);this.classSearch.set('');this.page.set(1);this.classPage.set(1);picker.open=false;}
  classTeacher(id:string){return this.remote.data().classTeachers.find((c:any)=>c.classId===id&&!c.endedAt);}
  offeredSubjects(){return (this.api.data()?.classSubjects??[]).filter((s:any)=>s.classroomId===this.classId);}
  selectedClassName(){return this.label(this.classes().find(c=>c.id===this.classId)?.name??'');}
  openSubject(assignment:any=null){if(this.busy())return;this.editing.set(assignment);this.classId=assignment?.classroomId??this.classFilter();this.subjectId=assignment?.subjectId??'';this.teacherId=assignment?.membershipId??'';this.dialogError.set('');this.dialog.set('subject');}
  openClass(c:any){if(this.busy())return;this.editing.set(null);this.classId=c.id;this.teacherId=this.classTeacher(c.id)?.membershipId??'';this.dialogError.set('');this.dialog.set('class');}
  close(){if(this.busy())return;this.dialog.set('');this.editing.set(null);this.dialogError.set('');}
  async save(){
    if(this.busy()||!this.dialog()||!this.ready())return;
    const context=`${this.api.schoolId()}:${this.year()?.id}`, mode=this.dialog(), assignment=this.editing();
    this.busy.set(true);this.dialogError.set('');
    try{
      if(mode==='class'){
        const error=await this.remote.command('class-teacher',{classId:this.classId,teacherId:this.teacherId||null});
        if(error)throw new Error(error);
      } else {
        await this.api.write(assignment?`assignments/${assignment.id}`:'assignments',assignment?{membershipId:this.teacherId,previousMembershipId:assignment.membershipId}:{membershipId:this.teacherId,classroomId:this.classId,subjectId:this.subjectId},assignment?'PATCH':'POST');
        await this.remote.load();
      }
      if(context===`${this.api.schoolId()}:${this.year()?.id}`){this.dialog.set('');this.editing.set(null);this.notice.set('Teaching responsibilities updated.');}
    }catch(e){if(context===`${this.api.schoolId()}:${this.year()?.id}`)this.dialogError.set(this.api.auth.error(e));}
    finally{this.busy.set(false);}
  }
}
