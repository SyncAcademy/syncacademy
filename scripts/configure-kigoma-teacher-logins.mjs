import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { config, parse } from 'dotenv';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

config({quiet:true});
const url=new URL(process.env.DATABASE_URL);
url.hostname='localhost';url.port='55432';url.username='syncacademy_runtime';url.password=process.env.RUNTIME_DB_PASSWORD;
const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
const begin='# BEGIN KIGOMA TEACHER TEST LOGINS';
const end='# END KIGOMA TEACHER TEST LOGINS';
try {
  const school=await db.school.findUniqueOrThrow({where:{code:'1776'}});
  assert.match(school.name,/kigoma/i);
  const advisors=await db.membership.findMany({where:{schoolId:school.id,role:'ACADEMIC',active:true},include:{user:true}});
  assert.equal(advisors.length,1,'Expected the existing academic advisor.');
  const advisor=advisors[0];
  const teachers=await db.membership.findMany({where:{schoolId:school.id,role:'TEACHER',active:true},include:{user:true}});
  assert.ok(teachers.length>=40,'Expected the 40 existing teachers.');
  const users=[...new Map([...teachers,advisor].map(m=>[m.userId,m.user])).values()];
  await mkdir('.runtime',{recursive:true,mode:0o700});
  const credentialsPath='.runtime/kigoma-teacher-logins.credentials.txt';
  let oldBlock='';
  try { oldBlock=await readFile(credentialsPath,'utf8'); } catch {}
  const password=oldBlock.match(/^# Shared password: (.+)$/m)?.[1]?.trim()??`Kigoma!${randomBytes(15).toString('base64url')}`;
  const hashes=new Map();
  for(const user of users) hashes.set(user.id,await argon2.hash(password,{type:argon2.argon2id}));
  const backup=`.runtime/kigoma-teacher-accounts-before-${Date.now()}.json`;
  await writeFile(backup,JSON.stringify({users:users.map(u=>({id:u.id,passwordHash:u.passwordHash,enabled:u.enabled,mustChangePassword:u.mustChangePassword,sessionVersion:u.sessionVersion})),teacherMemberships:teachers.map(({user,...m})=>m)},null,2),{mode:0o600,flag:'wx'});
  const classes=await db.classroom.findMany({where:{schoolId:school.id},include:{year:true,subjects:true},orderBy:[{year:{name:'asc'}},{name:'asc'}]});
  const allocations=await db.teachingAssignment.findMany({where:{schoolId:school.id},include:{membership:{include:{user:true}}}});
  const classRows=await db.$queryRaw`SELECT "yearId", data->'classTeachers' AS teachers FROM "AcademicWorkspace" WHERE "schoolId"=${school.id}::uuid`;
  // Keep the authoritative class teacher in the workspace and ensure its relational assignment exists.
  const classTeachers=classes.map(c=>{
    const matches=(classRows.find(w=>w.yearId===c.yearId)?.teachers??[]).filter(t=>t.classId===c.id&&!t.endedAt);
    assert.equal(matches.length,1,`${c.year.name}/${c.name}: expected exactly one current class teacher.`);
    assert.ok(teachers.some(m=>m.id===matches[0].membershipId&&m.userId===matches[0].teacherId),`${c.name}: class teacher must be an active teacher.`);
    return {...matches[0],year:c.year.name,className:c.name};
  });
  let filled=0,advisorAssignments=0;
  await db.$transaction(async tx=>{
    const advisorTeacher=await tx.membership.upsert({where:{userId_schoolId_role:{userId:advisor.userId,schoolId:school.id,role:'TEACHER'}},create:{userId:advisor.userId,schoolId:school.id,role:'TEACHER',active:true},update:{active:true}});
    for(const user of users) await tx.user.update({where:{id:user.id},data:{passwordHash:hashes.get(user.id),mustChangePassword:false,enabled:true,sessionVersion:{increment:1}}});
    const teacherIds=[...new Set([...teachers.map(m=>m.id),advisorTeacher.id])];
    for(const c of classes) for(const offering of c.subjects) {
      const covered=allocations.some(a=>a.classroomId===c.id&&a.subjectId===offering.subjectId&&teacherIds.includes(a.membershipId));
      if(!covered){await tx.teachingAssignment.create({data:{schoolId:school.id,classroomId:c.id,subjectId:offering.subjectId,membershipId:teacherIds[filled%teacherIds.length],confirmedAt:new Date()}});filled++;}
    }
    const math=await tx.subject.findFirstOrThrow({where:{schoolId:school.id,code:'MATH'}});
    for(const c of classes.filter(c=>/^form\s*1\s*b$/i.test(c.name))) {
      if(!c.subjects.some(s=>s.subjectId===math.id))continue;
      await tx.teachingAssignment.upsert({where:{schoolId_membershipId_classroomId_subjectId:{schoolId:school.id,membershipId:advisorTeacher.id,classroomId:c.id,subjectId:math.id}},create:{schoolId:school.id,membershipId:advisorTeacher.id,classroomId:c.id,subjectId:math.id,confirmedAt:new Date()},update:{confirmedAt:new Date()}});advisorAssignments++;
    }
    for(const ct of classTeachers) {
      const whole=await tx.teachingAssignment.findMany({where:{schoolId:school.id,classroomId:ct.classId,subjectId:null}});
      assert.ok(whole.every(a=>a.membershipId===ct.membershipId),'Conflicting whole-class assignments require review.');
      assert.ok(whole.length<=1,'Duplicate whole-class assignments require review.');
      if(!whole.length)await tx.teachingAssignment.create({data:{schoolId:school.id,classroomId:ct.classId,membershipId:ct.membershipId,confirmedAt:new Date()}});
    }
    await tx.auditEvent.create({data:{schoolId:school.id,actorId:advisor.userId,action:'TEACHER_TEST_LOGINS_CONFIGURED',target:`${users.length} teacher logins; ${filled} subject gaps filled; advisor teaching access enabled`}});
  },{timeout:60000});
  const finalTeachers=await db.membership.findMany({where:{schoolId:school.id,role:'TEACHER',active:true},include:{user:true,assignments:{include:{subject:true,classroom:{include:{year:true}}}}},orderBy:{user:{email:'asc'}}});
  for(const member of finalTeachers){assert.ok(await argon2.verify(member.user.passwordHash,password));assert.equal(member.user.mustChangePassword,false);assert.ok(member.assignments.some(a=>a.subjectId),'Every teacher needs a subject assignment.');}
  const block=[begin,'# School: KIGOMA SECONDARY (1776), Docker database on localhost:55432',
    '# Login role: Teacher. Choose academic year 2026 to explore the large dataset.',
    `# Shared password: ${password}`,
    '# Existing teacher and academic-advisor accounts now use this password too.',
    '# The advisor can select Academic or Teacher with the same existing email.',
    '# All teacher accounts have the same TEACHER role; records remain scoped to their assignments.',
    '# Number | Email | Name | Additional role | Subjects taught',
    ...finalTeachers.map((m,i)=>`# ${i+1} | ${m.user.email} | ${m.user.name} | ${m.userId===advisor.userId?'Academic advisor':'Teacher'} | ${[...new Set(m.assignments.flatMap(a=>a.subject?[a.subject.name]:[]))].sort().join(', ')}`),
    '# Class teachers (exactly one per class per academic year):',
    ...classTeachers.map(c=>`# ${c.year} | ${c.className} | ${finalTeachers.find(m=>m.id===c.membershipId).user.email}`),end,''].join('\n');
  await writeFile(credentialsPath,block,{mode:0o600});
  console.log(JSON.stringify({teacherAccounts:finalTeachers.length,sharedPasswordsVerified:true,subjectGapsFilled:filled,advisorTeachingAssignments:advisorAssignments,classesWithOneClassTeacher:classTeachers.length,credentialsFile:credentialsPath,backup}));
} finally {await db.$disconnect();}
