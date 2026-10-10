const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

module.exports = async ({ t, db, client, fixture }) => {
  await t.test('assessment allocation targets only selected classes', async () => {
    const school = await db.school.create({ data: { name: 'Assessment allocation test', code: `ALLOC-${randomUUID().slice(0, 8)}`, region: 'Test' } });
    const year = await db.academicYear.create({ data: { schoolId: school.id, name: '2026', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') } });
    const first = await db.classroom.create({ data: { schoolId: school.id, yearId: year.id, name: 'Form 1A' } });
    const second = await db.classroom.create({ data: { schoolId: school.id, yearId: year.id, name: 'Form 1B' } });
    const subject = await db.subject.create({ data: { schoolId: school.id, name: 'Mathematics', code: 'MATH' } });
    const academicUser = await fixture(`alloc-academic-${randomUUID()}@example.test`, 'ACADEMIC', school.id);
    const teacherUser = await fixture(`alloc-teacher-${randomUUID()}@example.test`, 'TEACHER', school.id);
    const membership = await db.membership.findFirstOrThrow({ where: { userId: teacherUser.id, schoolId: school.id } });
    for (const classroom of [first, second]) {
      await db.classSubject.create({ data: { schoolId: school.id, classroomId: classroom.id, subjectId: subject.id } });
      await db.teachingAssignment.create({ data: { schoolId: school.id, classroomId: classroom.id, subjectId: subject.id, membershipId: membership.id } });
    }
    const academic = client(), teacher = client();
    assert.equal((await academic.login(academicUser.email, undefined, 'ACADEMIC')).status, 201);
    assert.equal((await teacher.login(teacherUser.email, undefined, 'TEACHER')).status, 201);
    const route = `schools/${school.id}/academics`;
    const command = (agent, action, payload) => agent.call('POST', `${route}/commands`, { yearId: year.id, action, payload }, { 'Idempotency-Key': randomUUID() });
    const state = async agent => (await agent.call('GET', `${route}?yearId=${year.id}`)).body;
    const created = await command(academic, 'assessment', { name: 'Class test', term: 'Term 1', deadline: '2026-11-01' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const exam = (await state(academic)).assessments[0];
    assert.equal((await command(academic, 'assessment-status', { id: exam.id, status: 'open' })).status, 201);
    assert.equal((await command(teacher, 'allocate', { id: exam.id, classIds: [first.id] })).status, 403);
    assert.equal((await command(academic, 'allocate', { id: exam.id, classIds: [randomUUID()] })).status, 400);
    assert.equal((await command(academic, 'allocate', { id: exam.id, classIds: [first.id] })).status, 201);
    let submissions = (await state(teacher)).submissions;
    assert.deepEqual(submissions.map(row => row.classId), [first.id], 'other class is not assigned');
    assert.equal((await command(academic, 'allocate', { id: exam.id, classIds: [first.id] })).status, 201);
    assert.equal((await state(teacher)).submissions.length, 1, 'repeating a selection is idempotent');
    assert.equal((await command(academic, 'allocate', { id: exam.id, classIds: [second.id] })).status, 201);
    submissions = (await state(teacher)).submissions;
    assert.deepEqual(new Set(submissions.map(row => row.classId)), new Set([first.id, second.id]));
  });
};
