// Read-only benchmark. --docker-local uses the existing local Docker DB credentials.
const {createRequire}=require('node:module');
const path=require('node:path');
const {readFileSync}=require('node:fs');
const apiRequire=createRequire(path.resolve(__dirname,'../apps/api/package.json'));
apiRequire('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
let synthetic;
if(process.argv.includes('--synthetic')) {
 const report=JSON.parse(readFileSync(path.resolve(__dirname,'../.tmp/multischool-benchmark.json'),'utf8'));
 if(!['syncacademy_auth_test','syncacademy_scale_test'].includes(report.database))throw new Error('Expected a disposable benchmark database.');
 const url=new URL(process.env.DATABASE_URL);url.pathname='/'+report.database;process.env.DATABASE_URL=url.toString();
 synthetic=report.fixtures[0];
}
if(process.argv.includes('--docker-local')) {
 const url=new URL(process.env.DATABASE_URL);url.hostname='127.0.0.1';url.port='55432';url.username='syncacademy';url.password=process.env.POSTGRES_PASSWORD;process.env.DATABASE_URL=url.toString();
}
const {PrismaClient}=apiRequire('@prisma/client');
const {academicOverviewQuery,academicMarksQuery}=require('../apps/api/dist/academic-overview');
const {gzipSync}=require('node:zlib');
const queryTimes=[];
const db=new PrismaClient({log:[{emit:'event',level:'query'}]});
db.$on('query',event=>{
 const model=event.query.match(/FROM "public"\."([^"]+)"/)?.[1]??'SQL';queryTimes.push({model,ms:event.duration});
 if(process.argv.includes('--query-shapes')&&model==='EnrollmentSubject')console.log(JSON.stringify({model,queryShape:event.query.slice(0,600),queryLength:event.query.length}));
});
(async()=>{
 const school=await db.school.findFirstOrThrow({where:synthetic?{id:synthetic.schoolId}:{name:{contains:'KIGOMA',mode:'insensitive'}},select:{id:true}});
 const year=await db.academicYear.findFirstOrThrow({where:{schoolId:school.id,...(synthetic?{id:synthetic.yearId}:{name:'2026'})},select:{id:true}});
 if(process.argv.includes('--controllers')) {
  const {PlatformService}=require('../apps/api/dist/platform.service');
  const {ApiController}=require('../apps/api/dist/api.controller');
  const {RegistryController}=require('../apps/api/dist/registry.controller');
  const member=await db.membership.findFirstOrThrow({where:{schoolId:school.id,role:synthetic?'ACADEMIC':'HEADMASTER',active:true,user:{enabled:true,mustChangePassword:false}},include:{user:true}});
  // Read-only in-process timings. Normal school/role authorization still executes;
  // these do not measure HTTP transport or the session store.
  const req={session:{userId:member.userId,version:member.user.sessionVersion,selectedRole:member.role,issuedAt:Date.now(),mfaVerified:true}};
  const service=new PlatformService(db),api=new ApiController(service),registry=new RegistryController(service);
  console.log(JSON.stringify({dashboardQuery:api.workspace.toString().includes('WITH charges')?'grouped':'correlated'}));
  for(let run=1;run<=(process.argv.includes('--once')?1:3);run++)for(const [kind,read] of [
   ['school-workspace',()=>api.workspace(req,school.id,{})],
   ['school-summary',()=>api.workspace(req,school.id,{view:'summary'})],
   ['student-page',()=>registry.students(req,school.id,{yearId:year.id,page:1,pageSize:25})],
   ['registry-summary',()=>registry.summary(req,school.id,year.id)],
  ]) {
   queryTimes.length=0;const start=performance.now(),data=await read();
   console.log(JSON.stringify({run,kind,controllerMs:Math.round(performance.now()-start),bytes:Buffer.byteLength(JSON.stringify(data)),queries:queryTimes.length,slowest:queryTimes.sort((a,b)=>b.ms-a.ms).slice(0,4)}));
  }
  return;
 }
 const [first]=await db.$queryRaw`SELECT data->'submissions'->0->>'id' AS id FROM "AcademicWorkspace" WHERE "schoolId"=${school.id}::uuid AND "yearId"=${year.id}::uuid`;
 for(let run=1;run<=(process.argv.includes('--once')?1:3);run++)for(const kind of ['full','overview',...(first?.id?['marks']:[])]) {
  const start=performance.now();
  const record=kind==='full'?await db.academicWorkspace.findUniqueOrThrow({where:{yearId:year.id}}):(await db.$queryRaw(kind==='marks'?academicMarksQuery(school.id,year.id,first.id):academicOverviewQuery(school.id,year.id)))[0];
  const queryMs=performance.now()-start;
  const serializeStart=performance.now(),json=JSON.stringify(record.data),serializeMs=performance.now()-serializeStart;
  const parseStart=performance.now();JSON.parse(json);const parseMs=performance.now()-parseStart;
  console.log(JSON.stringify({run,kind,queryMs:Math.round(queryMs),serializeMs:Math.round(serializeMs),parseMs:Math.round(parseMs),bytes:Buffer.byteLength(json),gzipBytes:gzipSync(json,{level:5}).length}));
 }
})().finally(()=>db.$disconnect());
