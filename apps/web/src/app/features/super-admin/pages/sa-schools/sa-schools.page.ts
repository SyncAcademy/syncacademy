import { requestId } from '../../../../core/services/request-id';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SaEditorComponent, EditorField } from '../../components/sa-editor.component';
import { SuperAdminStore, PlatformSchool } from '../../super-admin.store';
import { EXPIRY_OPTIONS } from '../../../headmaster/head.models';

@Component({
  selector: 'app-sa-schools',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SaEditorComponent],
  templateUrl: './sa-schools.page.html',
  styleUrls: ['./sa-schools.page.scss', '../../sa-workflows.scss'],
})
export class SaSchoolsPage {
  store = inject(SuperAdminStore);
  readonly money = this.store.money.bind(this.store);
  readonly timeSince = this.store.timeSince.bind(this.store);

  search = this.store.schoolSearch;
  statusFilter = this.store.schoolStatus;
  planFilter = signal('');
  typeFilter = signal('');

  readonly filteredSchools = computed(() => this.store.schools());
  private searchTimer?: ReturnType<typeof setTimeout>;
  filter(value:string,kind:'search'|'status'){(kind==='search'?this.search:this.statusFilter).set(value);this.store.page.set(1);clearTimeout(this.searchTimer);this.searchTimer=setTimeout(()=>void this.store.loadSchools().catch(e=>this.store.storageError.set(this.store.auth.error(e))),kind==='search'?250:0);}

  readonly totalStudents = computed(() => this.filteredSchools().reduce((s, x) => s + x.students, 0));
  readonly totalStaff = computed(() => this.filteredSchools().reduce((s, x) => s + x.staff, 0));
  readonly totalRevenue = computed(() => this.filteredSchools().reduce((s, x) => s + this.store.monthlyRevenue(x.id), 0));

  @ViewChild('schoolDetails') schoolDetails?: ElementRef<HTMLElement>;
  selectSchool(id: string): void { this.selectedId.set(id); setTimeout(() => this.schoolDetails?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  selectedId = signal('');
  selected = computed(() => this.store.schools().find(s => s.id === this.selectedId()));
  regions = computed(() => [...new Set(this.store.activeSchools().map(s => s.location))].map(region => ({ region, count: this.store.activeSchools().filter(s => s.location === region).length })));
  editor: { title: string; fields: EditorField[]; values: Record<string, any>; mode: string } | null = null;
  readonly invitationExpiryChoices = EXPIRY_OPTIONS.map(option => ({ value: String(option.minutes), label: option.label }));
  schoolFields:EditorField[]=[{key:'name',label:'School name',required:true},{key:'code',label:'Unique school code',required:true},{key:'region',label:'Region',required:true},{key:'headmasterName',label:'Headmaster name',required:true},{key:'headmasterEmail',label:'Headmaster email',type:'email',required:true},{key:'headmasterExpiresInMinutes',label:'Headmaster invitation expires after',choices:this.invitationExpiryChoices,required:true}];
  openSchool(school?:PlatformSchool):void { this.error=''; this.selectedId.set(''); this.editor={title:'Register school and invite Headmaster',mode:'school',fields:this.schoolFields,values:{headmasterExpiresInMinutes:'2880'}}; }
  changeStatus(): void {
    const school = this.selected(); if (!school) return;
    this.editor = { title: school.status === 'suspended' ? 'Reactivate school' : 'Suspend school', mode: 'status', fields: [{ key: 'reason', label: 'Reason for this change', required: true }], values: {} };
  }
  saving=false; error=''; private saveKey=''; private fingerprint=''; async save(values:Record<string,any>):Promise<void>{if(this.saving)return;this.saving=true;this.error='';try{if(this.editor?.mode==='status'){await this.store.setSchoolStatus(this.selectedId(),this.selected()?.status==='suspended'?'active':'suspended',values['reason']);}else{const fp=JSON.stringify(values);if(fp!==this.fingerprint){this.fingerprint=fp;this.saveKey=requestId();}const r=await this.store.auth.request('POST','schools',values,this.saveKey);this.selectedId.set(r.school.id);await this.store.load();}this.editor=null;}catch(e){this.error=this.store.auth.error(e);}finally{this.saving=false;}}
  constructor(){inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe(params=>{const q=params.get('q')||'';const status=params.get('status')||'';if(q!==this.search()||status!==this.statusFilter()){this.search.set(q);this.statusFilter.set(status);this.store.page.set(1);void this.store.loadSchools().catch(e=>this.store.storageError.set(this.store.auth.error(e)));}});}
}
