const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const sourceUrl = new URL(process.env.DATABASE_URL);
const databaseName = process.env.PARENT_TEST_DATABASE_NAME || 'syncacademy_auth_test';
if (!['syncacademy_parent_test', 'syncacademy_auth_test'].includes(databaseName)) throw Error('Only a disposable parent or authentication test database is allowed');
const adminUrl = new URL(sourceUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(sourceUrl);
testUrl.pathname = `/${databaseName}`;
process.env.DATABASE_URL = testUrl.toString();
process.env.REALTIME_DATABASE_URL = testUrl.toString();
process.env.NODE_ENV = 'test';
process.env.PORT = '3107';
process.env.COMMUNICATION_MOCK_DISPATCH = 'true';
process.env.EMAIL_PROVIDER = 'mock';
if (new URL(process.env.DATABASE_URL).pathname !== `/${databaseName}`) throw Error('Isolated parent test database required');
const { passwordHash, decrypt, digest } = require('../dist/security');
const base = 'http://127.0.0.1:3107/api/v1/';
const origin = process.env.APP_ORIGIN;

function staffClient() {
  let cookie = '';
  return async (method, route, body, csrf) => {
    const res = await fetch(base + route, { method, headers: { Origin: origin, 'X-Requested-With': 'SyncAcademy', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const set = res.headers.getSetCookie();
    if (set.length) cookie = set.map(value => value.split(';')[0]).join('; ');
    return { status: res.status, body: await res.json() };
  };
}
async function mobile(method, route, body, token) {
  const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, body: await res.json() };
}

test('parent activation and school isolation', { timeout: 180000 }, async () => {
  const provision = new Pool({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 });
  try {
    const exists = await provision.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
    if (!exists.rows.length) {
      if (databaseName !== 'syncacademy_parent_test') throw Error('The selected disposable test database does not exist');
      await provision.query('CREATE DATABASE syncacademy_parent_test');
    }
  } finally { await provision.end(); }
  const prisma = path.resolve(__dirname, '../../../node_modules/prisma/build/index.js');
  const migration = spawnSync(process.execPath, [prisma, 'migrate', 'deploy', '--schema', path.resolve(__dirname, '../prisma/schema.prisma')], { env: process.env, encoding: 'utf8', timeout: 90000 });
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  const db = new PrismaClient();
  const database = await db.$queryRaw`SELECT current_database() AS name`;
  assert.equal(database[0].name, databaseName);
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "School", "session", "RateBucket" CASCADE');
  const password = `Parent-test-${randomUUID()}`;
  const hash = await passwordHash(password);
  const school = await db.school.create({ data: { name: 'Parent test school', code: `PT${randomUUID().slice(0, 8)}`, region: 'Test' } });
  const otherSchool = await db.school.create({ data: { name: 'Other test school', code: `OT${randomUUID().slice(0, 8)}`, region: 'Test' } });
  const year = await db.academicYear.create({ data: { schoolId: school.id, name: '2026', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') } });
  const classroom = await db.classroom.create({ data: { schoolId: school.id, yearId: year.id, name: 'Class One' } });
  const child = await db.student.create({ data: { schoolId: school.id, name: 'Authorized Child', admissionNumber: 'P-001' } });
  await db.enrollment.create({ data: { schoolId: school.id, studentId: child.id, classroomId: classroom.id } });
  const unrelated = await db.student.create({ data: { schoolId: otherSchool.id, name: 'Unrelated Child', admissionNumber: 'O-001' } });
  const guardian = await db.guardian.create({ data: { schoolId: school.id, name: 'Parent Test', phone: '255712345678', email: 'parent@example.test' } });
  await db.studentGuardian.create({ data: { schoolId: school.id, studentId: child.id, guardianId: guardian.id } });
  const staff = await db.user.create({ data: { email: 'registrar@example.test', name: 'Registrar Test', passwordHash: hash } });
  await db.membership.create({ data: { userId: staff.id, schoolId: school.id, role: 'REGISTRAR' } });
  const teacher = await db.user.create({ data: { email: 'teacher@example.test', name: 'Teacher Test', passwordHash: hash } });
  await db.membership.create({ data: { userId: teacher.id, schoolId: school.id, role: 'TEACHER' } });
  const head = await db.user.create({ data: { email: 'head@example.test', name: 'Head Test', passwordHash: hash } });
  await db.membership.create({ data: { userId: head.id, schoolId: school.id, role: 'HEADMASTER' } });

  const api = spawn(process.execPath, [path.resolve(__dirname, '../dist/main.js')], { env: process.env, stdio: 'pipe', windowsHide: true });
  let logs = '';
  api.stdout.on('data', bytes => { logs += bytes; });
  api.stderr.on('data', bytes => { logs += bytes; });
  let worker;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      try { if ((await fetch(base + 'health/ready')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready, logs.slice(-1000));
    assert.equal((await mobile('GET', `parent/children/${child.id}`)).status, 401);
    const denied = staffClient();
    assert.equal((await denied('POST', 'auth/login', { email: teacher.email, password, role: 'TEACHER' })).status, 201);
    assert.equal((await denied('POST', `schools/${school.id}/parent-invitations`, { guardianId: guardian.id, channel: 'SMS' })).status, 403);
    const staffCall = staffClient();
    assert.equal((await staffCall('POST', 'auth/login', { email: staff.email, password, role: 'REGISTRAR' })).status, 201);
    assert.equal((await staffCall('POST', `schools/${school.id}/parent-invitations`, { guardianId: guardian.id, channel: 'SMS' })).status, 403);
    const csrf = (await staffCall('GET', `schools/${school.id}/parent-actions/csrf`)).body.csrfToken;
    const invitation = await staffCall('POST', `schools/${school.id}/parent-invitations`, { guardianId: guardian.id, channel: 'SMS' }, csrf);
    assert.equal(invitation.status, 201, JSON.stringify(invitation.body));
    const outbox = await db.outbox.findFirstOrThrow({ where: { idempotencyKey: `parent-invitation:${invitation.body.id}` } });
    const message = JSON.parse(decrypt(outbox.payload)).body;
    const credential = /token=([A-Za-z0-9_-]+)/.exec(message)?.[1];
    assert.ok(credential);
    assert.equal((await mobile('POST', 'parent/invitations/challenge', { credential })).status, 201);
    const verification = await db.contactVerification.findFirstOrThrow({ where: { schoolId: school.id, guardianId: guardian.id } });
    const otpOutbox = await db.outbox.findFirstOrThrow({ where: { schoolId: school.id, idempotencyKey: null, createdAt: { gte: verification.createdAt } }, orderBy: { createdAt: 'desc' } });
    const code = /code: (\d{6})/.exec(JSON.parse(decrypt(otpOutbox.payload)).body)?.[1];
    assert.ok(code);
    assert.equal((await mobile('POST', 'parent/invitations/activate', { credential, code: '000000', password })).status, 400);
    assert.equal((await mobile('POST', 'parent/invitations/activate', { credential, code, password })).status, 201);
    assert.equal((await mobile('POST', 'parent/invitations/activate', { credential, code, password })).status, 400);
    const revokedInvitation = await staffCall('POST', `schools/${school.id}/parent-invitations`, { guardianId: guardian.id, channel: 'SMS' }, csrf);
    assert.equal(revokedInvitation.status, 201);
    const revokedOutbox = await db.outbox.findFirstOrThrow({ where: { idempotencyKey: `parent-invitation:${revokedInvitation.body.id}` } });
    const revokedCredential = /token=([A-Za-z0-9_-]+)/.exec(JSON.parse(decrypt(revokedOutbox.payload)).body)?.[1];
    assert.equal((await staffCall('POST', `schools/${school.id}/parent-invitations/${revokedInvitation.body.id}/revoke`, {}, csrf)).status, 201);
    assert.equal((await mobile('POST', 'parent/invitations/challenge', { credential: revokedCredential })).status, 400);
    const expiredInvitation = await staffCall('POST', `schools/${school.id}/parent-invitations`, { guardianId: guardian.id, channel: 'SMS' }, csrf);
    assert.equal(expiredInvitation.status, 201);
    const expiredOutbox = await db.outbox.findFirstOrThrow({ where: { idempotencyKey: `parent-invitation:${expiredInvitation.body.id}` } });
    const expiredCredential = /token=([A-Za-z0-9_-]+)/.exec(JSON.parse(decrypt(expiredOutbox.payload)).body)?.[1];
    await db.parentInvitation.update({ where: { id: expiredInvitation.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await mobile('POST', 'parent/invitations/challenge', { credential: expiredCredential })).status, 400);
    const signIn = await mobile('POST', 'parent/auth/login', { identifier: guardian.email, password });
    assert.equal(signIn.status, 201, JSON.stringify(signIn.body));
    let token = signIn.body.accessToken;
    assert.equal((await mobile('GET', 'parent/children', undefined, token)).body.items.length, 1);
    assert.equal((await mobile('GET', `parent/children/${child.id}`, undefined, token)).status, 200);
    assert.equal((await mobile('GET', `parent/children/${unrelated.id}`, undefined, token)).status, 404);
    const reportCardId = `${randomUUID()}:${classroom.id}:${child.id}`;
    await db.academicWorkspace.create({ data: { schoolId: school.id, yearId: year.id, data: { reports: [{ id: reportCardId, status: 'approved', academicApproved: true, period: '2026 Term 1', results: [{ subject: 'Mathematics', mark: 82, grade: 'A' }] }], attendance: [{ classId: classroom.id, date: '2026-06-01', revision: 1, entries: [{ studentId: child.id, status: 'Present', note: '' }] }] } } });
    const published = await db.reportAccessLink.create({ data: { schoolId: school.id, studentId: child.id, guardianId: guardian.id, reportCardId, tokenHash: digest(randomUUID()), expiresAt: new Date(Date.now() + 86400000) } });
    const resultList = await mobile('GET', `parent/children/${child.id}/results`, undefined, token);
    assert.equal(resultList.status, 200);
    assert.equal(resultList.body.items.length, 1);
    const result = await mobile('GET', `parent/children/${child.id}/results/${published.id}`, undefined, token);
    assert.equal(result.status, 200);
    assert.equal(result.body.results[0].mark, 82);
    await db.reportAccessLink.update({ where: { id: published.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await mobile('GET', `parent/children/${child.id}/results`, undefined, token)).body.items.length, 0);
    assert.equal((await mobile('GET', `parent/children/${child.id}/results/${published.id}`, undefined, token)).status, 404);
    assert.equal((await mobile('GET', `parent/children/${child.id}/home`, undefined, token)).body.results.publishedCount, 0);
    const attendance = await mobile('GET', `parent/children/${child.id}/attendance?yearId=${year.id}`, undefined, token);
    assert.equal(attendance.status, 200);
    assert.equal(attendance.body.items[0].status, 'Present');
    const fee = await db.feeStructure.create({ data: { schoolId: school.id, yearId: year.id, classroomId: classroom.id, term: 'Term 1', name: 'Tuition', amount: 100, dueDate: new Date('2026-06-30') } });
    const charge = await db.studentCharge.create({ data: { schoolId: school.id, yearId: year.id, classroomId: classroom.id, studentId: child.id, feeId: fee.id, term: 'Term 1', name: 'Tuition', amount: 100, dueDate: new Date('2026-06-30') } });
    await db.payment.create({ data: { schoolId: school.id, yearId: year.id, studentId: child.id, chargeId: charge.id, term: 'Term 1', amount: 30, method: 'cash', receipt: 'P-0001', date: new Date('2026-06-02') } });
    const fees = await mobile('GET', `parent/children/${child.id}/fees?yearId=${year.id}`, undefined, token);
    assert.equal(fees.status, 200);
    assert.equal(fees.body.summary.balance, 70);
    const otherYear = await db.academicYear.create({ data: { schoolId: otherSchool.id, name: '2026', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') } });
    const otherClass = await db.classroom.create({ data: { schoolId: otherSchool.id, yearId: otherYear.id, name: 'Class Two' } });
    await db.enrollment.create({ data: { schoolId: otherSchool.id, studentId: unrelated.id, classroomId: otherClass.id } });
    const otherGuardian = await db.guardian.create({ data: { schoolId: otherSchool.id, name: 'Parent Test', phone: guardian.phone, email: guardian.email } });
    await db.studentGuardian.create({ data: { schoolId: otherSchool.id, studentId: unrelated.id, guardianId: otherGuardian.id } });
    const otherRegistrar = await db.user.create({ data: { email: 'other-registrar@example.test', name: 'Other Registrar', passwordHash: hash } });
    await db.membership.create({ data: { userId: otherRegistrar.id, schoolId: otherSchool.id, role: 'REGISTRAR' } });
    const otherStaffCall = staffClient();
    assert.equal((await otherStaffCall('POST', 'auth/login', { email: otherRegistrar.email, password, role: 'REGISTRAR' })).status, 201);
    const otherCsrf = (await otherStaffCall('GET', `schools/${otherSchool.id}/parent-actions/csrf`)).body.csrfToken;
    const otherInvitation = await otherStaffCall('POST', `schools/${otherSchool.id}/parent-invitations`, { guardianId: otherGuardian.id, channel: 'EMAIL' }, otherCsrf);
    assert.equal(otherInvitation.status, 201);
    const otherOutbox = await db.outbox.findFirstOrThrow({ where: { idempotencyKey: `parent-invitation:${otherInvitation.body.id}` } });
    const otherCredential = /token=([A-Za-z0-9_-]+)/.exec(JSON.parse(decrypt(otherOutbox.payload)).body)?.[1];
    assert.equal((await mobile('POST', 'parent/invitations/challenge', { credential: otherCredential })).status, 201);
    const otherVerification = await db.contactVerification.findFirstOrThrow({ where: { schoolId: otherSchool.id, guardianId: otherGuardian.id } });
    const otherOtpOutbox = await db.outbox.findFirstOrThrow({ where: { schoolId: otherSchool.id, idempotencyKey: null, createdAt: { gte: otherVerification.createdAt } }, orderBy: { createdAt: 'desc' } });
    const otherCode = /code: (\d{6})/.exec(JSON.parse(decrypt(otherOtpOutbox.payload)).body)?.[1];
    assert.equal((await mobile('POST', 'parent/invitations/activate', { credential: otherCredential, code: otherCode, password })).status, 201);
    assert.equal((await mobile('GET', `parent/children/${unrelated.id}`, undefined, token)).status, 200);
    assert.equal((await mobile('GET', 'parent/children', undefined, token)).body.items.length, 2);
    const recoveryRequest = await mobile('POST', 'parent/auth/recovery/request', { identifier: guardian.phone });
    assert.equal(recoveryRequest.status, 201);
    const recovery = await db.parentRecoveryChallenge.findFirstOrThrow({ where: { destination: guardian.phone }, orderBy: { createdAt: 'desc' } });
    const recoveryOutbox = await db.outbox.findFirstOrThrow({ where: { idempotencyKey: `parent-recovery:${recovery.id}` } });
    const recoveryCode = /code: (\d{8})/.exec(JSON.parse(decrypt(recoveryOutbox.payload)).body)?.[1];
    const recoveredPassword = `Recovered-test-${randomUUID()}`;
    assert.equal((await mobile('POST', 'parent/auth/recovery/confirm', { identifier: guardian.phone, code: '00000000', password: recoveredPassword })).status, 400);
    assert.equal((await mobile('POST', 'parent/auth/recovery/confirm', { identifier: guardian.phone, code: recoveryCode, password: recoveredPassword })).status, 201);
    assert.equal((await mobile('GET', 'parent/auth/me', undefined, token)).status, 401);
    const afterRecovery = await mobile('POST', 'parent/auth/login', { identifier: guardian.phone, password: recoveredPassword });
    assert.equal(afterRecovery.status, 201);
    token = afterRecovery.body.accessToken;
    assert.equal((await staffCall('POST', `schools/${school.id}/parent-announcements`, { yearId: year.id, title: 'School notice', body: 'School notice body' }, csrf)).status, 403);
    const headCall = staffClient();
    assert.equal((await headCall('POST', 'auth/login', { email: head.email, password, role: 'HEADMASTER' })).status, 201);
    const headCsrf = (await headCall('GET', `schools/${school.id}/parent-actions/csrf`)).body.csrfToken;
    const announcement = await headCall('POST', `schools/${school.id}/parent-announcements`, { yearId: year.id, title: 'School notice', body: 'School notice body' }, headCsrf);
    assert.equal(announcement.status, 201);
    assert.equal((await mobile('GET', `parent/announcements/${announcement.body.id}`, undefined, token)).status, 200);
    const draft = await headCall('POST', `schools/${school.id}/parent-announcements`, { yearId: year.id, title: 'Draft notice', body: 'Draft notice body', draft: true }, headCsrf);
    assert.equal(draft.status, 201);
    assert.equal(draft.body.publishedAt, null);
    assert.equal((await mobile('GET', `parent/announcements/${draft.body.id}`, undefined, token)).status, 404);
    assert.equal((await headCall('GET', `schools/${school.id}/parent-announcements/${draft.body.id}`)).status, 200);
    assert.equal((await headCall('PATCH', `schools/${school.id}/parent-announcements/${draft.body.id}`, { title: 'Edited notice' }, headCsrf)).status, 200);
    assert.equal((await headCall('POST', `schools/${school.id}/parent-announcements/${draft.body.id}/publish`, {}, headCsrf)).status, 201);
    assert.equal((await mobile('GET', `parent/announcements/${draft.body.id}`, undefined, token)).body.title, 'Edited notice');
    assert.equal((await headCall('POST', `schools/${school.id}/parent-announcements/${draft.body.id}/unpublish`, {}, headCsrf)).status, 201);
    assert.equal((await mobile('GET', `parent/announcements/${draft.body.id}`, undefined, token)).status, 404);
    assert.equal((await mobile('GET', `parent/announcements/${draft.body.id}/media`, undefined, token)).status, 404);
    const batch = await staffCall('POST', `schools/${school.id}/parent-invitation-batches`, { yearId: year.id, studentIds: [child.id], channel: 'EMAIL' }, csrf);
    assert.equal(batch.status, 201);
    worker = spawn(process.execPath, [path.resolve(__dirname, '../dist/worker.js')], { env: { ...process.env, MONITOR_INSTANCE_ID: 'parent-test-worker' }, stdio: 'ignore', windowsHide: true });
    let completed = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const state = await staffCall('GET', `schools/${school.id}/parent-invitation-batches/${batch.body.jobId}`);
      if (state.body.status === 'COMPLETE') { completed = true; assert.equal(state.body.queued, 1); break; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(completed, 'Batch worker should complete in the isolated database');
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await mobile('GET', 'parent/notifications', undefined, token)).body.items.some(item => item.kind === 'ANNOUNCEMENT')) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const notifications = await mobile('GET', 'parent/notifications', undefined, token);
    const notice = notifications.body.items.find(item => item.kind === 'ANNOUNCEMENT');
    assert.ok(notice);
    assert.equal((await mobile('PATCH', `parent/notifications/${notice.id}/read`, {}, token)).body.updated, true);
    assert.ok((await mobile('GET', 'parent/notifications', undefined, token)).body.items.find(item => item.id === notice.id).readAt);
    await db.studentGuardian.updateMany({ where: { schoolId: school.id, studentId: child.id, guardianId: guardian.id }, data: { active: false } });
    assert.equal((await mobile('GET', `parent/children/${child.id}`, undefined, token)).status, 404);
    assert.equal((await mobile('GET', 'parent/children', undefined, token)).body.items.length, 1);
    assert.equal((await mobile('GET', `parent/children/${unrelated.id}`, undefined, token)).status, 200);
    assert.equal((await mobile('POST', 'parent/auth/logout', {}, token)).status, 201);
    assert.equal((await mobile('GET', 'parent/auth/me', undefined, token)).status, 401);
    const parentUser = await db.guardian.findFirstOrThrow({ where: { id: guardian.id, schoolId: school.id }, select: { userId: true } });
    await db.user.update({ where: { id: parentUser.userId }, data: { enabled: false } });
    assert.equal((await mobile('POST', 'parent/auth/login', { identifier: guardian.phone, password: recoveredPassword })).status, 401);
  } catch (error) {
    console.error('Parent test API diagnostics:', logs.slice(-1500));
    throw error;
  } finally {
    worker?.kill();
    api.kill();
    await db.$disconnect();
  }
});
