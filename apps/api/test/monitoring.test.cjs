const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const {PrismaClient}=require('@prisma/client');
const {authenticator}=require('otplib');
const {io}=require('socket.io-client');
require('dotenv').config({path:path.resolve(__dirname,'../../../.env'),quiet:true});
const dockerUrl=new URL('postgresql://syncacademy@127.0.0.1:55432/postgres');dockerUrl.password=process.env.POSTGRES_PASSWORD||'';
const adminUrl=process.env.MONITOR_TEST_DATABASE_URL||(process.env.POSTGRES_PASSWORD?dockerUrl.toString():process.env.DATABASE_URL);
const url=new URL(adminUrl);url.pathname='/syncacademy_monitor_test';
process.env.DATABASE_URL=url.toString();process.env.REALTIME_DATABASE_URL=url.toString();process.env.NODE_ENV='test';process.env.PORT='3103';process.env.MONITOR_INSTANCE_ID='monitor-test';
if(new URL(process.env.DATABASE_URL).pathname!=='/syncacademy_monitor_test')throw new Error('Isolated test database required');
const {Metrics,empty,add,summarize}=require('../dist/monitoring/metrics');
const {settingsSchema,defaults,overall}=require('../dist/monitoring/settings');
const {MonitoringService}=require('../dist/monitoring/monitoring.service');
const {passwordHash,encrypt}=require('../dist/security');
const base='http://localhost:3103/api/v1/',origin=process.env.APP_ORIGIN;
function client(){let cookie='';return {get cookie(){return cookie},async call(method,route,body){const r=await fetch(base+route,{method,headers:{Origin:origin,'X-Requested-With':'SyncAcademy','Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});const cookies=r.headers.getSetCookie();if(cookies.length)cookie=cookies.map(v=>v.split(';')[0]).join('; ');return {status:r.status,body:await r.json()};}};}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('bounded instrumentation, safe route aggregation, thresholds and recovery',async()=>{
 assert.equal(summarize(empty()).state,'idle');assert.equal(summarize(empty()).avgMs,null,'idle latency is not fabricated as zero');assert.equal(summarize(empty()).errorRate,null,'error percentage requires a denominator');
 const metrics=new Metrics();metrics.record('GET','/api/v1/schools/:id/workspace',200,20);metrics.record('GET','/api/v1/schools/:id/workspace',500,700);metrics.record('GET',undefined,404,4);
 const batch=metrics.drain(),a=summarize(batch.get('GET /api/v1/schools/:id/workspace'));assert.equal(a.count,2);assert.equal(a.errorRate,50);assert.equal(a.p95Ms,1000);assert.equal(a.avgMs,360);assert.ok(batch.has('GET unmatched'));
 for(let i=0;i<10000;i++)metrics.record('GET','/api/v1/route-'+i,200,1);assert.ok(metrics.drain().size<=256);
 assert.equal(settingsSchema.safeParse({...defaults,cpuWarning:99,cpuCritical:80}).success,false);assert.equal(overall(['healthy','critical']),'Partial Outage');assert.equal(overall(['unknown']),'Unknown');
 const service=new MonitoringService({},new Metrics());await service.pool.end();const calls=[];service.pool={query:async(sql,values)=>{calls.push({sql,values});return {rows:[]}},end:async()=>{}};
 const bad={id:'database',name:'Database',status:'critical',detail:'Probe failed'};
 await service.observeAlert(bad,false);await service.observeAlert(bad,false);assert.equal(calls.length,0);await service.observeAlert(bad,false);assert.equal(service.pendingAlerts.size,1,'database outage is queued without storage');
 await service.observeAlert({...bad,status:'healthy'});assert.ok(calls.some(c=>c.sql.includes('INSERT')));assert.ok(!calls.some(c=>c.sql.includes('UPDATE "MonitorAlert" SET')));
 await service.observeAlert({...bad,status:'healthy'});await service.observeAlert({...bad,status:'healthy'});assert.ok(calls.some(c=>c.sql.includes('UPDATE "MonitorAlert" SET')),'only verified consecutive recovery resolves');
 service.pool={query:async()=>{throw Error('unavailable')},end:async()=>{}};await service.collect();assert.equal(service.current.database.connected,false);assert.equal(service.current.persistenceAvailable,false);assert.notEqual(service.current.status,'Operational');await service.onModuleDestroy();
});
test('protected monitoring API collects real requests, sockets, history and audited settings',{timeout:180000},async()=>{
 const provision=new Pool({connectionString:adminUrl});try{const exists=await provision.query("SELECT 1 FROM pg_database WHERE datname='syncacademy_monitor_test'");if(!exists.rows.length)await provision.query('CREATE DATABASE syncacademy_monitor_test');}finally{await provision.end();}
 const migrated=spawnSync(process.execPath,[path.resolve(__dirname,'../../../node_modules/prisma/build/index.js'),'migrate','deploy','--schema',path.resolve(__dirname,'../prisma/schema.prisma')],{env:process.env,encoding:'utf8'});assert.equal(migrated.status,0,migrated.stderr);
 const db=new PrismaClient();await db.$executeRawUnsafe('TRUNCATE TABLE "MonitorSample","MonitorEndpoint","MonitorSetting","MonitorAlert","MonitorWorker","User","School","session","RateBucket" CASCADE');
 const api=spawn(process.execPath,[path.resolve(__dirname,'../dist/main.js')],{env:process.env,stdio:'pipe',windowsHide:true});let logs='';let worker;api.stdout.on('data',b=>logs+=b);api.stderr.on('data',b=>logs+=b);let socket;
 try{
  for(let i=0;i<120;i++){try{if((await fetch(base+'health/ready')).ok)break;}catch{}await delay(250);}
  assert.equal((await fetch(base+'health/ready')).status,200,logs.slice(-500));
  const anonymous=client();for(const route of ['system-health','system-health/history','system-health/endpoints','system-health/alerts'])assert.equal((await anonymous.call('GET',route)).status,401);
  const password='Monitoring-test-'+randomUUID(),hash=await passwordHash(password);
  const admin=await db.user.create({data:{email:'monitor-admin@example.test',name:'Monitoring tester',passwordHash:hash,platformAdmin:true}});
  const c=client();assert.equal((await c.call('POST','auth/login',{email:admin.email,password,role:'SUPER_ADMIN'})).status,201);
  assert.equal((await c.call('GET','system-health')).status,403,'MFA is required');
  const setup=await c.call('POST','auth/mfa/setup',{});assert.equal((await c.call('POST','auth/mfa/verify',{code:authenticator.generate(setup.body.secret),setup:true})).status,201);
  const school=await db.school.create({data:{name:'Monitoring access test',code:'MONITOR',region:'Test'}});
  for(const role of ['HEADMASTER','ACADEMIC','REGISTRAR','TEACHER','BURSAR']){
   const user=await db.user.create({data:{email:role.toLowerCase()+'@monitor.test',name:'Test',passwordHash:hash}});await db.membership.create({data:{schoolId:school.id,userId:user.id,role}});const ordinary=client();assert.equal((await ordinary.call('POST','auth/login',{email:user.email,password,role})).status,201);
   for(const route of ['system-health','system-health/history','system-health/endpoints','system-health/alerts'])assert.equal((await ordinary.call('GET',route)).status,403,role+' must not access infrastructure');
   assert.equal((await ordinary.call('PATCH','system-health/settings',defaults)).status,403);
  }
  console.log('Monitoring auth and role checks passed');
  let summary=await c.call('GET','system-health');assert.equal(summary.status,200);assert.equal(summary.body.current.database.connected,true);assert.ok(summary.body.current.runtime.rssBytes>0);
  assert.equal((await c.call('PATCH','system-health/settings',{...defaults,cpuWarning:99,cpuCritical:80})).status,400);assert.equal((await c.call('PATCH','system-health/settings',{...defaults,consecutive:2})).status,200);
  assert.equal((await c.call('GET','system-health/history?range=invalid')).status,400);
  socket=io('http://localhost:3103',{transports:['websocket'],auth:{scope:'platform'},extraHeaders:{Origin:origin,Cookie:c.cookie},reconnection:false});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Socket ready timeout')),8000);socket.on('platform:ready',()=>{clearTimeout(timer);resolve()});socket.on('connect_error',reject)});
  worker=spawn(process.execPath,[path.resolve(__dirname,'../dist/worker.js')],{env:{...process.env,MONITOR_INSTANCE_ID:'test-worker',COMMUNICATION_MOCK_DISPATCH:'true'},stdio:'ignore',windowsHide:true});
  const job=await db.outbox.create({data:{channel:'EMAIL',payload:encrypt(JSON.stringify({to:'monitor-worker@example.test',subject:'Monitoring regression fixture',text:'Isolated test only'}))}});
  console.log('Monitoring socket ready; collecting next observation');
  await delay(31000);
  summary=await c.call('GET','system-health');assert.ok(summary.body.current.websocket.active>=1);assert.ok(summary.body.current.websocket.connections>=1);assert.ok(summary.body.current.jobs.workers.some(w=>w.instance==='test-worker'));assert.ok(summary.body.current.jobs.channels.some(c=>c.channel==='EMAIL'&&c.sent>=1));assert.ok((await db.outbox.findUnique({where:{id:job.id}})).sentAt,'real worker processes isolated mock-provider job');
  const history=await c.call('GET','system-health/history?range=15m');assert.equal(history.status,200);assert.ok(history.body.points.length>=2);assert.ok(history.body.observations>=2,'history contains real persisted observations, not only empty buckets');assert.ok(history.body.coveragePercent<100);assert.equal(history.body.externalAvailability,null);const gap=history.body.points.find(p=>p.observations===0);assert.ok(gap&&gap.requestState==='missing'&&gap.latency===null&&gap.requests===null,'Unobserved time is explicit, never replaced with zero');const idle=history.body.points.find(p=>p.observations>0&&p.requests===0);if(idle)assert.ok(idle.requestState==='idle'&&idle.latency===null&&idle.errors===null);
  const endpoints=await c.call('GET','system-health/endpoints?range=15m');assert.equal(endpoints.status,200);assert.ok(endpoints.body.rows.some(r=>r.route.includes('auth/login')));assert.ok(!JSON.stringify(endpoints.body).includes(password));assert.ok(!JSON.stringify(endpoints.body).includes(admin.email));assert.ok(!JSON.stringify(summary.body).includes(process.env.DATABASE_URL));
  const id=randomUUID();await db.$executeRaw`INSERT INTO "MonitorAlert" (id,instance,service,severity,title,description) VALUES (${id}::uuid,'isolated-test','api','warning','Test alert','Threshold regression fixture')`;
  assert.equal((await c.call('POST',`system-health/alerts/${id}/acknowledge`,{})).status,201);const alert=(await c.call('GET','system-health/alerts')).body.rows.find(a=>a.id===id);assert.ok(alert.acknowledgedAt);assert.equal(alert.actorId,admin.id);assert.equal(alert.resolvedAt,null);assert.equal(await db.auditEvent.count({where:{action:'MONITOR_ALERT_ACKNOWLEDGED',target:id}}),1);assert.equal(await db.auditEvent.count({where:{action:'MONITOR_SETTINGS_UPDATED',actorId:admin.id}}),1);
 }catch(error){console.error('Monitoring test API diagnostics:',logs.slice(-1800));throw error;}finally{socket?.disconnect();worker?.kill();api.kill();await db.$disconnect();}
});
