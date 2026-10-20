const { test } = require("node:test");
const assert = require("node:assert/strict");
const { AuditLogService, sanitizeAuditDetails } = require("../dist/audit-log.service");

const row = (overrides = {}) => ({
  id: "00000000-0000-4000-8000-000000000001",
  source: "SECURITY",
  createdAt: new Date("2026-10-20T12:00:00.000Z"),
  action: "LOGIN_FAILED",
  category: "AUTHENTICATION",
  actorId: null,
  actorName: "=HYPERLINK(\"https://example.test\")",
  actorEmail: "person@example.test",
  actorRole: "SUPER_ADMIN",
  schoolId: null,
  schoolName: null,
  schoolCode: null,
  target: "=1+1",
  targetId: "00000000-0000-4000-8000-000000000003",
  outcome: "FAILED",
  severity: "HIGH",
  details: { password: "never expose", reason: "invalid password" },
  ipAddress: "192.0.2.4",
  userAgent: "Test Browser",
  ...overrides,
});

function createService({ rows = [row()], total = rows.length } = {}) {
  const created = [];
  const db = {
    $queryRaw: async query => query.sql.includes("COUNT(*)")
      ? [{ total: BigInt(total) }]
      : rows,
    auditEvent: { create: async value => created.push(value) },
  };
  return { service: new AuditLogService(db), created };
}

const query = {
  page: 1,
  pageSize: 20,
  q: "",
  actor: "",
  action: "",
};

test("audit list returns unique rows with pagination metadata and no resource UUIDs", async () => {
  const { service } = createService({ rows: [row()], total: 41 });
  const result = await service.list({ ...query, page: 2, pageSize: 20 });

  assert.equal(result.total, 41);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 20);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].target, "=1+1");
  assert.equal("actorId" in result.items[0], false);
  assert.equal("details" in result.items[0], false);
});

test("audit detail redacts sensitive fields recursively", async () => {
  const { service } = createService({
    rows: [row({ details: { request: [{ apiKey: "secret", safe: "visible" }] } })],
  });
  const result = await service.detail("SECURITY", row().id);

  assert.equal(result.details.request[0].apiKey, "[REDACTED]");
  assert.equal(result.details.request[0].safe, "visible");
  assert.equal(result.targetId, "00000000-0000-4000-8000-000000000003");
});

test("CSV export neutralizes spreadsheet formulas and records the export event", async () => {
  const { service, created } = createService({
    rows: [row({ schoolName: " \t=HYPERLINK(\"https://example.test\")" })],
  });
  const csv = await service.export(query, "00000000-0000-4000-8000-000000000002");

  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /'=1\+1/);
  assert.match(csv, /' \t=HYPERLINK/);
  assert.equal(created.length, 1);
  assert.equal(created[0].data.action, "AUDIT_LOG_EXPORTED");
});

test("CSV export rejects result sets above the bounded export limit", async () => {
  const { service, created } = createService({ rows: [], total: 5001 });

  await assert.rejects(service.export(query, "00000000-0000-4000-8000-000000000002"), /5,000 event limit/);
  assert.equal(created.length, 0);
});

test("audit detail sanitizer bounds nested data and redacts credential-like keys", () => {
  assert.deepEqual(sanitizeAuditDetails({
    sessionId: "private",
    metadata: [{ accessToken: "private", visible: "ok" }],
  }), {
    sessionId: "[REDACTED]",
    metadata: [{ accessToken: "[REDACTED]", visible: "ok" }],
  });
});
