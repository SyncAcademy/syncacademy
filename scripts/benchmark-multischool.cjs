// Synthetic HTTP benchmark. Never targets an existing school or the live database.
// node scripts/benchmark-multischool.cjs --run --schools 12 --students 2400 --users-per-school 2
const {randomUUID,randomBytes}=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {writeFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
const {Client}=require('pg');
const {PrismaClient}=require('@prisma/client');
const signature=require('cookie-signature');
const args=process.argv.slice(2);
if(!args.includes('--run')) {console.log('Requires --run. Creates synthetic data only in syncacademy_scale_test. See docs/SCALABILITY_VALIDATION.md.');process.exit(0);}
function number(name,fallback,max) {const index=args.indexOf('--'+name),value=index<0?fallback:Number(args[index+1]);if(!Number.isInteger(value)||value<1||value>max)throw new Error('Invalid '+name);return value;}
const options={schools:number('schools',12,100),students:number('students',2400,20000),subjects:number('subjects',8,20),assessments:number('assessments',3,12),days:number('days',20,90),usersPerSchool:number('users-per-school',2,20),rounds:number('rounds',3,100)};
// Explicit fallback for hosts where the runtime account cannot create databases.
// Only append synthetic fixtures to the already provisioned disposable test DB.
const integrationDatabase=args.includes('--integration-database');
const url=new URL(process.env.DATABASE_URL);url.pathname=integrationDatabase?'/syncacademy_auth_test':'/syncacademy_scale_test';url.searchParams.set('connection_limit','10');
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Local disposable databases only. Use the documented deployment workload process for remote staging.');
process.env.DATABASE_URL=url.toString();process.env.REALTIME_DATABASE_URL=url.toString();process.env.NODE_ENV='test';process.env.PORT='3103';process.env.REALTIME_TRANSPORT='postgres';process.env.REQUEST_METRICS='true';
const db=new PrismaClient();const run=randomUUID(),samples=[],runtime=[],connections=[];let api,monitor;
const base='http://127.0.0.1:3103/api/v1/',origin=process.env.APP_ORIGIN;
const policy={revision:1,passMark:35,bands:[{label:'A',minimum:80},{label:'B',minimum:65},{label:'C',minimum:50},{label:'D',minimum:35},{label:'F',minimum:0}]};
async function batch(model,rows) {for(let i=0;i<rows.length;i+=1000)await db[model].createMany({data:rows.slice(i,i+1000)});}
async function session(user,role) {
 const sid=randomBytes(24).toString('hex'),expires=Date.now()+3600000;
 const sess={cookie:{originalMaxAge:3600000,expires:new Date(expires).toISOString(),secure:false,httpOnly:true,path:'/',sameSite:'lax'},userId:user.id,version:0,selectedRole:role,issuedAt:Date.now(),mfaVerified:true};
 // Match connect-pg-simple's timestamp conversion, including non-UTC databases.
 await db.$executeRaw`INSERT INTO session (sid,sess,expire) VALUES (${sid},${JSON.stringify(sess)}::json,to_timestamp(${Math.ceil(expires/1000)}))`;
 return 'sa.sid='+encodeURIComponent('s:'+signature.sign(sid,process.env.SESSION_SECRET));
}
async function seed(index) {
 const schoolId=randomUUID(),yearId=randomUUID(),teacherId=randomUUID(),academicId=randomUUID(),memberId=randomUUID();
 await db.school.create({data:{id:schoolId,name:`Scale ${run.slice(0,8)} ${index}`,code:`SC-${run.slice(0,8)}-${index}`,region:'Synthetic'}});
 await db.academicYear.create({data:{id:yearId,schoolId,name:'2026',startsAt:new Date('2026-01-01'),endsAt:new Date('2026-12-31')}});
 // Passwords are deliberately unusable. Short-lived, signed test sessions are inserted only in this disposable database.
 await db.user.createMany({data:[{id:teacherId,name:'Synthetic Teacher',email:`${teacherId}@example.invalid`,passwordHash:'!disabled'},{id:academicId,name:'Synthetic Academic',email:`${academicId}@example.invalid`,passwordHash:'!disabled'}]});
 await db.membership.createMany({data:[{id:memberId,userId:teacherId,schoolId,role:'TEACHER'},{userId:academicId,schoolId,role:'ACADEMIC'}]});
 const classes=Array.from({length:Math.ceil(options.students/60)},(_,i)=>({id:randomUUID(),schoolId,yearId,name:`Class ${String(i+1).padStart(3,'0')}`}));
 const subjects=Array.from({length:options.subjects},(_,i)=>({id:randomUUID(),schoolId,name:`Subject ${i+1}`,code:`S${i+1}`}));
 const students=Array.from({length:options.students},(_,i)=>({id:randomUUID(),schoolId,name:`Student ${String(i+1).padStart(6,'0')}`,admissionNumber:`T${i+1}`}));
 const enrollments=students.map((s,i)=>({id:randomUUID(),schoolId,studentId:s.id,classroomId:classes[Math.floor(i/60)].id,createdAt:new Date('2026-01-01')}));
 await batch('classroom',classes);await batch('subject',subjects);await batch('student',students);await batch('enrollment',enrollments);
 await batch('classSubject',classes.flatMap(c=>subjects.map(s=>({schoolId,classroomId:c.id,subjectId:s.id}))));
 await batch('enrollmentSubject',enrollments.flatMap(e=>subjects.map(s=>({schoolId,enrollmentId:e.id,subjectId:s.id}))));
 const allocations=classes.flatMap(c=>subjects.map(s=>({id:randomUUID(),schoolId,classroomId:c.id,subjectId:s.id,membershipId:memberId,confirmedAt:new Date()})));
 await batch('teachingAssignment',allocations);
 const assessments=Array.from({length:options.assessments},(_,i)=>({id:randomUUID(),yearId,name:`Assessment ${i+1}`,term:'Term 1',deadline:'2026-12-01',status:'open',createdAt:'2026-01-01T00:00:00.000Z'}));
 const roster=new Map(classes.map((c,i)=>[c.id,students.slice(i*60,(i+1)*60)]));
 const submissions=assessments.flatMap((exam,ei)=>allocations.map(a=>({id:randomUUID(),academicYearId:yearId,academicYearLabel:'2026',assessmentId:exam.id,assessmentName:exam.name,teachingId:a.id,classId:a.classroomId,className:classes.find(c=>c.id===a.classroomId).name,subjectId:a.subjectId,subjectName:subjects.find(s=>s.id===a.subjectId).name,teacherId,teacherName:'Synthetic Teacher',studentCount:roster.get(a.classroomId).length,rosterStatus:'confirmed',revision:1,gradingPolicy:policy,assessmentProgress:{status:ei===0?'draft':'approved',total:roster.get(a.classroomId).length,completed:roster.get(a.classroomId).length},entries:roster.get(a.classroomId).map((s,i)=>({studentId:s.id,studentNumber:s.admissionNumber,fullName:s.name,gender:'',marksValue:35+i%65,noMark:false,comments:'Synthetic mark',lastSaved:'2026-09-01T00:00:00.000Z'}))})));
 const attendance=classes.flatMap(c=>Array.from({length:options.days},(_,i)=>({id:randomUUID(),yearId,classId:c.id,date:new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),teacherId,teacherName:'Synthetic Teacher',savedAt:'2026-09-01T00:00:00.000Z',revision:1,reason:'',entries:roster.get(c.id).map(s=>({studentId:s.id,student:s.name,number:s.admissionNumber,status:'Present',note:''}))})));
 const data={assessments,submissions,attendance,classTeachers:classes.map(c=>({id:randomUUID(),yearId,classId:c.id,teacherId,membershipId:memberId,teacherName:'Synthetic Teacher',at:'2026-01-01T00:00:00.000Z'})),slots:[],syllabus:[],support:[],audit:[],reports:[],notifications:[],policy};
 await db.academicWorkspace.create({data:{schoolId,yearId,data}});
 return {schoolId,yearId,teacherCookie:await session({id:teacherId},'TEACHER'),academicCookie:await session({id:academicId},'ACADEMIC'),submissions:submissions.filter(s=>s.assessmentId===assessments[0].id),reportAssessment:assessments.at(-1).id,classes,roster,bytes:Buffer.byteLength(JSON.stringify(data))};
}
async function request(fixture,operation,method,route,body,role='teacher') {
 const started=performance.now();let status=0,bytes=0,result;
 try {const response=await fetch(base+route,{method,headers:{Origin:origin,'X-Requested-With':'SyncAcademy','Content-Type':'application/json',Cookie:role==='academic'?fixture.academicCookie:fixture.teacherCookie,'Idempotency-Key':randomUUID()},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)});status=response.status;const text=await response.text();bytes=Buffer.byteLength(text);try{result=JSON.parse(text);}catch{} }
 catch{status=0;}
 samples.push({operation,ms:Math.round(performance.now()-started),status,bytes,...(status>=400?{failure:result?.message}: {})});return {status,body:result};
}
async function worker(fixture,userIndex) {
 const root=`schools/${fixture.schoolId}`,sub=fixture.submissions[userIndex%fixture.submissions.length],classroom=fixture.classes[userIndex%fixture.classes.length];
 for(let round=0;round<options.rounds;round++) {
  const read=await request(fixture,'marks-read','GET',`${root}/academics?yearId=${fixture.yearId}&view=marks&submissionId=${sub.id}`);
  const current=read.body?.submissions?.[0];
  if(current)await request(fixture,'marks-save','POST',`${root}/academics/commands`,{yearId:fixture.yearId,action:'marks',view:'marks',payload:{id:sub.id,revision:current.revision,entries:current.entries.map(e=>({studentId:e.studentId,marksValue:e.marksValue,noMark:e.noMark,comments:e.comments}))}});
  if(args.includes('--marks-only'))continue;
  await request(fixture,'subject-page-search','GET',`${root}/registry/student-subjects?yearId=${fixture.yearId}&classroomId=${classroom.id}&pageSize=25&q=Student`);
  await request(fixture,'dashboard','GET',`${root}/workspace`);
  await request(fixture,'dashboard-summary','GET',`${root}/workspace?view=summary`);
  await request(fixture,'academic-full','GET',`${root}/academics?yearId=${fixture.yearId}`);
  await request(fixture,'academic-overview','GET',`${root}/academics?yearId=${fixture.yearId}&view=overview`);
  await request(fixture,'academic-revision','GET',`${root}/academics/revision?yearId=${fixture.yearId}`);
  const date=new Date(Date.UTC(2026,7,round+1)).toISOString().slice(0,10);
  await request(fixture,'attendance-save','POST',`${root}/academics/commands`,{yearId:fixture.yearId,action:'attendance',payload:{classId:classroom.id,date,revision:0,reason:'',entries:fixture.roster.get(classroom.id).map(s=>({studentId:s.id,status:'Present',note:''}))}});
  if(options.assessments>1)await request(fixture,'reports','POST',`${root}/academics/commands`,{yearId:fixture.yearId,action:'reports',payload:{assessmentId:fixture.reportAssessment,className:classroom.name}},'academic');
 }
}
function summarize() {return Object.fromEntries([...new Set(samples.map(s=>s.operation))].map(operation=>{const rows=samples.filter(s=>s.operation===operation),times=rows.map(r=>r.ms).sort((a,b)=>a-b);const q=p=>times[Math.min(times.length-1,Math.ceil(times.length*p)-1)];return [operation,{count:rows.length,p50Ms:q(.5),p95Ms:q(.95),p99Ms:q(.99),maxMs:times.at(-1),conflicts:rows.filter(r=>r.status===409).length,errors:rows.filter(r=>r.status===0||r.status>=400&&r.status!==409).length,statuses:Object.fromEntries([...new Set(rows.map(r=>r.status))].map(status=>[status,rows.filter(r=>r.status===status).length])),maxBytes:Math.max(...rows.map(r=>r.bytes))}];}));}
(async()=>{
 if(integrationDatabase){
  for(const port of [3101,3102]){let running=false;try{await fetch(`http://127.0.0.1:${port}/api/v1/health/ready`,{signal:AbortSignal.timeout(1000)});running=true;}catch{}if(running)throw new Error('Stop the integration APIs before benchmarking their disposable database.');}
 }else{
  const adminUrl=new URL(url);adminUrl.pathname='/postgres';const owner=new Client({connectionString:adminUrl.toString(),connectionTimeoutMillis:5000});await owner.connect();try{if(!(await owner.query('SELECT 1 FROM pg_database WHERE datname=$1',['syncacademy_scale_test'])).rowCount)await owner.query('CREATE DATABASE syncacademy_scale_test');}finally{await owner.end();}
 }
 const migrate=spawnSync(process.execPath,[path.resolve(__dirname,'../node_modules/prisma/build/index.js'),'migrate','deploy','--schema',path.resolve(__dirname,'../apps/api/prisma/schema.prisma')],{env:process.env,encoding:'utf8',timeout:120000});if(migrate.status!==0)throw new Error('Disposable database migrations failed.');
 const fixtures=[];for(let i=0;i<options.schools;i++){fixtures.push(await seed(i));console.log(JSON.stringify({event:'seeded',school:i+1,students:options.students,workspaceBytes:fixtures.at(-1).bytes}));}
 api=spawn(process.execPath,[path.resolve(__dirname,'../apps/api/dist/main.js')],{env:process.env,stdio:['ignore','pipe','pipe']});
 let buffer='',startupOutput='',startupErrors='';api.stdout.on('data',chunk=>{startupOutput=(startupOutput+chunk).slice(-2000);buffer+=chunk;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){try{const value=JSON.parse(line);if(value.event==='runtime_metrics')runtime.push(value);}catch{}}});api.stderr.on('data',chunk=>{startupErrors=(startupErrors+chunk).slice(-4000);});
 // Cold Windows startup can exceed 30 seconds; startup is outside all samples.
 let ready=false;for(let i=0;i<480;i++){if(api.exitCode!==null||api.signalCode!==null)break;try{ready=(await fetch(base+'health/ready',{signal:AbortSignal.timeout(1000)})).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,250));}if(!ready)throw new Error(`Benchmark API did not start (exit=${api.exitCode}, signal=${api.signalCode}). ${startupErrors||startupOutput}`);
 for(const fixture of fixtures)for(const cookie of [fixture.teacherCookie,fixture.academicCookie]){
  const response=await fetch(base+'auth/me',{headers:{Cookie:cookie},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Synthetic session validation failed: HTTP '+response.status);
 }
 let checking=false;monitor=setInterval(async()=>{if(checking)return;checking=true;try{connections.push((await db.$queryRaw`SELECT count(*)::int AS total, count(*) FILTER (WHERE state='active')::int AS active, count(*) FILTER (WHERE wait_event_type='Lock')::int AS lock_waiting FROM pg_stat_activity WHERE datname=current_database()`)[0]);}finally{checking=false;}},1000);
 const started=performance.now();await Promise.all(fixtures.flatMap(f=>Array.from({length:options.usersPerSchool},(_,i)=>worker(f,i))));
 const report={run,options,marksOnly:args.includes('--marks-only'),database:url.pathname.slice(1),fixtures:fixtures.map(f=>({schoolId:f.schoolId,yearId:f.yearId,workspaceBytes:f.bytes})),scope:'Loopback HTTP, synthetic schools; excludes browser, TLS, WAN and login',elapsedMs:Math.round(performance.now()-started),operations:summarize(),peakApiRssBytes:Math.max(0,...runtime.map(r=>r.rssBytes)),peakApiHeapBytes:Math.max(0,...runtime.map(r=>r.heapUsedBytes)),peakDatabaseConnections:Math.max(0,...connections.map(r=>r.total)),peakDatabaseActive:Math.max(0,...connections.map(r=>r.active)),peakDatabaseLockWaiting:Math.max(0,...connections.map(r=>r.lock_waiting)),samples};
 mkdirSync(path.resolve(__dirname,'../.tmp'),{recursive:true});writeFileSync(path.resolve(__dirname,'../.tmp/multischool-benchmark.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,samples:undefined},null,2));
 if(Object.values(report.operations).some(operation=>operation.errors))process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{clearInterval(monitor);api?.kill();await db.$disconnect();});
