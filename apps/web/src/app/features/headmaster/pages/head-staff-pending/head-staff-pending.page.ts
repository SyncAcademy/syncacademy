import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeadStore } from '../../head.store';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { STAFF_ROLE_LABELS } from '../../head.models';

@Component({selector:'app-head-staff-pending',standalone:true,imports:[CommonModule,FormsModule,RouterLink,HeadPageHeaderComponent],templateUrl:'./head-staff-pending.page.html',styleUrls:['../../../academic/academic.page.scss','./head-staff-pending.page.scss']})
export class HeadStaffPendingPage {
 readonly store=inject(HeadStore);
 readonly roles=STAFF_ROLE_LABELS;
 readonly pending=computed(()=>this.store.invitations().filter(i=>i.status==='active'&&Date.parse(i.expiresAt)>Date.now()));
 readonly search=signal('');readonly page=signal(1);
 readonly filtered=computed(()=>this.pending().filter(i=>`${i.name} ${i.email} ${this.roles[i.role]}`.toLowerCase().includes(this.search().toLowerCase())));
 readonly pages=computed(()=>Math.max(1,Math.ceil(this.filtered().length/25)));
 readonly visible=computed(()=>this.filtered().slice((this.page()-1)*25,this.page()*25));
 readonly busy=signal('');readonly error=signal('');readonly notice=signal('');
 async action(id:string,kind:'resend'|'revoke'){if(this.busy())return;this.busy.set(id);this.error.set('');this.notice.set('');try{await this.store.api.write('invitations/'+id+'/'+kind,{});this.notice.set(kind==='resend'?'A fresh invitation was queued for email delivery.':'Invitation revoked.');}catch(e){this.error.set(this.store.api.auth.error(e));}finally{this.busy.set('');}}
}
