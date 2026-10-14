import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { TAG, validateYear } from './kigoma-load-data.mjs';
config({quiet:true});
const url=new URL(process.env.DATABASE_URL);
if(process.argv.includes('--docker')){url.hostname='localhost';url.port='55432';url.username='syncacademy_runtime';url.password=process.env.RUNTIME_DB_PASSWORD;}
const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
try {
  const school=await db.school.findUniqueOrThrow({where:{code:'1776'}});
  assert.match(school.name,/kigoma/i);
  const years=await db.academicYear.findMany({where:{schoolId:school.id,name:{in:['2022','2023','2024','2025','2026']}},orderBy:{name:'asc'}});
  assert.equal(years.length,5);
  const summaries=[];
  for(const academicYear of years) {
    const yearId=academicYear.id, schoolId=school.id;
    const [workspace,classroom,enrollment,enrollmentSubject,studentCharge,payment,adjustment]=await Promise.all([
      db.academicWorkspace.findUniqueOrThrow({where:{yearId}}),
      db.classroom.findMany({where:{yearId,schoolId}}),
      db.enrollment.findMany({where:{schoolId,classroom:{yearId}}}),
      db.enrollmentSubject.findMany({where:{schoolId,enrollment:{classroom:{yearId}}}}),
      db.studentCharge.findMany({where:{schoolId,yearId}}),
      db.payment.findMany({where:{schoolId,yearId}}),
      db.adjustment.findMany({where:{schoolId,yearId}}),
    ]);
    assert.equal(workspace.data.seed.tag,TAG);
    assert.equal(academicYear.terms.length,4);
    const summary=validateYear({academicYear,tables:{classroom,enrollment,enrollmentSubject,studentCharge,payment},state:workspace.data});
    const ledger=new Map();for(const c of studentCharge){const key=`${c.studentId}:${c.term}`;ledger.set(key,(ledger.get(key)??0)+c.amount);}for(const p of payment){const key=`${p.studentId}:${p.term}`;ledger.set(key,ledger.get(key)-p.amount);}for(const a of adjustment){const key=`${a.studentId}:${a.term}`;ledger.set(key,ledger.get(key)+a.amount);}
    assert.ok([...ledger.values()].every(v=>v>=0));
    for(const r of workspace.data.reports) assert.ok(r.results.length+r.noMarks.length>=4);
    summary.paidTermBalances=[...ledger.values()].filter(n=>n===0).length;
    summary.outstandingTermBalances=[...ledger.values()].filter(n=>n>0).length;
    summaries.push(summary);console.log(JSON.stringify(summary));
  }
  const teacherCount=await db.membership.count({where:{schoolId:school.id,role:'TEACHER',active:true}});
  assert.equal(teacherCount,41,'40 original teachers plus the academic advisor with teacher access.');
  assert.equal(await db.student.count({where:{schoolId:school.id}}),1800);
  const originalYear=await db.academicYear.findUniqueOrThrow({where:{schoolId_name:{schoolId:school.id,name:'2026/2027'}}});
  assert.equal(await db.enrollment.count({where:{schoolId:school.id,classroom:{yearId:originalYear.id}}}),49);
  assert.equal(await db.classroom.count({where:{yearId:originalYear.id}}),3);
  const existingTeacher=await db.user.findFirstOrThrow({where:{name:'mwalimu kayombo'}});
  for(const year of years) assert.ok(await db.teachingAssignment.count({where:{schoolId:school.id,classroom:{yearId:year.id},membership:{userId:existingTeacher.id}}})>0);
  await writeFile('.runtime/kigoma-load-verified.json',JSON.stringify({school:school.name,passed:true,teachers:teacherCount,uniqueStudents:1800,originalYearPreserved:true,summaries},null,2));
  console.log('PASS: persisted data, original records, current teacher access, marks, and fee balances verified.');
} finally {await db.$disconnect();}
