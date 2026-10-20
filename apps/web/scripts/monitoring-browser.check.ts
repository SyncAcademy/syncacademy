import 'zone.js';
import '@angular/compiler';
import { By } from '@angular/platform-browser';
import { HealthChartComponent } from '../src/app/features/super-admin/pages/sa-system/health-chart.component';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule,platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { SaSystemPage } from '../src/app/features/super-admin/pages/sa-system/sa-system.page';
import { AuthService } from '../src/app/core/services/auth.service';
const passed:string[]=[];const check=(value:unknown,label:string)=>{if(!value)throw Error(label);passed.push(label);};const delay=(n=0)=>new Promise(r=>setTimeout(r,n));
// UI-only deterministic fixtures; the separate API suite verifies real observations.
const at=new Date().toISOString(),settings={cpuWarning:80,cpuCritical:95,memoryWarning:80,memoryCritical:95,diskWarning:80,diskCritical:95,latencyWarning:500,latencyCritical:2000,errorWarning:2,errorCritical:5,consecutive:3,refreshSeconds:30,retentionDays:31};
const current={at,instance:'browser-test',status:'Operational',persistenceAvailable:true,runtime:{uptimeSeconds:1000,cpuPercent:4,memoryPercent:20,rssBytes:100000000,heapUsedBytes:50000000,heapLimitBytes:250000000,diskPercent:30,version:'test',environment:'test'},api:{count:100,avgMs:25,p95Ms:50,p99Ms:100,p50Ms:25,errorRate:0,clientErrorRate:0,successRate:100,requestsPerMinute:200},database:{connected:true,latencyMs:2,connections:4,maxConnections:100,active:1,slowQueries:0,longTransactions:0,bytes:10000000,rollbacks:0,failedOperations:0},websocket:{ready:true,active:3,connections:5,disconnections:2,failures:0,events:12,eventsPerMinute:6,processingFailures:0,failureRate:0,transport:'local'},jobs:{workers:[],pending:0,failed:0,sent:10},sessionPool:{total:2,max:5,waiting:0},services:['api','database','websocket','worker','resources'].map(id=>({id,name:{api:'Backend API',database:'PostgreSQL',websocket:'WebSocket gateway',worker:'Email outbox worker',resources:'Process resources'}[id],status:'healthy'}))};
const points=Array.from({length:12},(_,i)=>({at:new Date(Date.now()-(12-i)*30000).toISOString(),cpu:3+i%3,memory:20,disk:30,database:2,connections:4,connectionPercent:4,databaseFailures:0,sockets:3,socketFailures:0,requests:20,latency:25,p95:50,errors:0,observations:1,healthy:1,statuses:['Operational']}));
// Exercise ordinary idle traffic throughout the API charts, while resource probes continue.
points.forEach((point:any,index)=>{if(index%3===0){point.requests=0;point.latency=null;point.p95=null;point.errors=null;}});
const calls:{method:string,path:string,body:any}[]=[];let fail=false,hold:Promise<void>|null=null;let ack=false;
const auth={error:()=> 'Monitoring temporarily unavailable.',request:async(method:string,path:string,body:any)=>{calls.push({method,path,body});if(hold)await hold;if(fail)throw Error('test failure');if(path.includes('/acknowledge')){ack=true;return {};};if(path.endsWith('/settings'))return body;if(path.includes('/history'))return {points,bucketSeconds:30,coveragePercent:10,observedAvailabilityPercent:100,note:'Test observation coverage'};if(path.includes('/endpoints'))return {rows:[{route:'GET /api/v1/schools/:id/workspace',count:10,avgMs:25,p95Ms:50,errorRate:0,serverErrors:0,clientErrors:0},{route:'POST /api/v1/auth/login',count:5,avgMs:30,p95Ms:50,errorRate:20,serverErrors:1,clientErrors:0}]};if(path.includes('/alerts'))return {rows:[{id:'alert-test',service:'api',instance:'browser-test',severity:'warning',title:'API latency needs attention',description:'Test fixture',detectedAt:at,acknowledgedAt:ack?at:null,resolvedAt:null}]};return {current,settings,observedConnections:3,instances:[],scope:'Serving process'};}};
TestBed.initTestEnvironment(BrowserDynamicTestingModule,platformBrowserDynamicTesting());TestBed.configureTestingModule({imports:[SaSystemPage],providers:[{provide:AuthService,useValue:auth}]});
(async()=>{
 if(location.search.includes('zoom'))document.documentElement.style.fontSize='200%';
 if(location.search.includes('stress')){current.instance='api-primary-'+('long-instance-name-'.repeat(3));current.api.count=100000000;current.runtime.cpuPercent=142;}
 const fixture=TestBed.createComponent(SaSystemPage);document.body.appendChild(fixture.nativeElement);fixture.detectChanges();await delay(40);fixture.detectChanges();const page=fixture.componentInstance;
 check(page.current().database.connected,'API data renders');check(fixture.nativeElement.querySelectorAll('.kpi').length===6,'Six live KPI cards');
 check(document.documentElement.scrollWidth<=window.innerWidth+1,'No page overflow at current viewport');
 page.query.set('login');fixture.detectChanges();check(page.rows().length===1,'Endpoint search');page.query.set('');page.method.set('GET');check(page.rows().length===1,'Method filter');page.method.set('all');page.category.set('5xx');check(page.rows().length===1,'Error filter');page.category.set('all');page.sortBy('count');check(page.rows()[0].count===5,'Numeric sort reverses');
 const beforeHidden=calls.length;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});page.updated.set(new Date(0));document.dispatchEvent(new Event('visibilitychange'));await delay();check(calls.length===beforeHidden,'Hidden page does not refresh');Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));await delay();check(calls.length>beforeHidden,'Visible page resumes refresh');
 page.changeRange('7d');await delay();fixture.detectChanges();check(calls.some(c=>c.path.endsWith('range=7d')),'Time range fetches history');
 let release!:()=>void;hold=new Promise(r=>release=r);const before=calls.length;const one=page.refresh(true),two=page.refresh(true);check(calls.length-before===4,'Refresh requests are coalesced');release();hold=null;await Promise.all([one,two]);
 fail=true;await page.refresh(true);fixture.detectChanges();check(page.current().database.connected&&page.stale(),'Failed refresh retains last valid data and marks stale');check(fixture.nativeElement.querySelector('[role=alert]'),'Failure is announced');fail=false;await page.refresh(true);fixture.detectChanges();check(!page.stale(),'Successful refresh recovers');
 await page.acknowledge('alert-test');check(ack&&page.alerts()[0].acknowledgedAt,'Acknowledgement calls protected API');
 page.settingsOpen.set(true);page.settings={...settings,refreshSeconds:60};await page.saveSettings();check(calls.some(c=>c.method==='PATCH'&&c.body.refreshSeconds===60),'Settings save via API');
 const chart=fixture.nativeElement.querySelector('app-health-chart svg') as SVGElement;chart.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));fixture.detectChanges();check(!!fixture.nativeElement.querySelector('app-health-chart .tooltip time'),'Keyboard chart inspection');
 const legend=fixture.nativeElement.querySelector('app-health-chart .legend button') as HTMLButtonElement;legend.click();fixture.detectChanges();check(legend.getAttribute('aria-pressed')==='false','Chart legend toggles series');
 for(const service of ['api','database','websocket','worker','resources']){page.selectedService.set(service);fixture.detectChanges();check(!!fixture.nativeElement.querySelector('.detail-panel h3'),'Service details '+service);}
 page.selectedService.set('database');fixture.detectChanges();
 const normal=page.current();page.summary.set({...page.summary(),current:{...normal,runtime:{...normal.runtime,cpuPercent:null,memoryPercent:null},api:{...normal.api,avgMs:null,errorRate:null}}});fixture.detectChanges();check(!fixture.nativeElement.textContent.includes('NaN'),'Missing metrics do not render NaN');page.summary.set({...page.summary(),current:normal});fixture.detectChanges();

 const currentSummary=page.summary();
 page.summary.set({...currentSummary,current:{...page.current(),api:{...page.current().api,count:0,avgMs:null,errorRate:null}}});fixture.detectChanges();
 check(page.apiMetric(null,' ms')==='No requests'&&page.apiMetric(null,'%')==='No requests','Idle API metrics have explicit no-request state');
 check(!fixture.nativeElement.textContent.includes('Unavailable ms'),'Missing values never have a misleading unit');
 page.summary.set(currentSummary);fixture.detectChanges();
 const graphs=fixture.debugElement.queryAll(By.directive(HealthChartComponent));
 check(graphs.length===page.charts.length,'Every configured graph is rendered');
 check(graphs.every(item=>(item.componentInstance as HealthChartComponent).plots().every(plot=>!plot.path.includes('NaN'))),'Every graph uses finite coordinates');
 const graph=graphs[0].componentInstance as HealthChartComponent;
 const graphRows=[
  {at:new Date(Date.now()-90000).toISOString(),observations:1,requests:0,latency:null,p95:null},
  {at:new Date(Date.now()-60000).toISOString(),observations:1,requests:1,latency:12,p95:25},
  {at:new Date(Date.now()-30000).toISOString(),observations:1,requests:0,latency:null,p95:null},
  {at:new Date().toISOString(),observations:0,requestState:'missing',requests:null,latency:null,p95:null},
 ];
 graph.points=graphRows;fixture.detectChanges();
 check(graph.plots().every(plot=>plot.markers.length===1),'Isolated measured intervals remain visible as points');
 check(graph.idleCount()===2&&graph.missingCount()===1,'Idle traffic and absent observations are distinct');
 check(graph.plots().every(plot=>(plot.path.match(/L/g)||[]).length===0),'Charts never join across idle or missing measurements');
 check(fixture.nativeElement.querySelectorAll('app-health-chart .measurement').length>0,'Measurement markers are rendered');
 check(!fixture.nativeElement.textContent.includes('Unavailable ms'),'Tooltips do not append units to missing states');
 const kpi=fixture.nativeElement.querySelector('.kpi') as HTMLElement,detail=fixture.nativeElement.querySelector('.detail-panel') as HTMLElement;
 check(getComputedStyle(kpi).borderTopWidth===getComputedStyle(kpi).borderBottomWidth&&getComputedStyle(kpi).borderTopColor===getComputedStyle(kpi).borderBottomColor,'KPI accent strip removed at source');
 check(getComputedStyle(detail).borderLeftWidth===getComputedStyle(detail).borderRightWidth&&getComputedStyle(detail).borderLeftColor===getComputedStyle(detail).borderRightColor,'Detail side accent removed at source');
 graph.points=points;fixture.detectChanges();
 document.body.dataset['testResult']=JSON.stringify({passed});
})().catch(error=>document.body.dataset['testResult']=JSON.stringify({failed:String(error),passed}));
