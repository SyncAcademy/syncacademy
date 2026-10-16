import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { SchoolApiService } from './school-api.service';
import { AcademicYearService } from './academic-year.service';
import { Router, NavigationEnd } from '@angular/router';
import { academicView, marksSubmissionId } from './academic-view';
const empty = ():any => ({assessments:[],submissions:[],slots:[],syllabus:[],support:[],audit:[],reports:[],attendance:[],classTeachers:[],notifications:[],policy:null});
@Injectable({providedIn:'root'})
export class AcademicDataService {
 readonly api=inject(SchoolApiService); readonly years=inject(AcademicYearService);
 private readonly destroyRef=inject(DestroyRef);
 private readonly router=inject(Router,{optional:true});
 readonly view=signal(academicView(this.router?.getCurrentNavigation()?.extractedUrl.toString()??this.router?.url??''));
 readonly submissionId=signal(marksSubmissionId(this.router?.getCurrentNavigation()?.extractedUrl.toString()??this.router?.url??''));
 readonly year=computed(()=>this.api.role()==='TEACHER'?this.years.teacherYear():this.api.role()==='HEADMASTER'?this.years.headYear():this.years.academicYear());
 readonly context=computed(()=>`${this.api.auth.identity()?.id}:${this.api.role()}:${this.api.schoolId()}:${this.year()?.id}:${this.view()}:${this.submissionId()??''}`);
 private readonly schoolReady=computed(()=>!!this.api.data());
 private readonly allocationScope=computed(()=>JSON.stringify((this.api.data()?.assignments??[]).map((a:any)=>[a.id,a.membershipId,a.membership?.user?.id,a.classroom?.name,a.subject?.name])));
 private readonly records=signal<{key:string;value:any}>({key:'',value:empty()});
 readonly data=computed(()=>this.records().key===this.context()?this.records().value:empty());
 readonly hasData=computed(()=>this.records().key===this.context());
 readonly loading=signal(false);readonly busy=signal(false);readonly error=signal('');private generation=0;private checking=false;private checkPending=false;
 private activeLoad:{context:string;promise:Promise<void>}|null=null;
 constructor(){effect(()=>{this.context();this.schoolReady();this.allocationScope();untracked(()=>void this.load());});
  const navigation=this.router?.events.subscribe(event=>{if(event instanceof NavigationEnd){this.submissionId.set(marksSubmissionId(event.urlAfterRedirects));this.view.set(academicView(event.urlAfterRedirects));}});
  this.destroyRef.onDestroy(()=>navigation?.unsubscribe());
  effect(()=>{this.api.academicRevisionNotice();untracked(()=>void this.refreshIfChanged());});
  effect(()=>{this.api.data();untracked(()=>void this.refreshIfChanged());});
  if(typeof document!=='undefined'){
   const refresh=()=>{if(document.visibilityState==='visible')void this.refreshIfChanged();};
   const timer=window.setInterval(refresh,30000);
   document.addEventListener('visibilitychange',refresh);
   this.destroyRef.onDestroy(()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh);});
  }
 }
 private drainCheck(){if(this.checkPending&&!this.checking&&!this.activeLoad&&!this.busy()){this.checkPending=false;queueMicrotask(()=>void this.refreshIfChanged());}}
 private async refreshIfChanged(){
  if(this.checking||this.activeLoad||this.busy()){this.checkPending=true;return;}
  const context=this.context(),school=this.api.schoolId(),year=this.year()?.id;
  if(!school||!year||!this.api.data()||!['TEACHER','ACADEMIC','HEADMASTER'].includes(this.api.role()))return;
  if(!this.hasData()){await this.load(true);return;}
  this.checking=true;
  try{
   const result=await this.api.auth.request<{revision:number}>('GET',`schools/${school}/academics/revision?yearId=${year}`);
   if(context===this.context()&&result.revision!==this.records().value.workspaceRevision)await this.load(true);
  }catch{/* Keep the visible record; the next check will retry. */}
  finally{this.checking=false;this.drainCheck();}
 }
 load(silent=false):Promise<void>{
  const context=this.context();
  if(this.activeLoad?.context===context)return this.activeLoad.promise;
  const promise=this.fetch(silent);
  this.activeLoad={context,promise};
  void promise.finally(()=>{if(this.activeLoad?.promise===promise)this.activeLoad=null;this.drainCheck();});
  return promise;
 }
 private async fetch(silent=false){if(silent&&(this.loading()||this.busy()))return;const context=this.context(),school=this.api.schoolId(),year=this.year()?.id;const g=++this.generation;
 if(!school||!year||!this.api.data()||!['TEACHER','ACADEMIC','HEADMASTER'].includes(this.api.role())){this.loading.set(false);this.error.set('');return;}
 if(!silent){this.loading.set(true);this.error.set('');}try{const data=await this.api.auth.request('GET',`schools/${school}/academics?yearId=${year}${this.view()==='marks'?'&view=marks&submissionId='+this.submissionId():this.view()==='overview'?'&view=overview':''}`);if(g===this.generation&&context===this.context()){this.records.set({key:context,value:data});this.error.set('');}}
 catch(e){if(!silent&&g===this.generation&&context===this.context())this.error.set(this.api.auth.error(e));}finally{if(!silent&&g===this.generation)this.loading.set(false);}}
 private applyPatch(context:string,patch:any):boolean {
  if(!patch||context!==this.context()||this.records().key!==context||this.records().value.workspaceRevision!==patch.baseRevision||this.view()==='overview'&&!patch.overviewSafe||this.activeLoad)return false;
  if(this.view()==='marks') {
   const submissions=patch.upsert?.submissions;
   if(!patch.marksSafe||submissions?.length!==1||submissions[0].id!==this.submissionId()||!this.records().value.submissions.some((s:any)=>s.id===this.submissionId()))return false;
   this.records.set({key:context,value:{...this.records().value,submissions,workspaceRevision:patch.workspaceRevision}});
   return true;
  }
  const value={...this.records().value,...patch.replace,workspaceRevision:patch.workspaceRevision};
  for(const [key,items] of Object.entries(patch.upsert??{}) as [string,any[]][]) {
   const replacements=new Map(items.map(item=>[item.id,item]));
   value[key]=(value[key]??[]).map((item:any)=>{const replacement=replacements.get(item.id);replacements.delete(item.id);return replacement??item;}).concat([...replacements.values()]);
  }
  this.records.set({key:context,value});return true;
 }
 async command(action:string,payload:unknown):Promise<string|null>{if(this.busy())return 'A save is already in progress.';const context=this.context(),yearId=this.year()?.id;if(!yearId)return 'Select an academic year.';const revision=this.records().key===context?this.records().value.workspaceRevision:undefined;const priorLoad=this.activeLoad?.promise;this.busy.set(true);try{const result=await this.api.write('academics/commands',{yearId,action,payload,...(this.view()==='marks'?{view:'marks'}:{})},'POST',undefined,['class','delete-class','copy-classes','class-teacher'].includes(action));if(!this.applyPatch(context,result.patch)&&context===this.context()&&this.records().value.workspaceRevision===revision){const staleLoad=!!priorLoad&&this.activeLoad?.promise===priorLoad;await this.load();if(staleLoad&&this.records().value.workspaceRevision===revision)await this.load();}return null;}catch(e){return this.api.auth.error(e);}finally{this.busy.set(false);this.drainCheck();}}
}
