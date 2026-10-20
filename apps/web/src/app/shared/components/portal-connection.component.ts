import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SchoolApiService } from '../../core/services/school-api.service';
@Component({selector:'app-portal-connection',standalone:true,imports:[RouterLink],template:`
  @if (api.choices().length > 1) { <label>School <select aria-label="School" [value]="api.schoolId()" (change)="api.select($any($event.target).value)">@for(s of api.choices();track s.id){<option [value]="s.id">{{s.name}}</option>}</select></label> }
  @if(api.error()){<p role="alert">{{api.error()}} <button (click)="api.refresh()">Retry</button></p>}
  @if(!api.schoolId() && !api.loading()){@if(api.auth.identity()?.platformAdmin){<p>Select a school from <a routerLink="/super-admin/schools">Schools Directory</a> to manage its records.</p>} @else {<p>No school access is available for this account. Contact your school administrator.</p>}}
  @if(api.notice()){<p role="status">{{api.notice()}}</p>}
  @if(api.data()?.members?.length === 100 || api.data()?.assignments?.length === 100){<p>Staff and teaching-assignment previews show up to 100 records. Student directories support search and pagination.</p>}
`,styles:[`:host{display:block;color:#475569}p{padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}select,button{padding:8px;border:1px solid #cbd5e1;border-radius:6px;background:white}`]})
export class PortalConnectionComponent { readonly api=inject(SchoolApiService); }
