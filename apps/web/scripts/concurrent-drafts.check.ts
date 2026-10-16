import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { RendererFactory2, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TeacherStore } from '../src/app/features/teacher/teacher.store';
import { TeacherMarksPage } from '../src/app/features/teacher/pages/teacher-marks/teacher-marks.page';
import { TeacherClassPage } from '../src/app/features/teacher/teacher-class.page';
import { TeacherClassStore } from '../src/app/features/teacher/teacher-class.store';
import { StudentSubjectsPage } from '../src/app/features/academic/student-subjects.page';
import { SchoolApiService } from '../src/app/core/services/school-api.service';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
const baseProviders = [
  {provide: DOCUMENT, useValue: {body:null,querySelectorAll:()=>[]}},
  {provide: RendererFactory2, useValue: {begin(){},end(){},whenRenderingDone:()=>Promise.resolve()}},
];
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const assignments = signal<any[]>([{id:'submission',revision:3,assessmentId:'exam',assessmentStatus:'open',rosterStatus:'confirmed',assessmentProgress:{status:'draft'}}]);
const rows = signal<any[]>([{studentId:'student',fullName:'Student',studentNumber:'001',marksValue:70,noMark:false,comments:''}]);
const calls:any[]=[];
let serverRevision=3, conflict=false;
const marksStore = {
  entries:()=>rows(),assignments,readOnly:()=>false,grade:()=> 'A',api:{loading:()=>false},
  remote:{loading:()=>false,load:async()=>{},error:()=>''},
  save:async(_id:string,_rows:any[],revision:number)=>{calls.push({action:'save',revision}); if(conflict||revision!==serverRevision)return 'Marks changed in another session. Reload before saving.'; serverRevision++; return null;},
  submit:async(_id:string,revision:number)=>{calls.push({action:'submit',revision});return revision===serverRevision?null:'Submission changed.';}
};
TestBed.configureTestingModule({providers:[...baseProviders,{provide:TeacherStore,useValue:marksStore},{provide:ActivatedRoute,useValue:{snapshot:{paramMap:{get:()=> 'submission'}}}}]});
const marks=TestBed.runInInjectionContext(()=>new TeacherMarksPage());marks.ngOnInit();TestBed.flushEffects();
marks.onMarkChange('student','81');serverRevision=4;assignments.set([{...assignments()[0],revision:4}]);rows.set([{...rows()[0],marksValue:95}]);TestBed.flushEffects();
assert.equal(marks.marks()[0].marksValue,81,'live refresh preserves the losing draft');
assert.equal(marks.draftRevision(),3);
assert.equal(await marks.save(),false);assert.equal(calls.at(-1).revision,3);assert.equal(marks.dirty(),true);
await marks.discard();marks.onMarkChange('student','83');assert.equal(await marks.save(),true);assert.equal(marks.draftRevision(),5);
marks.onMarkChange('student','84');assert.equal(await marks.save(),true);assert.equal(calls.at(-1).revision,5,'repeat save uses committed draft revision');
marks.onMarkChange('student','85');await marks.confirmSubmit();assert.deepEqual(calls.slice(-2),[{action:'save',revision:6},{action:'submit',revision:7}]);assert.equal(marks.submitted(),true);
// A newer snapshot arriving inside save must never authorize an old draft with its revision.
marksStore.save=async(_id,_rows,revision)=>{calls.push({action:'save',revision});serverRevision=revision+2;assignments.set([{...assignments()[0],revision:serverRevision}]);TestBed.flushEffects();return null;};
marks.onMarkChange('student','86');assert.equal(await marks.save(),true);assert.equal(marks.draftRevision(),8,'advance exactly the accepted mutation, not a later snapshot');
TestBed.resetTestingModule();

const schoolId=signal('school'), year=signal<any>({id:'year',startDate:'2026-01-01',terms:[]});
const saved=signal<any[]>([]);const attendanceCalls:any[]=[];
let attendanceVersion=0;
const roster=[{studentId:'student',student:'Student',number:'001'}];
const attendance={roster:()=>roster,remote:{load:async()=>{},error:()=>''},save:async(classId:string,date:string,entries:any[],reason:string,revision:number)=>{attendanceCalls.push({classId,date,entries,reason,revision});if(revision!==attendanceVersion)return 'Attendance changed. Reload before correcting.';attendanceVersion++;return null;}};
const classStore={year,classes:()=>[{id:'class',name:'Class'}],assessments:()=>[],attendance,teacher:{readOnly:()=>false,api:{schoolId,auth:{identity:()=>({id:'teacher'})}}},sheets:saved,attendanceHistory:saved,roster:()=>[],ownAssignments:()=>[],results:()=>[],reports:()=>[]};
TestBed.configureTestingModule({providers:[...baseProviders,{provide:TeacherClassStore,useValue:classStore},{provide:AcademicYearService,useValue:{}},{provide:ActivatedRoute,useValue:{data:of({section:'attendance'})}}]});
const page=TestBed.runInInjectionContext(()=>new TeacherClassPage());TestBed.flushEffects();
page.setAttendance('student','status','Absent');attendanceVersion=1;saved.set([{classId:'class',date:page.date(),revision:1,entries:[{...roster[0],status:'Present'}]}]);TestBed.flushEffects();
assert.equal(page.entries['student']?.status,'Absent');await page.save();assert.equal(attendanceCalls.at(-1).revision,0);assert.equal(page.attendanceDirty(),true);
const date=page.date();page.selectDate('2026-01-01');assert.equal(page.date(),date,'date switching cannot relabel a draft');page.selectClass('other');assert.equal(page.classId(),'');
await page.discardAttendance();page.setAttendance('student','status','Late');page.setReason('Corrected after reviewing the register.');await page.save();assert.equal(attendanceCalls.at(-1).revision,1);assert.equal(page.attendanceDirty(),false);
page.setAttendance('student','status','Present');page.setReason('Second verified attendance correction.');await page.save();assert.equal(attendanceCalls.at(-1).revision,2,'repeated attendance saves advance their own version');
TestBed.resetTestingModule();

const notices=signal(0), student={enrollmentId:'enrollment',version:4,studentId:'student',name:'Student',admissionNumber:'001',subjectIds:['math']};
let latest={...student};const subjectWrites:any[]=[];
const api={schoolId,role:()=> 'ACADEMIC',schoolRevisionNotice:notices,auth:{request:async()=>({classes:[{id:'class',name:'Class',subjects:[]}],students:[latest],total:1,year:{}}),error:(e:any)=>e.message},write:async(_path:string,payload:any)=>{subjectWrites.push(payload);if(payload.version!==latest.version)throw new Error('Record changed.');latest={...latest,version:latest.version+1};}};
TestBed.configureTestingModule({providers:[...baseProviders,{provide:SchoolApiService,useValue:api},{provide:AcademicYearService,useValue:{selected:()=>year()}},{provide:ActivatedRoute,useValue:{data:of({audience:'academic'})}}]});
const subjects=TestBed.runInInjectionContext(()=>new StudentSubjectsPage());TestBed.flushEffects();await tick();await subjects.openClass('class');subjects.startEditing(student);subjects.toggleSubject('science');
latest={...student,version:5,subjectIds:['history']};notices.set(1);TestBed.flushEffects();await tick();await subjects.saveSubjects(latest);
assert.equal(subjectWrites[0].version,4,'refreshed list cannot lend its version to an older draft');assert.deepEqual(subjects.editingSubjects(),['math','science']);assert.equal(subjects.editingEnrollmentId(),'enrollment');
subjects.cancelEditing();subjects.startEditing(latest);await subjects.saveSubjects(latest);assert.equal(subjectWrites.at(-1).version,5);assert.equal(subjects.editingEnrollmentId(),'');
TestBed.resetTestingModule();
console.log('Draft checks passed: conflict preservation, repeat saves, save-then-submit, date/class guards, and refreshed subject versions.');
