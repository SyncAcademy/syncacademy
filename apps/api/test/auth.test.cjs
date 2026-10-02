const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");
const { authenticator } = require("otplib");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
  quiet: true,
});
const url = new URL(process.env.DATABASE_URL);
url.pathname = "/syncacademy_auth_test";
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = "test";
process.env.PORT = "3101";
if (new URL(process.env.DATABASE_URL).pathname !== "/syncacademy_auth_test")
  throw new Error("Tests require isolated database");
const db = new PrismaClient();
const {
  passwordHash,
  passwordMatches,
  encrypt,
  decrypt,
} = require("../dist/security");
const origin = process.env.APP_ORIGIN;
const base = "http://localhost:3101/api/v1/";
const strongPassword = "Only-for-isolated-tests-" + randomUUID();
let api;
function client() {
  let cookie = "";
  return {
    async call(method, route, body, headers = {}) {
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
  };
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
  { timeout: 180000 },
  async (t) => {
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
      'TRUNCATE TABLE "session", "Outbox", "Idempotency", "RateBucket", "AuditEvent", "Invitation", "PasswordReset", "TeachingAssignment", "Enrollment", "Student", "Classroom", "AcademicYear", "Membership", "School", "User" CASCADE',
    );
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
      const c = client();
      await t.test(
        "anonymous access and cross-origin writes rejected",
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
        },
      );
      await t.test(
        "login rotates session and requires password replacement and MFA",
        async () => {
          const signed = await c.login(
            admin.email,
            strongPassword,
            "SUPER_ADMIN",
          );
          assert.equal(signed.status, 201);
          assert.equal(signed.body.mustChangePassword, true);
          assert.equal(signed.body.selectedRole, "SUPER_ADMIN");
          assert.match(signed.headers.get("set-cookie"), /HttpOnly/i);
          assert.equal((await c.call("GET", "schools")).status, 403);
          const changed = await c.call("POST", "auth/change-password", {
            currentPassword: strongPassword,
            password: strongPassword + "-new",
          });
          assert.equal(changed.status, 201);
          assert.equal(changed.body.mustChangePassword, false);
          assert.equal((await c.call("GET", "schools")).status, 403);
        },
      );
      let recoveryCodes = [];
      await t.test(
        "MFA setup, one-time codes and replay protection",
        async () => {
          const setup = await c.call("POST", "auth/mfa/setup", {});
          assert.equal(setup.status, 201);
          const code = authenticator.generate(setup.body.secret);
          const verified = await c.call("POST", "auth/mfa/verify", {
            code,
            setup: true,
          });
          assert.equal(verified.status, 201);
          recoveryCodes = verified.body.recoveryCodes;
          assert.equal(recoveryCodes.length, 8);
          assert.equal((await c.call("GET", "schools")).status, 200);
          const second = client();
          assert.equal(
            (
              await second.login(
                admin.email,
                strongPassword + "-new",
                "SUPER_ADMIN",
              )
            ).body.needsMfa,
            true,
          );
          assert.equal(
            (
              await second.call("POST", "auth/mfa/verify", {
                code,
                setup: false,
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await second.call("POST", "auth/mfa/recovery", {
                code: recoveryCodes[0],
              })
            ).status,
            201,
          );
          const third = client();
          await third.login(
            admin.email,
            strongPassword + "-new",
            "SUPER_ADMIN",
          );
          assert.equal(
            (
              await third.call("POST", "auth/mfa/recovery", {
                code: recoveryCodes[0],
              })
            ).status,
            401,
          );
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
          assert.ok(listed.body.some((item) => item.id === invitation.id));
          const preview = await client().call("POST", "invitations/preview", {
            token: await invitationToken(invitation.id),
          });
          assert.equal(preview.status, 201);
          assert.equal(preview.body.role, "SUPER_ADMIN");
          assert.equal(preview.body.school, "SyncAcademy platform");

          const recipient = client();
          const accepted = await recipient.call("POST", "invitations/accept", {
            token: await invitationToken(invitation.id),
            password: strongPassword,
          });
          assert.equal(accepted.status, 201);
          const secondAdmin = await db.user.findUniqueOrThrow({
            where: { email: "second-admin@example.test" },
          });
          assert.equal(secondAdmin.platformAdmin, true);
          assert.equal(
            await db.membership.count({ where: { userId: secondAdmin.id } }),
            0,
          );
          const login = await recipient.login(
            "second-admin@example.test",
            strongPassword,
            "SUPER_ADMIN",
          );
          assert.equal(login.status, 201);
          assert.equal(login.body.needsMfaSetup, true);
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
            403,
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
        "Headmaster cannot invite another Headmaster or platform admin",
        async () => {
          assert.equal(
            (
              await head.call(
                "POST",
                `schools/${schoolA.id}/invitations`,
                {
                  name: "Elevated",
                  email: "elevated@example.test",
                  role: "HEADMASTER",
                },
                idempotent(),
              )
            ).status,
            403,
          );
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
            { name: "2026", startsAt: "2026-01-01", endsAt: "2026-12-31" },
            idempotent(),
          );
          assert.equal(y.status, 201);
          yearA = y.body;
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
              `schools/${schoolA.id}/assignments`,
              { membershipId: membership.id, classroomId: classA.id },
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
      await t.test(
        "original portal projections use real school records and protect profile fields",
        async () => {
          const summary = await c.call("GET", "platform/summary");
          assert.equal(summary.status, 200);
          assert.equal(summary.body.schools, await db.school.count());
          assert.equal(summary.body.students, 1);
          assert.equal(summary.body.admins[0].email, admin.email);
          assert.equal(summary.body.admins[0].passwordHash, undefined);
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
          assert.equal(t.assignments[0].classroomId, classA.id);
          assert.equal(t.assignments[0].membership.user.id, teacherUser.id);
          assert.equal(t.years[0].id, yearA.id);
          assert.equal(t.students[0].address, undefined);
          assert.equal(t.students[0].dateOfBirth, undefined);
          assert.equal(t.audit.length, 0);
        },
      );
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
            }
            if (account.role === "TEACHER") {
              await db.membership.updateMany({
                where: { userId: user.id, role: "TEACHER" },
                data: { active: true },
              });
            }
            assert.equal(
              (await client().login(account.email, nextPassword, account.role))
                .status,
              201,
              account.role,
            );
          }
          assert.equal((await registrar.call("GET", "auth/me")).status, 401);
        },
      );
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
