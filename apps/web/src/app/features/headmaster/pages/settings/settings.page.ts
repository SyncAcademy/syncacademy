import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { AcademicDataService } from '../../../../core/services/academic-data.service';
import { AcademicYearService } from '../../../../core/services/academic-year.service';
import { DEFAULT_GRADING, GradeBand } from '../../../../core/services/grading-policy.service';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';

@Component({selector:'app-settings',standalone:true,imports:[CommonModule,FormsModule,RouterLink,HeadPageHeaderComponent],templateUrl:'./settings.page.html',styleUrls:['../../../academic/academic.page.scss','./settings.page.scss']})
export class SettingsPage {
  readonly api=inject(SchoolApiService);
  readonly remote=inject(AcademicDataService);
  readonly years=inject(AcademicYearService);
  readonly year=this.years.headYear;
  readonly policy=computed(()=>this.remote.data().policy??DEFAULT_GRADING);
  bands:GradeBand[]=[];
  passMark=35;
  readonly error=signal('');readonly notice=signal('');readonly saving=signal(false);
  constructor(){effect(()=>{const p=this.policy();this.bands=p.bands.map((b:GradeBand)=>({...b}));this.passMark=p.passMark;});}
  addBand(){this.bands.push({label:'',minimum:0});}
  removeBand(index:number){if(this.bands.length>2)this.bands.splice(index,1);}
  async save():Promise<void>{
    if(this.saving()||this.year()?.status==='closed')return;
    this.error.set('');this.notice.set('');
    const bands=this.bands.map(b=>({label:b.label.trim(),minimum:Number(b.minimum)}));
    if(!this.year()||!Number.isFinite(Number(this.passMark))||Number(this.passMark)<0||Number(this.passMark)>100||bands.length<2||bands.some((b,i)=>!b.label||!Number.isFinite(b.minimum)||b.minimum<0||b.minimum>100||(i>0&&b.minimum>=bands[i-1].minimum))||bands.at(-1)?.minimum!==0||new Set(bands.map(b=>b.label.toLowerCase())).size!==bands.length){this.error.set('Use unique grade names and descending minimum scores ending at 0. The pass mark must be between 0 and 100.');return;}
    this.saving.set(true);const error=await this.remote.command('grading',{bands,passMark:Number(this.passMark)});this.saving.set(false);
    if(error)this.error.set(error);else this.notice.set('Grading scheme saved for this academic year.');
  }
}
