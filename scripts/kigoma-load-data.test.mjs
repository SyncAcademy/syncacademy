import test from 'node:test';
import assert from 'node:assert/strict';
import { uid, buildCatalogue, createCohorts, makeYear, validateYear, core, combinations } from './kigoma-load-data.mjs';

test('five-year school data respects rosters, combinations, progression, reports and balances',()=>{
  const school={id:uid('test-school')}, actorId=uid('test-head');
  const existing={id:uid('existing-student'),schoolId:school.id,name:'Existing Student',admissionNumber:'EXISTING-1',gender:'F'};
  const teacher={id:uid('existing-member'),userId:uid('existing-teacher'),active:true,user:{enabled:true,name:'Existing Teacher'}};
  const catalogue=buildCatalogue(school,[],[teacher]);
  const cohorts=createCohorts(school,[existing],[{studentId:existing.id,status:'active',classroom:{name:'form 1A'}}]);
  assert.equal(catalogue.teachers.length,40);
  assert.equal(catalogue.newUsers.length,39);
  const previous=new Map();let markCount=0;
  for(let year=2022;year<=2026;year++) {
    const plan=makeYear({school,actorId,year,catalogue,cohorts});
    const summary=validateYear(plan);markCount+=summary.marks;
    const {tables:t,state:s}=plan;
    const ids=new Map(Object.entries(catalogue.byCode).map(([code,s])=>[s.id,code]));
    const selections=new Map();for(const e of t.enrollmentSubject){const codes=selections.get(e.enrollmentId)??[];codes.push(ids.get(e.subjectId));selections.set(e.enrollmentId,codes);}
    for(const c of t.classroom) {
      const roster=t.enrollment.filter(e=>e.classroomId===c.id), chosen=roster.map(e=>selections.get(e.id));
      if(/Form [1-4]/.test(c.name)) {
        for(const codes of chosen){assert.ok(core.every(code=>codes.includes(code)));assert.ok(codes.length===9||codes.length===10);assert.equal(codes.includes('PHY'),codes.includes('CHEM'));assert.equal(codes.includes('BK'),codes.includes('COM'));assert.notEqual(codes.includes('PHY'),codes.includes('BK'));}
        assert.ok(chosen.some(c=>c.includes('BIBLE')));assert.ok(chosen.some(c=>c.includes('ICS')));
      } else {
        const combos=c.name.includes('Science')?['PCM','PGM','PCB']:['HGL','HGK','HGE'];
        for(const codes of chosen) assert.ok(combos.some(combo=>JSON.stringify([...combinations[combo],'GS'].sort())===JSON.stringify([...codes].sort())));
        for(const combo of combos) assert.ok(chosen.some(c=>combinations[combo].every(code=>c.includes(code))));
      }
      const form=Number(c.name.match(/Form (\d)/)[1]);
      if(year>2022&&![1,5].includes(form)) {
        const before=c.name.replace(`Form ${form}`,`Form ${form-1}`);
        assert.deepEqual(roster.map(e=>e.studentId),previous.get(before));
      }
      if(year===2026&&c.name==='Form 1A') assert.ok(roster.some(e=>e.studentId===existing.id));
    }
    previous.clear();for(const c of t.classroom)previous.set(c.name,t.enrollment.filter(e=>e.classroomId===c.id).map(e=>e.studentId));
    const sources=new Map();for(const sub of s.submissions)for(const e of sub.entries)sources.set(`${sub.assessmentId}:${sub.classId}:${e.studentNumber}:${sub.subjectName}`,{...e,status:sub.assessmentProgress.status,policy:sub.gradingPolicy});
    for(const r of s.reports)for(const result of r.results){const source=sources.get(`${r.assessmentId}:${r.classId}:${r.studentNumber}:${result.subject}`);assert.equal(source.status,'approved');assert.equal(result.mark,source.marksValue);assert.equal(result.grade,source.policy.bands.find(b=>result.mark>=b.minimum).label);}
    const ledger=new Map();for(const c of t.studentCharge){const key=`${c.studentId}:${c.term}`;ledger.set(key,(ledger.get(key)??0)+c.amount);}for(const p of t.payment){const key=`${p.studentId}:${p.term}`;ledger.set(key,ledger.get(key)-p.amount);}for(const a of t.adjustment){const key=`${a.studentId}:${a.term}`;ledger.set(key,ledger.get(key)+a.amount);}assert.ok([...ledger.values()].every(v=>v>=0));assert.ok([...ledger.values()].some(v=>v===0));assert.ok([...ledger.values()].some(v=>v>0));
    const usedSlots=new Set();for(const slot of s.slots)for(const resource of [`teacher:${slot.teacher}`,`room:${slot.room}`,`class:${slot.className}`]){const key=`${slot.date}:${slot.start}:${resource}`;assert.ok(!usedSlots.has(key),`Timetable collision: ${key}`);usedSlots.add(key);}
    const counts=new Map();for(const sheet of s.attendance){assert.equal(sheet.entries.length,50);assert.ok(sheet.date<='2026-10-12');for(const e of sheet.entries)counts.set(e.status,(counts.get(e.status)??0)+1);}assert.equal(counts.size,4);
    assert.equal(new Set(t.teachingAssignment.map(a=>a.membershipId)).size,40);
  }
  assert.equal(cohorts.students.size,1800);
  assert.ok(markCount>350000);
});
