const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

module.exports = async function studentSubjects({ t, db, client, fixture }) {
  await t.test('class defaults and student subject editing are shared with academic and class teachers', async () => {
    await db.rateBucket.deleteMany();
    const school = await db.school.create({ data: { name: 'Student Subjects Test', code: `SUBJECTS-${randomUUID().slice(0, 8)}`, region: 'Test' } });
    const year = await db.academicYear.create({ data: { schoolId: school.id, name: '2026', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') } });
    const classroom = await db.classroom.create({ data: { schoolId: school.id, yearId: year.id, name: 'Form 1 A' } });
    const otherClass = await db.classroom.create({ data: { schoolId: school.id, yearId: year.id, name: 'Form 1 B' } });
    const regUser = await fixture(`subjects-registrar-${randomUUID()}@example.test`, 'REGISTRAR', school.id);
    const academicUser = await fixture(`subjects-academic-${randomUUID()}@example.test`, 'ACADEMIC', school.id);
    const teacherUser = await fixture(`subjects-class-teacher-${randomUUID()}@example.test`, 'TEACHER', school.id);
    const otherTeacherUser = await fixture(`subjects-other-teacher-${randomUUID()}@example.test`, 'TEACHER', school.id);
    const reg = client(), academic = client(), teacher = client(), otherTeacher = client();
    for (const [agent, user, role] of [[reg, regUser, 'REGISTRAR'], [academic, academicUser, 'ACADEMIC'], [teacher, teacherUser, 'TEACHER'], [otherTeacher, otherTeacherUser, 'TEACHER']]) {
      assert.equal((await agent.login(user.email, undefined, role)).status, 201);
    }
    const route = `schools/${school.id}/registry/`;
    const call = (agent, method, path, data) => agent.call(method, route + path, data, { 'Idempotency-Key': randomUUID() });
    const post = (agent, path, data) => call(agent, 'POST', path, data);
    const patch = (agent, path, data) => call(agent, 'PATCH', path, data);
    const roster = (agent, classId) => agent.call('GET', route + `student-subjects?yearId=${year.id}${classId ? `&classroomId=${classId}` : ''}`);

    const registered = await post(reg, 'students', { name: 'Early Student', admissionNumber: 'SUB-001', classroomId: classroom.id });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const math = (await post(academic, 'subjects', { name: 'Mathematics', code: 'MAT' })).body;
    const science = (await post(academic, 'subjects', { name: 'Science', code: 'SCI' })).body;
    assert.equal((await post(academic, 'class-subjects', { classroomId: classroom.id, subjectIds: [math.id] })).status, 201);
    const early = await db.enrollment.findFirstOrThrow({ where: { studentId: registered.body.id, classroomId: classroom.id } });
    assert.deepEqual((await db.enrollmentSubject.findMany({ where: { enrollmentId: early.id }, select: { subjectId: true } })).map(row => row.subjectId), [math.id], 'existing active students inherit newly offered subjects');
    const late = await post(reg, 'students', { name: 'Later Student', admissionNumber: 'SUB-002', classroomId: classroom.id });
    assert.equal(late.status, 201, JSON.stringify(late.body));
    let academicRoster = await roster(academic, classroom.id);
    assert.equal(academicRoster.status, 200, JSON.stringify(academicRoster.body));
    assert.equal(academicRoster.body.classes.length, 2, 'academic master sees cards for all classes');
    assert.equal(academicRoster.body.selectedClass.studentCount, 2);
    assert.ok(academicRoster.body.students.every(student => student.subjectIds.includes(math.id)), 'omitted registrar selection inherits class subjects');
    const paged = await academic.call('GET', route + `student-subjects?yearId=${year.id}&classroomId=${classroom.id}&pageSize=1&page=2`);
    assert.equal(paged.body.total, 2); assert.equal(paged.body.students.length, 1);
    const searched = await academic.call('GET', route + `student-subjects?yearId=${year.id}&classroomId=${classroom.id}&pageSize=1&q=Later`);
    assert.equal(searched.body.total, 1); assert.equal(searched.body.students[0].studentId, late.body.id, 'search covers the authorized dataset before paging');
    assert.equal((await academic.call('GET', route + `student-subjects?yearId=${year.id}&classroomId=${classroom.id}&pageSize=10000`)).status, 400);
    const oldVersion = academicRoster.body.students.find(student => student.studentId === registered.body.id).version;
    assert.equal((await post(academic, 'class-subjects', { classroomId: classroom.id, subjectIds: [math.id, science.id] })).status, 201);
    academicRoster = await roster(academic, classroom.id);
    assert.ok(academicRoster.body.students.every(student => student.subjectIds.includes(science.id)), 'new class offering reaches every active student');
    assert.equal((await patch(academic, `enrollments/${early.id}/subjects`, { version: oldVersion, subjectIds: [math.id] })).status, 409, 'new default invalidates a stale edit');

    const membership = await db.membership.findFirstOrThrow({ where: { schoolId: school.id, userId: teacherUser.id } });
    const assigned = await academic.call('POST', `schools/${school.id}/academics/commands`, { yearId: year.id, action: 'class-teacher', payload: { classId: classroom.id, teacherId: membership.id } }, { 'Idempotency-Key': randomUUID() });
    assert.equal(assigned.status, 201, JSON.stringify(assigned.body));
    assert.equal((await roster(teacher)).body.classes.length, 1, 'class teacher sees only their class');
    assert.equal((await roster(otherTeacher)).body.classes.length, 0);
    assert.equal((await roster(otherTeacher, classroom.id)).status, 403);
    assert.equal((await roster(reg)).status, 403);
    const first = academicRoster.body.students.find(student => student.studentId === registered.body.id);
    const second = academicRoster.body.students.find(student => student.studentId === late.body.id);
    assert.equal((await patch(academic, `enrollments/${first.enrollmentId}/subjects`, { version: first.version, subjectIds: [math.id] })).status, 200);
    assert.equal((await patch(otherTeacher, `enrollments/${second.enrollmentId}/subjects`, { version: second.version, subjectIds: [science.id] })).status, 403);
    assert.equal((await patch(teacher, `enrollments/${second.enrollmentId}/subjects`, { version: second.version, subjectIds: [science.id] })).status, 200);
    const updated = await roster(teacher, classroom.id);
    assert.deepEqual(updated.body.students.find(student => student.studentId === registered.body.id).subjectIds, [math.id]);
    assert.deepEqual(updated.body.students.find(student => student.studentId === late.body.id).subjectIds, [science.id]);
    await db.academicYear.update({ where: { id: year.id }, data: { closed: true } });
    assert.equal((await patch(teacher, `enrollments/${second.enrollmentId}/subjects`, { version: second.version + 1, subjectIds: [math.id] })).status, 200);
  });
};
