import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { PlatformService } from './platform.service';
import { addClassSubjectsToEnrollments } from './registry-support';
import { requireYearTerm } from './academic-terms';
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
 private async context(tx:Prisma.TransactionClient,schoolId:string,yearId:string) {
  const year=await tx.academicYear.findFirst({where:{id:yearId,schoolId}});if(!year)throw new BadRequestException('Choose an academic year in this school.');
  const allocations=await tx.teachingAssignment.findMany({where:{schoolId,classroom:{yearId},membership:{active:true,user:{enabled:true}}},include:{membership:{include:{user:true}},classroom:true,subject:true}});
  const record=await tx.academicWorkspace.findUnique({where:{yearId}});
  return {year,allocations,state:{...empty(),...(record?.data as any ?? {})}};
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
  const {user}=await this.svc.authorize(req,parse(uuid,schoolId),['ACADEMIC','HEADMASTER','TEACHER']);const {yearId}=parse(z.object({yearId:uuid}).strict(),query);
  const {state,allocations}=await this.context(this.svc.db,schoolId,yearId);return this.projection(state,allocations,user.id,req.session.selectedRole==='TEACHER');
 }
 @Post('commands') async command(@Req() req:Request,@Param('schoolId') schoolId:string,@Body() body:unknown) {
  const {user}=await this.svc.authorize(req,parse(uuid,schoolId),['ACADEMIC','HEADMASTER','TEACHER']);
  const b=parse(z.object({yearId:uuid,action:text,payload:z.unknown()}).strict(),body);const teacher=req.session.selectedRole==='TEACHER';
  return this.svc.idempotent(`${user.id}:academics:${schoolId}`,parse(uuid,req.header('Idempotency-Key')),b,async tx=>{
   const {year,state:s,allocations}=await this.context(tx,schoolId,b.yearId);
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
     academic();const p=parse(z.object({id:uuid,decision:z.enum(['approved','returned']),reason:z.string().trim().max(2000).default('')}).strict(),b.payload);const a=submission(p.id);
     if(a.assessmentProgress.status!=='submitted'||assessment(a.assessmentId).status==='closed')throw new ConflictException('Only a submitted, open assessment can be reviewed.');
     if(p.decision==='returned'&&p.reason.length<10)throw new BadRequestException('Explain the correction in at least 10 characters.');
     a.assessmentProgress={...a.assessmentProgress,status:p.decision,approvedAt:p.decision==='approved'?now:null,returnReason:p.decision==='returned'?p.reason:null};a.revision++;
     s.notifications.unshift({id:randomUUID(),type:p.decision==='approved'?'marks_approved':'marks_returned',relatedAssignmentId:a.id,readBy:[],createdAt:now,message:`${a.className} / ${a.subjectName}: ${p.decision}. ${p.reason}`});break;
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
    case 'support': {
     academic();const p=parse(z.object({studentNumber:text,className:text,subject:text,action:z.string().trim().min(10).max(2000),teacherMembershipId:uuid,due:date}).strict(),b.payload);within(p.due);
     const classroom=(await tx.classroom.findMany({where:{schoolId,yearId:b.yearId}})).find(c=>classLabel(c.name)===p.className);
     const subject=await tx.subject.findFirst({where:{schoolId,name:p.subject}});
     const student=classroom&&subject?await tx.student.findFirst({where:{schoolId,admissionNumber:p.studentNumber,enrollments:{some:{classroomId:classroom.id,status:'active',subjects:{some:{subjectId:subject.id}}}}}}):null;
     const teacherMember=await tx.membership.findFirst({where:{id:p.teacherMembershipId,schoolId,role:'TEACHER',active:true,user:{enabled:true}},include:{user:true}});
     if(!classroom||!student||!subject||!teacherMember)throw new BadRequestException('Choose an enrolled student, class, subject, and active teacher from this school.');
     s.support.push({...p,student:student.name,teacherId:teacherMember.userId,owner:teacherMember.user.name,id:randomUUID(),yearId:b.yearId,createdAt:now,status:'pending',responseReason:'',respondedAt:null});
     s.notifications.unshift({id:randomUUID(),type:'support_assigned',teacherId:teacherMember.userId,relatedSupportId:s.support.at(-1).id,readBy:[],createdAt:now,message:`Student support assigned: ${student.name} / ${p.subject} in ${p.className}.`});break;
    }
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
    case 'grading': {academic();const p=parse(policySchema.strict(),b.payload);if(new Set(p.bands.map(x=>x.label.toLowerCase())).size!==p.bands.length||p.bands.at(-1)!.minimum!==0||p.bands.some((x,i)=>i>0&&x.minimum>=p.bands[i-1].minimum))throw new BadRequestException('Grade bands must be unique, descending and end at zero.');s.policy={...p,revision:s.policy.revision+1};break;}
    case 'reports': {
     academic();const p=parse(z.object({assessmentId:uuid,className:text}).strict(),b.payload);assessment(p.assessmentId);const rows=s.submissions.filter((a:any)=>a.assessmentId===p.assessmentId&&a.className===p.className);
     if(!rows.length||rows.some((a:any)=>a.assessmentProgress.status!=='approved'))throw new BadRequestException('Approve all assigned subjects first.');
     const enrollments=await tx.enrollment.findMany({where:{schoolId,classroomId:rows[0].classId,status:'active'},include:{subjects:true}});
     if(enrollments.some(e=>e.subjects.some(subject=>!rows.some((a:any)=>a.subjectId===subject.subjectId&&a.entries.some((m:any)=>m.studentId===e.studentId)))))throw new BadRequestException('Some enrolled subjects have no approved marks. Assign and approve those subjects first.');
     const students=new Map<string,any>();for(const a of rows)for(const m of a.entries){if(typeof m.marksValue!=='number'&&m.noMark!==true)throw new BadRequestException('Incomplete marks.');const r=students.get(m.studentId)??{id:`${p.assessmentId}:${a.classId}:${m.studentId}`,academicYearId:b.yearId,assessmentId:p.assessmentId,classId:a.classId,createdAt:now,student:m.fullName,studentNumber:m.studentNumber,className:a.className,period:`${year.name} / ${assessment(p.assessmentId).name}`,academicApproved:true,status:'generated',recipients:[],results:[],noMarks:[]};if(typeof m.marksValue==='number')r.results.push({subject:a.subjectName,mark:m.marksValue,grade:grade(m.marksValue,a.gradingPolicy)});else r.noMarks.push(a.subjectName);students.set(m.studentId,r);}
     for(const r of students.values()){const existing=s.reports.find((x:any)=>x.id===r.id);if(existing&&existing.status!=='generated')continue;s.reports=s.reports.filter((x:any)=>x.id!==r.id);s.reports.push(r);}break;
    }
    case 'class-teacher': {
     academic();const p=parse(z.object({classId:uuid,teacherId:uuid.nullable()}).strict(),b.payload);if(!await tx.classroom.findFirst({where:{id:p.classId,schoolId,yearId:b.yearId}}))throw new BadRequestException('Class not found.');
     const m=p.teacherId?await tx.membership.findFirst({where:{id:p.teacherId,schoolId,role:'TEACHER',active:true,user:{enabled:true}},include:{user:true}}):null;if(p.teacherId&&!m)throw new BadRequestException('Choose an active teacher.');
     const previous=s.classTeachers.filter((a:any)=>a.classId===p.classId&&!a.endedAt);
     if(previous.length===1&&previous[0].membershipId===m?.id)break;
     for(const a of previous)a.endedAt=now;
     const formerMembershipIds=previous.map((a:any)=>a.membershipId).filter((id:string)=>id&&id!==m?.id);
     if(formerMembershipIds.length)await tx.teachingAssignment.deleteMany({where:{schoolId,classroomId:p.classId,membershipId:{in:formerMembershipIds},subjectId:null}});
     if(m){s.classTeachers.push({id:randomUUID(),classId:p.classId,yearId:b.yearId,teacherId:m.userId,membershipId:m.id,teacherName:m.user.name,at:now});if(!await tx.teachingAssignment.findFirst({where:{schoolId,classroomId:p.classId,membershipId:m.id,subjectId:null}}))await tx.teachingAssignment.create({data:{schoolId,classroomId:p.classId,membershipId:m.id}});}break;
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
    case 'approve-report': {if(req.session.selectedRole!=='HEADMASTER')throw new ForbiddenException();const p=parse(z.object({id:text}).strict(),b.payload);const r=s.reports.find((r:any)=>r.id===p.id);if(!r)throw new BadRequestException('Report not found.');r.status='approved';break;}
    case 'read-notifications': {const p=parse(z.object({id:uuid.optional()}).strict(),b.payload);const visible=this.projection(s,allocations,user.id,teacher).notifications;for(const n of s.notifications)if((!p.id||n.id===p.id)&&visible.some((v:any)=>v.id===n.id))n.readBy=[...new Set([...(n.readBy??[]),user.id])];break;}
    default: throw new BadRequestException('Unknown academic action.');
   }
   log(`${b.action.replaceAll('-',' ')} saved`);
   await tx.academicWorkspace.upsert({where:{yearId:b.yearId},create:{yearId:b.yearId,schoolId,data:s},update:{data:s,revision:{increment:1}}});
   await tx.auditEvent.create({data:{schoolId,actorId:user.id,action:'ACADEMIC_'+b.action.toUpperCase(),target:b.yearId}});
   return {saved:true};
  });
 }
}
