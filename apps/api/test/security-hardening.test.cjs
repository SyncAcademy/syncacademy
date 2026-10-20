const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");

process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.APP_ORIGIN = "https://example.test";
process.env.SESSION_SECRET = "a".repeat(48);
process.env.DATA_ENCRYPTION_KEY = "a".repeat(64);
process.env.SMTP_HOST = "localhost";
process.env.MAIL_FROM = "test@example.test";
process.env.MOCK_PAYMENT_PROVIDER = "false";

const { NextSmsWebhookHandler } = require("../dist/communication/webhooks/nextsms-webhook");
const { verifyResendWebhookSignature } = require("../dist/communication/webhooks/resend-webhook");
const { createPaymentProvider } = require("../dist/payments/payment-provider.factory");

test("NextSMS webhook authentication fails closed without a configured token", () => {
  const handler = new NextSmsWebhookHandler();
  assert.equal(handler.handle({ token: "syncacademy-verify-token", messageId: "message-1" }).valid, false);
  assert.equal(new NextSmsWebhookHandler("configured-token").handle({
    token: "configured-token",
    messageId: "message-1",
    status: "DELIVERED",
  }).valid, true);
});

test("Resend webhook signature rejects missing, altered, and stale signatures", () => {
  const secret = `whsec_${Buffer.from("test-webhook-secret").toString("base64")}`;
  const body = Buffer.from(JSON.stringify({ type: "email.delivered", data: { email_id: "email-1" } }));
  const id = "msg_123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = createHmac("sha256", Buffer.from(secret.slice("whsec_".length), "base64"))
    .update(`${id}.${timestamp}.${body.toString("utf8")}`)
    .digest("base64");
  const headers = { id, timestamp, signature: `v1,${digest}` };

  assert.equal(verifyResendWebhookSignature(secret, headers, body), true);
  assert.equal(verifyResendWebhookSignature(undefined, headers, body), false);
  assert.equal(verifyResendWebhookSignature(secret, headers, Buffer.from("{}")), false);
  assert.equal(verifyResendWebhookSignature(secret, { ...headers, timestamp: "1" }, body), false);
  assert.equal(verifyResendWebhookSignature(secret, { ...headers, signature: "v1,invalid" }, body), false);
});

test("production payment provider never auto-confirms purchases", async () => {
  const provider = createPaymentProvider();
  assert.equal(provider.name, "unconfigured");
  await assert.rejects(
    provider.initiatePayment({
      schoolId: "00000000-0000-4000-8000-000000000001",
      invoiceId: "invoice",
      invoiceType: "SUBSCRIPTION",
      amount: 1000,
      currency: "TZS",
      description: "test",
    }),
    /Online payments are not configured/,
  );
});
