import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { RendererFactory2, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { SchoolSetupStore } from '../src/app/features/headmaster/school-setup.store';
import { SchoolApiService } from '../src/app/core/services/school-api.service';
import { AcademicYearService } from '../src/app/core/services/academic-year.service';
import { AcademicDataService } from '../src/app/core/services/academic-data.service';

const year=signal<{id:string;label:string}|undefined>(undefined);
const workspace=signal<any>(null);
const academic=signal<any>({policy:{revision:1}});
TestBed.initTestEnvironment(BrowserDynamicTestingModule,platformBrowserDynamicTesting());
TestBed.configureTestingModule({providers:[
  {provide:DOCUMENT,useValue:{body:null,querySelectorAll:()=>[]}},
  {provide:RendererFactory2,useValue:{begin(){},end(){},whenRenderingDone:()=>Promise.resolve()}},
  {provide:SchoolApiService,useValue:{data:workspace}},
  {provide:AcademicYearService,useValue:{headYear:year}},
  {provide:AcademicDataService,useValue:{data:academic}},
]});
const store=TestBed.inject(SchoolSetupStore);
assert.equal(store.steps().length,7);
assert.equal(store.complete(),0,'loading must not claim school setup is complete');
year.set({id:'year-1',label:'2026'});
workspace.set({school:{name:'Example School',code:'EX-01',region:'Kigoma'},classes:[{id:'class-1',yearId:'year-1',_count:{enrollments:1}}],members:[{role:'TEACHER',active:true,user:{enabled:true}}],classSubjects:[{classroomId:'class-1',subjectId:'math'}],assignments:[{classroomId:'class-1',subjectId:'math',membership:{active:true,user:{enabled:true}}}]});
assert.equal(store.profile()?.name,'Example School');
assert.equal(store.steps().find(s=>s.id==='classes')?.done,true);
assert.equal(store.steps().find(s=>s.id==='staff')?.done,true);
assert.equal(store.steps().find(s=>s.id==='assignments')?.done,true);
assert.equal(store.steps().find(s=>s.id==='students')?.done,true);
assert.equal(store.steps().find(s=>s.id==='grading')?.done,false,'default grading requires review');
academic.set({policy:{revision:2}});
assert.equal(store.steps().find(s=>s.id==='grading')?.done,true);
year.set({id:'year-2',label:'2027'});
assert.equal(store.steps().find(s=>s.id==='classes')?.done,false,'class setup is scoped to selected year');
assert.equal(store.steps().find(s=>s.id==='school')?.done,true,'school profile survives year switch');
TestBed.resetTestingModule();
console.log('School setup checks passed: live completion, grading revision and year scoping.');
