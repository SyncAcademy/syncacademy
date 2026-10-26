const { test } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/push_test',
  APP_ORIGIN: 'http://localhost:8080',
  SESSION_SECRET: 't'.repeat(48),
  DATA_ENCRYPTION_KEY: 'a'.repeat(64),
  SMTP_HOST: 'localhost',
  MAIL_FROM: 'test@example.invalid',
});

const { enqueueParentPush, deliverParentPush } = require('../dist/parent-push');
const { decrypt } = require('../dist/security');

test('push jobs are encrypted, scoped per device, and deduplicated', async () => {
  let created;
  const tx = {
    parentPushDevice: { findMany: async ({ where }) => {
      assert.deepEqual(where, { userId: 'parent-1', revokedAt: null, enabled: true });
      return [{ id: 'device-1' }, { id: 'device-2' }];
    } },
    outbox: { createMany: async (input) => { created = input; } },
  };
  await enqueueParentPush(tx, { id: 'alert-1', userId: 'parent-1', schoolId: 'school-1' });
  assert.equal(created.skipDuplicates, true);
  assert.equal(created.data.length, 2);
  assert.deepEqual(created.data.map(job => job.idempotencyKey), [
    'parent-push:alert-1:device-1', 'parent-push:alert-1:device-2',
  ]);
  for (const job of created.data) {
    assert.equal(job.channel, 'PUSH');
    assert.equal(job.schoolId, 'school-1');
    assert.deepEqual(JSON.parse(decrypt(job.payload)), {
      notificationId: 'alert-1', deviceId: job.idempotencyKey.split(':')[2],
    });
    assert.ok(!job.payload.includes('alert-1'));
  }
});

test('push delivery cancels a revoked guardian link before contacting Firebase', async () => {
  const db = {
    parentPushDevice: { findFirst: async () => ({
      id: 'device-1', sessionId: 'session-1', userId: 'parent-1', fidEncrypted: 'unused',
    }) },
    parentMobileSession: { findFirst: async () => ({ version: 2, user: { sessionVersion: 2 } }) },
    parentNotification: { findFirst: async () => ({
      id: 'alert-1', userId: 'parent-1', schoolId: 'school-1', studentId: 'student-1', kind: 'RESULT',
    }) },
    studentGuardian: { findFirst: async () => null },
  };
  assert.equal(await deliverParentPush(db, 'alert-1', 'device-1'), 'CANCELLED');
});

test('result push checks the complete published report ID', async () => {
  const db = {
    parentPushDevice: { findFirst: async () => ({ id: 'device-1', sessionId: 'session-1', userId: 'parent-1' }) },
    parentMobileSession: { findFirst: async () => ({ version: 2, user: { sessionVersion: 2 } }) },
    parentNotification: { findFirst: async () => ({
      id: 'alert-1', schoolId: 'school-1', studentId: 'student-1', kind: 'RESULT',
      dedupeKey: 'result:school-1:assessment-1:class-1:student-1:parent-1',
    }) },
    studentGuardian: { findFirst: async () => ({ id: 'link-1' }) },
    parentResultPublication: { findFirst: async ({ where }) => {
      assert.equal(where.reportCardId, 'assessment-1:class-1:student-1');
      return null;
    } },
  };
  assert.equal(await deliverParentPush(db, 'alert-1', 'device-1'), 'CANCELLED');
});
