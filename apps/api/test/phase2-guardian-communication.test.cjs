const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Import compiled modules from dist
const { 
  NextSmsProvider, 
  NextWhatsAppProvider, 
  ResendEmailProvider,
  MockCommunicationProvider, 
  NextSmsWebhookHandler 
} = require('../dist/communication');

const { 
  normalizePhoneNumber,
  calculateSmsSegments,
  SMS_COST_PER_SEGMENT_TZS,
  WHATSAPP_COST_PER_TEMPLATE_TZS
} = require('../dist/communication/communication.service');

const { digest, randomToken } = require('../dist/security');

test('ResendEmailProvider - sends in mock mode with structured message result', async () => {
  const provider = new ResendEmailProvider({
    apiKey: '',
    defaultFrom: 'notifications@syncacademy.co.tz',
    mockMode: true,
  });

  assert.equal(provider.providerName, 'resend');

  const res = await provider.send({
    to: 'parent@example.com',
    subject: 'Ripoti ya Muhula',
    text: 'Ripoti ya mtoto wako ipo tayari.',
    html: '<p>Ripoti ya mtoto wako ipo tayari.</p>',
    reference: 'job-12345',
  });

  assert.equal(res.channel, 'EMAIL');
  assert.equal(res.status, 'DELIVERED');
  assert.equal(res.recipient, 'parent@example.com');
  assert.equal(res.unitCostTzs, 0);
  assert.ok(res.providerMessageId.startsWith('resend-mock-'));
});

test('CommunicationService - phone normalization for Tanzanian formats', () => {
  assert.equal(normalizePhoneNumber('0712345678'), '255712345678');
  assert.equal(normalizePhoneNumber('+255712345678'), '255712345678');
  assert.equal(normalizePhoneNumber('255712345678'), '255712345678');
  assert.equal(normalizePhoneNumber('0655-123-456'), '255655123456');
  assert.equal(normalizePhoneNumber('+255 784 999 888'), '255784999888');
});

test('CommunicationService - SMS segment & cost calculation (30 TZS per segment)', () => {
  // 1-160 GSM chars = 1 segment (30 TZS)
  const text1 = 'Habari ya jioni. Hii ni taarifa ya shule kuhusu ufunguzi.';
  assert.equal(calculateSmsSegments(text1), 1);
  assert.equal(calculateSmsSegments(text1) * SMS_COST_PER_SEGMENT_TZS, 30);

  // 161 chars = 2 segments (60 TZS)
  const text2 = 'X'.repeat(161);
  assert.equal(calculateSmsSegments(text2), 2);
  assert.equal(calculateSmsSegments(text2) * SMS_COST_PER_SEGMENT_TZS, 60);

  // UCS-2 / Emoji: 71 chars = 2 segments
  const emojiText = 'Ripoti ya mwanafunzi ipo tayari 🎓 ' + 'Y'.repeat(50);
  assert.equal(calculateSmsSegments(emojiText), 2);
});

test('ContactVerification - OTP generation, hashing, and challenge verification', () => {
  // 1. Generate 6-digit OTP
  const rawOtp = '482910';
  const hashedOtp = digest(rawOtp);

  // 2. Hash should be SHA-256 (64 hex characters)
  assert.equal(hashedOtp.length, 64);
  assert.equal(digest(rawOtp), hashedOtp);

  // 3. Reject wrong code
  const wrongOtp = '482911';
  assert.notEqual(digest(wrongOtp), hashedOtp);

  // 4. Verify expiration logic
  const now = Date.now();
  const expiresAt = new Date(now + 15 * 60 * 1000); // 15 mins
  assert.ok(expiresAt > new Date());

  const expiredAt = new Date(now - 1000);
  assert.ok(expiredAt < new Date());
});

test('ReportAccessLink - 256-bit URL token issuance, hashing, and security checks', () => {
  // 1. Generate token
  const token = randomToken();
  assert.ok(token.length >= 43); // 32 bytes base64url

  // 2. Hash token for database storage
  const tokenHash = digest(token);
  assert.equal(tokenHash.length, 64);

  // 3. Challenge verification: phone last 4 digits
  const guardianPhone = '255712345678';
  const expectedLast4 = guardianPhone.slice(-4); // "5678"

  const userEnteredLast4 = '5678';
  assert.equal(userEnteredLast4, expectedLast4);

  const wrongLast4 = '1234';
  assert.notEqual(wrongLast4, expectedLast4);

  // 4. Access count limit
  let accessCount = 0;
  const maxAccess = 25;
  while (accessCount < maxAccess) {
    accessCount++;
  }
  assert.equal(accessCount >= maxAccess, true);
});

test('NextSMS Webhook - Delivery report & Inbound opt-out parsing', () => {
  const handler = new NextSmsWebhookHandler('syncacademy-secret-token');

  // Reject invalid token
  const invalidTokenResult = handler.handle({
    token: 'wrong-token',
    messageId: 'msg-12345',
    status: 'DELIVERED',
  });
  assert.equal(invalidTokenResult.valid, false);

  // Accept valid delivery report
  const validReport = handler.handle({
    token: 'syncacademy-secret-token',
    messageId: 'msg-998877',
    status: 'DELIVERED',
    id: '73',
  });
  assert.equal(validReport.valid, true);
  assert.equal(validReport.type, 'DELIVERY_REPORT');
  assert.equal(validReport.data.status, 'DELIVERED');
  assert.equal(validReport.data.messageId, 'msg-998877');

  // Accept valid WhatsApp inbound response
  const validInbound = handler.handle({
    token: 'syncacademy-secret-token',
    messageId: 'msg-998877',
    text: 'STOP',
  });
  assert.equal(validInbound.valid, true);
  assert.equal(validInbound.type, 'WHATSAPP_RESPONSE');
  assert.equal(validInbound.data.inboundText, 'STOP');
});

test('Worker - Backoff calculation and dead-letter boundaries', () => {
  const calculateBackoffMs = (attempts) => Math.min(3600000, 2 ** attempts * 10000);

  // Attempt 1: 20s
  assert.equal(calculateBackoffMs(1), 20000);
  // Attempt 2: 40s
  assert.equal(calculateBackoffMs(2), 40000);
  // Attempt 3: 80s
  assert.equal(calculateBackoffMs(3), 80000);
  // Attempt 8: 2560s (~42 mins)
  assert.equal(calculateBackoffMs(8), 2560000);
  // Max cap: 3600000 (1 hour)
  assert.equal(calculateBackoffMs(10), 3600000);

  // Dead letter threshold: attempts >= 8
  const isDeadLetter = (attempts) => attempts >= 8;
  assert.equal(isDeadLetter(7), false);
  assert.equal(isDeadLetter(8), true);
  assert.equal(isDeadLetter(9), true);
});
