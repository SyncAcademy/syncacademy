const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const sourceUrl = new URL(process.env.DATABASE_URL);
const databaseName = process.env.ISOLATION_TEST_DATABASE_NAME || 'syncacademy_auth_test';
const adminUrl = new URL(sourceUrl);
adminUrl.pathname = '/postgres';
const testUrl = new URL(sourceUrl);
testUrl.pathname = `/${databaseName}`;
process.env.DATABASE_URL = testUrl.toString();
process.env.REALTIME_DATABASE_URL = testUrl.toString();
process.env.NODE_ENV = 'test';
process.env.PORT = '3119';
process.env.COMMUNICATION_MOCK_DISPATCH = 'true';
process.env.EMAIL_PROVIDER = 'mock';
process.env.REALTIME_TRANSPORT = 'postgres';

const { passwordHash } = require('../dist/security');
const base = 'http://127.0.0.1:3119/api/v1/';
const origin = process.env.APP_ORIGIN;

function staffClient() {
  let cookie = '';
  return async (method, route, body, csrf, headers = {}) => {
    const res = await fetch(base + route, {
      method,
      headers: {
        Origin: origin,
        'X-Requested-With': 'SyncAcademy',
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const set = res.headers.getSetCookie();
    if (set.length) cookie = set.map(value => value.split(';')[0]).join('; ');
    return { status: res.status, body: await res.json() };
  };
}

async function parentClient(method, route, body, token) {
  const res = await fetch(base + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'SyncAcademy',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: await res.json() };
}

test('Mobile product separation, cross-tenant isolation, concurrency conflict, and data preservation', { timeout: 300000 }, async () => {
  const provision = new Pool({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 });
  try {
    const exists = await provision.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
    if (!exists.rows.length) {
      await provision.query(`CREATE DATABASE ${databaseName}`);
    }
  } finally {
    await provision.end();
  }

  const migration = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/deploy-migrations.cjs')], {
    env: process.env,
    encoding: 'utf8',
    timeout: 300000,
    windowsHide: true,
  });
  assert.equal(migration.status, 0, migration.error?.message || migration.stderr || migration.stdout);

  const db = new PrismaClient();
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "School", "session", "RateBucket" CASCADE');

  const password = `SecretPass-${randomUUID()}`;
  const hash = await passwordHash(password);

  // Setup School A
  const schoolA = await db.school.create({
    data: { name: 'School Alpha', code: `SA${randomUUID().slice(0, 6)}`, region: 'Dar es Salaam' },
  });
  const yearA = await db.academicYear.create({
    data: {
      schoolId: schoolA.id,
      name: '2026',
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      terms: [{ key: 'term-1', name: 'Term 1', startsAt: '2026-01-01', endsAt: '2026-06-30' }],
    },
  });
  const classroomA = await db.classroom.create({
    data: { schoolId: schoolA.id, yearId: yearA.id, name: 'Grade 1' },
  });

  // Setup School B (unrelated tenant)
  const schoolB = await db.school.create({
    data: { name: 'School Beta', code: `SB${randomUUID().slice(0, 6)}`, region: 'Arusha' },
  });
  const yearB = await db.academicYear.create({
    data: {
      schoolId: schoolB.id,
      name: '2026',
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      terms: [{ key: 'term-1', name: 'Term 1', startsAt: '2026-01-01', endsAt: '2026-06-30' }],
    },
  });

  // Setup Students in School A
  const childA = await db.student.create({
    data: { schoolId: schoolA.id, name: 'Alpha Student One', admissionNumber: 'STD-001' },
  });
  await db.enrollment.create({
    data: {
      schoolId: schoolA.id,
      studentId: childA.id,
      classroomId: classroomA.id,
      status: 'active',
      createdAt: new Date('2026-01-01'),
    },
  });

  // Setup Student in School B
  const childB = await db.student.create({
    data: { schoolId: schoolB.id, name: 'Beta Student Two', admissionNumber: 'STD-999' },
  });

  // Setup Guardian & Parent User for Child A
  const guardianA = await db.guardian.create({
    data: { schoolId: schoolA.id, name: 'Parent Alpha', phone: '255788111222', email: 'alpha.parent@example.test' },
  });
  await db.studentGuardian.create({
    data: { schoolId: schoolA.id, studentId: childA.id, guardianId: guardianA.id },
  });

  const parentUser = await db.user.create({
    data: {
      email: 'alpha.parent@example.test',
      name: 'Parent Alpha',
      passwordHash: hash,
      enabled: true,
    },
  });
  const parentAccount = await db.parentAccount.create({
    data: {
      userId: parentUser.id,
      loginPhone: '255788111222',
      verifiedAt: new Date(),
    },
  });
  await db.guardian.update({
    where: { id: guardianA.id },
    data: { userId: parentUser.id },
  });

  // Setup Teacher for School A
  const teacherUser = await db.user.create({
    data: { email: 'teacher.alpha@example.test', name: 'Teacher Alpha', passwordHash: hash, enabled: true },
  });
  await db.membership.create({
    data: { userId: teacherUser.id, schoolId: schoolA.id, role: 'TEACHER', active: true },
  });

  // Setup Second Teacher for School A (for concurrent conflict tests)
  const teacher2User = await db.user.create({
    data: { email: 'teacher.beta@example.test', name: 'Teacher Beta', passwordHash: hash, enabled: true },
  });
  await db.membership.create({
    data: { userId: teacher2User.id, schoolId: schoolA.id, role: 'TEACHER', active: true },
  });

  // Initialize Academic Workspace in School A
  await db.academicWorkspace.create({
    data: {
      schoolId: schoolA.id,
      yearId: yearA.id,
      data: {
        assessments: [],
        submissions: [],
        slots: [],
        syllabus: [],
        support: [],
        audit: [],
        reports: [],
        attendance: [
          {
            id: randomUUID(),
            classId: classroomA.id,
            date: '2026-02-15',
            revision: 2,
            entries: [{ studentId: childA.id, status: 'present' }],
          },
        ],
        classTeachers: [
          { classId: classroomA.id, teacherId: teacherUser.id },
          { classId: classroomA.id, teacherId: teacher2User.id },
        ],
        notifications: [],
        policy: {},
      },
    },
  });

  // Start NestJS API server
  let api = spawn(process.execPath, [path.resolve(__dirname, '../dist/main.js')], {
    env: process.env,
    stdio: 'pipe',
    windowsHide: true,
  });

  let logs = '';
  api.stdout.on('data', b => { logs += b; });
  api.stderr.on('data', b => { logs += b; });

  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      try {
        if ((await fetch(base + 'health/ready')).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    assert.ok(ready, 'Server failed to start: ' + logs.slice(-500));

    // 1. Authenticate Parent User
    const parentLogin = await parentClient('POST', 'parent/auth/login', {
      identifier: '255788111222',
      password,
    });
    assert.equal(parentLogin.status, 201);
    const parentToken = parentLogin.body.accessToken;
    assert.ok(parentToken);

    // 2. Authenticate Teacher User
    const teacherSession = staffClient();
    const teacherLogin = await teacherSession('POST', 'auth/login', {
      email: teacherUser.email,
      password,
      role: 'TEACHER',
    });
    assert.equal(teacherLogin.status, 201);

    // --- CHECK 1: Parent cannot access Teacher/Staff Workspaces ---
    const parentAttemptOnWorkspace = await parentClient(
      'GET',
      `schools/${schoolA.id}/academics?yearId=${yearA.id}`,
      undefined,
      parentToken
    );
    // Should be rejected with 401 Unauthorized because bearer token is not a staff session cookie
    assert.equal(parentAttemptOnWorkspace.status, 401);

    // --- CHECK 2: Teacher cannot access Parent Portal endpoints without parent bearer token ---
    const teacherAttemptOnParent = await teacherSession('GET', 'parent/children');
    assert.equal(teacherAttemptOnParent.status, 401);

    // --- CHECK 3: Multi-tenant guardian isolation: Parent A cannot access Child B (unrelated child) ---
    const parentAccessAuthorized = await parentClient('GET', `parent/children/${childA.id}`, undefined, parentToken);
    assert.equal(parentAccessAuthorized.status, 200);
    assert.equal(parentAccessAuthorized.body.id, childA.id);

    const parentAccessUnauthorized = await parentClient('GET', `parent/children/${childB.id}`, undefined, parentToken);
    // Unrelated child must be strictly rejected (404 Not Found as not in guardian scope)
    assert.equal(parentAccessUnauthorized.status, 404);

    // --- CHECK 4: Multi-tenant teacher isolation: Teacher of School A cannot access School B ---
    const teacherCrossTenantAttempt = await teacherSession(
      'GET',
      `schools/${schoolB.id}/academics?yearId=${yearB.id}`
    );
    // Forbidden or rejected
    assert.ok([401, 403, 404].includes(teacherCrossTenantAttempt.status));

    // --- CHECK 5: Concurrency Conflict Detection: Attendance update with stale revision returns 409 ---
    const csrfRes = await teacherSession('GET', `schools/${schoolA.id}/parent-actions/csrf`);
    const csrfToken = csrfRes.body?.csrfToken;

    // Send attendance mutation with revision 1 when current revision in workspace is 2
    const staleMutation = await teacherSession(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-15',
          revision: 1, // STALE REVISION!
          reason: 'Correcting student status after verification',
          entries: [{ studentId: childA.id, status: 'Absent', note: 'Medical appointment' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    // Concurrency protection must halt and throw 409 Conflict
    assert.equal(staleMutation.status, 409);
    assert.match(staleMutation.body.message, /Attendance changed|reload/i);

    // --- CHECK 6: Account Deactivation preserves Student Institutional Records ---
    // Record student result/mark and an attendance entry
    const attendanceBefore = await db.student.findUnique({ where: { id: childA.id } });
    assert.ok(attendanceBefore);

    // Parent self-deletes account
    const deleteAccountRes = await parentClient('POST', 'parent/auth/delete-account', { password }, parentToken);
    assert.ok([200, 201].includes(deleteAccountRes.status));

    // Verify parent account is deleted and user is disabled
    const userAfter = await db.user.findUnique({ where: { id: parentUser.id } });
    assert.equal(userAfter.enabled, false);
    const parentAccAfter = await db.parentAccount.findUnique({ where: { userId: parentUser.id } });
    assert.equal(parentAccAfter, null);

    // Verify student institutional record remains 100% INTACT
    const studentAfter = await db.student.findUnique({ where: { id: childA.id } });
    assert.ok(studentAfter);
    assert.equal(studentAfter.id, childA.id);
    assert.equal(studentAfter.name, 'Alpha Student One');
    const enrollmentAfter = await db.enrollment.findFirst({ where: { studentId: childA.id } });
    assert.ok(enrollmentAfter);

    // --- CHECK 7: Revoked Guardian Linkage blocks child access ---
    // Attempting to query with old token returns 401
    const postDeletionQuery = await parentClient('GET', `parent/children/${childA.id}`, undefined, parentToken);
    assert.equal(postDeletionQuery.status, 401);

    // --- CHECK 8: Server-Side Idempotency Key Enforcement ---
    const idempotencyKey = randomUUID();
    const firstCall = await teacherSession(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-16',
          revision: 0,
          reason: 'Initial roll call entry',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': idempotencyKey }
    );
    assert.equal(firstCall.status, 201);

    // Replay with identical idempotency key - must succeed without duplicate entry
    const replayCall = await teacherSession(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-16',
          revision: 0,
          reason: 'Initial roll call entry',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': idempotencyKey }
    );
    assert.equal(replayCall.status, 201);

    // Verify workspace contains exactly 1 attendance sheet for 2026-02-16 (no duplicate row)
    const ws = await db.academicWorkspace.findFirstOrThrow({ where: { schoolId: schoolA.id, yearId: yearA.id } });
    const sheetsOnDate = (ws.data.attendance || []).filter(a => a.date === '2026-02-16');
    assert.equal(sheetsOnDate.length, 1);

    // --- CHECK 9: Teacher Account Deactivation Preserves Institutional Records ---
    // Administrator deactivates teacher
    await db.user.update({ where: { id: teacherUser.id }, data: { enabled: false } });
    await db.membership.updateMany({ where: { userId: teacherUser.id, schoolId: schoolA.id }, data: { active: false } });

    // Subsequent teacher command must be rejected
    const deactivatedTeacherAttempt = await teacherSession(
      'GET',
      `schools/${schoolA.id}/academics?yearId=${yearA.id}`
    );
    assert.ok([401, 403].includes(deactivatedTeacherAttempt.status));

    // Verify workspace attendance and student records recorded by teacher remain intact
    const wsAfterDeactivation = await db.academicWorkspace.findFirstOrThrow({ where: { schoolId: schoolA.id, yearId: yearA.id } });
    const attendanceEntries = (wsAfterDeactivation.data.attendance || []).filter(a => a.teacherId === teacherUser.id);
    assert.ok(attendanceEntries.length > 0);
    assert.equal(attendanceEntries[0].teacherName, 'Teacher Alpha');

    // --- CHECK 10: Two Teachers Submitting Conflicting Revisions (Optimistic Concurrency 409) ---
    const teacher2Session = staffClient();
    const teacher2Login = await teacher2Session('POST', 'auth/login', {
      email: teacher2User.email,
      password,
      role: 'TEACHER',
    });
    assert.equal(teacher2Login.status, 201);

    // Teacher 2 attempts to overwrite attendance on 2026-02-16 with stale revision 0 (current is 1)
    const conflictingTeacherMutation = await teacher2Session(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-16',
          revision: 0, // STALE REVISION!
          reason: 'Second teacher conflicting update',
          entries: [{ studentId: childA.id, status: 'Absent', note: 'Sick' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    assert.equal(conflictingTeacherMutation.status, 409);
    assert.match(conflictingTeacherMutation.body.message, /Attendance changed|reload/i);

    // --- CHECK 11: Idempotency Fingerprint Mismatch Rejection ---
    const reuseKey = randomUUID();
    const initialCall = await teacher2Session(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-17',
          revision: 0,
          reason: 'Original entry',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': reuseKey }
    );
    assert.equal(initialCall.status, 201);

    // Replay with identical key but DIFFERENT payload fingerprint must throw 409 Conflict
    const tamperedCall = await teacher2Session(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-17',
          revision: 0,
          reason: 'TAMPERED PAYLOAD',
          entries: [{ studentId: childA.id, status: 'Absent', note: 'Tampered' }],
        },
      },
      undefined,
      { 'Idempotency-Key': reuseKey }
    );
    assert.equal(tamperedCall.status, 409);
    assert.match(tamperedCall.body.message, /Idempotency key already used for a different request/i);

    // --- CHECK 12: Mutation Replay After Session Expiration Rejected (401) ---
    // Evict all active sessions for teacher 2
    await db.$executeRawUnsafe('DELETE FROM "session"');

    const expiredSessionAttempt = await teacher2Session(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-17',
          revision: 0,
          reason: 'Replay after logout/expiration',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    assert.equal(expiredSessionAttempt.status, 401);

    // --- CHECK 13: Server Restart Preserves Idempotency Without Duplicate Execution ---
    // Log teacher 2 back in
    const teacher2NewLogin = await teacher2Session('POST', 'auth/login', {
      email: teacher2User.email,
      password,
      role: 'TEACHER',
    });
    assert.equal(teacher2NewLogin.status, 201);

    const restartKey = randomUUID();
    const beforeRestartCall = await teacher2Session(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-18',
          revision: 0,
          reason: 'Entry before server crash',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': restartKey }
    );
    assert.equal(beforeRestartCall.status, 201);

    // Kill API server process to simulate a backend restart/crash
    api.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1500));

    // Spawn a fresh API server instance on the same port
    api = spawn(process.execPath, [path.resolve(__dirname, '../dist/main.js')], {
      env: process.env,
      stdio: 'pipe',
      windowsHide: true,
    });
    api.stdout.on('data', b => { logs += b; });
    api.stderr.on('data', b => { logs += b; });

    let serverRestarted = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(base + 'health/ready')).ok) {
          serverRestarted = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    assert.ok(serverRestarted, 'Server failed to restart after crash simulation');

    // Replay mutation with identical idempotency key against restarted server
    const afterRestartCall = await teacher2Session(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-18',
          revision: 0,
          reason: 'Entry before server crash',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': restartKey }
    );
    // Persisted in PostgreSQL: returns cached 201 without re-executing
    assert.equal(afterRestartCall.status, 201);

    // Verify workspace contains exactly 1 sheet for 2026-02-18
    const wsFinal = await db.academicWorkspace.findFirstOrThrow({ where: { schoolId: schoolA.id, yearId: yearA.id } });
    const sheetsOnCrashDate = (wsFinal.data.attendance || []).filter(a => a.date === '2026-02-18');
    assert.equal(sheetsOnCrashDate.length, 1);

    // --- CHECK 14: Teacher Removed from School Before Staged Mutation Synchronizes (403 Forbidden) ---
    // Revoke Teacher 2's membership in School A
    await db.membership.updateMany({
      where: { userId: teacher2User.id, schoolId: schoolA.id },
      data: { active: false },
    });

    const revokedSyncAttempt = await teacher2Session(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-19',
          revision: 0,
          reason: 'Staged offline before dismissal',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    // Server must reject with 403 Forbidden because caller's membership is inactive
    assert.ok([401, 403].includes(revokedSyncAttempt.status));

    // --- CHECK 15: Parent Account Switching Isolation (Two Distinct Parents) ---
    // Create Parent Beta associated with Child B in School B
    const guardianB = await db.guardian.create({
      data: { schoolId: schoolB.id, name: 'Parent Beta', phone: '255788333444', email: 'beta.parent@example.test' },
    });
    await db.studentGuardian.create({
      data: { schoolId: schoolB.id, studentId: childB.id, guardianId: guardianB.id },
    });
    const parent2User = await db.user.create({
      data: {
        email: 'beta.parent@example.test',
        name: 'Parent Beta',
        passwordHash: hash,
        enabled: true,
      },
    });
    await db.parentAccount.create({
      data: {
        userId: parent2User.id,
        loginPhone: '255788333444',
        verifiedAt: new Date(),
      },
    });
    await db.guardian.update({
      where: { id: guardianB.id },
      data: { userId: parent2User.id },
    });

    // Parent 2 logs in
    const parent2Login = await parentClient('POST', 'parent/auth/login', {
      identifier: '255788333444',
      password,
    });
    assert.equal(parent2Login.status, 201);
    const parent2Token = parent2Login.body.accessToken;
    assert.ok(parent2Token);

    // Parent 2 can access Child B
    const p2ChildBAccess = await parentClient('GET', `parent/children/${childB.id}`, undefined, parent2Token);
    assert.equal(p2ChildBAccess.status, 200);
    assert.equal(p2ChildBAccess.body.id, childB.id);

    // Parent 2 CANNOT access Child A (cross-parent isolation)
    const p2ChildAAttempt = await parentClient('GET', `parent/children/${childA.id}`, undefined, parent2Token);
    assert.equal(p2ChildAAttempt.status, 404);

    // Parent 2 logs out
    const p2Logout = await parentClient('POST', 'parent/auth/logout', {}, parent2Token);
    assert.ok([200, 201].includes(p2Logout.status));

    // After logout, token is invalidated
    const p2PostLogoutAttempt = await parentClient('GET', 'parent/children', undefined, parent2Token);
    assert.equal(p2PostLogoutAttempt.status, 401);

    // --- CHECK 16: Adversarial Test A - User Identity Tampering (Payload Spoofing) ---
    // Re-activate Teacher 2 for adversarial queue and permission tests
    await db.user.update({ where: { id: teacher2User.id }, data: { enabled: true } });
    await db.membership.updateMany({ where: { userId: teacher2User.id, schoolId: schoolA.id }, data: { active: true } });

    const teacherAdvSession = staffClient();
    const advLogin = await teacherAdvSession('POST', 'auth/login', {
      email: teacher2User.email,
      password,
      role: 'TEACHER',
    });
    assert.equal(advLogin.status, 201);

    // Teacher 2 submits a staged mutation with payload attempting to spoof Teacher 1's ID
    const identitySpoofCall = await teacherAdvSession(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-20',
          revision: 0,
          reason: 'Adversarial user identity spoofing test',
          teacherId: teacherUser.id, // Attacker attempts to inject Teacher Alpha's ID!
          userId: teacherUser.id,
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    // Strict Zod schema rejects unrecognized identity injection fields
    assert.equal(identitySpoofCall.status, 400);
    assert.match(identitySpoofCall.body.message, /Unrecognized key/i);

    // Now Teacher 2 submits a clean valid payload
    const validIdentityCall = await teacherAdvSession(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-20',
          revision: 0,
          reason: 'Adversarial user identity verified test',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    assert.equal(validIdentityCall.status, 201);

    // Verify server independently derived caller identity strictly from authenticated session cookie
    const wsAdv = await db.academicWorkspace.findFirstOrThrow({ where: { schoolId: schoolA.id, yearId: yearA.id } });
    const spoofSheet = (wsAdv.data.attendance || []).find(a => a.date === '2026-02-20');
    assert.ok(spoofSheet);
    // Server must attribute action to Teacher Beta (authenticated caller), NOT Teacher Alpha (spoofed)
    assert.equal(spoofSheet.teacherId, teacher2User.id);
    assert.equal(spoofSheet.teacherName, 'Teacher Beta');

    // --- CHECK 17: Adversarial Test B - School ID / Cross-Tenant Tampering ---
    // Teacher 2 (School Alpha member) submits a command targeting School Beta's route
    const crossSchoolTamperCall = await teacherAdvSession(
      'POST',
      `schools/${schoolB.id}/academics/commands`,
      {
        yearId: yearB.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-21',
          revision: 0,
          reason: 'Adversarial cross-tenant submission',
          entries: [{ studentId: childB.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    // Server must reject with 403 Forbidden because Teacher 2 holds no membership in School Beta
    assert.ok([401, 403].includes(crossSchoolTamperCall.status));

    // --- CHECK 18: Adversarial Test C - Account Type Tampering ---
    // Log Parent 2 in to acquire an active parent bearer token
    const p2FreshLogin = await parentClient('POST', 'parent/auth/login', { identifier: '255788333444', password });
    assert.equal(p2FreshLogin.status, 201);
    const p2TokenForTamper = p2FreshLogin.body.accessToken;

    // Parent attempts to call staff/teacher academic mutation endpoint
    const parentAccountTamperCall = await parentClient(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: classroomA.id,
          date: '2026-02-22',
          revision: 0,
          reason: 'Parent attempting teacher command',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      p2TokenForTamper
    );
    // Server must reject with 401 Unauthorized or 403 Forbidden (parent token is not staff session cookie)
    assert.ok([401, 403].includes(parentAccountTamperCall.status));

    // Teacher session attempts to call parent push registration endpoint
    const teacherTamperOnParentPush = await teacherAdvSession('POST', 'parent/push/devices', {
      installationId: randomUUID(),
      fid: 'valid_push_token_fid_1234567890',
      platform: 'android',
    });
    // Server must reject with 401 Unauthorized or 403 Forbidden (teacher staff cookie is not parent bearer session)
    assert.ok([401, 403].includes(teacherTamperOnParentPush.status));

    // --- CHECK 19: Adversarial Test D - Resource Identifier Tampering ---
    // Teacher submits attendance targeting an invalid/foreign class ID that does not belong to school
    const invalidClassId = randomUUID();
    const foreignClassTamperCall = await teacherAdvSession(
      'POST',
      `schools/${schoolA.id}/academics/commands`,
      {
        yearId: yearA.id,
        action: 'attendance',
        payload: {
          classId: invalidClassId,
          date: '2026-02-23',
          revision: 0,
          reason: 'Resource ID tampering with invalid class',
          entries: [{ studentId: childA.id, status: 'Present', note: '' }],
        },
      },
      undefined,
      { 'Idempotency-Key': randomUUID() }
    );
    // Server must reject with 403 Forbidden (not assigned class teacher) or 400 Bad Request
    assert.ok([400, 403, 404].includes(foreignClassTamperCall.status));
    assert.match(foreignClassTamperCall.body.message, /assigned class teacher|Class not found/i);

    // --- CHECK 20: Teacher Push Device Lifecycle & Audit Verification ---
    const teacherInstallationId = randomUUID();
    const teacherPushReg = await teacherAdvSession('POST', 'teacher/push/devices', {
      installationId: teacherInstallationId,
      fid: 'teacher_push_fid_device_token_abc_123',
      platform: 'android',
    });
    assert.equal(teacherPushReg.status, 201);
    assert.equal(teacherPushReg.body.registered, true);

    // Verify audit event in database
    const regAudit = await db.auditEvent.findFirst({
      where: { actorId: teacher2User.id, action: 'TEACHER_PUSH_DEVICE_REGISTERED', target: teacherInstallationId },
    });
    assert.ok(regAudit);

    // Teacher unregisters push device
    const teacherPushUnreg = await teacherAdvSession('POST', 'teacher/push/devices/unregister', {
      installationId: teacherInstallationId,
    });
    assert.equal(teacherPushUnreg.status, 201);
    assert.equal(teacherPushUnreg.body.unregistered, true);

    const unregAudit = await db.auditEvent.findFirst({
      where: { actorId: teacher2User.id, action: 'TEACHER_PUSH_DEVICE_UNREGISTERED', target: teacherInstallationId },
    });
    assert.ok(unregAudit);

    // Unauthenticated attempt to register teacher push device is rejected
    const unauthClient = staffClient();
    const unauthPushReg = await unauthClient('POST', 'teacher/push/devices', {
      installationId: randomUUID(),
      fid: 'unauth_push_fid_device_token_xyz',
      platform: 'android',
    });
    assert.equal(unauthPushReg.status, 401);

  } finally {
    api.kill('SIGTERM');
    await db.$disconnect();
  }
});
