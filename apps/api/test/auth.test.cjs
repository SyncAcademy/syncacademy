const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");
const { authenticator } = require("otplib");
const { io } = require("socket.io-client");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
  quiet: true,
});
const url = new URL(process.env.DATABASE_URL);
url.pathname = "/syncacademy_auth_test";
process.env.DATABASE_URL = url.toString();
process.env.REALTIME_DATABASE_URL = url.toString();
process.env.NODE_ENV = "test";
process.env.PORT = "3101";
process.env.REALTIME_TRANSPORT = "postgres";
process.env.TRUSTED_PROXY_CIDRS = "";
if (new URL(process.env.DATABASE_URL).pathname !== "/syncacademy_auth_test")
  throw new Error("Tests require isolated database");
const db = new PrismaClient();
const {
  passwordHash,
  passwordMatches,
  encrypt,
  decrypt,
  digest,
} = require("../dist/security");
const origin = process.env.APP_ORIGIN;
const base = "http://localhost:3101/api/v1/";
const strongPassword = "Only-for-isolated-tests-" + randomUUID();
let api;
function client() {
  let cookie = "";
  return {
    get cookie() { return cookie; },
    async call(method, route, body, headers = {}) {
      if (method === 'POST' && route === 'invitations/accept' && body) body = { acceptedTerms: true, acknowledgedPrivacy: true, ...body };
      const response = await fetch(base + route, {
        method,
        headers: {
          Origin: origin,
          "X-Requested-With": "SyncAcademy",
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const set = response.headers.getSetCookie();
      if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
      return {
        status: response.status,
        body: await response.json(),
        cookie,
        headers: response.headers,
      };
    },
    async login(email, password = strongPassword, role) {
      return this.call("POST", "auth/login", {
        email,
        password,
        role,
        rememberMe: false,
      });
    },
    async platformLogin(email, password = strongPassword) {
      return this.call("POST", "auth/platform/login", { email, password });
    },
  };
}
async function waitForNextTotpStep() {
  await new Promise((resolve) => setTimeout(resolve, 30000 - (Date.now() % 30000) + 50));
}
function sessionId(client) {
  const value = decodeURIComponent(client.cookie.match(/sa\.sid=([^;]+)/)?.[1] || "");
  return value.slice(2, value.lastIndexOf("."));
}
async function fixture(email, role, schoolId) {
  const user = await db.user.create({
    data: {
      email,
      name: "Integration user",
      passwordHash: await passwordHash(strongPassword),
    },
  });
  await db.membership.create({ data: { schoolId, userId: user.id, role } });
  return user;
}
async function invitationToken(id) {
  const job = await db.outbox.findFirstOrThrow({
    where: { invitationId: id },
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(decrypt(job.payload)).text.match(
    /#token=([A-Za-z0-9_-]+)/,
  )[1];
}

test(
  "PostgreSQL authentication and school workflow",
  { timeout: 600000 },
  async (t) => {
    const isolated = await db.$queryRaw`SELECT current_database() AS name`;
    assert.equal(isolated[0]?.name, "syncacademy_auth_test", "Authentication tests must connect only to the isolated database");
    const migrate = spawnSync(
      process.execPath,
      [
        path.resolve(__dirname, "../../../node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
        "--schema",
        path.resolve(__dirname, "../prisma/schema.prisma"),
      ],
      { env: process.env, encoding: "utf8" },
    );
    assert.equal(migrate.status, 0, "Isolated test migrations must apply");
    // Explicitly restricted to the disposable database named above.
    await db.$executeRawUnsafe(
      'TRUNCATE TABLE "PublicFormAttempt", "PublicFormBlock", "PlatformLeadActivity", "RegistryEvent", "Admission", "session", "Outbox", "Idempotency", "RateBucket", "AuditEvent", "Invitation", "PasswordReset", "TeachingAssignment", "Enrollment", "Student", "Classroom", "AcademicYear", "Membership", "School", "User" CASCADE',
    );
    const legacyAdmin = await db.user.create({ data: { email: "legacy-version@example.test", name: "Legacy admin", passwordHash: await passwordHash(strongPassword), platformAdmin: true, sessionVersion: 6 } });
    const legacySchoolUser = await db.user.create({ data: { email: "school-version@example.test", name: "School user", passwordHash: await passwordHash(strongPassword), sessionVersion: 6 } });
    const migrationSql = readFileSync(path.resolve(__dirname, "../prisma/migrations/202610230001_platform_admin_mfa_session_revoke/migration.sql"), "utf8");
    await db.$executeRawUnsafe(migrationSql);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: legacyAdmin.id } })).sessionVersion, 7);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: legacySchoolUser.id } })).sessionVersion, 6);
    await db.user.deleteMany({ where: { id: { in: [legacyAdmin.id, legacySchoolUser.id] } } });
    const appliedMigration = await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE migration_name = '202610230001_platform_admin_mfa_session_revoke' AND finished_at IS NOT NULL`;
    assert.equal(appliedMigration[0]?.count, 1);
    api = spawn(
      process.execPath,
      [path.resolve(__dirname, "../dist/main.js")],
      { env: process.env, stdio: "pipe" },
    );
    let logs = "";
    api.stdout.on("data", (b) => (logs += b));
    api.stderr.on("data", (b) => (logs += b));
    try {
      let ready = false;
      for (let i = 0; i < 240; i++) {
        try {
          ready = (await fetch(base + "health/ready")).ok;
          if (ready) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.ok(ready, "Test API must start: " + logs.slice(-1000));
      const admin = await db.user.create({
        data: {
          email: "admin@example.test",
          name: "Admin",
          platformAdmin: true,
          passwordHash: await passwordHash(strongPassword),
          mustChangePassword: true,
        },
      });
      let adminPassword = strongPassword;
      let recoveryCodes = [];
      let secondAdmin;
      let secondAdminClient;
      let secondRecoveryCodes = [];
      const c = client();
      await t.test(
        "same-origin checks reject missing, null, cross-origin and malformed writes",
        async () => {
          assert.equal((await c.call("GET", "schools")).status, 401);
          assert.equal(
            (
              await c.call(
                "POST",
                "auth/login",
                { email: admin.email, password: strongPassword },
                { Origin: "https://attacker.example" },
              )
            ).status,
            403,
          );
          for (const headers of [
            { "X-Requested-With": "SyncAcademy", "Content-Type": "application/json" },
            { Origin: "null", "X-Requested-With": "SyncAcademy", "Content-Type": "application/json" },
            { Origin: origin, "Content-Type": "application/json" },
            { Origin: origin, "X-Requested-With": "wrong", "Content-Type": "application/json" },
            { Origin: origin, "X-Requested-With": "SyncAcademy", "Content-Type": "text/plain" },
          ]) {
            const response = await fetch(base + "auth/platform/login", {
              method: "POST",
              headers,
              body: JSON.stringify({ email: admin.email, password: strongPassword }),
            });
            assert.equal(response.status, 403);
          }
          const crossOriginRead = await fetch(base + "auth/me", { headers: { Origin: "https://attacker.example" } });
          assert.equal(crossOriginRead.headers.get("access-control-allow-origin"), null);
          assert.equal((await crossOriginRead.json()).statusCode, 401);
          const forwarded = await client().call("POST", "auth/platform/login", { email: "proxy-test@example.test", password: strongPassword }, { "X-Forwarded-For": "198.51.100.99" });
          assert.equal(forwarded.status, 401);
          assert.equal(await db.rateBucket.count({ where: { key: digest("platform-login-fail-ip:198.51.100.99") } }), 0, "untrusted X-Forwarded-For must not override the request IP");
          const legacyRole = await c.call("POST", "auth/login", { email: admin.email, password: strongPassword, role: "SUPER_ADMIN" });
          assert.equal(legacyRole.status, 400);
        },
      );
      await t.test(
        "platform password verification is a restricted challenge and first enrollment is verified",
        async () => {
          const unknown = await client().platformLogin("missing@example.test", strongPassword);
          const badPassword = await client().platformLogin(admin.email, strongPassword + "-wrong");
          assert.equal(unknown.status, 401);
          assert.equal(badPassword.status, 401);
          assert.equal(unknown.body.message, badPassword.body.message);
          const schoolOnly = await db.user.create({
            data: { email: "school-only@example.test", name: "School only", passwordHash: await passwordHash(strongPassword) },
          });
          assert.equal((await client().platformLogin(schoolOnly.email)).status, 401);
          const signed = await c.platformLogin(admin.email);
          assert.equal(signed.status, 201);
          assert.equal(signed.body.stage, "password-change");
          assert.equal(signed.body.id, undefined);
          assert.match(signed.headers.get("set-cookie"), /HttpOnly/i);
          assert.equal((await c.call("GET", "auth/me")).status, 401);
          assert.equal((await c.call("GET", "platform/summary")).status, 401);
          assert.equal((await c.call("GET", "schools")).status, 401);
          const changed = await c.call("POST", "auth/platform/password", { password: strongPassword + "-new" });
          assert.equal(changed.status, 201);
          adminPassword += "-new";
          assert.equal(changed.body.stage, "enrollment");
          assert.ok(changed.body.secret);
          assert.ok(changed.body.qr.startsWith("data:image/png;base64,"));
          const enrollmentSecret = changed.body.secret;
          const verified = await c.call("POST", "auth/platform/verify", { code: authenticator.generate(enrollmentSecret) });
          assert.equal(verified.status, 201);
          assert.equal(verified.body.stage, "recovery-ack");
          recoveryCodes = verified.body.recoveryCodes;
          assert.equal(recoveryCodes.length, 8);
          assert.equal((await c.call("GET", "auth/me")).status, 401);
          assert.equal((await c.call("GET", "platform/summary")).status, 401);
          const enrolled = await db.user.findUniqueOrThrow({ where: { id: admin.id } });
          assert.equal(decrypt(enrolled.mfaSecret), enrollmentSecret);
          assert.ok(enrolled.mfaRecovery.every((hash) => !recoveryCodes.includes(hash)));
          assert.equal(enrolled.mfaRecovery.length, 8);
          const priorChallengeCookie = signed.cookie;
          const completed = await c.call("POST", "auth/platform/acknowledge-recovery", {});
          assert.equal(completed.status, 201);
          assert.equal(completed.body.platformAdmin, true);
          assert.notEqual(c.cookie, priorChallengeCookie, "MFA completion must rotate the challenge session");
          assert.equal((await c.call("GET", "platform/summary")).status, 200);
          assert.equal((await c.call("POST", "auth/mfa/setup", {})).status, 403);
        },
      );
      await t.test(
        "new administrator logins require TOTP and recovery codes are consumed atomically once",
        async () => {
          const totp = authenticator.generateSecret();
          const adminRecord = await db.user.findUniqueOrThrow({ where: { id: admin.id } });
          const code = authenticator.generate(decrypt(adminRecord.mfaSecret));
          const pending = client();
          assert.equal((await pending.platformLogin(admin.email, adminPassword)).body.stage, "totp");
          assert.equal((await pending.call("GET", "platform/summary")).status, 401);
          const wrong = authenticator.generate(totp);
          assert.equal((await pending.call("POST", "auth/platform/verify", { code: wrong })).status, 401);
          await waitForNextTotpStep();
          const validCode = authenticator.generate(decrypt(adminRecord.mfaSecret));
          const verified = await pending.call("POST", "auth/platform/verify", { code: validCode });
          assert.equal(verified.status, 201);
          assert.equal(verified.body.platformAdmin, true);
          const concurrentA = client();
          const concurrentB = client();
          assert.equal((await concurrentA.platformLogin(admin.email, adminPassword)).body.stage, "totp");
          assert.equal((await concurrentB.platformLogin(admin.email, adminPassword)).body.stage, "totp");
          await waitForNextTotpStep();
          const replayCode = authenticator.generate(decrypt(adminRecord.mfaSecret));
          const results = await Promise.all([
            concurrentA.call("POST", "auth/platform/verify", { code: replayCode }),
            concurrentB.call("POST", "auth/platform/verify", { code: replayCode }),
          ]);
          assert.deepEqual(results.map((result) => result.status).sort(), [201, 401]);
          const recoveryLogin = client();
          assert.equal((await recoveryLogin.platformLogin(admin.email, adminPassword)).body.stage, "totp");
          const recovered = await recoveryLogin.call("POST", "auth/platform/recovery", { code: recoveryCodes[0] });
          assert.equal(recovered.status, 201);
          assert.equal(recovered.body.platformAdmin, true);
          const repeatedRecovery = client();
          assert.equal((await repeatedRecovery.platformLogin(admin.email, adminPassword)).body.stage, "totp");
          assert.equal((await repeatedRecovery.call("POST", "auth/platform/recovery", { code: recoveryCodes[0] })).status, 401);
          const notices = await db.outbox.findMany({ where: { payload: { not: "" } }, select: { payload: true } });
          assert.ok(notices.some((job) => JSON.parse(decrypt(job.payload)).text.includes("recovery code was used")));
          assert.ok(await db.auditEvent.count({ where: { actorId: admin.id, action: 'PLATFORM_ADMIN_RECOVERY_CODE_USED' } }) > 0);
        },
      );
      await t.test(
        "Super Admin can invite another platform administrator",
        async () => {
          const denied = await client().call(
            "POST",
            "platform/invitations",
            { name: "Unauthorized", email: "unauthorized-admin@example.test" },
            { "Idempotency-Key": randomUUID() },
          );
          assert.equal(denied.status, 401);

          const created = await c.call(
            "POST",
            "platform/invitations",
            {
              name: "Second Platform Admin",
              email: "second-admin@example.test",
              expiresInMinutes: 15,
            },
            { "Idempotency-Key": randomUUID() },
          );
          assert.equal(created.status, 201, JSON.stringify(created.body));
          const invitation = await db.invitation.findUniqueOrThrow({
            where: { id: created.body.id },
          });
          assert.equal(invitation.platformAdmin, true);
          assert.equal(invitation.schoolId, null);
          assert.equal(invitation.expiresInMinutes, 15);
          const job = await db.outbox.findFirstOrThrow({
            where: { invitationId: invitation.id },
          });
          assert.match(
            JSON.parse(decrypt(job.payload)).text,
            /within 15 minutes/,
          );
          assert.match(
            JSON.parse(decrypt(job.payload)).text,
            /as a Super Admin/,
          );

          const listed = await c.call("GET", "platform/invitations");
          assert.equal(listed.status, 200);
          assert.ok(listed.body.items.some((item) => item.id === invitation.id));
          const preview = await client().call("POST", "invitations/preview", {
            token: await invitationToken(invitation.id),
          });
          assert.equal(preview.status, 201);
          assert.equal(preview.body.role, "SUPER_ADMIN");
          assert.equal(preview.body.school, "SyncAcademy platform");

          const withoutAgreement = await fetch(base + "invitations/accept", {
            method: "POST",
            headers: { Origin: origin, "X-Requested-With": "SyncAcademy", "Content-Type": "application/json" },
            body: JSON.stringify({ token: await invitationToken(invitation.id), password: strongPassword }),
          });
          assert.equal(withoutAgreement.status, 400);

          const recipient = client();
          const accepted = await recipient.call("POST", "invitations/accept", {
            token: await invitationToken(invitation.id),
            password: strongPassword,
          });
          assert.equal(accepted.status, 201);
          secondAdmin = await db.user.findUniqueOrThrow({
            where: { email: "second-admin@example.test" },
          });
          assert.equal(secondAdmin.platformAdmin, true);
          assert.equal(
            await db.membership.count({ where: { userId: secondAdmin.id } }),
            0,
          );
          const login = await recipient.platformLogin("second-admin@example.test", strongPassword);
          assert.equal(login.status, 201);
          assert.equal(login.body.stage, "enrollment");
          const enrollment = await recipient.call("POST", "auth/platform/verify", { code: authenticator.generate(login.body.secret) });
          assert.equal(enrollment.status, 201);
          assert.equal(enrollment.body.stage, "recovery-ack");
          secondRecoveryCodes = enrollment.body.recoveryCodes;
          const activated = await recipient.call("POST", "auth/platform/acknowledge-recovery", {});
          assert.equal(activated.status, 201);
          assert.equal(activated.body.platformAdmin, true);
          secondAdminClient = recipient;
          assert.equal(
            (
              await c.call("POST", "invitations/accept", {
                token: await invitationToken(invitation.id),
                password: strongPassword,
              })
            ).status,
            400,
          );
        },
      );
      let schoolA, schoolB, headInvitation;
      await t.test("school provisioning is atomic and idempotent", async () => {
        const k = randomUUID();
        const data = {
          name: "Test school A",
          code: "TEST-A",
          region: "Arusha",
          headmasterName: "Head A",
          headmasterEmail: "head@example.test",
          headmasterExpiresInMinutes: 15,
        };
        const first = await c.call("POST", "schools", data, {
          "Idempotency-Key": k,
        });
        assert.equal(first.status, 201, JSON.stringify(first.body));
        schoolA = first.body.school;
        headInvitation = first.body.invitation;
        const firstHeadInvitation = await db.invitation.findUniqueOrThrow({
          where: { id: headInvitation.id },
        });
        assert.equal(firstHeadInvitation.expiresInMinutes, 15);
        const again = await c.call("POST", "schools", data, {
          "Idempotency-Key": k,
        });
        assert.equal(again.body.school.id, schoolA.id);
        assert.equal(await db.school.count(), 1);
        assert.equal(
          await db.outbox.count({ where: { invitationId: headInvitation.id } }),
          1,
        );
        assert.equal(
          (
            await c.call(
              "POST",
              "schools",
              { ...data, name: "Changed" },
              { "Idempotency-Key": k },
            )
          ).status,
          409,
        );
        const b = await c.call(
          "POST",
          "schools",
          {
            ...data,
            name: "Test school B",
            code: "TEST-B",
            headmasterEmail: "head-b@example.test",
          },
          { "Idempotency-Key": randomUUID() },
        );
        assert.equal(b.status, 201);
        schoolB = b.body.school;
      });
      await t.test("disabled administrator lifecycle revokes account-wide sessions, challenges and sockets", async () => {
        assert.ok(secondAdmin && secondAdminClient);
        await db.membership.create({ data: { schoolId: schoolA.id, userId: secondAdmin.id, role: "HEADMASTER" } });
        const schoolSession = client();
        assert.equal((await schoolSession.login(secondAdmin.email, strongPassword, "HEADMASTER")).status, 201);
        assert.equal((await schoolSession.call("GET", `schools/${schoolA.id}/workspace`)).status, 200);
        assert.equal((await schoolSession.call("GET", "platform/summary")).status, 403);
        const legacyRoleSession = client();
        assert.equal((await legacyRoleSession.login(secondAdmin.email, strongPassword, "HEADMASTER")).status, 201);
        const legacySid = sessionId(legacyRoleSession);
        const legacyRows = await db.$queryRaw`SELECT sess FROM "session" WHERE sid = ${legacySid}`;
        const legacyData = typeof legacyRows[0].sess === "string" ? JSON.parse(legacyRows[0].sess) : legacyRows[0].sess;
        legacyData.selectedRole = "SUPER_ADMIN";
        legacyData.mfaVerified = true;
        delete legacyData.platformMfaAssured;
        await db.$executeRaw`UPDATE "session" SET sess = ${JSON.stringify(legacyData)}::json WHERE sid = ${legacySid}`;
        assert.equal((await legacyRoleSession.call("GET", "platform/summary")).status, 401);

        const idleSession = client();
        assert.equal((await idleSession.platformLogin(secondAdmin.email, strongPassword)).body.stage, "totp");
        const idleRecovery = await idleSession.call("POST", "auth/platform/recovery", { code: secondRecoveryCodes[0] });
        assert.equal(idleRecovery.status, 201);
        const sid = sessionId(idleSession);
        const initialRows = await db.$queryRaw`SELECT sess FROM "session" WHERE sid = ${sid}`;
        const initialSession = typeof initialRows[0].sess === "string" ? JSON.parse(initialRows[0].sess) : initialRows[0].sess;
        const lastActivityAt = initialSession.lastActivityAt;
        assert.ok(lastActivityAt > 0);
        await idleSession.call("GET", "system-health");
        const polledRows = await db.$queryRaw`SELECT sess FROM "session" WHERE sid = ${sid}`;
        const polledSession = typeof polledRows[0].sess === "string" ? JSON.parse(polledRows[0].sess) : polledRows[0].sess;
        assert.equal(polledSession.lastActivityAt, lastActivityAt, "polling must not slide administrator inactivity");
        initialSession.lastActivityAt = Date.now() - 16 * 60000;
        await db.$executeRaw`UPDATE "session" SET sess = ${JSON.stringify(initialSession)}::json WHERE sid = ${sid}`;
        assert.equal((await idleSession.call("GET", "platform/summary")).status, 401);

        const expired = client();
        assert.equal((await expired.platformLogin(secondAdmin.email, strongPassword)).body.stage, "totp");
        const expiredSid = sessionId(expired);
        const expiredRows = await db.$queryRaw`SELECT sess FROM "session" WHERE sid = ${expiredSid}`;
        const expiredSession = typeof expiredRows[0].sess === "string" ? JSON.parse(expiredRows[0].sess) : expiredRows[0].sess;
        expiredSession.platformChallenge.expiresAt = Date.now() - 1;
        await db.$executeRaw`UPDATE "session" SET sess = ${JSON.stringify(expiredSession)}::json WHERE sid = ${expiredSid}`;
        assert.equal((await expired.call("POST", "auth/platform/recovery", { code: secondRecoveryCodes[1] })).status, 401);

        const pending = client();
        assert.equal((await pending.platformLogin(secondAdmin.email, strongPassword)).body.stage, "totp");
        const socket = io("http://localhost:3101", {
          path: "/socket.io",
          transports: ["websocket"],
          auth: { scope: "platform" },
          extraHeaders: { Origin: origin, Cookie: secondAdminClient.cookie },
          reconnection: false,
        });
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Platform socket did not connect")), 5000);
          socket.once("connect", () => { clearTimeout(timeout); resolve(); });
          socket.once("connect_error", (error) => { clearTimeout(timeout); reject(error); });
        });
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Platform socket was not authorized")), 5000);
          socket.once("platform:ready", () => { clearTimeout(timeout); resolve(); });
          socket.once("disconnect", reason => { clearTimeout(timeout); reject(new Error("Platform socket authorization failed: " + reason + ": " + logs.slice(-1000))); });
        });
        const socketDisconnected = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Disabled administrator socket remained connected: " + logs.slice(-1500))), 5000);
          socket.once("disconnect", () => { clearTimeout(timeout); resolve(); });
        });
        assert.equal((await secondAdminClient.call("GET", "platform/summary")).status, 200);
        const beforeDisable = await db.user.findUniqueOrThrow({ where: { id: secondAdmin.id } });
        const disabled = await c.call("PATCH", `platform/admins/${secondAdmin.id}`, { enabled: false });
        assert.equal(disabled.status, 200, JSON.stringify(disabled.body));
        const afterDisable = await db.user.findUniqueOrThrow({ where: { id: secondAdmin.id } });
        assert.equal(afterDisable.enabled, false);
        assert.equal(afterDisable.platformAdmin, true);
        assert.equal(afterDisable.sessionVersion, beforeDisable.sessionVersion + 1);
        assert.equal((await secondAdminClient.call("GET", "platform/summary")).status, 401);
        assert.equal((await schoolSession.call("GET", `schools/${schoolA.id}/workspace`)).status, 401);
        assert.equal((await pending.call("POST", "auth/platform/recovery", { code: secondRecoveryCodes[1] })).status, 401);
        assert.equal((await client().platformLogin(secondAdmin.email, strongPassword)).status, 401);
        await socketDisconnected;
        socket.close();
        assert.ok(await db.auditEvent.count({ where: { actorId: admin.id, action: "PLATFORM_ADMIN_DISABLED", target: secondAdmin.id } }) > 0);
        assert.ok(await db.auditEvent.count({ where: { action: "PLATFORM_ADMIN_SESSIONS_REVOKED", target: `${secondAdmin.id}:account-wide-access-change` } }) > 0);

        const beforeEnableVersion = afterDisable.sessionVersion;
        const enabled = await c.call("PATCH", `platform/admins/${secondAdmin.id}`, { enabled: true });
        assert.equal(enabled.status, 200);
        const afterEnable = await db.user.findUniqueOrThrow({ where: { id: secondAdmin.id } });
        assert.equal(afterEnable.enabled, true);
        assert.equal(afterEnable.platformAdmin, true);
        assert.equal(afterEnable.sessionVersion, beforeEnableVersion + 1);
        assert.equal((await secondAdminClient.call("GET", "platform/summary")).status, 401);
        const freshAdmin = client();
        assert.equal((await freshAdmin.platformLogin(secondAdmin.email, strongPassword)).body.stage, "totp");
        assert.equal((await freshAdmin.call("GET", "platform/summary")).status, 401);
        assert.equal((await freshAdmin.call("POST", "auth/platform/recovery", { code: secondRecoveryCodes[1] })).status, 201);
        assert.equal((await freshAdmin.call("GET", "platform/summary")).status, 200);
        secondAdminClient = freshAdmin;
        const reenabledSchool = client();
        assert.equal((await reenabledSchool.login(secondAdmin.email, strongPassword, "HEADMASTER")).status, 201);
        assert.equal((await reenabledSchool.call("GET", `schools/${schoolA.id}/workspace`)).status, 200);
      });
      await t.test(
        "Super Admin can invite every supported school role",
        async () => {
          for (const role of [
            "HEADMASTER",
            "REGISTRAR",
            "ACADEMIC",
            "TEACHER",
            "BURSAR",
          ]) {
            const result = await c.call(
              "POST",
              `schools/${schoolA.id}/invitations`,
              {
                name: `Platform invited ${role}`,
                email: `platform-invited-${role.toLowerCase()}@example.test`,
                role,
                expiresInMinutes: 30,
              },
              { "Idempotency-Key": randomUUID() },
            );
            assert.equal(
              result.status,
              201,
              `${role}: ${JSON.stringify(result.body)}`,
            );
            const invitation = await db.invitation.findUniqueOrThrow({
              where: { id: result.body.id },
            });
            assert.equal(invitation.role, role);
            assert.equal(invitation.expiresInMinutes, 30);
          }
        },
      );
      const head = client();
      await t.test(
        "invitation creates real account and is single-use",
        async () => {
          const token = await invitationToken(headInvitation.id);
          assert.equal(
            (await head.call("POST", "invitations/preview", { token })).status,
            201,
          );
          assert.equal(
            (
              await head.call("POST", "invitations/accept", {
                token,
                password: strongPassword,
              })
            ).status,
            201,
          );
          assert.equal(
            (
              await head.call("POST", "invitations/accept", {
                token,
                password: strongPassword,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await head.login(
                "head@example.test",
                strongPassword,
                "HEADMASTER",
              )
            ).status,
            201,
          );
          assert.equal(
            (await head.call("GET", `schools/${schoolA.id}/workspace`)).status,
            200,
          );
          assert.equal(
            (await head.call("GET", `schools/${schoolB.id}/workspace`)).status,
            403,
          );
          assert.equal(
            (await head.call("GET", `schools/${schoolA.id}/workspace`)).status,
            200,
          );
          assert.equal((await head.call("GET", "schools")).status, 403);
        },
      );
      const idempotent = () => ({ "Idempotency-Key": randomUUID() });
      await t.test(
        "concurrent idempotent school creation returns one result",
        async () => {
          const input = {
            name: "Concurrent school",
            code: "CONCURRENT",
            region: "Arusha",
            headmasterName: "Concurrent Head",
            headmasterEmail: "concurrent@example.test",
          };
          const k = randomUUID();
          const [a, b] = await Promise.all([
            c.call("POST", "schools", input, { "Idempotency-Key": k }),
            c.call("POST", "schools", input, { "Idempotency-Key": k }),
          ]);
          assert.equal(a.status, 201);
          assert.equal(b.status, 201, JSON.stringify(b.body));
          assert.equal(a.body.school.id, b.body.school.id);
        },
      );
      await t.test(
        "existing user invitation requires matching authenticated account",
        async () => {
          const i = await c.call(
            "POST",
            `schools/${schoolB.id}/invitations`,
            {
              name: "Existing head",
              email: "head@example.test",
              role: "REGISTRAR",
            },
            { "Idempotency-Key": randomUUID() },
          );
          assert.equal(i.status, 201);
          const token = await invitationToken(i.body.id);
          assert.equal(
            (
              await client().call("POST", "invitations/accept", {
                token,
                password: strongPassword + "-wrong",
              })
            ).status,
            403,
          );
          assert.equal(
            (await head.call("POST", "invitations/accept", { token })).status,
            201,
          );
          assert.equal(
            (await head.call("GET", `schools/${schoolB.id}/workspace`)).status,
            401,
          );
          assert.equal(
            (await head.login("head@example.test", strongPassword, "REGISTRAR"))
              .status,
            201,
          );
          assert.equal(
            (await head.call("GET", `schools/${schoolB.id}/workspace`)).status,
            200,
          );
          assert.equal(
            (await head.call("GET", `schools/${schoolA.id}/workspace`)).status,
            403,
          );
          assert.equal(
            await db.user.count({ where: { email: "head@example.test" } }),
            1,
          );
          assert.equal(
            (
              await head.login(
                "head@example.test",
                strongPassword,
                "HEADMASTER",
              )
            ).status,
            201,
          );
          const next = await c.call(
            "POST",
            `schools/${schoolB.id}/invitations`,
            {
              name: "Existing head",
              email: "head@example.test",
              role: "ACADEMIC",
            },
            idempotent(),
          );
          assert.equal(next.status, 201);
          const nextToken = await invitationToken(next.body.id);
          assert.equal(
            (
              await client().call("POST", "invitations/accept", {
                token: nextToken,
                password: strongPassword + "-wrong",
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await client().call("POST", "invitations/accept", {
                token: nextToken,
                password: strongPassword,
              })
            ).status,
            201,
          );
          const academic = client();
          assert.equal(
            (
              await academic.login(
                "head@example.test",
                strongPassword,
                "ACADEMIC",
              )
            ).status,
            201,
          );
          assert.equal(
            (await academic.call("GET", `schools/${schoolB.id}/workspace`))
              .status,
            200,
          );
          assert.equal(
            (await academic.call("GET", `schools/${schoolA.id}/workspace`))
              .status,
            403,
          );
          assert.equal(
            (await head.login("head@example.test", strongPassword, "HEADMASTER"))
              .status,
            201,
          );
        },
      );
      await t.test(
        "wrong selected role and wrong password have the same sign-in error",
        async () => {
          const wrongRole = await client().login(
            "head@example.test",
            strongPassword,
            "BURSAR",
          );
          const wrongPassword = await client().login(
            "head@example.test",
            strongPassword + "-wrong",
            "REGISTRAR",
          );
          assert.equal(wrongRole.status, 401);
          assert.equal(wrongPassword.status, 401);
          assert.equal(wrongRole.body.message, wrongPassword.body.message);
        },
      );
      await t.test(
        "Headmasters can invite multiple Headmasters but cannot invite platform admins",
        async () => {
          const first = await head.call(
            "POST",
            `schools/${schoolA.id}/invitations`,
            {
              name: "Additional Headmaster",
              email: "additional-head@example.test",
              role: "HEADMASTER",
            },
            idempotent(),
          );
          assert.equal(first.status, 201, JSON.stringify(first.body));
          const second = await head.call(
            "POST",
            `schools/${schoolA.id}/invitations`,
            {
              name: "Another Headmaster",
              email: "another-head@example.test",
              role: "HEADMASTER",
            },
            idempotent(),
          );
          assert.equal(second.status, 201, JSON.stringify(second.body));
          assert.equal(
            (
              await head.call(
                "POST",
                `schools/${schoolA.id}/invitations/${second.body.id}/resend`,
                {},
              )
            ).status,
            201,
          );
          assert.equal(
            (
              await head.call(
                "POST",
                `schools/${schoolA.id}/invitations/${second.body.id}/revoke`,
                {},
              )
            ).status,
            201,
          );
          for (const role of ["ACADEMIC", "BURSAR"]) {
            for (const suffix of ["one", "two"]) {
              const additional = await head.call(
                "POST",
                `schools/${schoolA.id}/invitations`,
                {
                  name: `${role} ${suffix}`,
                  email: `${role.toLowerCase()}-${suffix}@example.test`,
                  role,
                },
                idempotent(),
              );
              assert.equal(
                additional.status,
                201,
                `${role} ${suffix}: ${JSON.stringify(additional.body)}`,
              );
            }
          }
          assert.equal(
            (
              await head.call(
                "POST",
                `schools/${schoolA.id}/invitations`,
                {
                  name: "Elevated",
                  email: "elevated@example.test",
                  role: "SUPER_ADMIN",
                },
                idempotent(),
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "invitation expiry selection applies to links and resends",
        async () => {
          const created = await head.call(
            "POST",
            `schools/${schoolA.id}/invitations`,
            {
              name: "Expiry Test Academic",
              email: "expiry-academic@example.test",
              role: "ACADEMIC",
              expiresInMinutes: 5,
            },
            idempotent(),
          );
          assert.equal(created.status, 201, JSON.stringify(created.body));
          let invitation = await db.invitation.findUniqueOrThrow({
            where: { id: created.body.id },
          });
          assert.equal(invitation.expiresInMinutes, 5);
          const remainingMinutes =
            new Date(invitation.expiresAt).getTime() - Date.now();
          assert.ok(remainingMinutes <= 5 * 60_000);
          assert.ok(remainingMinutes > 4 * 60_000);
          let job = await db.outbox.findFirstOrThrow({
            where: { invitationId: invitation.id },
          });
          assert.match(
            JSON.parse(decrypt(job.payload)).text,
            /within 5 minutes/,
          );

          const resent = await head.call(
            "POST",
            `schools/${schoolA.id}/invitations/${invitation.id}/resend`,
            {},
          );
          assert.equal(resent.status, 201);
          invitation = await db.invitation.findUniqueOrThrow({
            where: { id: invitation.id },
          });
          assert.equal(invitation.expiresInMinutes, 5);
          job = await db.outbox.findFirstOrThrow({
            where: { invitationId: invitation.id },
            orderBy: { createdAt: "desc" },
          });
          assert.match(
            JSON.parse(decrypt(job.payload)).text,
            /within 5 minutes/,
          );
        },
      );
      let classA, yearA;
      await t.test(
        "academic setup validates school relationships",
        async () => {
          const y = await head.call(
            "POST",
            `schools/${schoolA.id}/years`,
            { name: "2026", startsAt: "2026-01-01", endsAt: "2026-12-31", terms: [
              { key: "Term 1", name: "Opening term", startsAt: "2026-01-01", endsAt: "2026-04-30" },
              { key: "Term 2", name: "Middle term", startsAt: "2026-05-01", endsAt: "2026-08-31" },
              { key: "Term 3", name: "Final term", startsAt: "2026-09-01", endsAt: "2026-12-31" },
            ] },
            idempotent(),
          );
          assert.equal(y.status, 201);
          yearA = y.body;
          const visibleYears = (await head.call("GET", `schools/${schoolA.id}/workspace`)).body.years;
          assert.equal(visibleYears.find(year => year.id === yearA.id).terms[0].name, "Opening term");
          const cls = await head.call(
            "POST",
            `schools/${schoolA.id}/classes`,
            { name: "Class 1", yearId: yearA.id },
            idempotent(),
          );
          assert.equal(cls.status, 201);
          classA = cls.body;
          assert.equal(
            (
              await c.call(
                "POST",
                `schools/${schoolB.id}/classes`,
                { name: "Cross school", yearId: yearA.id },
                idempotent(),
              )
            ).status,
            400,
          );
        },
      );
      const registrar = client(),
        teacher = client();
      let academicClient;
      let teacherUser;
      await t.test(
        "all school roles can log in with real memberships",
        async () => {
          for (const role of ["REGISTRAR", "ACADEMIC", "TEACHER", "BURSAR"]) {
            const email = role.toLowerCase() + "@example.test";
            const invite = await head.call(
              "POST",
              `schools/${schoolA.id}/invitations`,
              { name: role + " User", email, role },
              idempotent(),
            );
            assert.equal(invite.status, 201, role);
            const u = client();
            assert.equal(
              (
                await u.call("POST", "invitations/accept", {
                  token: await invitationToken(invite.body.id),
                  password: strongPassword,
                })
              ).status,
              201,
              role,
            );
            const login = await u.login(email, strongPassword, role);
            assert.equal(login.status, 201, role);
            assert.equal(login.body.memberships[0].role, role);
            assert.equal(login.body.selectedRole, role);
            if (role === "ACADEMIC") academicClient = u;
          }
          await registrar.login(
            "registrar@example.test",
            strongPassword,
            "REGISTRAR",
          );
          await teacher.login(
            "teacher@example.test",
            strongPassword,
            "TEACHER",
          );
          teacherUser = await db.user.findUniqueOrThrow({
            where: { email: "teacher@example.test" },
          });
        },
      );
      await t.test("Academic Master can edit configured terms after their dates pass", async () => {
        const existing = (await academicClient.call("GET", `schools/${schoolA.id}/workspace`)).body.years.find(year => year.id === yearA.id);
        const terms = existing.terms.map(term => term.key === "Term 1" ? { ...term, name: "First learning term" } : term);
        const changed = await academicClient.call("PATCH", `schools/${schoolA.id}/years/${yearA.id}`, { name: existing.name, startsAt: "2026-01-01", endsAt: "2026-12-31", terms });
        assert.equal(changed.status, 200, JSON.stringify(changed.body));
        assert.equal((await head.call("GET", `schools/${schoolA.id}/workspace`)).body.years.find(year => year.id === yearA.id).terms[0].name, "First learning term");
        assert.equal((await academicClient.call("PATCH", `schools/${schoolA.id}/years/${yearA.id}`, { name: existing.name, startsAt: "2026-01-01", endsAt: "2026-12-31", terms: [{ ...terms[0], endsAt: "2026-06-01" }, ...terms.slice(1)] })).status, 400, "overlapping terms are rejected");
      });
      await t.test("Academic Master can invite teachers only", async () => {
        const invitation = await academicClient.call(
          "POST",
          `schools/${schoolA.id}/invitations`,
          {
            name: "Invited by Academic",
            email: "academic-invited-teacher@example.test",
            role: "TEACHER",
            expiresInMinutes: 15,
          },
          idempotent(),
        );
        assert.equal(invitation.status, 201, JSON.stringify(invitation.body));
        const record = await db.invitation.findUniqueOrThrow({
          where: { id: invitation.body.id },
        });
        assert.equal(record.expiresInMinutes, 15);
        const view = await academicClient.call(
          "GET",
          `schools/${schoolA.id}/workspace`,
        );
        assert.ok(view.body.invitations.some((item) => item.id === record.id));
        assert.equal(
          (
            await academicClient.call(
              "POST",
              `schools/${schoolA.id}/invitations`,
              {
                name: "Not Allowed",
                email: "academic-invited-bursar@example.test",
                role: "BURSAR",
              },
              idempotent(),
            )
          ).status,
          403,
        );
        const selfInvitation = await academicClient.call(
          "POST",
          `schools/${schoolA.id}/invitations`,
          {
            name: "Academic User",
            email: "academic@example.test",
            role: "TEACHER",
          },
          idempotent(),
        );
        assert.equal(selfInvitation.status, 201, JSON.stringify(selfInvitation.body));
        assert.equal(
          (
            await academicClient.call("POST", "invitations/accept", {
              token: await invitationToken(selfInvitation.body.id),
            })
          ).status,
          201,
        );
        const teacherRole = client();
        assert.equal(
          (
            await teacherRole.login(
              "academic@example.test",
              strongPassword,
              "TEACHER",
            )
          ).status,
          201,
        );
        const recipient = client();
        assert.equal(
          (
            await recipient.call("POST", "invitations/accept", {
              token: await invitationToken(record.id),
              password: strongPassword,
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await recipient.login(
              "academic-invited-teacher@example.test",
              strongPassword,
              "TEACHER",
            )
          ).status,
          201,
        );
      });
      let student;
      await t.test(
        "Registrar registers student atomically; teachers cannot register",
        async () => {
          const input = {
            name: "Student One",
            admissionNumber: "A-001",
            classroomId: classA.id,
            gender: "F",
            address: "Test address",
            dateOfBirth: "2015-04-10",
          };
          const k = randomUUID();
          const response = await registrar.call(
            "POST",
            `schools/${schoolA.id}/students`,
            input,
            { "Idempotency-Key": k },
          );
          assert.equal(response.status, 201);
          student = response.body;
          assert.equal(
            (
              await registrar.call(
                "POST",
                `schools/${schoolA.id}/students`,
                input,
                { "Idempotency-Key": k },
              )
            ).body.id,
            student.id,
          );
          assert.equal(await db.enrollment.count(), 1);
          assert.equal(
            (
              await teacher.call(
                "POST",
                `schools/${schoolA.id}/students`,
                { ...input, admissionNumber: "A-002" },
                idempotent(),
              )
            ).status,
            403,
          );
          const before = await db.student.count();
          assert.equal(
            (
              await c.call(
                "POST",
                `schools/${schoolB.id}/students`,
                { ...input, admissionNumber: "B-001" },
                idempotent(),
              )
            ).status,
            400,
          );
          assert.equal(await db.student.count(), before);
        },
      );
      await t.test("teacher sees only assigned class students", async () => {
        assert.equal(
          (await teacher.call("GET", `schools/${schoolA.id}/workspace`)).body
            .students.length,
          0,
        );
        const membership = await db.membership.findFirstOrThrow({
          where: { userId: teacherUser.id, role: "TEACHER" },
        });
        assert.equal(
          (
            await head.call(
              "POST",
              `schools/${schoolA.id}/academics/commands`,
              { yearId: yearA.id, action: "class-teacher", payload: {teacherId: membership.id, classId: classA.id} },
              idempotent(),
            )
          ).status,
          201,
        );
        assert.equal(
          (await teacher.call("GET", `schools/${schoolA.id}/workspace`)).body
            .students.length,
          1,
        );
        assert.equal(
          (await teacher.call("GET", `schools/${schoolB.id}/workspace`)).status,
          403,
        );
      });
      await t.test("teacher assignment directory groups unique teachers and scopes filters and pages to one year", async () => {
        const teacherMembership = await db.membership.findFirstOrThrow({
          where: { schoolId: schoolA.id, userId: teacherUser.id, role: "TEACHER" },
        });
        const secondTeacher = await db.membership.findFirstOrThrow({
          where: { schoolId: schoolA.id, role: "TEACHER", user: { email: "academic@example.test" } },
        });
        const otherClass = await db.classroom.create({
          data: { schoolId: schoolA.id, yearId: yearA.id, name: "Class 1B" },
        });
        const civics = await db.subject.create({
          data: { schoolId: schoolA.id, name: "Civics", code: "CIV" },
        });
        const history = await db.subject.create({
          data: { schoolId: schoolA.id, name: "History", code: "HIS" },
        });
        await db.teachingAssignment.createMany({
          data: [
            { schoolId: schoolA.id, membershipId: teacherMembership.id, classroomId: classA.id, subjectId: civics.id },
            { schoolId: schoolA.id, membershipId: teacherMembership.id, classroomId: otherClass.id, subjectId: civics.id },
            { schoolId: schoolA.id, membershipId: teacherMembership.id, classroomId: classA.id, subjectId: history.id },
            { schoolId: schoolA.id, membershipId: secondTeacher.id, classroomId: classA.id, subjectId: history.id },
          ],
        });
        const priorYear = await db.academicYear.create({
          data: {
            schoolId: schoolA.id,
            name: "2025",
            startsAt: new Date("2025-01-01"),
            endsAt: new Date("2025-12-31"),
            closed: true,
          },
        });
        const priorClass = await db.classroom.create({
          data: { schoolId: schoolA.id, yearId: priorYear.id, name: "Form 4A" },
        });
        await db.teachingAssignment.create({
          data: { schoolId: schoolA.id, membershipId: teacherMembership.id, classroomId: priorClass.id, subjectId: civics.id },
        });
        const extraUsers = Array.from({ length: 12 }, (_, index) => ({
          email: `directory-teacher-${index}@example.test`,
          name: `Directory Teacher ${String(index).padStart(2, "0")}`,
          passwordHash: "test-only-hash",
        }));
        await db.user.createMany({ data: extraUsers });
        const extraTeacherUsers = await db.user.findMany({
          where: { email: { in: extraUsers.map(user => user.email) } },
          select: { id: true },
        });
        await db.membership.createMany({
          data: extraTeacherUsers.map(user => ({ schoolId: schoolA.id, userId: user.id, role: "TEACHER" })),
        });

        const baseRoute = `schools/${schoolA.id}/teacher-assignments?yearId=${yearA.id}`;
        const firstPage = await c.call("GET", `${baseRoute}&page=1&pageSize=12`);
        assert.equal(firstPage.status, 200, JSON.stringify(firstPage.body));
        assert.equal(firstPage.body.total, 15, "counts unique school teacher memberships, not assignment rows");
        assert.equal(firstPage.body.items.length, 12);
        assert.equal(firstPage.body.year.id, yearA.id);
        const secondPage = await c.call("GET", `${baseRoute}&page=2&pageSize=12`);
        assert.equal(secondPage.status, 200);
        assert.equal(secondPage.body.items.length, 3);
        assert.equal(
          new Set([...firstPage.body.items, ...secondPage.body.items].map(item => item.id)).size,
          15,
          "unique teacher pages have no duplicates or missing memberships",
        );
        const teacherProfile = [...firstPage.body.items, ...secondPage.body.items]
          .find(item => item.id === teacherUser.id);
        assert.ok(teacherProfile);
        assert.deepEqual(teacherProfile.classTeacherClasses.map(item => item.id), [classA.id]);
        assert.deepEqual(
          teacherProfile.teachingAssignments.map(item => item.name),
          ["Civics", "History"],
        );
        assert.deepEqual(
          teacherProfile.teachingAssignments.find(item => item.id === civics.id).classes.map(item => item.id).sort(),
          [classA.id, otherClass.id].sort(),
        );
        assert.equal(teacherProfile.teachingAssignments.some(item => item.classes.some(classroom => classroom.id === priorClass.id)), false);
        const priorYearResults = await c.call(
          "GET",
          `schools/${schoolA.id}/teacher-assignments?yearId=${priorYear.id}`,
        );
        assert.equal(priorYearResults.status, 200);
        const historicalTeacher = priorYearResults.body.items.find(item => item.id === teacherUser.id);
        assert.deepEqual(historicalTeacher.teachingAssignments.map(item => item.name), ["Civics"]);
        assert.equal(historicalTeacher.classTeacherClasses.length, 0);

        const civicsFilter = await c.call("GET", `${baseRoute}&subjectId=${civics.id}`);
        assert.equal(civicsFilter.body.total, 1);
        assert.equal(civicsFilter.body.items[0].id, teacherUser.id);
        const classFilter = await c.call("GET", `${baseRoute}&classId=${classA.id}`);
        assert.equal(classFilter.body.total, 2);
        const roleFilter = await c.call("GET", `${baseRoute}&role=class_teacher`);
        assert.equal(roleFilter.body.total, 1);
        const searchFilter = await c.call("GET", `${baseRoute}&search=TEACHER%20User`);
        assert.equal(searchFilter.status, 200);
        assert.equal(searchFilter.body.total, 1);
        assert.equal(searchFilter.body.items[0].id, teacherUser.id);
        assert.equal(
          (await c.call("GET", `${baseRoute}&classId=${classA.id}&subjectId=${civics.id}`)).body.total,
          1,
          "class and subject filters can combine",
        );
        assert.equal(
          (await c.call("GET", `${baseRoute}&subjectId=${civics.id}&role=subject_teacher`)).body.total,
          1,
          "subject and role filters can combine",
        );
        assert.equal(
          (await c.call("GET", `${baseRoute}&search=TEACHER%20User&role=subject_teacher`)).body.total,
          1,
          "name search and role filters can combine",
        );
        const combinedFilter = await c.call(
          "GET",
          `${baseRoute}&classId=${classA.id}&subjectId=${civics.id}&role=subject_teacher&search=TEACHER%20User`,
        );
        assert.equal(combinedFilter.body.total, 1, JSON.stringify(combinedFilter.body));
        assert.equal(combinedFilter.body.items[0].id, teacherUser.id);
        assert.equal(
          (await head.call("GET", `schools/${schoolB.id}/teacher-assignments?yearId=${yearA.id}`)).status,
          403,
          "school memberships cannot read another school's teacher directory",
        );
        assert.equal(
          (await c.call("GET", `schools/${schoolA.id}/teacher-assignments?yearId=${priorYear.id}&pageSize=13`)).status,
          400,
          "unsupported page sizes are rejected",
        );
      });
      await t.test(
        "original portal projections use real school records and protect profile fields",
        async () => {
          const summary = await c.call("GET", "platform/summary");
          assert.equal(summary.status, 200);
          assert.equal(summary.body.schools, await db.school.count());
          assert.equal(summary.body.students, 1);
          assert.equal(summary.body.admins[0].email, admin.email);
          assert.equal(summary.body.admins[0].passwordHash, undefined);
          const compactAdmin = await c.call("GET", `schools/${schoolA.id}/workspace?view=summary`);
          assert.equal(compactAdmin.status, 200);
          assert.deepEqual(compactAdmin.body.assignments, [], "Super Admin summary does not load all assignment rows");
          assert.equal(
            (await head.call("GET", "platform/summary")).status,
            403,
          );
          const r = (
            await registrar.call("GET", `schools/${schoolA.id}/workspace`)
          ).body;
          assert.equal(r.students[0].gender, "F");
          assert.equal(r.students[0].address, "Test address");
          assert.equal(r.students[0].enrollments[0].classroom.yearId, yearA.id);
          assert.equal(r.classes[0]._count.enrollments, 1);
          const t = (
            await teacher.call("GET", `schools/${schoolA.id}/workspace`)
          ).body;
          assert.ok(t.assignments.some(assignment => assignment.classroomId === classA.id && assignment.membership.user.id === teacherUser.id));
          assert.equal(t.years[0].id, yearA.id);
          assert.equal(t.students[0].address, undefined);
          assert.equal(t.students[0].dateOfBirth, undefined);
          assert.equal(t.audit.length, 0);
          const compact = await teacher.call("GET", `schools/${schoolA.id}/workspace?view=summary`);
          assert.equal(compact.status, 200);
          assert.equal(compact.body.studentsComplete, false);
          assert.deepEqual(compact.body.students, []);
          for (const key of ['studentCount', 'classes', 'years', 'assignments', 'permissions']) {
            assert.deepEqual(compact.body[key], t[key], `summary preserves authorized ${key}`);
          }
          assert.equal((await teacher.call("GET", `schools/${schoolB.id}/workspace?view=summary`)).status, 403);
        },
      );
      await t.test("teacher guardian and report-link access stays within assigned classes", async () => {
        const privateClass = await db.classroom.create({
          data: { schoolId: schoolA.id, yearId: yearA.id, name: "Unassigned Class" },
        });
        const privateStudent = await db.student.create({
          data: { schoolId: schoolA.id, name: "Private Student", admissionNumber: "PRIVATE-001" },
        });
        await db.enrollment.create({
          data: { schoolId: schoolA.id, studentId: privateStudent.id, classroomId: privateClass.id },
        });
        const visibleGuardian = await db.guardian.create({
          data: { schoolId: schoolA.id, name: "Assigned Guardian", phone: "+255712345678" },
        });
        const privateGuardian = await db.guardian.create({
          data: { schoolId: schoolA.id, name: "Unassigned Guardian", phone: "+255712345679" },
        });
        await db.studentGuardian.createMany({
          data: [
            { schoolId: schoolA.id, studentId: student.id, guardianId: visibleGuardian.id },
            { schoolId: schoolA.id, studentId: privateStudent.id, guardianId: privateGuardian.id },
          ],
        });
        await db.reportAccessLink.createMany({
          data: [
            { schoolId: schoolA.id, studentId: student.id, guardianId: visibleGuardian.id, reportCardId: "visible-report", tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 86400000) },
            { schoolId: schoolA.id, studentId: privateStudent.id, guardianId: privateGuardian.id, reportCardId: "private-report", tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 86400000) },
          ],
        });

        const guardianList = await teacher.call("GET", `schools/${schoolA.id}/guardians`);
        assert.equal(guardianList.status, 200);
        assert.deepEqual(guardianList.body.items.map(item => item.id), [visibleGuardian.id]);
        assert.equal((await teacher.call("GET", `schools/${schoolA.id}/guardians/${privateGuardian.id}`)).status, 404);

        const reportLinks = await teacher.call("GET", `schools/${schoolA.id}/reports/links`);
        assert.equal(reportLinks.status, 200);
        assert.deepEqual(reportLinks.body.items.map(item => item.id), [
          (await db.reportAccessLink.findFirstOrThrow({ where: { studentId: student.id } })).id,
        ]);
        assert.equal(
          (await teacher.call("GET", `schools/${schoolA.id}/reports/links?classId=${privateClass.id}`)).status,
          403,
        );
      });
      await t.test(
        "student and parent accounts are not supported",
        async () => {
          for (const role of ["STUDENT", "PARENT"]) {
            const invitation = await head.call(
              "POST",
              `schools/${schoolA.id}/invitations`,
              {
                name: "Unsupported account",
                email: `${role.toLowerCase()}@example.test`,
                role,
              },
              idempotent(),
            );
            assert.equal(invitation.status, 400, role);
            assert.equal(
              (
                await client().login(
                  `${role.toLowerCase()}@example.test`,
                  strongPassword,
                  role,
                )
              ).status,
              400,
              role,
            );
          }
        },
      );
      await t.test("resending and revocation invalidate links", async () => {
        const invite = await head.call(
          "POST",
          `schools/${schoolA.id}/invitations`,
          {
            name: "Pending User",
            email: "pending@example.test",
            role: "TEACHER",
          },
          idempotent(),
        );
        const old = await invitationToken(invite.body.id);
        assert.equal(
          (
            await head.call(
              "POST",
              `schools/${schoolA.id}/invitations/${invite.body.id}/resend`,
              {},
            )
          ).status,
          201,
        );
        assert.equal(
          (await client().call("POST", "invitations/preview", { token: old }))
            .status,
          400,
        );
        const fresh = await invitationToken(invite.body.id);
        await head.call(
          "POST",
          `schools/${schoolA.id}/invitations/${invite.body.id}/revoke`,
          {},
        );
        assert.equal(
          (
            await client().call("POST", "invitations/accept", {
              token: fresh,
              password: strongPassword,
            })
          ).status,
          400,
        );
      });
      await t.test(
        "membership suspension invalidates existing sessions",
        async () => {
          const m = await db.membership.findFirstOrThrow({
            where: { userId: teacherUser.id, role: "TEACHER" },
          });
          assert.equal(
            (
              await head.call(
                "PATCH",
                `schools/${schoolA.id}/members/${m.id}`,
                { active: false },
              )
            ).status,
            200,
          );
          assert.equal((await teacher.call("GET", "auth/me")).status, 401);
        },
      );
      await require('./platform-operations.cjs')({ t, db, client, admin: c });
      await t.test('public demo requests validate, deduplicate, rate limit and enter the lead pipeline', async () => {
        const visitor = client();
        const payload = { schoolName: 'Mlimani Primary School', schoolType: 'Primary', location: 'Kinondoni', region: 'Dar es Salaam',
          studentCount: 450, schoolWebsite: '', contactName: 'Amina Mwinyi', applicantPosition: 'Registrar', contactEmail: 'demo-applicant@example.test', contactPhone: '+255 712 345 678',
          headmasterName: 'Neema Mushi', headmasterEmail: 'headmaster-demo@example.test', headmasterPhone: '', preferredDemoMethod: 'Online Demo', requestMessage: '', consent: true, websiteField: '' };
        assert.equal((await visitor.call('POST', 'demo-requests', { ...payload, headmasterEmail: '' })).status, 400);
        for (let i = 0; i < 3; i++) assert.equal((await visitor.call('POST', 'demo-requests', payload)).status, 201);
        const limited = await visitor.call('POST', 'demo-requests', payload);
        assert.equal(limited.status, 429);
        assert.ok(Number(limited.headers.get('retry-after')) > 0);
        const leads = await db.platformLead.findMany({ where: { contactEmail: payload.contactEmail } });
        assert.equal(leads.length, 1);
        assert.equal(leads[0].headmasterEmail, payload.headmasterEmail);
        assert.equal(leads[0].status, 'new');
        assert.equal(leads[0].convertedSchoolId, null);
        assert.equal((await visitor.call('GET', 'platform/leads')).status, 401);
        assert.equal((await visitor.call('POST', `platform/leads/${leads[0].id}/activities`, { kind: 'contacted', note: 'Called school office' })).status, 401);
        assert.equal((await c.call('POST', `platform/leads/${leads[0].id}/activities`, { kind: 'contacted', note: 'Called school office' })).status, 201);
        assert.equal((await db.platformLead.findUniqueOrThrow({ where: { id: leads[0].id } })).status, 'contacted');
        const editable = Object.fromEntries(['schoolName', 'contactName', 'contactEmail', 'contactPhone', 'location', 'region', 'schoolType', 'schoolWebsite', 'applicantPosition', 'headmasterName', 'headmasterEmail', 'headmasterPhone', 'preferredDemoMethod', 'requestMessage', 'source', 'studentCount', 'notes', 'owner', 'followUp'].map(field => [field, leads[0][field]]));
        assert.equal((await c.call('PATCH', `platform/leads/${leads[0].id}`, { ...editable, status: 'won' })).status, 200);
        const converted = await c.call('POST', `platform/leads/${leads[0].id}/convert`, { code: 'MLIMANI-DEMO', expiresInMinutes: 2880 }, { 'Idempotency-Key': randomUUID() });
        assert.equal(converted.status, 201);
        assert.equal(converted.body.invitation.email, payload.headmasterEmail);
        assert.equal((await db.platformLead.findUniqueOrThrow({ where: { id: leads[0].id } })).convertedSchoolId, converted.body.school.id);
      });
      await t.test('contact requests preserve the three per email rolling limit and reject spoofed IP changes', async () => {
        await db.publicFormAttempt.deleteMany();
        await db.publicFormBlock.deleteMany();
        const visitor = client();
        const payload = { fullName: 'Juma Mushi', emailAddress: 'CONTACT@example.test', phoneNumber: '+255 712 345 678', subject: 'sales', message: 'Please contact our school office.', websiteField: '' };
        for (let i = 0; i < 3; i++) assert.equal((await visitor.call('POST', 'contact', payload, { 'X-Forwarded-For': `203.0.113.${i + 1}` })).status, 201);
        const limited = await visitor.call('POST', 'contact', payload, { 'X-Forwarded-For': '203.0.113.99' });
        assert.equal(limited.status, 429);
        assert.ok(Number(limited.headers.get('retry-after')) > 0);
        const attempts = await db.publicFormAttempt.findMany({ where: { form: 'contact' } });
        assert.equal(attempts.length, 3);
        assert.equal(new Set(attempts.map(item => item.ipHash)).size, 1);
        const activity = await c.call('GET', 'platform/public-forms/activity');
        assert.equal(activity.status, 200);
        assert.ok(activity.body.total >= 1);
        assert.equal((await visitor.call('GET', 'platform/public-forms/activity')).status, 401);
      });
      await t.test('concurrent public submissions cannot exceed the email limit', async () => {
        await db.publicFormAttempt.deleteMany();
        await db.publicFormBlock.deleteMany();
        const visitor = client();
        const payload = { fullName: 'Juma Mushi', emailAddress: 'parallel@example.test', phoneNumber: '', subject: 'sales', message: 'Please contact our school office.', websiteField: '' };
        const results = await Promise.all(Array.from({ length: 5 }, () => visitor.call('POST', 'contact', payload)));
        assert.equal(results.filter(result => result.status === 201).length, 3);
        assert.equal(results.filter(result => result.status === 429).length, 2);
      });
      await require('./realtime-platform.cjs')({ t, db, client, fixture, admin: c, adminPassword, recoveryCodes, strongPassword });
      await t.test(
        "password recovery works for every supported role",
        async () => {
          const accounts = [
            {
              email: "admin@example.test",
              role: "SUPER_ADMIN",
              password: strongPassword + "-new",
            },
            {
              email: "head@example.test",
              role: "HEADMASTER",
              password: strongPassword,
            },
            {
              email: "registrar@example.test",
              role: "REGISTRAR",
              password: strongPassword,
            },
            {
              email: "academic@example.test",
              role: "ACADEMIC",
              password: strongPassword,
            },
            {
              email: "teacher@example.test",
              role: "TEACHER",
              password: strongPassword,
            },
            {
              email: "bursar@example.test",
              role: "BURSAR",
              password: strongPassword,
            },
          ];
          for (const account of accounts) {
            const r = client();
            assert.equal(
              (await r.call("POST", "auth/recover", { email: account.email }))
                .status,
              201,
              account.role,
            );
            const user = await db.user.findUniqueOrThrow({
              where: { email: account.email },
            });
            const reset = await db.passwordReset.findFirstOrThrow({
              where: { userId: user.id },
              orderBy: { expiresAt: "desc" },
            });
            const job = await db.outbox.findFirstOrThrow({
              where: { resetId: reset.id },
            });
            const token = JSON.parse(decrypt(job.payload)).text.match(
              /#token=([A-Za-z0-9_-]+)/,
            )[1];
            const nextPassword =
              strongPassword + "-reset-" + account.role.toLowerCase();
            assert.equal(
              (
                await r.call("POST", "auth/reset", {
                  token,
                  password: nextPassword,
                })
              ).status,
              201,
              account.role,
            );
            const updated = await db.user.findUniqueOrThrow({
              where: { id: user.id },
            });
            assert.equal(
              await passwordMatches(updated.passwordHash, nextPassword),
              true,
              account.role,
            );
            if (account.role === "SUPER_ADMIN") {
              assert.equal(
                (
                  await r.call("POST", "auth/reset", {
                    token,
                    password: strongPassword + "-again",
                  })
                ).status,
                400,
                account.role,
              );
              assert.equal((await r.login(account.email, nextPassword, "SUPER_ADMIN")).status, 400);
              const challenge = await r.platformLogin(account.email, nextPassword);
              assert.equal(challenge.status, 201);
              assert.equal(challenge.body.stage, "totp");
              assert.equal((await r.call("GET", "platform/summary")).status, 401);
              await waitForNextTotpStep();
              const signedIn = await r.call("POST", "auth/platform/verify", { code: authenticator.generate(decrypt(updated.mfaSecret)) });
              assert.equal(signedIn.status, 201);
              assert.equal(signedIn.body.platformAdmin, true);
            }
            if (account.role === "TEACHER") {
              await db.membership.updateMany({
                where: { userId: user.id, role: "TEACHER" },
                data: { active: true },
              });
            }
            if (account.role !== "SUPER_ADMIN") {
              assert.equal(
                (await client().login(account.email, nextPassword, account.role))
                  .status,
                201,
                account.role,
              );
            }
          }
          assert.equal((await registrar.call("GET", "auth/me")).status, 401);
        },
      );
      await t.test('student management persists records and enforces role, school, year and concurrency boundaries', async () => {
        const school = await db.school.create({ data: { name: 'Registry integration school', code: 'REG-TEST', region: 'Test' } });
        const other = await db.school.create({ data: { name: 'Isolated registry school', code: 'REG-OTHER', region: 'Test' } });
        const year = await db.academicYear.create({ data: { schoolId: school.id, name: '2026', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') } });
        const next = await db.academicYear.create({ data: { schoolId: school.id, name: '2027', startsAt: new Date('2027-01-01'), endsAt: new Date('2027-12-31') } });
        const foreignYear = await db.academicYear.create({ data: { schoolId: other.id, name: '2026', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') } });
        const makeClass = (name, yearId = year.id, schoolId = school.id) => db.classroom.create({ data: { name, yearId, schoolId } });
        const a = await makeClass('Class A'), b = await makeClass('Class B'), future = await makeClass('Next class', next.id), foreign = await makeClass('Foreign class', foreignYear.id, other.id);
        const registrarUser = await fixture('registry@example.test', 'REGISTRAR', school.id);
        const academicUser = await fixture('registry-academic@example.test', 'ACADEMIC', school.id);
        const teacherUser = await fixture('registry-teacher@example.test', 'TEACHER', school.id);
        await fixture('registry-head@example.test', 'HEADMASTER', school.id);
        const reg = client(), acad = client(), teach = client(), hm = client();
        for (const [agent, email, role] of [[reg,registrarUser.email,'REGISTRAR'],[acad,academicUser.email,'ACADEMIC'],[teach,teacherUser.email,'TEACHER'],[hm,'registry-head@example.test','HEADMASTER']]) assert.equal((await agent.login(email, strongPassword, role)).status, 201);
        const membership = await db.membership.findFirstOrThrow({ where: { userId: teacherUser.id, schoolId: school.id } });
        await db.teachingAssignment.create({ data: { schoolId: school.id, classroomId: a.id, membershipId: membership.id } });
        const route = `schools/${school.id}/registry/`;
        const post = (path, body, agent = reg, requestKey = randomUUID()) => agent.call('POST', route + path, body, { 'Idempotency-Key': requestKey });
        const get = (path, agent = reg) => agent.call('GET', route + path);
        const input = { name: 'Integration Student', admissionNumber: 'REG-001', classroomId: a.id, gender: 'F', dateOfBirth: '2010-05-12', address: 'Private test address' };
        const requestKey = randomUUID();
        const created = await post('students', input, reg, requestKey);
        assert.equal(created.status, 201, JSON.stringify(created.body));
        const studentId = created.body.id;
        assert.equal((await post('students', input, reg, requestKey)).body.id, studentId, 'retry does not create another student');
        assert.equal((await post('students', input)).status, 409, 'student number is unique');
        assert.equal((await post('students', { ...input, admissionNumber: 'BAD-DATE', dateOfBirth: '2026-02-30' })).status, 400);
        assert.equal((await post('students', { ...input, admissionNumber: 'FUTURE-DATE', dateOfBirth: '2099-01-01' })).status, 400);
        assert.equal((await post('students', { ...input, admissionNumber: 'FOREIGN', classroomId: foreign.id })).status, 400);
        assert.equal((await post('students', { ...input, admissionNumber: 'DENIED' }, acad)).status, 403);
        assert.equal((await post('students', { ...input, admissionNumber: 'DENIED' }, teach)).status, 403);
        assert.equal((await reg.call('GET', `schools/${other.id}/registry/students?yearId=${foreignYear.id}`)).status, 403);
        assert.equal((await get(`students?yearId=${year.id}&q=REG-001`, acad)).body.total, 1);
        let detail = await get('students/' + studentId, teach);
        assert.equal(detail.status, 200); assert.equal('address' in detail.body, false); assert.equal('dateOfBirth' in detail.body, false); assert.equal(detail.body.events.length, 0);
        assert.equal((await get('admissions?yearId=' + year.id, acad)).status, 403);
        const editBody = { ...input, name: 'Updated Integration Student', version: 1, yearId: year.id }; delete editBody.classroomId;
        const edit = await reg.call('PATCH', route + 'students/' + studentId, editBody, { 'Idempotency-Key': randomUUID() });
        assert.equal(edit.status, 200, JSON.stringify(edit.body));
        assert.equal((await reg.call('PATCH', route + 'students/' + studentId, editBody, { 'Idempotency-Key': randomUUID() })).status, 409, 'stale profile updates rejected');
        detail = await get('students/' + studentId); assert.equal(detail.body.name, editBody.name); assert.equal(detail.body.version, 2);
        const competingProfiles = await Promise.all([reg,hm].map((agent,index)=>agent.call('PATCH',route+'students/'+studentId,{...editBody,version:2,name:'Concurrent profile '+index},{'Idempotency-Key':randomUUID()})));
        assert.deepEqual(competingProfiles.map(r=>r.status).sort(),[200,409],'Registrar and Headmaster cannot silently overwrite the same profile version');
        const profileWinner=competingProfiles.findIndex(r=>r.status===200);
        detail=await get('students/'+studentId);
        assert.equal(detail.body.name,'Concurrent profile '+profileWinner);assert.equal(detail.body.version,3);
        assert.equal((await teach.call('PATCH',route+'students/'+studentId,{...editBody,version:3},{'Idempotency-Key':randomUUID()})).status,403,'teachers cannot edit personal student profiles');
        let e = detail.body.enrollments[0];
        assert.equal((await post('movements', { enrollmentId: e.id, version: e.version, action: 'class_change', classroomId: future.id, reason: 'Invalid year change' })).status, 400);
        assert.equal((await post('movements', { enrollmentId: e.id, version: e.version, action: 'class_change', classroomId: b.id, reason: 'Class allocation updated' })).status, 201);
        assert.equal((await post('movements', { enrollmentId: e.id, version: e.version, action: 'withdrawn', reason: 'Outdated request' })).status, 409);
        assert.equal((await get(`students?yearId=${year.id}`, teach)).body.total, 0, 'teacher loses access after transfer');
        assert.equal((await get('students/' + studentId, teach)).status, 400);
        let snapshot = await hm.call('GET', `schools/${school.id}/workspace`);
        assert.equal(snapshot.body.classes.find(c => c.id === a.id)._count.enrollments, 0);
        assert.equal(snapshot.body.classes.find(c => c.id === b.id)._count.enrollments, 1);
        e = (await get('students/' + studentId)).body.enrollments[0];
        assert.equal((await post('movements', { enrollmentId: e.id, version: e.version, action: 'withdrawn', reason: 'Family requested withdrawal' })).status, 201);
        assert.equal((await get('summary?yearId=' + year.id)).body.active, 0);
        e = (await get('students/' + studentId)).body.enrollments[0];
        assert.equal(e.status, 'withdrawn');
        assert.equal((await post('movements', { enrollmentId: e.id, version: e.version, action: 'reactivate', reason: 'Student returned to school' })).status, 201);
        assert.equal((await post('enrollments', { studentId, classroomId: a.id })).status, 409);
        const application = await post('admissions', { name: 'Admission Test Student', gender: 'M', dateOfBirth: '2011-06-12', requestedClassId: a.id });
        assert.equal(application.status, 201, JSON.stringify(application.body));
        assert.equal((await post('admissions', { name: 'Admission Test Student', gender: 'M', dateOfBirth: '2011-06-12', requestedClassId: a.id })).status, 409);
        assert.equal((await get('summary?yearId=' + year.id)).body.pending, 1);
        const decision = await post(`admissions/${application.body.id}/decision`, { decision: 'accepted', admissionNumber: 'REG-002', classroomId: a.id });
        assert.equal(decision.status, 201, JSON.stringify(decision.body));
        assert.equal((await post(`admissions/${application.body.id}/decision`, { decision: 'rejected', note: 'Late duplicate decision' })).status, 409);
        const firstWorkspacePage = await hm.call('GET', `schools/${school.id}/workspace?page=1&pageSize=1`);
        const secondWorkspacePage = await hm.call('GET', `schools/${school.id}/workspace?page=2&pageSize=1`);
        assert.equal(firstWorkspacePage.body.studentCount, 2);
        assert.equal(firstWorkspacePage.body.students.length, 1);
        assert.equal(secondWorkspacePage.body.students.length, 1);
        assert.notEqual(firstWorkspacePage.body.students[0].id, secondWorkspacePage.body.students[0].id);
        assert.equal((await hm.call('GET', `schools/${school.id}/workspace`)).body.students.length, 2, 'workspace requests without pagination retain the full roster');
        assert.equal((await get(`students?yearId=${year.id}`, teach)).body.total, 1);
        assert.equal((await get('summary?yearId=' + year.id)).body.pending, 0);
        const reject = await post('admissions', { name: 'Rejected Application', requestedClassId: a.id });
        assert.equal((await post(`admissions/${reject.body.id}/decision`, { decision: 'rejected', note: 'Not eligible for requested year' })).status, 201);
        const admissions = await get('admissions?yearId=' + year.id + '&status=rejected'); assert.equal(admissions.body.total, 1);
        assert.equal((await post('progression', { studentIds: [studentId, decision.body.studentId], sourceYearId: year.id, classroomId: future.id })).status, 201);
        assert.equal((await get('students/' + studentId)).body.enrollments.length, 2, 'source year retained');
        assert.equal((await post('progression', { studentIds: [studentId], sourceYearId: year.id, classroomId: future.id })).status, 409);
        const unplaced = await db.student.create({ data: { name: 'Unplaced test student', admissionNumber: 'REG-U', schoolId: school.id } });
        assert.equal((await get(`students?yearId=${year.id}&status=unassigned`)).body.items.some(s => s.id === unplaced.id), true);
        const racing = await Promise.all([post('enrollments', { studentId: unplaced.id, classroomId: a.id }), post('enrollments', { studentId: unplaced.id, classroomId: b.id })]);
        assert.deepEqual(racing.map(r => r.status).sort(), [201,409], 'concurrent enrollment cannot place a student in two classes');
        await db.student.createMany({ data: Array.from({length:105}, (_,i) => ({ schoolId: school.id, name: 'Pagination student ' + String(i).padStart(3,'0'), admissionNumber: 'PAGE-' + i })) });
        const first = await get(`students?yearId=${year.id}&q=Pagination&pageSize=100`), second = await get(`students?yearId=${year.id}&q=Pagination&pageSize=100&page=2`);
        assert.equal(first.body.total, 105); assert.equal(first.body.items.length, 100); assert.equal(second.body.items.length, 5);
        assert.equal(new Set([...first.body.items,...second.body.items].map(s => s.id)).size, 105);
        const events = await get(`events?yearId=${year.id}&kind=movement`); assert.equal(events.body.total, 3); assert.ok(events.body.items.every(e => e.kind === 'movement'));
        await db.academicYear.update({ where: { id: year.id }, data: { closed: true } });
        assert.equal((await post('students', { ...input, admissionNumber: 'CLOSED' })).status, 201);
        assert.equal((await post('admissions', { name: 'Closed year applicant', requestedClassId: a.id })).status, 201);
        e = (await get('students/' + studentId)).body.enrollments.find(e => e.classroom.yearId === year.id);
        assert.equal((await post('movements', { enrollmentId: e.id, version: e.version, action: 'withdrawn', reason: 'Historical record corrected' })).status, 201);
        assert.equal((await get('students/' + studentId)).body.name, 'Concurrent profile '+profileWinner, 'the winning concurrent edit survives subsequent requests');
      });

      await require('./registrar-workflows.cjs')({ t, db, client, fixture });
      await require('./student-subjects.cjs')({ t, db, client, fixture });
      await require('./assessment-allocation.cjs')({ t, db, client, fixture });
      await require('./academic-workflows.cjs')({ t, db, client, fixture });
      await require('./transaction-retries.cjs')({ t, db });
      await require('./finance-workflows.cjs')({ t, db, client, fixture });

      await t.test("expired invitation is rejected", async () => {
        const i = await db.invitation.findFirstOrThrow({
          where: { email: "head-b@example.test" },
        });
        const token = await invitationToken(i.id);
        await db.invitation.update({
          where: { id: i.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        assert.equal(
          (await client().call("POST", "invitations/preview", { token }))
            .status,
          400,
        );
      });
      await t.test("logout revokes session", async () => {
        assert.equal((await head.call("POST", "auth/logout", {})).status, 201);
        assert.equal((await head.call("GET", "auth/me")).status, 401);
      });
      await t.test("administrator password and MFA challenges stop after five failures", async () => {
        const passwordLocked = await db.user.create({
          data: { email: "password-locked@example.test", name: "Password locked", passwordHash: await passwordHash(strongPassword), platformAdmin: true },
        });
        for (let attempt = 0; attempt < 5; attempt++) {
          assert.equal((await client().platformLogin(passwordLocked.email, strongPassword + "-wrong")).status, 401);
        }
        assert.equal((await client().platformLogin(passwordLocked.email, strongPassword)).status, 429);

        const secret = authenticator.generateSecret();
        const mfaLocked = await db.user.create({
          data: { email: "mfa-locked@example.test", name: "MFA locked", passwordHash: await passwordHash(strongPassword), platformAdmin: true, mfaSecret: encrypt(secret) },
        });
        const challenge = client();
        assert.equal((await challenge.platformLogin(mfaLocked.email, strongPassword)).body.stage, "totp");
        let invalidCode = authenticator.generate(authenticator.generateSecret());
        while (authenticator.check(invalidCode, secret)) invalidCode = authenticator.generate(authenticator.generateSecret());
        for (let attempt = 0; attempt < 5; attempt++) {
          assert.equal((await challenge.call("POST", "auth/platform/verify", { code: invalidCode })).status, 401);
        }
        assert.equal((await challenge.call("GET", "auth/platform/challenge")).status, 401);
        const anotherChallenge = client();
        assert.equal((await anotherChallenge.platformLogin(mfaLocked.email, strongPassword)).status, 201);
        assert.equal((await anotherChallenge.call("POST", "auth/platform/verify", { code: invalidCode })).status, 429);
      });
      await t.test(
        "rate limiting rejects repeated recovery attempts",
        async () => {
          const r = client();
          let last;
          for (let i = 0; i < 4; i++)
            last = await r.call("POST", "auth/recover", {
              email: "unknown@example.test",
            });
          assert.equal(last.status, 429);
        },
      );
    } finally {
      api?.kill();
      await db.$disconnect();
    }
  },
);
