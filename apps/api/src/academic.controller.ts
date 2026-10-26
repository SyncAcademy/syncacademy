import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { addClassSubjectsToEnrollments } from './registry-support';
import { requireYearTerm } from './academic-terms';
import { academicOverviewQuery, academicMarksQuery } from './academic-overview';
const classLabel=(name:string)=>name.replace(/(\d)\s+([A-Za-z])$/, '$1$2');
const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(200);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v);
const policySchema = z.object({passMark:z.number().min(0).max(100), bands:z.array(z.object({label:z.string().trim().min(1).max(12),minimum:z.number().min(0).max(100)})).min(2).max(20)});
const defaultPolicy = {revision:1,passMark:35,bands:[{label:'A',minimum:80},{label:'B',minimum:65},{label:'C',minimum:50},{label:'D',minimum:35},{label:'F',minimum:0}]};
const parse = <S extends z.ZodTypeAny>(schema:S,input:unknown):z.output<S> => { const r=schema.safeParse(input);if(!r.success)throw new BadRequestException(r.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));return r.data; };
const empty = ():any => ({assessments:[],submissions:[],slots:[],syllabus:[],support:[],audit:[],reports:[],attendance:[],classTeachers:[],notifications:[],policy:defaultPolicy});
const grade=(mark:number,policy:any)=>policy.bands.find((b:any)=>mark>=b.minimum)?.label;
@Controller('api/v1/schools/:schoolId/academics')
export class AcademicController {
 constructor(private readonly svc:PlatformService) {}
 private async saveSupport(tx:Prisma.TransactionClient,schoolId:string,yearId:string,payload:unknown,user:any,teacher:boolean) {
  if(teacher)throw new ForbiddenException('Academic Master or Headmaster access required.');
  const p=parse(z.object({studentNumber:text,className:text,subject:text,action:z.string().trim().min(10).max(2000),teacherMembershipId:uuid,due:date}).strict(),payload);
  const year=await tx.academicYear.findFirst({where:{id:yearId,schoolId}});
  if(!year)throw new BadRequestException('Choose an academic year in this school.');
  if(p.due<year.startsAt.toISOString().slice(0,10)||p.due>year.endsAt.toISOString().slice(0,10))throw new BadRequestException('Date must fall within the academic year.');
  const classroom=(await tx.classroom.findMany({where:{schoolId,yearId}})).find(c=>classLabel(c.name)===p.className);
  const subject=await tx.subject.findFirst({where:{schoolId,name:p.subject}});
  const student=classroom&&subject?await tx.student.findFirst({where:{schoolId,admissionNumber:p.studentNumber,enrollments:{some:{classroomId:classroom.id,status:'active',subjects:{some:{subjectId:subject.id}}}}}}):null;
  const teacherMember=await tx.membership.findFirst({where:{id:p.teacherMembershipId,schoolId,role:'TEACHER',active:true,user:{enabled:true}},include:{user:true}});
  if(!classroom||!student||!subject||!teacherMember)throw new BadRequestException('Choose an enrolled student, class, subject, and active teacher from this school.');
  const record=await tx.academicWorkspace.findFirst({where:{schoolId,yearId},select:{revision:true}});
  const now=new Date().toISOString();
  const plan={...p,student:student.name,teacherId:teacherMember.userId,owner:teacherMember.user.name,id:randomUUID(),yearId,createdAt:now,status:'pending',responseReason:'',respondedAt:null};
  const notification={id:randomUUID(),type:'support_assigned',teacherId:teacherMember.userId,relatedSupportId:plan.id,readBy:[],createdAt:now,message:`Student support assigned: ${student.name} / ${p.subject} in ${p.className}.`};
  const audit={id:randomUUID(),yearId,at:now,message:'support saved',actorId:user.id};
  // Append within PostgreSQL: never transfer and rewrite marks/report history for a support plan.
  if(record) {
   const planJson=JSON.stringify([plan]),notificationJson=JSON.stringify([notification]),auditJson=JSON.stringify([audit]);
   await tx.$executeRaw`UPDATE "AcademicWorkspace" SET data=data||jsonb_build_object(
    'support',COALESCE(data->'support','[]'::jsonb)||${planJson}::jsonb,
    'notifications',${notificationJson}::jsonb||COALESCE(data->'notifications','[]'::jsonb),
    'audit',${auditJson}::jsonb||COALESCE(data->'audit','[]'::jsonb)),revision=revision+1
    WHERE "schoolId"=${schoolId}::uuid AND "yearId"=${yearId}::uuid`;
  } else await tx.academicWorkspace.create({data:{schoolId,yearId,data:{...empty(),support:[plan],notifications:[notification],audit:[audit]}},select:{revision:true}});
  await tx.auditEvent.create({data:{schoolId,actorId:user.id,action:'ACADEMIC_SUPPORT',target:yearId}});
  const updated=await tx.$queryRaw<Array<{revision:number;audit:any[];notifications:any[]}>>`SELECT revision,data->'audit' AS audit,data->'notifications' AS notifications FROM "AcademicWorkspace" WHERE "schoolId"=${schoolId}::uuid AND "yearId"=${yearId}::uuid`;
  return {saved:true,patch:{baseRevision:record?.revision??0,workspaceRevision:updated[0].revision,overviewSafe:true,
   replace:{audit:updated[0].audit,notifications:updated[0].notifications.filter(n=>!n.teacherId).map(n=>({...n,read:(n.readBy??[]).includes(user.id),readBy:undefined}))},upsert:{support:[plan]}}};
 }
 private async saveGrading(tx:Prisma.TransactionClient,schoolId:string,yearId:string,payload:unknown,user:any,teacher:boolean) {
  if(teacher)throw new ForbiddenException('Academic Master or Headmaster access required.');
  const p=parse(policySchema.strict(),payload);
  if(new Set(p.bands.map(x=>x.label.toLowerCase())).size!==p.bands.length||p.bands.at(-1)!.minimum!==0||p.bands.some((x,i)=>i>0&&x.minimum>=p.bands[i-1].minimum))throw new BadRequestException('Grade bands must be unique, descending and end at zero.');
  if(!await tx.academicYear.findFirst({where:{id:yearId,schoolId},select:{id:true}}))throw new BadRequestException('Choose an academic year in this school.');
  const rows=await tx.$queryRaw<Array<{revision:number|null;baseRevision:number}>>`SELECT (data->'policy'->>'revision')::int AS revision,revision AS "baseRevision" FROM "AcademicWorkspace" WHERE "yearId"=${yearId}::uuid AND "schoolId"=${schoolId}::uuid`;
  const revision=(rows[0]?.revision??defaultPolicy.revision)+1;
  const now=new Date().toISOString();
  const policyJson=JSON.stringify({...p,revision});
  const auditJson=JSON.stringify([{id:randomUUID(),yearId,at:now,message:'grading saved',actorId:user.id}]);
  if(rows.length)await tx.$executeRaw`UPDATE "AcademicWorkspace" SET data=jsonb_set(data,'{policy}',${policyJson}::jsonb)||jsonb_build_object('audit',${auditJson}::jsonb||COALESCE(data->'audit','[]'::jsonb)),revision=revision+1 WHERE "yearId"=${yearId}::uuid AND "schoolId"=${schoolId}::uuid`;
  else await tx.academicWorkspace.create({data:{yearId,schoolId,data:{...empty(),policy:{...p,revision},audit:JSON.parse(auditJson)}}});
  await tx.auditEvent.create({data:{schoolId,actorId:user.id,action:'ACADEMIC_GRADING',target:yearId}});
  const updated=await tx.$queryRaw<Array<{revision:number;policy:any;audit:any}>>`SELECT revision,data->'policy' AS policy,data->'audit' AS audit FROM "AcademicWorkspace" WHERE "yearId"=${yearId}::uuid AND "schoolId"=${schoolId}::uuid`;
  return {saved:true,patch:{baseRevision:rows[0]?.baseRevision??0,workspaceRevision:updated[0].revision,overviewSafe:true,replace:{policy:updated[0].policy,audit:updated[0].audit},upsert:{}}};
 }
 private async assignClassTeacher(tx:Prisma.TransactionClient,schoolId:string,yearId:string,payload:unknown,user:any,teacher:boolean) {
  if(teacher)throw new ForbiddenException('Academic Master or Headmaster access required.');
  const p=parse(z.object({classId:uuid,teacherId:uuid.nullable()}).strict(),payload);
  if(!await tx.classroom.findFirst({where:{id:p.classId,schoolId,yearId}}))throw new BadRequestException('Choose a class in this academic year.');
  const member=p.teacherId?await tx.membership.findFirst({where:{id:p.teacherId,schoolId,role:'TEACHER',active:true,user:{enabled:true}},include:{user:true}}):null;
  if(p.teacherId&&!member)throw new BadRequestException('Choose an active teacher.');
  // Read and replace only class-teacher metadata, not a potentially 50 MB marks/attendance workspace.
  const rows=await tx.$queryRaw<Array<{teachers:any}>>`SELECT data->'classTeachers' AS teachers FROM "AcademicWorkspace" WHERE "yearId"=${yearId}::uuid AND "schoolId"=${schoolId}::uuid`;
  const history:any[]=rows[0]?.teachers??[];
  const previous=history.filter(a=>a.classId===p.classId&&!a.endedAt);
  if(previous.length===1&&previous[0].membershipId===member?.id)return {saved:true};
  const now=new Date().toISOString();
  for(const assignment of previous)assignment.endedAt=now;
  const whole=await tx.teachingAssignment.findMany({where:{schoolId,classroomId:p.classId,subjectId:null}});
  // Reuse the current row when replacing the teacher, preserving attached roster history.
  if(member){
   const retained=whole.find(a=>a.membershipId===member.id)??whole[0];
   if(retained)await tx.teachingAssignment.update({where:{id:retained.id},data:{membershipId:member.id,confirmedAt:null}});
   else await tx.teachingAssignment.create({data:{schoolId,classroomId:p.classId,membershipId:member.id}});
   if(whole.length>1)await tx.teachingAssignment.deleteMany({where:{id:{in:whole.filter(a=>a.id!==retained?.id).map(a=>a.id)}}});
   history.push({id:randomUUID(),classId:p.classId,yearId,teacherId:member.userId,membershipId:member.id,teacherName:member.user.name,at:now});
  }else{
   // Keep a copy of any whole-class roster issues before removing the assignment relation.
   const issues=await tx.rosterIssue.findMany({where:{schoolId,assignmentId:{in:whole.map(a=>a.id)}}});
   if(issues.length) {
    const archived=JSON.stringify(issues);
    await tx.$executeRaw`UPDATE "AcademicWorkspace" SET data=jsonb_set(data,'{archivedClassRosterIssues}',COALESCE(data->'archivedClassRosterIssues','[]'::jsonb)||${archived}::jsonb) WHERE "yearId"=${yearId}::uuid`;
    await tx.rosterIssue.deleteMany({where:{id:{in:issues.map(a=>a.id)}}});
   }
   await tx.teachingAssignment.deleteMany({where:{schoolId,classroomId:p.classId,subjectId:null}});
  }
  const log={id:randomUUID(),yearId,at:now,actorId:user.id,message:member?`Class teacher assigned: ${member.user.name}`:'Class teacher responsibility removed'};
  if(rows.length){
   const teachersJson=JSON.stringify(history),auditJson=JSON.stringify([log]);
   await tx.$executeRaw`UPDATE "AcademicWorkspace" SET data=data||jsonb_build_object('classTeachers',${teachersJson}::jsonb,'audit',${auditJson}::jsonb||COALESCE(data->'audit','[]'::jsonb)),revision=revision+1 WHERE "yearId"=${yearId}::uuid AND "schoolId"=${schoolId}::uuid`;
  }else await tx.academicWorkspace.create({data:{yearId,schoolId,data:{...empty(),classTeachers:history,audit:[log]}}});
  await tx.auditEvent.create({data:{schoolId,actorId:user.id,action:'ACADEMIC_CLASS-TEACHER',target:p.classId}});
  return {saved:true};
 }
 private async context(tx:Prisma.TransactionClient,schoolId:string,yearId:string,overview=false,submissionId?:string) {
  const year=await tx.academicYear.findFirst({where:{id:yearId,schoolId}});if(!year)throw new BadRequestException('Choose an academic year in this school.');
  const allocations=await tx.teachingAssignment.findMany({where:{schoolId,classroom:{yearId},membership:{active:true,user:{enabled:true}}},include:{membership:{include:{user:true}},classroom:true,subject:true}});
  const record=submissionId?(await tx.$queryRaw<Array<{data:any;revision:number}>>(academicMarksQuery(schoolId,yearId,submissionId)))[0]:overview?(await tx.$queryRaw<Array<{data:any;revision:number}>>(academicOverviewQuery(schoolId,yearId)))[0]:await tx.academicWorkspace.findUnique({where:{yearId}});
  return {year,allocations,state:{...empty(),...(record?.data as any ?? {})},revision:record?.revision??0};
 }
 private async roster(tx:Prisma.TransactionClient,schoolId:string,classId:string,subjectId?:string|null) {
  const rows=await tx.enrollment.findMany({where:{schoolId,classroomId:classId,status:'active',...(subjectId?{subjects:{some:{subjectId}}}:{})},include:{student:true},orderBy:{student:{name:'asc'}}});
  return rows.map(e=>({studentId:e.student.id,studentNumber:e.student.admissionNumber,fullName:e.student.name,gender:e.student.gender??'',marksValue:null,comments:'',lastSaved:null}));
 }
 private projection(state:any,allocations:any[],userId:string,teacher:boolean) {
  const own=allocations.filter(a=>a.membership.userId===userId);
  const classIds=state.classTeachers.filter((a:any)=>!a.endedAt&&a.teacherId===userId).map((a:any)=>a.classId);
  const canSee=(s:any)=>own.some(a=>a.classroomId===s.classId&&a.subjectId===s.subjectId)||(classIds.includes(s.classId)&&s.assessmentProgress.status==='approved');
  const submissions=state.submissions.filter((s:any)=>!teacher||canSee(s)).map((s:any)=>{
   const a=allocations.find(a=>a.classroomId===s.classId&&a.subjectId===s.subjectId&&(!teacher||a.membership.userId===userId))??allocations.find(a=>a.classroomId===s.classId&&a.subjectId===s.subjectId);
   return {...s,teacherId:a?.membership.userId??s.teacherId,teacherName:a?.membership.user.name??s.teacherName,teachingId:a?.id??s.teachingId,assessmentStatus:state.assessments.find((e:any)=>e.id===s.assessmentId)?.status};
  });
  return {...state,submissions,slots:state.slots.filter((s:any)=>!teacher||own.some(a=>classLabel(a.classroom.name)===s.className)),syllabus:state.syllabus.filter((s:any)=>!teacher||own.some(a=>a.id===s.assignmentId)),support:teacher?state.support.filter((p:any)=>p.teacherId===userId):state.support,reports:teacher?state.reports.filter((r:any)=>classIds.includes(r.classId)):state.reports,audit:teacher?[]:state.audit,attendance:state.attendance.filter((s:any)=>!teacher||classIds.includes(s.classId)),classTeachers:state.classTeachers.filter((a:any)=>!teacher||a.teacherId===userId),notifications:state.notifications.filter((n:any)=>teacher?((n.teacherId===userId&&(!n.relatedSupportId||state.support.some((p:any)=>p.id===n.relatedSupportId&&p.teacherId===userId)))||submissions.some((s:any)=>s.id===n.relatedAssignmentId)):!n.teacherId).map((n:any)=>({...n,read:(n.readBy??[]).includes(userId),readBy:undefined}))};
 }
 @Get() async get(@Req() req:Request,@Param('schoolId') schoolId:string,@Query() query:unknown) {
  const {user}=await this.svc.authorize(req,parse(uuid,schoolId),['ACADEMIC','HEADMASTER','TEACHER']);const {yearId,view,submissionId}=parse(z.object({yearId:uuid,view:z.enum(['overview','marks']).optional(),submissionId:uuid.optional()}).strict().refine(q=>(q.view==='marks')===!!q.submissionId,'Marks view requires a submission.'),query);
  const {state,allocations,revision}=await this.context(this.svc.db,schoolId,yearId,view==='overview',submissionId);
  const projected=this.projection(state,allocations,user.id,req.session.selectedRole==='TEACHER');
  return {...projected,...(view?{view,reportCount:projected.reports.length,reports:[]}:{}),workspaceRevision:revision};
 }
 @Get('revision') async revision(@Req() req:Request,@Param('schoolId') schoolId:string,@Query() query:unknown) {
  await this.svc.authorize(req,parse(uuid,schoolId),['ACADEMIC','HEADMASTER','TEACHER']);
  const {yearId}=parse(z.object({yearId:uuid}).strict(),query);
  if(!await this.svc.db.academicYear.findFirst({where:{id:yearId,schoolId},select:{id:true}}))throw new BadRequestException('Choose an academic year in this school.');
  const workspace=await this.svc.db.academicWorkspace.findFirst({where:{yearId,schoolId},select:{revision:true}});
  return {revision:workspace?.revision??0};
 }
 @Post('commands') async command(@Req() req:Request,@Param('schoolId') schoolId:string,@Body() body:unknown) {
  const {user}=await this.svc.authorize(req,parse(uuid,schoolId),['ACADEMIC','HEADMASTER','TEACHER']);
  const b=parse(z.object({yearId:uuid,action:text,payload:z.unknown(),view:z.literal('marks').optional()}).strict(),body);const teacher=req.session.selectedRole==='TEACHER';
  let freshResult:unknown;
  const fresh=<T>(value:T):T=>{freshResult=value;return value;};
  const result=await this.svc.idempotent(`${user.id}:academics:${schoolId}`,parse(uuid,req.header('Idempotency-Key')),b,async tx=>{
   if(b.action==='class-teacher')return this.assignClassTeacher(tx,schoolId,b.yearId,b.payload,user,teacher);
   if(b.action==='support')return fresh(await this.saveSupport(tx,schoolId,b.yearId,b.payload,user,teacher));
   if(b.action==='grading')return fresh(await this.saveGrading(tx,schoolId,b.yearId,b.payload,user,teacher));
   const boundedMarks=b.view==='marks'&&b.action==='marks';
   const marksId=boundedMarks?parse(uuid,(b.payload as any)?.id):undefined;
   const {year,state:s,allocations,revision:baseRevision}=await this.context(tx,schoolId,b.yearId,false,marksId);
   const academic=()=>{if(teacher)throw new ForbiddenException('Academic Master or Headmaster access required.');};
   const within=(value:string)=>{if(value<year.startsAt.toISOString().slice(0,10)||value>year.endsAt.toISOString().slice(0,10))throw new BadRequestException('Date must fall within the academic year.');};
   const assessment=(id:string)=>{const a=s.assessments.find((a:any)=>a.id===id);if(!a)throw new BadRequestException('Assessment not found.');return a;};
   const submission=(id:string)=>{const a=s.submissions.find((a:any)=>a.id===id);if(!a)throw new BadRequestException('Submission not found.');if(teacher&&!allocations.some(t=>t.membership.userId===user.id&&t.classroomId===a.classId&&t.subjectId===a.subjectId))throw new ForbiddenException('This subject is not assigned to you.');return a;};
   const now=new Date().toISOString();
   const log=(message:string)=>s.audit.unshift({id:randomUUID(),yearId:b.yearId,at:now,message,actorId:user.id});
   switch(b.action) {
    case 'assessment': {
     academic();const p=parse(z.object({id:uuid.optional(),name:text,term:text,deadline:date}).strict(),b.payload);requireYearTerm(year,p.term);
     if(s.assessments.some((a:any)=>a.id!==p.id&&a.term===p.term&&a.name.toLowerCase()===p.name.toLowerCase()))throw new ConflictException('An assessment with this name already exists.');
     const a=p.id?assessment(p.id):{id:randomUUID(),yearId:b.yearId,status:'draft',createdAt:now};if(a.status==='closed')throw new BadRequestException('Closed assessment cannot be edited.');Object.assign(a,{name:p.name,term:p.term,deadline:p.deadline});if(!p.id)s.assessments.push(a);break;
    }
    case 'assessment-status': {
     academic();const p=parse(z.object({id:uuid,status:z.enum(['open','closed'])}).strict(),b.payload);const a=assessment(p.id);
     if((p.status==='open'&&!['draft','closed'].includes(a.status))||(p.status==='closed'&&a.status!=='open'))throw new ConflictException('Assessment status has changed.');
     if(p.status==='closed'&&(!s.submissions.some((x:any)=>x.assessmentId===a.id)||s.submissions.some((x:any)=>x.assessmentId===a.id&&x.assessmentProgress.status!=='approved')))throw new BadRequestException('Assign and approve all submissions before closing.');a.status=p.status;break;
    }
    case 'allocate': {
     academic();const p=parse(z.object({id:uuid,classIds:z.array(uuid).min(1).max(200).refine(ids=>new Set(ids).size===ids.length,'Choose each class once.').optional()}).strict(),b.payload);const a=assessment(p.id);if(a.status!=='open')throw new BadRequestException('Open the assessment first.');
     if(p.classIds&&await tx.classroom.count({where:{schoolId,yearId:b.yearId,id:{in:p.classIds}}})!==p.classIds.length)throw new BadRequestException('Choose classes in this academic year.');
     const sources=allocations.filter(t=>t.subjectId&&(!p.classIds||p.classIds.includes(t.classroomId)));if(!sources.length)throw new BadRequestException('Assign subject teachers to the selected classes first.');
     for(const t of sources){if(s.submissions.some((x:any)=>x.assessmentId===a.id&&x.classId===t.classroomId&&x.subjectId===t.subjectId))continue;
      const entries=await this.roster(tx,schoolId,t.classroomId,t.subjectId);s.submissions.push({id:randomUUID(),createdAt:now,teachingId:t.id,classId:t.classroomId,subjectId:t.subjectId,teacherId:t.membership.userId,teacherName:t.membership.user.name,className:classLabel(t.classroom.name),classStream:null,subjectName:t.subject!.name,subjectCode:t.subject!.code,academicYearId:b.yearId,academicYearLabel:year.name,assessmentId:a.id,assessmentName:`${a.term} / ${a.name}`,studentCount:entries.length,rosterStatus:'pending',revision:1,entries,assessmentProgress:{total:entries.length,completed:0,status:'draft',submittedAt:null,approvedAt:null,returnReason:null}});
     }break;
    }
    case 'confirm-roster': {
     const p=parse(z.object({id:uuid}).strict(),b.payload);const a=submission(p.id);if(assessment(a.assessmentId).status!=='open'||!['draft','returned'].includes(a.assessmentProgress.status))throw new BadRequestException('Only an editable submission can refresh its roster.');
     if(await tx.rosterIssue.findFirst({where:{schoolId,status:'open',assignment:{classroomId:a.classId,subjectId:a.subjectId}}}))throw new BadRequestException('Resolve open roster issues before confirming or submitting marks.');
     const roster=await this.roster(tx,schoolId,a.classId,a.subjectId);if(!roster.length)throw new BadRequestException('This subject has no enrolled students.');
     a.archives=[...(a.archives??[]),{at:now,entries:a.entries}];a.entries=roster.map(r=>({...r,...(a.entries.find((e:any)=>e.studentId===r.studentId)??{})}));a.studentCount=roster.length;a.assessmentProgress.total=roster.length;a.assessmentProgress.completed=a.entries.filter((e:any)=>e.marksValue!==null||e.noMark===true).length;a.rosterStatus='confirmed';a.revision++;break;
    }
    case 'marks': {
     const p=parse(z.object({id:uuid,revision:z.number().int(),entries:z.array(z.object({studentId:uuid,marksValue:z.number().min(0).max(100).nullable(),noMark:z.boolean().default(false),comments:z.string().max(1000)}).strict()).max(2000)}).strict(),b.payload);const a=submission(p.id);
     if(a.revision!==p.revision)throw new ConflictException('Marks changed in another session. Reload before saving.');
     if(assessment(a.assessmentId).status!=='open'||!['draft','returned'].includes(a.assessmentProgress.status)||a.rosterStatus!=='confirmed')throw new BadRequestException('Confirm the roster and use an open, editable assessment.');
     if(p.entries.length!==a.entries.length||new Set(p.entries.map(e=>e.studentId)).size!==a.entries.length||p.entries.some(e=>!a.entries.some((r:any)=>r.studentId===e.studentId)))throw new BadRequestException('Marks must match the confirmed student roster.');
     if(p.entries.some(e=>e.noMark&&e.marksValue!==null))throw new BadRequestException('A no-mark entry cannot also contain a score.');
     a.entries=a.entries.map((e:any)=>({...e,...p.entries.find(r=>r.studentId===e.studentId),lastSaved:now}));a.revision++;a.assessmentProgress.completed=p.entries.filter(e=>e.marksValue!==null||e.noMark).length;break;
    }
    case 'submit': {
     const p=parse(z.object({id:uuid,revision:z.number().int()}).strict(),b.payload);const a=submission(p.id);const exam=assessment(a.assessmentId);
     if(a.revision!==p.revision)throw new ConflictException('Submission changed. Reload the marks.');
     if(exam.status!=='open')throw new BadRequestException('Open the assessment before submitting marks.');
     if(await tx.rosterIssue.findFirst({where:{schoolId,status:'open',assignment:{classroomId:a.classId,subjectId:a.subjectId}}}))throw new BadRequestException('Resolve open roster issues before confirming or submitting marks.');
     const roster=await this.roster(tx,schoolId,a.classId,a.subjectId);
     if(!['draft','returned'].includes(a.assessmentProgress.status)||a.rosterStatus!=='confirmed'||!a.entries.length||a.entries.some((e:any)=>typeof e.marksValue!=='number'&&e.noMark!==true)||roster.length!==a.entries.length||roster.some(e=>!a.entries.some((r:any)=>r.studentId===e.studentId)))throw new BadRequestException('Refresh and confirm the roster, then save a valid mark or a dash for every student.');
     a.gradingPolicy=structuredClone(s.policy);a.assessmentProgress={...a.assessmentProgress,status:'submitted',submittedAt:now,returnReason:null};a.revision++;break;
    }
    case 'review': {
     if(req.session.selectedRole!=='ACADEMIC')throw new ForbiddenException('Only the Academic Master can review marks.');const p=parse(z.object({id:uuid,decision:z.literal('returned'),reason:z.string().trim().max(2000).default('')}).strict(),b.payload);const a=submission(p.id);
     if(a.assessmentProgress.status!=='submitted'||assessment(a.assessmentId).status==='closed')throw new ConflictException('Only a submitted, open assessment can be reviewed.');
     if(p.decision==='returned'&&p.reason.length<10)throw new BadRequestException('Explain the correction in at least 10 characters.');
     a.assessmentProgress={...a.assessmentProgress,status:'returned',approvedAt:null,returnReason:p.reason};a.revision++;
     s.notifications.unshift({id:randomUUID(),type:'marks_returned',relatedAssignmentId:a.id,readBy:[],createdAt:now,message:`${a.className} / ${a.subjectName}: returned. ${p.reason}`});break;
    }
    case 'review-class': {
     if(req.session.selectedRole!=='ACADEMIC')throw new ForbiddenException('Only the Academic Master can approve class marks.');
     const p=parse(z.object({assessmentId:uuid,classId:uuid}).strict(),b.payload);
     if(assessment(p.assessmentId).status==='closed')throw new ConflictException('This assessment is closed.');
     const rows=s.submissions.filter((a:any)=>a.assessmentId===p.assessmentId&&a.classId===p.classId);
     if(!rows.length||!rows.some((a:any)=>a.assessmentProgress.status==='submitted')||rows.some((a:any)=>!['submitted','approved'].includes(a.assessmentProgress.status)))throw new ConflictException('Every class subject must be submitted before class approval.');
     for(const a of rows.filter((row:any)=>row.assessmentProgress.status==='submitted')){
      a.assessmentProgress={...a.assessmentProgress,status:'approved',approvedAt:now,returnReason:null};a.revision++;
      s.notifications.unshift({id:randomUUID(),type:'marks_approved',relatedAssignmentId:a.id,readBy:[],createdAt:now,message:`${a.className} / ${a.subjectName}: approved with the class.`});
     }
     break;
    }
    case 'slot': {
     academic();const p=parse(z.object({assessmentId:uuid,className:text,subject:text,teacher:text,room:text,date,start:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),end:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}).strict(),b.payload);within(p.date);
     if(assessment(p.assessmentId).status==='closed'||p.end<=p.start)throw new BadRequestException('Choose an editable assessment and valid times.');
     if(!(await tx.classroom.findMany({where:{schoolId,yearId:b.yearId}})).some(c=>classLabel(c.name)===p.className)||!await tx.subject.findFirst({where:{schoolId,name:p.subject}}))throw new BadRequestException('Choose an existing class and subject.');
     const norm=(v:string)=>v.toLowerCase();if(s.slots.some((x:any)=>x.date===p.date&&x.start<p.end&&p.start<x.end&&(['className','teacher','room'] as const).some(k=>norm(x[k])===norm(p[k]))))throw new ConflictException('Class, invigilator or room has a conflicting exam.');
     s.slots.push({...p,id:randomUUID(),yearId:b.yearId,createdAt:now});break;
    }
    case 'remove-slot': {academic();const p=parse(z.object({id:uuid}).strict(),b.payload);const slot=s.slots.find((x:any)=>x.id===p.id);if(!slot||assessment(slot.assessmentId).status==='closed')throw new BadRequestException('Slot is unavailable.');s.slots=s.slots.filter((x:any)=>x.id!==p.id);break;}
    case 'topic': {academic();const p=parse(z.object({assignmentId:uuid,topic:text,due:date}).strict(),b.payload);within(p.due);if(!allocations.some(a=>a.id===p.assignmentId))throw new BadRequestException('Choose an active teaching assignment.');s.syllabus.push({...p,id:randomUUID(),yearId:b.yearId,completed:false,createdAt:now});break;}
    case 'toggle-topic': {const p=parse(z.object({id:uuid}).strict(),b.payload);const topic=s.syllabus.find((x:any)=>x.id===p.id);if(!topic)throw new BadRequestException('Topic not found.');if(teacher&&!allocations.some(a=>a.id===topic.assignmentId&&a.membership.userId===user.id))throw new ForbiddenException();topic.completed=!topic.completed;break;}
    case 'support-response': {
     if(!teacher)throw new ForbiddenException('Teacher access required.');
     const p=parse(z.object({id:uuid,decision:z.enum(['accepted','rejected']),reason:z.string().trim().max(1000).default('')}).strict(),b.payload);
     const plan=s.support.find((x:any)=>x.id===p.id);if(!plan||plan.teacherId!==user.id)throw new ForbiddenException('This support plan is not assigned to you.');
     if(plan.status!=='pending')throw new ConflictException('This support plan has already been answered.');
     if(p.decision==='rejected'&&p.reason.length<10)throw new BadRequestException('Explain the rejection in at least 10 characters.');
     plan.history=[...(plan.history??[]),{teacherId:user.id,teacherName:plan.owner,decision:p.decision,reason:p.reason,at:now}];
     plan.status=p.decision;plan.responseReason=p.reason;plan.respondedAt=now;
     s.notifications.unshift({id:randomUUID(),type:'support_response',relatedSupportId:plan.id,readBy:[],createdAt:now,message:`${plan.owner} ${p.decision} student support for ${plan.student} (${plan.className} / ${plan.subject}).${p.reason?` Reason: ${p.reason}`:''}`});break;
    }
    case 'reassign-support': {
     academic();const p=parse(z.object({id:uuid,teacherMembershipId:uuid}).strict(),b.payload);
     const plan=s.support.find((x:any)=>x.id===p.id);if(!plan)throw new BadRequestException('Support plan not found.');
     if(plan.status!=='rejected'&&!(plan.status==='open'&&!plan.teacherId))throw new ConflictException('Only a rejected or legacy unassigned support plan can be reassigned.');
     const member=await tx.membership.findFirst({where:{id:p.teacherMembershipId,schoolId,role:'TEACHER',active:true,user:{enabled:true}},include:{user:true}});
     if(!member||member.userId===plan.teacherId)throw new BadRequestException('Choose a different active teacher from this school.');
     plan.teacherMembershipId=member.id;plan.teacherId=member.userId;plan.owner=member.user.name;plan.status='pending';plan.responseReason='';plan.respondedAt=null;
     s.notifications.unshift({id:randomUUID(),type:'support_assigned',teacherId:member.userId,relatedSupportId:plan.id,readBy:[],createdAt:now,message:`Student support assigned: ${plan.student} / ${plan.subject} in ${plan.className}.`});break;
    }
    case 'complete-support': {academic();const p=parse(z.object({id:uuid}).strict(),b.payload);const plan=s.support.find((x:any)=>x.id===p.id);if(!plan)throw new BadRequestException('Support plan not found.');if(plan.status!=='accepted')throw new ConflictException('The assigned teacher must accept this plan before it can be completed.');plan.status='completed';break;}
    case 'reports': {
     academic();const p=parse(z.object({assessmentId:uuid,className:text}).strict(),b.payload);assessment(p.assessmentId);const rows=s.submissions.filter((a:any)=>a.assessmentId===p.assessmentId&&a.className===p.className);
     if(!rows.length||rows.some((a:any)=>a.assessmentProgress.status!=='approved'))throw new BadRequestException('Approve all assigned subjects first.');
     const enrollments=await tx.enrollment.findMany({where:{schoolId,classroomId:rows[0].classId,status:'active'},include:{subjects:true}});
     if(enrollments.some(e=>e.subjects.some(subject=>!rows.some((a:any)=>a.subjectId===subject.subjectId&&a.entries.some((m:any)=>m.studentId===e.studentId)))))throw new BadRequestException('Some enrolled subjects have no approved marks. Assign and approve those subjects first.');
     const students=new Map<string,any>();for(const a of rows)for(const m of a.entries){if(typeof m.marksValue!=='number'&&m.noMark!==true)throw new BadRequestException('Incomplete marks.');const r=students.get(m.studentId)??{id:`${p.assessmentId}:${a.classId}:${m.studentId}`,academicYearId:b.yearId,assessmentId:p.assessmentId,classId:a.classId,createdAt:now,student:m.fullName,studentNumber:m.studentNumber,className:a.className,period:`${year.name} / ${assessment(p.assessmentId).name}`,academicApproved:true,status:'approved',recipients:[],results:[],noMarks:[]};if(typeof m.marksValue==='number')r.results.push({subject:a.subjectName,mark:m.marksValue,maxMarks:100,grade:grade(m.marksValue,a.gradingPolicy)});else r.noMarks.push(a.subjectName);students.set(m.studentId,r);}
     const completeClass=students.size===enrollments.length&&enrollments.every(e=>students.has(e.studentId));
     const policyKeys=new Set(rows.map((a:any)=>JSON.stringify(a.gradingPolicy?.bands??null)));
     for(const r of students.values()){
      const marks=r.results.map((result:any)=>result.mark as number);
      const average=marks.length?marks.reduce((sum:number,mark:number)=>sum+mark,0)/marks.length:null;
      r.summary={average,overallGrade:average!==null&&policyKeys.size===1?grade(average,rows[0].gradingPolicy):null,position:null,classSize:null};
     }
     if(completeClass&&[...students.values()].every(r=>r.summary.average!==null)){
      const ranked=[...students.values()].sort((a,b)=>b.summary.average-a.summary.average||a.student.localeCompare(b.student)||a.studentNumber.localeCompare(b.studentNumber));
      ranked.forEach((r,index)=>{r.summary.position=index&&r.summary.average===ranked[index-1].summary.average?ranked[index-1].summary.position:index+1;r.summary.classSize=ranked.length;});
     }
     for(const r of students.values()){const existing=s.reports.find((x:any)=>x.id===r.id);if(existing&&existing.status!=='generated')continue;s.reports=s.reports.filter((x:any)=>x.id!==r.id);s.reports.push(r);}break;
    }
    case 'attendance': {
     const p=parse(z.object({classId:uuid,date,revision:z.number().int().nonnegative(),reason:z.string().trim().max(2000).default(''),entries:z.array(z.object({studentId:uuid,status:z.enum(['Present','Absent','Late','Excused']),note:z.string().max(1000)}).strict()).max(2000)}).strict(),b.payload);within(p.date);
     if(p.date>now.slice(0,10))throw new BadRequestException('Attendance date cannot be in the future.');if(teacher&&!s.classTeachers.some((a:any)=>a.classId===p.classId&&a.teacherId===user.id&&!a.endedAt))throw new ForbiddenException('Only the assigned class teacher can record attendance.');
     if(!await tx.classroom.findFirst({where:{id:p.classId,schoolId,yearId:b.yearId}}))throw new BadRequestException('Class not found.');
     const old=s.attendance.filter((a:any)=>a.classId===p.classId&&a.date===p.date).at(-1);if((old?.revision??0)!==p.revision)throw new ConflictException('Attendance changed. Reload before correcting.');if(old&&p.reason.length<10)throw new BadRequestException('Explain the attendance correction.');
     const roster=old?.entries??(await tx.enrollment.findMany({where:{schoolId,classroomId:p.classId,status:'active',createdAt:{lte:new Date(p.date+'T23:59:59.999Z')}},include:{student:true}})).map(e=>({studentId:e.studentId,student:e.student.name,number:e.student.admissionNumber}));
     if(!roster.length||p.entries.length!==roster.length||new Set(p.entries.map(e=>e.studentId)).size!==roster.length||p.entries.some(e=>!roster.some((r:any)=>r.studentId===e.studentId)))throw new BadRequestException('Record every student on the attendance roster.');
     s.attendance.push({...p,id:randomUUID(),yearId:b.yearId,teacherId:user.id,teacherName:user.name,savedAt:now,revision:p.revision+1,entries:roster.map((r:any)=>({...r,...p.entries.find(e=>e.studentId===r.studentId)}))});break;
    }
    case 'class': {
     academic();const p=parse(z.object({id:uuid.optional(),name:text,subjectIds:z.array(uuid).max(100)}).strict(),b.payload);
     if(new Set(p.subjectIds).size!==p.subjectIds.length||await tx.subject.count({where:{schoolId,id:{in:p.subjectIds}}})!==p.subjectIds.length)throw new BadRequestException('Choose unique school subjects.');
     let c=p.id?await tx.classroom.findFirst({where:{id:p.id,schoolId,yearId:b.yearId}}):null;if(p.id&&!c)throw new BadRequestException('Class not found.');
     const existingSubjects=c?await tx.classSubject.findMany({where:{schoolId,classroomId:c.id},select:{subjectId:true}}):[];
     const existingIds=new Set(existingSubjects.map(row=>row.subjectId));
     if(c){const removed={notIn:p.subjectIds};if(await tx.enrollmentSubject.count({where:{schoolId,enrollment:{classroomId:c.id},subjectId:removed}})||await tx.teachingAssignment.count({where:{schoolId,classroomId:c.id,subjectId:removed}}))throw new ConflictException('A subject in use cannot be removed.');c=await tx.classroom.update({where:{id:c.id},data:{name:p.name}});}
     else c=await tx.classroom.create({data:{schoolId,yearId:b.yearId,name:p.name}});
     await tx.classSubject.deleteMany({where:{schoolId,classroomId:c.id,subjectId:{notIn:p.subjectIds}}});await tx.classSubject.createMany({data:p.subjectIds.map(subjectId=>({schoolId,classroomId:c!.id,subjectId})),skipDuplicates:true});
     await addClassSubjectsToEnrollments(tx,schoolId,c.id,p.subjectIds.filter(subjectId=>!existingIds.has(subjectId)));break;
    }
    case 'delete-class': {
     academic();const p=parse(z.object({classId:uuid}).strict(),b.payload);const c=await tx.classroom.findFirst({where:{id:p.classId,schoolId,yearId:b.yearId}});if(!c)throw new BadRequestException('Class not found.');
     const [enrolments,assignments,admissions]=await Promise.all([tx.enrollment.count({where:{schoolId,classroomId:c.id}}),tx.teachingAssignment.count({where:{schoolId,classroomId:c.id}}),tx.admission.count({where:{schoolId,requestedClassId:c.id}})]);
     if(enrolments||assignments||admissions)throw new ConflictException('This class has enrolment, teaching, or admission history. Rename it or close the academic year to preserve records.');
     await tx.classSubject.deleteMany({where:{schoolId,classroomId:c.id}});await tx.classroom.delete({where:{id:c.id}});break;
    }
    case 'copy-classes': {
     academic();const p=parse(z.object({targetYearId:uuid}).strict(),b.payload);const target=await tx.academicYear.findFirst({where:{id:p.targetYearId,schoolId,closed:false,startsAt:{gt:year.startsAt}}});if(!target)throw new BadRequestException('Choose a later open year.');
     const sources=await tx.classroom.findMany({where:{schoolId,yearId:b.yearId},include:{subjects:true}});for(const source of sources){if(await tx.classroom.findFirst({where:{schoolId,yearId:target.id,name:source.name}}))continue;const c=await tx.classroom.create({data:{schoolId,yearId:target.id,name:source.name}});await tx.classSubject.createMany({data:source.subjects.map(m=>({schoolId,classroomId:c.id,subjectId:m.subjectId}))});}break;
    }
    case 'read-notifications': {const p=parse(z.object({id:uuid.optional()}).strict(),b.payload);const visible=this.projection(s,allocations,user.id,teacher).notifications;for(const n of s.notifications)if((!p.id||n.id===p.id)&&visible.some((v:any)=>v.id===n.id))n.readBy=[...new Set([...(n.readBy??[]),user.id])];break;}
    default: throw new BadRequestException('Unknown academic action.');
   }
   log(`${b.action.replaceAll('-',' ')} saved`);
   let saved:{revision:number};
   if(boundedMarks) {
    // Preserve the original root, other submissions, and selected roster archives.
    // The same marks validation above runs against the bounded read. Serializable
    // retries and both document/submission revisions still protect concurrent edits.
    const submissionJson=JSON.stringify(s.submissions[0]),auditJson=JSON.stringify(s.audit);
    const rows=await tx.$queryRaw<Array<{revision:number}>>`UPDATE "AcademicWorkspace" SET
     data=jsonb_set(data,'{submissions}',(SELECT jsonb_agg(
      CASE WHEN item->>'id'=${marksId} THEN item||${submissionJson}::jsonb ELSE item END ORDER BY ordinal)
      FROM jsonb_array_elements(data->'submissions') WITH ORDINALITY AS entries(item,ordinal)))
      ||jsonb_build_object('audit',${auditJson}::jsonb||COALESCE(data->'audit','[]'::jsonb)),
     revision=revision+1 WHERE "schoolId"=${schoolId}::uuid AND "yearId"=${b.yearId}::uuid AND revision=${baseRevision}
     RETURNING revision`;
    if(!rows.length)throw new ConflictException('Marks changed in another session. Reload before saving.');
    saved=rows[0];
   }else saved=await tx.academicWorkspace.upsert({where:{yearId:b.yearId},create:{yearId:b.yearId,schoolId,data:s},update:{data:s,revision:{increment:1}},select:{revision:true}});
   await tx.auditEvent.create({data:{schoolId,actorId:user.id,action:'ACADEMIC_'+b.action.toUpperCase(),target:b.yearId}});
   if(['marks','submit','review','attendance','toggle-topic','read-notifications'].includes(b.action)) {
    const visible=this.projection(s,allocations,user.id,teacher);
    const upsert:Record<string,any[]>={};
    const id=(b.payload as any)?.id;
    if(['marks','submit','review'].includes(b.action))upsert.submissions=visible.submissions.filter((r:any)=>r.id===id);
    if(b.action==='attendance')upsert.attendance=visible.attendance.filter((r:any)=>r.id===s.attendance.at(-1)?.id);
    if(b.action==='toggle-topic')upsert.syllabus=visible.syllabus.filter((r:any)=>r.id===id);
    if(b.view==='marks'&&['marks','submit','review'].includes(b.action)) {
     // Match the bounded GET: archives and unrelated metadata stay on the server.
     return fresh({saved:true,patch:{baseRevision,workspaceRevision:saved.revision,marksSafe:true,
      upsert:{submissions:upsert.submissions.map(({archives,...record}:any)=>record)}}});
    }
    return fresh({saved:true,patch:{baseRevision,workspaceRevision:saved.revision,overviewSafe:['toggle-topic','read-notifications'].includes(b.action),replace:{audit:visible.audit,notifications:visible.notifications},upsert}});
   }
   return {saved:true};
  });
  // Replays acknowledge the saved operation, then the client refetches with current
  // permissions. Never replay a private record after a teacher is reassigned.
  return result===freshResult?result:{saved:true};
 }
}
