import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { RendererFactory2, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { ClassTeacherService, ClassTeacherAssignment } from '../src/app/core/services/class-teacher.service';
import { AcademicDataService } from '../src/app/core/services/academic-data.service';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';
import { HeadStore } from '../src/app/features/headmaster/head.store';

const classes=signal([{id:'class-1',academicYearId:'year-1',name:'Form 1A'}, {id:'class-2',academicYearId:'year-2',name:'Form 2A'}]);
const classTeachers=signal<ClassTeacherAssignment[]>([]);
const commands: unknown[]=[];
const remote={data:()=>({classTeachers:classTeachers()}),command:async(action:string,payload:unknown)=>{commands.push({action,payload});return null;}};
TestBed.initTestEnvironment(BrowserDynamicTestingModule,platformBrowserDynamicTesting());
TestBed.configureTestingModule({providers:[
  {provide:DOCUMENT,useValue:{body:null,querySelectorAll:()=>[]}},
  {provide:RendererFactory2,useValue:{begin(){},end(){},whenRenderingDone:()=>Promise.resolve()}},
  {provide:HeadStore,useValue:{classes}},
  {provide:AcademicYearService,useValue:{}},
  {provide:AcademicDataService,useValue:remote},
]});
const roles=TestBed.inject(ClassTeacherService);
assert.equal(roles.classesFor('teacher-1','year-1').length,0,'subject teacher has no class privileges by default');
assert.equal(await roles.assign('class-1','membership-1'),null);
assert.deepEqual(commands[0],{action:'class-teacher',payload:{classId:'class-1',teacherId:'membership-1'}});
classTeachers.set([{id:'assignment-1',yearId:'year-1',classId:'class-1',teacherId:'teacher-1',membershipId:'membership-1',teacherName:'Teacher One',at:'2026-01-01'}]);
assert.equal(roles.classesFor('teacher-1','year-1').length,1,'class role grants class view');
assert.equal(roles.classesFor('teacher-1','year-2').length,0,'class role stays in its year');
assert.equal(roles.forClass('class-1','year-1')?.membershipId,'membership-1','edit form can preselect current teacher');
classTeachers.set([{...classTeachers()[0],endedAt:'2026-10-07'},{id:'assignment-2',yearId:'year-1',classId:'class-1',teacherId:'teacher-2',membershipId:'membership-2',teacherName:'Teacher Two',at:'2026-10-07'}]);
assert.equal(roles.classesFor('teacher-1','year-1').length,0,'replacement revokes class view');
assert.equal(roles.classesFor('teacher-2','year-1').length,1,'replacement gains class view');
await roles.assign('class-1','');
assert.deepEqual(commands.at(-1),{action:'class-teacher',payload:{classId:'class-1',teacherId:null}},'clearing teacher sends null');
TestBed.resetTestingModule();
console.log('Class teacher checks passed: assignment payload, year scope, preselection, replacement and clearing.');
