import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { SchoolApiService } from './school-api.service';
import { AcademicYearService } from './academic-year.service';
const empty = ():any => ({assessments:[],submissions:[],slots:[],syllabus:[],support:[],audit:[],reports:[],attendance:[],classTeachers:[],notifications:[],policy:null});
@Injectable({providedIn:'root'})
export class AcademicDataService {
 readonly api=inject(SchoolApiService); readonly years=inject(AcademicYearService);
 private readonly destroyRef=inject(DestroyRef);
 readonly year=computed(()=>this.api.role()==='TEACHER'?this.years.teacherYear():this.api.role()==='HEADMASTER'?this.years.headYear():this.years.academicYear());
 readonly context=computed(()=>`${this.api.auth.identity()?.id}:${this.api.role()}:${this.api.schoolId()}:${this.year()?.id}`);
 private readonly records=signal<{key:string;value:any}>({key:'',value:empty()});
 readonly data=computed(()=>this.records().key===this.context()?this.records().value:empty());
 readonly hasData=computed(()=>this.records().key===this.context());
 readonly loading=signal(false);readonly busy=signal(false);readonly error=signal('');private generation=0;
 constructor(){effect(()=>{this.context();this.api.data();untracked(()=>void this.load());});
  if(typeof document!=='undefined'){
   const refresh=()=>{if(document.visibilityState==='visible')void this.load(true);};
   const timer=window.setInterval(refresh,30000);
   document.addEventListener('visibilitychange',refresh);
   this.destroyRef.onDestroy(()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh);});
  }
 }
 async load(silent=false){if(silent&&(this.loading()||this.busy()))return;const context=this.context(),school=this.api.schoolId(),year=this.year()?.id;const g=++this.generation;
 if(!school||!year||!this.api.data()||!['TEACHER','ACADEMIC','HEADMASTER'].includes(this.api.role())){this.loading.set(false);this.error.set('');return;}
 if(!silent){this.loading.set(true);this.error.set('');}try{const data=await this.api.auth.request('GET',`schools/${school}/academics?yearId=${year}`);if(g===this.generation&&context===this.context()){this.records.set({key:context,value:data});this.error.set('');}}
 catch(e){if(!silent&&g===this.generation&&context===this.context())this.error.set(this.api.auth.error(e));}finally{if(!silent&&g===this.generation)this.loading.set(false);}}
 async command(action:string,payload:unknown):Promise<string|null>{if(this.busy())return 'A save is already in progress.';const context=this.context(),yearId=this.year()?.id;if(!yearId)return 'Select an academic year.';this.busy.set(true);try{await this.api.write('academics/commands',{yearId,action,payload});if(context===this.context())await this.load();return null;}catch(e){return this.api.auth.error(e);}finally{this.busy.set(false);}}
}
