const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const url = new URL(process.env.DATABASE_URL);
url.pathname = '/syncacademy_auth_test';
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = 'test';
process.env.PORT = '3102';
const db = new PrismaClient();
const password = `Student-subjects-test-${randomUUID()}`;
const origin = process.env.APP_ORIGIN;
const base = 'http://localhost:3102/api/v1/';

function client() {
  let cookie = '';
  return {
    async call(method, route, body, headers = {}) {
      const response = await fetch(base + route, {
        method,
        headers: { Origin: origin, 'X-Requested-With': 'SyncAcademy', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) cookie = cookies.map(value => value.split(';')[0]).join('; ');
      return { status: response.status, body: await response.json() };
    },
    login(email, ignoredPassword, role) { return this.call('POST', 'auth/login', { email, password, role, rememberMe: false }); },
  };
}

test('student subject workflow', { timeout: 120000 }, async t => {
  const migrate = spawnSync(process.execPath, [path.resolve(__dirname, '../../../node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.resolve(__dirname, '../prisma/schema.prisma')], { env: process.env, encoding: 'utf8' });
  assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
  await db.$executeRawUnsafe('TRUNCATE TABLE "RegistryEvent", "Admission", "session", "Outbox", "Idempotency", "RateBucket", "AuditEvent", "Invitation", "PasswordReset", "TeachingAssignment", "Enrollment", "Student", "Classroom", "AcademicYear", "Membership", "School", "User" CASCADE');
  const api = spawn(process.execPath, [path.resolve(__dirname, '../dist/main.js')], { env: process.env, stdio: 'pipe' });
  let logs = '';
  api.stdout.on('data', chunk => { logs += chunk; });
  api.stderr.on('data', chunk => { logs += chunk; });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      try { ready = (await fetch(base + 'health/ready')).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, `Test API must start: ${logs.slice(-1000)}`);
    const { passwordHash } = require('../dist/security');
    async function fixture(email, role, schoolId) {
      const user = await db.user.create({ data: { email, name: 'Integration user', passwordHash: await passwordHash(password) } });
      await db.membership.create({ data: { schoolId, userId: user.id, role } });
      return user;
    }
    await require('./student-subjects.cjs')({ t, db, client, fixture });
    await require('./assessment-allocation.cjs')({ t, db, client, fixture });
  } finally {
    api.kill();
    await db.$disconnect();
  }
});
