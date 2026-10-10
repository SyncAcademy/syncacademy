import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicDataService } from '../../core/services/academic-data.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
@Component({selector:'app-teacher-work',standalone:true,imports:[CommonModule],template:`
<h2>Teaching planner</h2><p>Exam dates, submission deadlines and syllabus topics for your assigned work.</p>
@if(remote.loading()){<p role="status">Loading planner...</p>}
@if(error()){<p class="portal-notice portal-notice--error" role="alert">{{error()}}</p>}
@if(notice()){<p class="portal-notice" role="status">{{notice()}}</p>}
<section class="panel"><h3>Assessment deadlines</h3><div class="table-scroll"><table><thead><tr><th>Assessment</th><th>Period</th><th>Deadline</th><th>Status</th></tr></thead><tbody>@for(a of remote.data().assessments;track a.id){<tr><td>{{a.name}}</td><td>{{years.termName('teacher', a.term)}}</td><td>{{a.deadline}}</td><td>{{a.status}}</td></tr>}@empty{<tr><td colspan="4">No assessments scheduled.</td></tr>}</tbody></table></div></section>
<section class="panel"><h3>Exam timetable</h3><div class="table-scroll"><table><thead><tr><th>Date / time</th><th>Class</th><th>Subject</th><th>Room</th><th>Invigilator</th></tr></thead><tbody>@for(s of remote.data().slots;track s.id){<tr><td>{{s.date}} {{s.start}} - {{s.end}}</td><td>{{s.className}}</td><td>{{s.subject}}</td><td>{{s.room}}</td><td>{{s.teacher}}</td></tr>}@empty{<tr><td colspan="5">No exams scheduled for your classes.</td></tr>}</tbody></table></div></section>
<section class="panel"><h3>Syllabus progress</h3>@for(t of remote.data().syllabus;track t.id){<div class="support-row"><div><strong>{{t.topic}}</strong><p>Target completion: {{t.due}}</p></div><button class="action-btn" [disabled]="remote.busy()" (click)="toggleTopic(t.id)">{{t.completed?'Completed - reopen':'Mark completed'}}</button></div>}@empty{<p>No syllabus topics assigned yet.</p>}</section>
`,styleUrls:['../academic/academic.page.scss']})
export class TeacherWorkPage {
  readonly remote=inject(AcademicDataService);
  readonly years=inject(AcademicYearService);
  readonly error=signal(''); readonly notice=signal('');
  async toggleTopic(id:string):Promise<void>{
    if(this.remote.busy())return;
    this.error.set('');this.notice.set('');
    const error=await this.remote.command('toggle-topic',{id});
    if(error)this.error.set(error);else this.notice.set('Syllabus progress updated.');
  }
}
