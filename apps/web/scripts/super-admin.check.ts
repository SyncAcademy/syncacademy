import 'zone.js/node';
import '@angular/compiler';
import assert from 'node:assert/strict';
import { DOCUMENT } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { AuthService } from '../src/app/core/services/auth.service';
import { PlatformRealtimeService } from '../src/app/core/services/platform-realtime.service';
import { SuperAdminStore } from '../src/app/features/super-admin/super-admin.store';
import { WorkspacePage } from '../src/app/features/live/workspace.page';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
Object.defineProperty(globalThis, 'document', { value: { body: null, head: null, querySelectorAll: () => [], createElement: () => ({ style: {}, setAttribute: () => {} }) }, configurable: true });
const identity = signal<any>({ id: 'admin', platformAdmin: true });
const calls: {method:string;route:string;body:any}[] = [];
let lead: any = null;
let settings: {platformName:string;supportEmail:string;maintenanceMessage:string} | null = {platformName:'SyncAcademy',supportEmail:'',maintenanceMessage:''};
let summaryGate: Promise<any> | null = null;
let failSettings = false;
let failAudit = false;
const auth = {identity, error:(e:unknown)=>String(e), async request(method:string,route:string,body?:any) {
  calls.push({method,route,body});
  if (route.startsWith('schools?page=')) return {items:[],total:0};
  if (route==='schools/school-1/workspace?view=summary') return {
    school:{id:'school-1',name:'Example School',code:'EX-1',region:'Arusha'},
    years:[{id:'year-1',name:'2026',closed:false}],
    classes:[{id:'class-1',name:'Class 1',yearId:'year-1',year:{name:'2026',closed:false},_count:{enrollments:26}}],
    subjects:[],members:[],assignments:[],studentCount:26,
    permissions:{staffManager:true,registrar:true,academic:true},
  };
  if (route.startsWith('schools/school-1/registry/students?')) return {
    items:[{id:'student-1',name:'Amina Student',admissionNumber:'EX-001'}],total:30,page:1,pageSize:25,
  };
  if (route.startsWith('schools/school-1/teacher-assignments?')) return {
    year:{id:'year-1',name:'2026',closed:false},
    items:[{id:'teacher-1',name:'Amina Teacher',role:'TEACHER',status:'active',classTeacherClasses:[{id:'class-1',name:'Class 1'}],teachingAssignments:[{id:'subject-1',name:'Civics',classes:[{id:'class-1',name:'Class 1'}]}]}],
    total:40,page:1,pageSize:20,
  };
  if (route.startsWith('audit?')) { if (failAudit) throw new Error('Audit temporarily unavailable'); return {items:[],total:0}; }
  if (route==='platform/summary' && summaryGate) return summaryGate;
  if (route==='platform/summary') return {schools:0,activeSchools:0,students:0,staff:0,pendingInvitations:0,admins:[]};
  if (route.startsWith('platform/leads?') && method==='GET') return {items:lead?[lead]:[],total:lead?1:0,stages:lead?{[lead.status]:1}:{}};
  if (route==='platform/settings' && method==='GET') { if (failSettings) throw new Error('Settings temporarily unavailable'); return settings; }
  if (route==='platform/leads' && method==='POST') {lead={...body,id:'lead-1'};return lead;}
  if (route==='platform/leads/lead-1' && method==='PATCH') {lead={...lead,...body};return lead;}
  if (route==='platform/leads/lead-1/convert') {lead.convertedSchoolId='school-1';return {school:{id:'school-1'}};}
  if (route==='platform/settings' && method==='PATCH') {settings=body;return settings;}
  throw new Error(`Unexpected ${method} ${route}`);
}};
TestBed.configureTestingModule({providers:[
  {provide:PlatformRealtimeService,useValue:{revision:signal(0),select:()=>{}}},
  {provide:AuthService,useValue:auth},
  {provide:DOCUMENT,useValue:{body:null,querySelectorAll:()=>[]}},
  {provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:{get:()=>null},data:{}}}},
  {provide:Router,useValue:{navigateByUrl:async()=>true}},
]});
const store=TestBed.inject(SuperAdminStore);
await store.load();
assert.equal(store.schools().length,0);
assert.equal(store.leads().length,0);
settings = null;
await store.load();
assert.equal(store.summary()?.schools, 0, 'Missing settings must not hide dashboard totals');
assert.equal(store.settings().platformName, 'SyncAcademy');
assert.equal(store.storageError(), '');
failSettings = true; failAudit = true;
store.summary.set(null);
await store.load();
assert.equal(store.summary()?.students, 0, 'Independent request failures must not discard successful totals');
assert.match(store.storageError(), /Platform settings:.*Audit log:/);
assert.equal(store.summaryError(), '');
assert.equal(store.loading(), false);
failSettings = false; failAudit = false;
await store.load();
assert.equal(store.storageError(), '');
assert.equal(store.schoolPageCount(), 1);
await store.nextPage(1);
assert.equal(store.page(), 1, 'Next must not navigate beyond the final page');
await store.nextPage(-1);
assert.equal(store.page(), 1, 'Previous must not navigate before the first page');
const values={schoolName:'Test School',contactName:'Test Head',contactEmail:'head@example.test',contactPhone:'',location:'Arusha',source:'referral',status:'new',studentCount:50,notes:'',owner:'',followUp:''};
await store.saveLead(values);
assert.equal(store.leads()[0].schoolName,'Test School');
await store.saveLead({...values,status:'won'},'lead-1');
assert.equal(store.leads()[0].status,'won');
await store.convertLead('lead-1','TEST-SCHOOL',2880);
assert.equal(store.leads()[0].convertedSchoolId,'school-1');
await store.saveSettings({platformName:'New Name',supportEmail:'support@example.test',maintenanceMessage:''});
assert.equal(store.settings().platformName,'New Name');
assert.ok(calls.some(c=>c.method==='POST' && c.route==='platform/leads/lead-1/convert'));
const workspace=TestBed.runInInjectionContext(()=>new WorkspacePage());
workspace.schoolId='school-1';
await workspace.load();
assert.equal(workspace.workspace?.classes[0]._count.enrollments,26);
assert.ok(calls.some(c=>c.method==='GET'&&c.route==='schools/school-1/workspace?view=summary'));
assert.equal(calls.some(c=>c.route.startsWith('schools/school-1/registry/students?')),false,'student records must not load before selecting a class');
await workspace.openClassStudents('class-1');
assert.equal(workspace.classStudents[0].admissionNumber,'EX-001');
const rosterRequest=[...calls].reverse().find(c=>c.route.startsWith('schools/school-1/registry/students?'));
assert.ok(rosterRequest);
const rosterQuery=new URLSearchParams(rosterRequest.route.split('?')[1]);
assert.equal(rosterQuery.get('yearId'),'year-1');
assert.equal(rosterQuery.get('classId'),'class-1');
assert.equal(rosterQuery.get('status'),'active');
assert.equal(rosterQuery.get('pageSize'),'25');
workspace.studentSearch='Amina';
await workspace.loadClassStudents();
const searchRequest=[...calls].reverse().find(c=>c.route.startsWith('schools/school-1/registry/students?'));
assert.ok(searchRequest);
assert.equal(new URLSearchParams(searchRequest.route.split('?')[1]).get('q'),'Amina',searchRequest.route);
await workspace.changeStudentPage(1);
const nextPageRequest=[...calls].reverse().find(c=>c.route.startsWith('schools/school-1/registry/students?'));
assert.ok(nextPageRequest);
assert.equal(new URLSearchParams(nextPageRequest.route.split('?')[1]).get('page'),'2');
await workspace.changeTab('classes');
let assignmentRequest=[...calls].reverse().find(c=>c.route.startsWith('schools/school-1/teacher-assignments?'));
assert.ok(assignmentRequest);
let assignmentQuery=new URLSearchParams(assignmentRequest.route.split('?')[1]);
assert.equal(assignmentQuery.get('yearId'),'year-1');
assert.equal(assignmentQuery.get('pageSize'),'20');
assert.equal(workspace.teacherAssignments[0].classTeacherClasses.length,1);
workspace.teacherAssignmentPage=3;
workspace.teacherAssignmentRole='class_teacher';
await workspace.filterTeacherAssignments();
assert.equal(workspace.teacherAssignmentPage,1,'filter changes reset teacher pagination');
assignmentRequest=[...calls].reverse().find(c=>c.route.startsWith('schools/school-1/teacher-assignments?'));
assignmentQuery=new URLSearchParams(assignmentRequest.route.split('?')[1]);
assert.equal(assignmentQuery.get('role'),'class_teacher');
assert.equal(assignmentQuery.get('page'),'1');
workspace.teacherAssignmentPage=2;
await workspace.changeTeacherAssignmentPageSize(12);
assert.equal(workspace.teacherAssignmentPage,1,'page-size changes reset teacher pagination');
assignmentRequest=[...calls].reverse().find(c=>c.route.startsWith('schools/school-1/teacher-assignments?'));
assignmentQuery=new URLSearchParams(assignmentRequest.route.split('?')[1]);
assert.equal(assignmentQuery.get('pageSize'),'12');
assert.equal(assignmentQuery.get('role'),'class_teacher');
await workspace.changeTeacherAssignmentPage(1);
assignmentRequest=[...calls].reverse().find(c=>c.route.startsWith('schools/school-1/teacher-assignments?'));
assert.equal(new URLSearchParams(assignmentRequest.route.split('?')[1]).get('page'),'2');
await workspace.resetTeacherAssignmentFilters();
assert.equal(workspace.teacherAssignmentRole,'all');
assert.equal(workspace.teacherAssignmentPage,1);
TestBed.flushEffects();
let release!: (value:any)=>void;
summaryGate = new Promise(resolve=>release=resolve);
const loading = store.load();
identity.set(null); TestBed.flushEffects();
release({schools:999,students:999,admins:[{id:'private',name:'Private',email:'private@example.test'}]});
await loading;
assert.equal(store.summary(),null,'late platform responses cannot restore data after logout');
assert.deepEqual(store.admins(),[]);
TestBed.resetTestingModule();
console.log('Super Admin checks passed: persisted lead workflow, class-scoped rosters, unique-teacher pagination, conversion and preferences.');
