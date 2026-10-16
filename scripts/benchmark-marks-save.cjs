// Command probe against disposable fixtures; rolls back unless --commit is explicit.
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
const report=JSON.parse(readFileSync(path.resolve(__dirname,'../.tmp/multischool-benchmark.json'),'utf8'));
if(!['syncacademy_auth_test','syncacademy_scale_test'].includes(report.database))throw new Error('Disposable fixtures required.');
const url=new URL(process.env.DATABASE_URL);url.pathname='/'+report.database;process.env.DATABASE_URL=url.toString();
const {PrismaClient}=require('@prisma/client');
const {PlatformService}=require('../apps/api/dist/platform.service');
const {AcademicController}=require('../apps/api/dist/academic.controller');
const {academicMarksQuery}=require('../apps/api/dist/academic-overview');
const db=new PrismaClient();
const concurrency=process.argv.includes('--concurrent')?4:1;
const commit=process.argv.includes('--commit');
(async()=>{
 const jobs=[];
 for(let i=0;i<concurrency;i++) {
  const fixture=report.fixtures[i%report.fixtures.length];
  const [selected]=await db.$queryRaw`SELECT data->'submissions'->0->>'id' AS id FROM "AcademicWorkspace" WHERE "schoolId"=${fixture.schoolId}::uuid AND "yearId"=${fixture.yearId}::uuid`;
  const [record]=await db.$queryRaw(academicMarksQuery(fixture.schoolId,fixture.yearId,selected.id));
  const sub=record.data.submissions[0];
  const member=await db.membership.findFirstOrThrow({where:{schoolId:fixture.schoolId,role:'TEACHER',active:true},include:{user:true}});
  const svc=new PlatformService(db),controller=new AcademicController(svc);
  const rollback=new Error('benchmark rollback');
  if(!commit)svc.atomic=async work=>{let result;try{await db.$transaction(async tx=>{result=await work(tx);throw rollback;},{isolationLevel:'Serializable',timeout:15000});}catch(error){if(error!==rollback)throw error;}return result;};
  const req={session:{userId:member.userId,version:member.user.sessionVersion,selectedRole:'TEACHER',issuedAt:Date.now(),mfaVerified:true},header:()=>randomUUID()};
  const body={yearId:fixture.yearId,action:'marks',view:'marks',payload:{id:sub.id,revision:sub.revision,entries:sub.entries.map(e=>({studentId:e.studentId,marksValue:e.marksValue,noMark:e.noMark??false,comments:e.comments??''}))}};
  jobs.push(async()=>{const start=performance.now();try{const result=await controller.command(req,fixture.schoolId,body);return {ms:Math.round(performance.now()-start),success:true,bytes:Buffer.byteLength(JSON.stringify(result))};}catch(error){return {ms:Math.round(performance.now()-start),success:false,code:error.code??error.getStatus?.(),sqlState:error.meta?.code,message:error.meta?.error??error.message};}});
 }
 const results=await Promise.all(jobs.map(job=>job()));
 console.log(JSON.stringify({scope:commit?'Committed synthetic-only writes, normal retries; same-submission competitors expect 409':'All transactions rolled back; excludes HTTP/session lookup; no serialization retries',concurrency,results},null,2));
 if(results.some(result=>!result.success&&(!commit||result.code!==409)))process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.$disconnect());
