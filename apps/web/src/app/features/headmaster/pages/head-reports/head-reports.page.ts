import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';
import { ReportStore, reportAverage } from '../../report.store';
import { DialogFocusDirective } from '../../../../shared/directives/dialog-focus.directive';
@Component({selector:'app-head-reports',standalone:true,imports:[CommonModule,FormsModule,HeadPageHeaderComponent,DialogFocusDirective],templateUrl:'./head-reports.page.html',styleUrls:['../../../academic/academic.page.scss'],styles:[`
  .report-class-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:12px}
  .report-class-card{display:grid;gap:9px;min-width:0;padding:15px;border:1px solid #e2e8f0;border-radius:11px;background:linear-gradient(145deg,#fff,#fbfcfe);color:#27364b;text-align:left;cursor:pointer;box-shadow:0 3px 12px #17233808}
  .report-class-card:hover{border-color:#d5a16a;box-shadow:0 8px 20px #17233810}
  .report-class-card strong{color:#172338;font-size:.95rem;overflow-wrap:anywhere}
  .report-class-card span{color:#64748b;font-size:.78rem}
  .report-class-card .view-label{color:#92400e;font-weight:650}
  .class-view-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 14px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:11px;background:#fff}
  .class-view-toolbar h3{margin:3px 0 0}
  @media(max-width:520px){.report-class-grid{grid-template-columns:1fr}}
  @media print{:host > :not(.printable){display:none!important}.no-print{display:none!important}}
`]})
export class HeadReportsPage {
 readonly reportAverage = reportAverage;
 readonly store=inject(ReportStore);readonly search=signal('');readonly className=signal('');readonly selected=signal('');
 readonly matchingReports=computed(()=>this.store.reports().filter(r=>`${r.student} ${r.studentNumber} ${r.className} ${r.period}`.toLowerCase().includes(this.search().trim().toLowerCase())));
 readonly classCards=computed(()=>[...new Set(this.matchingReports().map(r=>r.className))].sort().map(name=>{const items=this.matchingReports().filter(r=>r.className===name);return{name,count:items.length,pending:items.filter(r=>r.status==='generated').length};}));
 readonly reports=computed(()=>this.matchingReports().filter(r=>!this.className()||r.className===this.className()));
 readonly page=signal(1);readonly pages=computed(()=>Math.max(1,Math.ceil(this.reports().length/25)));
 readonly visible=computed(()=>this.reports().slice((this.page()-1)*25,this.page()*25));
 readonly report=computed(()=>this.store.reports().find(r=>r.id===this.selected()));
 chooseClass(name:string){this.className.set(name);this.page.set(1);}
 close(){this.selected.set('');}print(){window.print();}
}
