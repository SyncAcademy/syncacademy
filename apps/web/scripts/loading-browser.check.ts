import 'zone.js';
import '@angular/compiler';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { NetworkActivityService } from '../src/app/core/services/network-activity.service';
import { ChartRevealDirective } from '../src/app/shared/directives/chart-reveal.directive';
import { ActionLoadingDirective } from '../src/app/shared/directives/action-loading.directive';
import { LoadingSkeletonComponent } from '../src/app/shared/loading-skeleton.component';

@Component({standalone:true,imports:[LoadingSkeletonComponent],hostDirectives:[ChartRevealDirective,ActionLoadingDirective],template:`
  <button (click)="begin()">Save changes</button><app-loading-skeleton />
  <div style="height:1500px"></div>
  <div class="bar-track" style="width:240px;height:24px"><div class="bar-fill" style="width:75%;height:24px;background:#e87e24"></div></div>
`})
class LoadingHarness {
  network=inject(NetworkActivityService);
  finish?:()=>void;
  begin(){this.finish=this.network.start();}
}
TestBed.initTestEnvironment(BrowserDynamicTestingModule,platformBrowserDynamicTesting());
TestBed.configureTestingModule({imports:[LoadingHarness]});
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const passed:string[]=[];
const check=(value:unknown,label:string)=>{if(!value)throw new Error(label);passed.push(label);};
(async()=>{
  const fixture=TestBed.createComponent(LoadingHarness);
  document.body.appendChild(fixture.nativeElement);fixture.detectChanges();
  const network=TestBed.inject(NetworkActivityService);
  const quick=network.start();quick();await delay(350);
  check(!network.visible(),'Quick requests do not flash a loading bar');
  const button=document.querySelector('button')!;button.click();await delay(350);fixture.detectChanges();
  check(network.visible(),'Slow request shows loading bar');
  check(button.getAttribute('aria-busy')==='true','Action button shows loading spinner');
  const concurrent=network.start();fixture.componentInstance.finish!();await delay(20);fixture.detectChanges();
  check(network.visible()&&network.active()===1,'Concurrent requests keep indicator active');
  concurrent();await delay(30);fixture.detectChanges();
  check(!network.visible()&&!button.hasAttribute('aria-busy'),'Completed request clears indicators');
  const bar=document.querySelector<HTMLElement>('.bar-fill')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){check(!bar.dataset['chartReveal'],'Reduced motion leaves charts visible without animation');}
  else {
    check(bar.dataset['chartReveal']==='pending','Offscreen chart waits for scroll');
    bar.scrollIntoView({behavior:'instant'});await delay(1200);
    check(bar.dataset['chartReveal']==='visible','Chart draws when scrolled into view');
    check(getComputedStyle(bar).transform==='matrix(1, 0, 0, 1, 0, 0)','Chart reaches its full size');
    window.scrollTo(0,0);await delay(80);
    check(bar.dataset['chartReveal']==='visible','Chart does not restart on repeated scrolling');
  }
  check(document.querySelector('.loading-skeleton')?.getAttribute('aria-busy')==='true','Skeleton exposes its loading state');
  const slow=network.start();await delay(8100);
  check(network.slow(),'Long request shows connection feedback');slow();
  check(!network.slow(),'Connection feedback clears after completion');
  document.body.dataset['testResult']=JSON.stringify({passed});
})().catch(error=>{document.body.dataset['testResult']=JSON.stringify({failed:String(error),passed});});
