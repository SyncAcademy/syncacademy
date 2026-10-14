// Deterministic, additive load-test data. Existing school records and credentials are preserved.
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

export const TAG = 'kigoma-load-v1';
export const uid = key => {
  const h = createHash('sha256').update(`${TAG}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
const number = (key, max) => parseInt(createHash('sha256').update(key).digest('hex').slice(0,8),16) % max;
const date = (year, month, day = 1) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const stamp = value => `${value}T12:00:00.000Z`;
const dbDate = value => new Date(`${value}T00:00:00.000Z`);
const firstNames = ['Amina','Baraka','Neema','Juma','Rehema','Joseph','Grace','Hassan','Esther','Emmanuel','Fatuma','Daniel','Zawadi','Ibrahim','Agnes','Peter','Asha','David','Upendo','Kelvin','Halima','John','Joyce','Saidi','Ruth','Felix','Mariam','Godfrey','Elizabeth','James','Sarah','Noel','Diana','Yusuph','Catherine','Elia','Hawa','Michael','Edna','Frank'];
const surnames = ['Mbilinyi','Mwakalinga','Juma','Mushi','Kabwe','Mhando','Msuya','Ndayisaba','Kassimu','Magesa','Kato','Komba','Mollel','Mwakipesile','Nyanda','Chacha','Massawe','Mapunda','Mganga','Mfaume','Mwasonga','Mshana','Mwakibete','Kisanga','Mussa','Bwire','Mugisha','Nkurunziza','Kileo','Shayo','Lema','Mbwana','Mwaipaja','Mashauri','Kagoma','Ngalula','Kasuku','Mwangosi','Mrema','Mwakilima'];
const nameFor = key => `${firstNames[number(key,firstNames.length)]} ${firstNames[number(key+'middle',firstNames.length)]} ${surnames[number(key+'surname',surnames.length)]}`;
export const subjects = [
  ['CIV','Civics'],['HIST','History'],['GEO','Geography'],['KIS','Kiswahili'],['ENG','English Language'],['BIO','Biology'],['MATH','Basic Mathematics'],
  ['PHY','Physics'],['CHEM','Chemistry'],['BK','Bookkeeping'],['COM','Commerce'],['BIBLE','Bible Knowledge'],['ICS','Information and Computer Studies'],
  ['AMATH','Advanced Mathematics'],['ECON','Economics'],['GS','General Studies'],
];
const aliases = {ENG:['english'],MATH:['mathematics'],BK:['book keeping','book-keeping'],ICS:['computer studies']};
export const core = ['CIV','HIST','GEO','KIS','ENG','BIO','MATH'];
export const combinations = {PCM:['PHY','CHEM','AMATH'],PGM:['PHY','GEO','AMATH'],PCB:['PHY','CHEM','BIO'],HGL:['HIST','GEO','ENG'],HGK:['HIST','GEO','KIS'],HGE:['HIST','GEO','ECON']};
const policy = {revision:1,passMark:35,bands:[{label:'A',minimum:75},{label:'B',minimum:65},{label:'C',minimum:45},{label:'D',minimum:30},{label:'F',minimum:0}]};
const advancedPolicy = {revision:1,passMark:35,bands:[{label:'A',minimum:80},{label:'B',minimum:70},{label:'C',minimum:60},{label:'D',minimum:50},{label:'E',minimum:40},{label:'S',minimum:35},{label:'F',minimum:0}]};
const grade = (mark,p) => p.bands.find(b=>mark>=b.minimum).label;
export const classSpecs = [1,2,3,4].flatMap(form=>['A','B','C'].map(stream=>({form,stream,name:`Form ${form}${stream}`}))).concat([5,6].flatMap(form=>['Science','Arts'].map(stream=>({form,stream,name:`Form ${form} ${stream} Class`}))));

export function buildCatalogue(school, existingSubjects, existingTeachers) {
  const catalogue = subjects.map(([code,name])=>existingSubjects.find(s=>[name.toLowerCase(),...(aliases[code]??[])].includes(s.name.toLowerCase()))??{id:uid(`${school.id}:subject:${code}`),schoolId:school.id,code,name});
  const byCode = Object.fromEntries(subjects.map(([code],i)=>[code,catalogue[i]]));
  const teacherOrder = m => { const i=Array.from({length:40},(_,i)=>uid(`${school.id}:member:${i}`)).indexOf(m.id); return i<0?-1:i; };
  const teachers = existingTeachers.filter(m=>m.active&&m.user.enabled).sort((a,b)=>teacherOrder(a)-teacherOrder(b)||a.id.localeCompare(b.id));
  if (teachers.length>40) throw new Error('More than 40 active teachers already exist; refusing to remove staff.');
  const newUsers=[], newMemberships=[];
  for(let i=teachers.length;i<40;i++) {
    const user={id:uid(`${school.id}:teacher:${i}`),name:nameFor(`teacher${i}`),email:`kigoma.load.teacher.${i+1}@example.invalid`,enabled:true,mustChangePassword:true,createdAt:dbDate('2022-01-01')};
    const member={id:uid(`${school.id}:member:${i}`),schoolId:school.id,userId:user.id,role:'TEACHER',active:true,createdAt:dbDate('2022-01-01')};
    newUsers.push(user); newMemberships.push(member); teachers.push({...member,user});
  }
  return {catalogue,byCode,teachers,newUsers,newMemberships};
}

// Each cohort stays in the same stream, advances one form per year, and leaves after Form 4/6.
export function createCohorts(school, existingStudents, existingEnrollments) {
  const students=new Map(), overrides=new Map();
  for(const stream of ['A','B','C']) {
    const rows=existingEnrollments.filter(e=>e.status==='active'&&new RegExp(`^form\\s*1\\s*${stream}$`,'i').test(e.classroom.name));
    const unique=[...new Set(rows.map(e=>e.studentId))];
    if(unique.length>50) throw new Error(`Existing Form 1${stream} exceeds 50 students.`);
    unique.forEach((id,index)=>overrides.set(`O:2026:${stream}:${index}`,existingStudents.find(s=>s.id===id)));
  }
  function get(year,spec,index) {
    const start=year-(spec.form>4?spec.form-5:spec.form-1);
    const key=`${spec.form>4?'A':'O'}:${start}:${spec.stream}:${index}`;
    if(!students.has(key)) {
      const existing=overrides.get(key);
      const id=uid(`${school.id}:student:${key}`);
      students.set(key,existing??{id,schoolId:school.id,admissionNumber:`KGL-${start}-${spec.form>4?'A':'O'}${spec.stream.slice(0,1)}-${String(index+1).padStart(3,'0')}`,
        name:nameFor(key),gender:index%2?'M':'F',dateOfBirth:dbDate(date(start-(spec.form>4?17:13),1+index%12,1+index%27)),
        admissionDate:dbDate(date(start,1,5)),address:`${['Ujiji','Kigoma Town','Bangwe','Mwanga','Gungu','Katubuka'][index%6]}, Kigoma`,
        ownPhone:'',guardianName:nameFor(key+'guardian'),guardianPhone:'',createdAt:dbDate(date(start,1,5))});
    }
    return {student:students.get(key),key,start,index};
  }
  return {get,students};
}

export function makeYear({school,actorId,year,catalogue,cohorts,asOf='2026-10-12'}) {
  const schoolId=school.id, yearId=uid(`${schoolId}:year:${year}`), start=date(year,1,1);
  const terms=[1,2,3,4].map(t=>({key:`Term ${t}`,name:`Term ${t}`,startsAt:date(year,t*3-2),endsAt:date(year,t*3,[31,30,30,31][t-1])}));
  const academicYear={id:yearId,schoolId,name:String(year),startsAt:dbDate(start),endsAt:dbDate(date(year,12,31)),terms,closed:year<2026};
  const tables={classroom:[],classSubject:[],enrollment:[],enrollmentSubject:[],teachingAssignment:[],admission:[],registryEvent:[],feeStructure:[],studentCharge:[],payment:[],adjustment:[],rosterIssue:[]};
  const state={assessments:[],submissions:[],slots:[],syllabus:[],support:[],audit:[],reports:[],attendance:[],classTeachers:[],notifications:[],policy:{...policy,passMark:30},seed:{tag:TAG,asOf,schoolId}};
  const {byCode,teachers}=catalogue;
  for(let t=1;t<=4;t++) for(let a=1;a<=3;a++) {
    const deadline=date(year,t*3-3+a,10);
    state.assessments.push({id:uid(`${yearId}:assessment:${t}:${a}`),yearId,name:['Monthly Test','Midterm Assessment','End of Term Examination'][a-1],term:`Term ${t}`,deadline,status:deadline<=asOf?'closed':a===2?'open':'draft',createdAt:stamp(terms[t-1].startsAt)});
  }
  for(const [ci,spec] of classSpecs.entries()) {
    const classId=uid(`${yearId}:class:${spec.name}`), advanced=spec.form>4;
    const offerings=advanced?[...new Set((spec.stream==='Science'?['PCM','PGM','PCB']:['HGL','HGK','HGE']).flatMap(c=>combinations[c]).concat('GS'))]:subjects.slice(0,13).map(s=>s[0]);
    tables.classroom.push({id:classId,schoolId,yearId,name:spec.name});
    tables.classSubject.push(...offerings.map(code=>({schoolId,classroomId:classId,subjectId:byCode[code].id})));
    const classTeacher=teachers[ci%teachers.length];
    state.classTeachers.push({id:uid(`${classId}:classTeacher`),classId,yearId,teacherId:classTeacher.userId,membershipId:classTeacher.id,teacherName:classTeacher.user.name,at:stamp(start)});
    tables.teachingAssignment.push({id:uid(`${classId}:whole`),schoolId,classroomId:classId,membershipId:classTeacher.id,confirmedAt:dbDate(start)});
    const roster=Array.from({length:50},(_,i)=>{
      const item=cohorts.get(year,spec,i);
      const mix=(i+number(`${item.start}:${spec.stream}`,6))%6;
      const combo=advanced?(spec.stream==='Science'?['PCM','PGM','PCB']:['HGL','HGK','HGE'])[(i+item.start)%3]:null;
      const codes=advanced?[...combinations[combo],'GS']:[...core,...(mix%2?['BK','COM']:['PHY','CHEM']),...(mix>=4?['ICS']:mix>=2?['BIBLE']:[])];
      const enrollmentId=uid(`${classId}:enrollment:${item.student.id}`);
      tables.enrollment.push({id:enrollmentId,schoolId,studentId:item.student.id,classroomId:classId,status:'active',createdAt:dbDate(date(year,1,5))});
      tables.enrollmentSubject.push(...codes.map(code=>({schoolId,enrollmentId,subjectId:byCode[code].id})));
      const prev=year>2022&&spec.form!==1&&spec.form!==5?uid(`${uid(`${schoolId}:year:${year-1}`)}:class:${advanced?`Form 5 ${spec.stream} Class`:`Form ${spec.form-1}${spec.stream}`}`):null;
      tables.registryEvent.push({id:uid(`${enrollmentId}:event`),schoolId,yearId,studentId:item.student.id,actorId,kind:prev?'progression':'admission',message:prev?`${item.student.name} progressed to ${spec.name}.`:`${item.student.name} enrolled in ${spec.name}${combo?` (${combo})`:''}. Synthetic load-test record.`,fromClassId:prev,toClassId:classId,createdAt:dbDate(date(year,1,5))});
      if(!prev) tables.admission.push({id:uid(`${enrollmentId}:admission`),schoolId,yearId,requestedClassId:classId,studentId:item.student.id,name:item.student.name,gender:item.student.gender,dateOfBirth:item.student.dateOfBirth,address:item.student.address??'',guardianName:item.student.guardianName??'',guardianPhone:item.student.guardianPhone??'',admissionDate:dbDate(date(year,1,5)),status:'accepted',note:`Synthetic admission${combo?` for ${combo}`:''}.`,createdAt:dbDate(start),decidedAt:dbDate(date(year,1,5))});
      return {...item,codes,combo};
    });
    const assignments=offerings.map((code,si)=>{
      // Rotate through all 40 teachers, including the existing login.
      const teacher=teachers[(ci*7+si)%40], subject=byCode[code];
      const assignment={id:uid(`${classId}:subject:${subject.id}`),schoolId,classroomId:classId,subjectId:subject.id,membershipId:teacher.id,confirmedAt:dbDate(date(year,1,6))};
      tables.teachingAssignment.push(assignment);
      for(let t=1;t<=4;t++) for(let topic=0;topic<3;topic++) state.syllabus.push({id:uid(`${assignment.id}:topic:${t}:${topic}`),yearId,assignmentId:assignment.id,topic:`${subject.name}: ${['Foundations and key concepts','Applications and practical exercises','Revision and problem solving'][topic]} — Term ${t}`,due:date(year,t*3-2+topic,20),completed:date(year,t*3-2+topic,20)<asOf&&number(`${assignment.id}:${topic}:${t}`,10)>0,createdAt:stamp(start)});
      return {assignment,teacher,subject,code};
    });
    for(const [ai,exam] of state.assessments.entries()) {
      const reportMap=new Map(), current=exam.status!=='closed';
      if(exam.status==='draft') continue;
      for(const [si,{assignment,teacher,subject,code}] of assignments.entries()) {
        const p=advanced?advancedPolicy:{...policy,passMark:30};
        const status=current?['draft','submitted','returned','approved'][(si+ci)%4]:'approved';
        const saved=exam.deadline>asOf?asOf:exam.deadline;
        const entries=roster.filter(r=>r.codes.includes(code)).map(r=>{
          const absence=!current&&number(`${r.key}:${code}:${year}:${ai}:absent`,75)===0;
          const incomplete=status==='draft'&&number(`${r.key}:${code}`,4)===0;
          const ability=25+number(r.key,60), change=number(`${r.key}:${code}:${year}:${ai}`,31)-15+(year-2022);
          const mark=absence||incomplete?null:Math.max(4,Math.min(99,ability+change));
          return {studentId:r.student.id,studentNumber:r.student.admissionNumber,fullName:r.student.name,gender:r.student.gender??'',marksValue:mark,noMark:absence,comments:absence?'Absent with permission':mark===null?'':mark<30?'Needs guided revision':mark>=75?'Excellent understanding':'Keep practising',lastSaved:incomplete?null:stamp(saved)};
        });
        const submission={id:uid(`${exam.id}:${assignment.id}`),createdAt:stamp(terms[Math.floor(ai/3)].startsAt),teachingId:assignment.id,classId,subjectId:subject.id,teacherId:teacher.userId,teacherName:teacher.user.name,className:spec.name,classStream:null,subjectName:subject.name,subjectCode:subject.code,academicYearId:yearId,academicYearLabel:String(year),assessmentId:exam.id,assessmentName:`${exam.term} / ${exam.name}`,studentCount:entries.length,rosterStatus:'confirmed',revision:status==='approved'?4:2,entries,gradingPolicy:p,assessmentProgress:{total:entries.length,completed:entries.filter(e=>e.marksValue!==null||e.noMark).length,status,submittedAt:status==='draft'?null:stamp(saved),approvedAt:status==='approved'?stamp(saved):null,returnReason:status==='returned'?'Please verify the practical assessment scores before resubmitting.':null}};
        state.submissions.push(submission);
        if(!current) for(const m of entries) {
          const r=reportMap.get(m.studentId)??{id:`${exam.id}:${classId}:${m.studentId}`,academicYearId:yearId,assessmentId:exam.id,classId,createdAt:stamp(saved),student:m.fullName,studentNumber:m.studentNumber,className:spec.name,period:`${year} / ${exam.term} / ${exam.name}`,academicApproved:true,status:year<2026||ai<8?'approved':'generated',recipients:[],results:[],noMarks:[]};
          if(m.marksValue!==null) r.results.push({subject:subject.name,mark:m.marksValue,grade:grade(m.marksValue,p)});else r.noMarks.push(subject.name);
          reportMap.set(m.studentId,r);
        }
        // One class per day prevents invigilator/room collisions across classes.
        const slotDate=new Date(dbDate(exam.deadline));slotDate.setUTCDate(slotDate.getUTCDate()-9+Math.floor(si/3));
        const hour=8+(si%3)*3;
        state.slots.push({id:uid(`${submission.id}:slot`),yearId,assessmentId:exam.id,className:spec.name,subject:subject.name,teacher:teachers[ci].user.name,room:`Room ${ci+1}`,date:slotDate.toISOString().slice(0,10),start:`${hour.toString().padStart(2,'0')}:00`,end:`${(hour+2).toString().padStart(2,'0')}:00`,createdAt:stamp(start)});
        if(current||ai===9) state.notifications.push({id:uid(`${submission.id}:notice`),type:status==='returned'?'marks_returned':'marks_approved',relatedAssignmentId:submission.id,readBy:[],createdAt:stamp(saved),message:`${spec.name} / ${subject.name}: ${status}.`});
      }
      state.reports.push(...reportMap.values());
    }
    for(const term of terms) {
      const t=Number(term.key.at(-1)), tuition=(advanced?220000:150000)+(year-2022)*10000;
      for(const [fi,feeName] of ['Tuition','Meals','Learning materials'].entries()) {
        const amount=[tuition,80000,25000][fi], due=date(year,t*3-2,20), feeId=uid(`${classId}:${term.key}:${feeName}`);
        tables.feeStructure.push({id:feeId,schoolId,yearId,classroomId:classId,term:term.key,name:feeName,amount,dueDate:dbDate(due),locked:year<2026,createdAt:dbDate(term.startsAt)});
        for(const r of roster) {
          const chargeId=uid(`${feeId}:${r.student.id}`), bucket=number(`${r.key}:${year}:${t}`,10), future=term.startsAt>asOf;
          tables.studentCharge.push({id:chargeId,schoolId,feeId,yearId,classroomId:classId,studentId:r.student.id,term:term.key,name:feeName,amount,dueDate:dbDate(due),createdAt:dbDate(term.startsAt)});
          const discount=fi===0&&bucket===8?30000:0;
          if(discount&&!future) tables.adjustment.push({id:uid(`${chargeId}:discount`),schoolId,yearId,studentId:r.student.id,term:term.key,amount:-discount,kind:'Scholarship',reason:'Synthetic needs-based scholarship for UI load testing.',actorId,createdAt:dbDate(date(year,t*3-2,6))});
          const fraction=bucket<6?1:bucket<9?.5:0, paid=future?0:Math.floor((amount-discount)*fraction);
          if(paid) {
            const split=bucket%3===0?[Math.floor(paid*.6),paid-Math.floor(paid*.6)]:[paid];
            split.forEach((part,pi)=>{const id=uid(`${chargeId}:payment:${pi}`);tables.payment.push({id,schoolId,yearId,studentId:r.student.id,chargeId,term:term.key,amount:part,method:['Cash','Bank transfer','Mobile money'][(r.index+pi)%3],reference:`LOAD-${year}-${id.slice(0,8)}`,date:dbDate(date(year,t*3-2,7+pi*3)),receipt:`KGL-${id}`,createdAt:dbDate(date(year,t*3-2,7+pi*3))});});
          }
        }
      }
      // Forty weekdays per term; current-year attendance stops at the as-of date.
      let count=0;
      for(let day=new Date(dbDate(term.startsAt));day.toISOString().slice(0,10)<=term.endsAt&&count<40;day.setUTCDate(day.getUTCDate()+1)) {
        const d=day.toISOString().slice(0,10);
        if(d<date(year,1,5)||d>asOf||[0,6].includes(day.getUTCDay())) continue;
        count++;
        state.attendance.push({id:uid(`${classId}:attendance:${d}`),yearId,classId,date:d,teacherId:classTeacher.userId,teacherName:classTeacher.user.name,savedAt:stamp(d),revision:1,reason:'',entries:roster.map(r=>{const x=number(`${r.key}:${d}`,100);const status=x<88?'Present':x<93?'Late':x<97?'Absent':'Excused';return {studentId:r.student.id,student:r.student.name,number:r.student.admissionNumber,status,note:status==='Excused'?'Guardian notified the school.':''};})});
      }
    }
    for(let i=0;i<3;i++) {
      const r=roster[i], a=assignments.find(a=>r.codes.includes(a.code)), status=year<2026?'completed':['pending','accepted','rejected'][i];
      state.support.push({id:uid(`${classId}:support:${i}`),yearId,student:r.student.name,studentNumber:r.student.admissionNumber,className:spec.name,subject:a.subject.name,action:'Weekly guided revision, practice exercises, and a progress review with the class teacher.',teacherMembershipId:a.teacher.id,teacherId:a.teacher.userId,owner:a.teacher.user.name,due:date(year,10,20),createdAt:stamp(date(year,9,20)),status,responseReason:status==='rejected'?'Please assign a teacher available for the afternoon session.':'',respondedAt:status==='pending'?null:stamp(date(year,9,21))});
    }
    for(let i=0;i<3;i++) tables.admission.push({id:uid(`${classId}:applicant:${i}`),schoolId,yearId,requestedClassId:classId,name:nameFor(`${classId}:applicant:${i}`),gender:i%2?'M':'F',address:'Kigoma, Tanzania',status:year===2026&&i<2?'pending':'rejected',note:year===2026&&i<2?'Synthetic application awaiting document verification.':'Synthetic application: required documents were not supplied.',createdAt:dbDate(date(year,9,25)),decidedAt:year===2026&&i<2?null:dbDate(date(year,9,28))});
    const issueAssignment=assignments[0];
    tables.rosterIssue.push({id:uid(`${classId}:rosterIssue`),schoolId,assignmentId:issueAssignment.assignment.id,studentId:roster[0].student.id,reportedBy:issueAssignment.teacher.userId,issueType:'other',description:'Synthetic spelling check requested for the student register.',status:'resolved',resolution:'Verified the name against the admission register.',resolvedBy:actorId,resolvedAt:dbDate(date(year,1,9)),createdAt:dbDate(date(year,1,8))});
    state.audit.push({id:uid(`${classId}:audit`),yearId,at:stamp(start),actorId,message:`${spec.name}: synthetic roster, teaching allocations, assessments and operational records loaded.`});
  }
  return {academicYear,tables,state};
}

export function validateYear(plan) {
  const {tables:t,state:s}=plan;
  if(t.classroom.length!==16||t.enrollment.length!==800||s.assessments.length!==12) throw new Error('Unexpected class, student, or assessment count.');
  const students=new Set();
  for(const c of t.classroom) {
    const rows=t.enrollment.filter(e=>e.classroomId===c.id);
    if(rows.length!==50) throw new Error(`${c.name}: expected 50 students.`);
    for(const e of rows) {if(students.has(e.studentId)) throw new Error('Student enrolled twice in one year.');students.add(e.studentId);}
  }
  const enrollment=new Map(t.enrollment.map(e=>[`${e.classroomId}:${e.studentId}`,e]));
  const selections=new Set(t.enrollmentSubject.map(e=>`${e.enrollmentId}:${e.subjectId}`));
  for(const sub of s.submissions) for(const e of sub.entries) {
    const row=enrollment.get(`${sub.classId}:${e.studentId}`);
    if(!row||!selections.has(`${row.id}:${sub.subjectId}`)) throw new Error('Marks recorded for an unenrolled subject.');
    if(e.marksValue!==null&&(e.marksValue<0||e.marksValue>100)) throw new Error('Mark outside range.');
    if(sub.assessmentProgress.status==='approved'&&e.marksValue===null&&!e.noMark) throw new Error('Incomplete approved result.');
  }
  return {year:plan.academicYear.name,classes:t.classroom.length,enrollments:t.enrollment.length,assessments:s.assessments.length,submissions:s.submissions.length,marks:s.submissions.reduce((n,a)=>n+a.entries.filter(e=>e.marksValue!==null).length,0),reports:s.reports.length,attendanceSheets:s.attendance.length,attendanceEntries:s.attendance.reduce((n,a)=>n+a.entries.length,0),charges:t.studentCharge.length,payments:t.payment.length,workspaceMiB:+(Buffer.byteLength(JSON.stringify(s))/1048576).toFixed(2)};
}

async function main() {
  config({quiet:true});
  const apply=process.argv.includes('--apply');
  const docker=process.argv.includes('--docker');
  const url=new URL(process.env.DATABASE_URL);
  if(docker){url.hostname='localhost';url.port='55432';url.username='syncacademy_runtime';url.password=process.env.RUNTIME_DB_PASSWORD;}
  const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
  try {
    const matches=await db.school.findMany({where:{name:{contains:'KIGOMA',mode:'insensitive'}},include:{memberships:{include:{user:true}},subjects:true,students:true,years:true}});
    if(matches.length!==1||matches[0].code!=='1776') throw new Error('Expected the existing Kigoma school (code 1776). No records were changed.');
    const school=matches[0], actor=school.memberships.find(m=>m.active&&m.role==='HEADMASTER');
    if(!actor) throw new Error('The existing headmaster is required.');
    const marker=await db.auditEvent.findFirst({where:{schoolId:school.id,action:'LOAD_DATA_COMPLETED',target:TAG}});
    if(marker){console.log('This dataset is already complete. Existing records were not modified.');return;}
    const generatedYearIds=[2022,2023,2024,2025,2026].map(y=>uid(`${school.id}:year:${y}`));
    const prior=await db.enrollment.findMany({where:{schoolId:school.id,classroom:{yearId:{notIn:generatedYearIds}}},include:{classroom:true}});
    const catalogue=buildCatalogue(school,school.subjects,school.memberships.filter(m=>m.role==='TEACHER'));
    const cohorts=createCohorts(school,school.students,prior);
    const report={tag:TAG,school:school.name,code:school.code,applied:apply,years:[],preservedYears:school.years.filter(y=>!/^202[2-6]$/.test(y.name)).map(y=>y.name)};
    const collision=school.years.find(y=>/^202[2-6]$/.test(y.name)&&y.id!==uid(`${school.id}:year:${y.name}`));
    if(collision) throw new Error(`Existing ${collision.name} is not owned by this generator; refusing to overwrite it.`);
    if(apply) {
      const passwordHash=await argon2.hash(randomBytes(48).toString('base64url'),{type:argon2.argon2id});
      await db.$transaction(async tx=>{
        await tx.user.createMany({data:catalogue.newUsers.map(u=>({...u,passwordHash})),skipDuplicates:true});
        await tx.membership.createMany({data:catalogue.newMemberships,skipDuplicates:true});
        await tx.subject.createMany({data:catalogue.catalogue.filter(s=>!school.subjects.some(old=>old.id===s.id)),skipDuplicates:true});
      });
    }
    const seenStudents=new Set(school.students.map(s=>s.id));
    for(let year=2022;year<=2026;year++) {
      const plan=makeYear({school,actorId:actor.userId,year,catalogue,cohorts});
      const summary=validateYear(plan);report.years.push(summary);console.log(JSON.stringify(summary));
      if(!apply) continue;
      const existing=await db.academicWorkspace.findUnique({where:{yearId:plan.academicYear.id}});
      if(existing?.data?.seed?.tag===TAG) {console.log(`${year}: already loaded; preserved.`);continue;}
      if(existing) throw new Error(`${year}: unexpected workspace; refusing to replace.`);
      const fresh=[...cohorts.students.values()].filter(s=>!seenStudents.has(s.id));
      await db.$transaction(async tx=>{
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(17762026)`;
        await tx.student.createMany({data:fresh,skipDuplicates:true});
        await tx.academicYear.create({data:plan.academicYear});
        for(const [model,rows] of Object.entries(plan.tables)) for(let i=0;i<rows.length;i+=1000) await tx[model].createMany({data:rows.slice(i,i+1000)});
        await tx.academicWorkspace.create({data:{yearId:plan.academicYear.id,schoolId:school.id,data:plan.state}});
        await tx.auditEvent.create({data:{schoolId:school.id,actorId:actor.userId,action:'LOAD_DATA_YEAR_CREATED',target:`${TAG}:${year}`}});
      },{timeout:300000,maxWait:20000});
      fresh.forEach(s=>seenStudents.add(s.id));
    }
    report.uniqueStudents=cohorts.students.size;report.teachers=catalogue.teachers.length;
    if(apply) await db.auditEvent.create({data:{schoolId:school.id,actorId:actor.userId,action:'LOAD_DATA_COMPLETED',target:TAG}});
    await mkdir('.runtime',{recursive:true});await writeFile(`.runtime/${TAG}-${apply?'applied':'preview'}.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify({applied:apply,uniqueStudents:report.uniqueStudents,teachers:report.teachers,preservedYears:report.preservedYears}));
  } finally {await db.$disconnect();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error(e.message);process.exitCode=1;});
