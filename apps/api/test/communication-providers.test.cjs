const test = require('node:test');
const assert = require('node:assert/strict');

// Import compiled communication modules from dist
const { 
  NextSmsProvider, 
  NextWhatsAppProvider, 
  MockCommunicationProvider, 
  NextSmsWebhookHandler 
} = require('../dist/communication');

test('NextSmsProvider - phone number normalization', () => {
  assert.equal(NextSmsProvider.normalizePhoneNumber('0712345678'), '255712345678');
  assert.equal(NextSmsProvider.normalizePhoneNumber('+255712345678'), '255712345678');
  assert.equal(NextSmsProvider.normalizePhoneNumber('255712345678'), '255712345678');
  assert.equal(NextSmsProvider.normalizePhoneNumber('+255 767 123 456'), '255767123456');
  assert.equal(NextSmsProvider.normalizePhoneNumber('0655-987-654'), '255655987654');
});

test('NextSmsProvider - validates Tanzanian mobile network prefixes', () => {
  // Vodacom
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255742123456'), true);
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255754123456'), true);
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255767123456'), true);
  // Airtel
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255682123456'), true);
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255692123456'), true);
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255784123456'), true);
  // Tigo / Yas
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255655123456'), true);
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255677123456'), true);
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255713123456'), true);
  // Halotel
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255621123456'), true);

  // Invalid numbers
  assert.equal(NextSmsProvider.isValidTanzanianNumber('254712345678'), false); // Kenya
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255812345678'), false); // Invalid prefix
  assert.equal(NextSmsProvider.isValidTanzanianNumber('255712345'), false); // Too short
  assert.equal(NextSmsProvider.isValidTanzanianNumber('25571234567890'), false); // Too long
});

test('NextSmsProvider - character count and segment calculation', () => {
  // Standard GSM-7
  const shortText = 'Habari, matokeo ya muhula wa kwanza yapo tayari.';
  const calcShort = NextSmsProvider.calculateSegments(shortText);
  assert.equal(calcShort.isUcs2, false);
  assert.equal(calcShort.segments, 1);

  // 160 GSM chars = 1 segment
  const text160 = 'A'.repeat(160);
  assert.equal(NextSmsProvider.calculateSegments(text160).segments, 1);

  // 161 GSM chars = 2 segments (153 chars per part)
  const text161 = 'A'.repeat(161);
  assert.equal(NextSmsProvider.calculateSegments(text161).segments, 2);

  // 306 GSM chars = 2 segments (153 * 2)
  const text306 = 'A'.repeat(306);
  assert.equal(NextSmsProvider.calculateSegments(text306).segments, 2);

  // 307 GSM chars = 3 segments
  const text307 = 'A'.repeat(307);
  assert.equal(NextSmsProvider.calculateSegments(text307).segments, 3);

  // UCS-2 (containing emoji)
  const emojiText = 'Matokeo yapo tayari 🎓';
  const calcEmoji = NextSmsProvider.calculateSegments(emojiText);
  assert.equal(calcEmoji.isUcs2, true);
  assert.equal(calcEmoji.segments, 1);

  // 71 UCS-2 chars = 2 segments (67 chars per part)
  const textUcs71 = '🎓' + 'B'.repeat(69); // 1 surrogate pair + 69 chars = 71 chars
  assert.equal(NextSmsProvider.calculateSegments(textUcs71).segments, 2);
});

test('NextSmsProvider - authentication header generation', () => {
  const tokenProvider = new NextSmsProvider({ token: 'test-token-123' });
  assert.equal(tokenProvider.getAuthorizationHeader(), 'Bearer test-token-123');

  const basicProvider = new NextSmsProvider({ username: 'sync_user', password: 'sync_password' });
  const expectedBasic = 'Basic ' + Buffer.from('sync_user:sync_password').toString('base64');
  assert.equal(basicProvider.getAuthorizationHeader(), expectedBasic);

  const emptyProvider = new NextSmsProvider({});
  assert.throws(() => emptyProvider.getAuthorizationHeader(), /NextSMS provider requires either token or username\/password/);
});

test('NextSmsProvider - rejects invalid phone numbers without making network calls', async () => {
  const provider = new NextSmsProvider({ token: 'test-token' });
  const result = await provider.send({
    to: 'invalid-number-123',
    text: 'Test message',
  });

  assert.equal(result.status, 'REJECTED');
  assert.equal(result.statusCode, 69);
  assert.equal(result.isRetryable, false);
});

test('NextWhatsAppProvider - formats payload and handles recipients correctly', async () => {
  const provider = new NextWhatsAppProvider({ 
    token: 'test-token',
    defaultSenderId: 'SYNCACADEMY',
    testMode: true,
  });

  // Rejection on invalid numbers
  const invalidResult = await provider.sendTemplate({
    to: ['invalid-phone'],
    template: 'report_card_published_v1',
  });
  assert.equal(invalidResult.status, 'REJECTED');
  assert.equal(invalidResult.statusCode, 69);
  assert.equal(invalidResult.isRetryable, false);
});

test('MockCommunicationProvider - handles SMS, WhatsApp, Email, cost tracking, and balance', async () => {
  const mock = new MockCommunicationProvider();
  assert.equal(mock.balanceTzs, 100000);

  // Send SMS (1 segment = 25 TZS)
  const smsResult = await mock.sendSms({
    to: '0712345678',
    text: 'Taarifa fupi kwa mzazi.',
  });
  assert.equal(smsResult.status, 'DELIVERED');
  assert.equal(smsResult.recipient, '255712345678');
  assert.equal(smsResult.segments, 1);
  assert.equal(smsResult.unitCostTzs, 25);
  assert.equal(mock.balanceTzs, 99975);
  assert.equal(mock.sentSms.length, 1);

  // Send WhatsApp (50 TZS)
  const waResult = await mock.sendTemplate({
    to: '0767123456',
    template: 'report_card_v1',
    attributes: [{ student: 'Baraka', term: 'Term 1' }],
  });
  assert.equal(waResult.status, 'DELIVERED');
  assert.equal(waResult.recipient, '255767123456');
  assert.equal(waResult.unitCostTzs, 50);
  assert.equal(mock.balanceTzs, 99925);
  assert.equal(mock.sentWhatsApp.length, 1);

  // Send Email (0 TZS telecom fee)
  const mailResult = await mock.sendEmail({
    to: 'parent@example.com',
    subject: 'School Report Card',
    text: 'Your report card is ready.',
  });
  assert.equal(mailResult.status, 'DELIVERED');
  assert.equal(mailResult.unitCostTzs, 0);
  assert.equal(mock.sentEmail.length, 1);

  // Simulated failure mode
  mock.forceFail = true;
  mock.failStatus = 'FAILED';
  mock.failStatusCode = 57; // FAILED_NOT_ENOUGH_CREDITS
  const failResult = await mock.sendSms({
    to: '0712345678',
    text: 'Test message',
  });
  assert.equal(failResult.status, 'FAILED');
  assert.equal(failResult.statusCode, 57);
  assert.equal(failResult.isRetryable, false);

  mock.reset();
  assert.equal(mock.sentSms.length, 0);
  assert.equal(mock.balanceTzs, 100000);
});

test('NextSmsWebhookHandler - validates tokens and parses delivery reports and WhatsApp responses', () => {
  const handler = new NextSmsWebhookHandler('secret-webhook-verify-token');

  // Mismatched token
  const invalidToken = handler.handle({
    token: 'wrong-token',
    messageId: '12345',
    status: 'DELIVERED',
  });
  assert.equal(invalidToken.valid, false);
  assert.match(invalidToken.reason, /Invalid or missing webhook verification token/);

  // Missing messageId
  const missingMsgId = handler.handle({
    token: 'secret-webhook-verify-token',
    status: 'DELIVERED',
  });
  assert.equal(missingMsgId.valid, false);
  assert.match(missingMsgId.reason, /Missing messageId/);

  // Valid Delivery Report - DELIVERED (id 73)
  const deliveredReport = handler.handle({
    token: 'secret-webhook-verify-token',
    messageId: '5955619888423744719',
    status: 'DELIVERED',
    id: '73',
  });
  assert.equal(deliveredReport.valid, true);
  assert.equal(deliveredReport.type, 'DELIVERY_REPORT');
  assert.equal(deliveredReport.data?.status, 'DELIVERED');
  assert.equal(deliveredReport.data?.statusCode, 73);

  // Valid Delivery Report - UNDELIVERABLE (id 76)
  const undeliverableReport = handler.handle({
    token: 'secret-webhook-verify-token',
    messageId: '5955619888423744720',
    status: 'UNDELIVERABLE',
    id: '76',
  });
  assert.equal(undeliverableReport.valid, true);
  assert.equal(undeliverableReport.type, 'DELIVERY_REPORT');
  assert.equal(undeliverableReport.data?.status, 'UNDELIVERABLE');

  // Valid Delivery Report - EXPIRED (id 74)
  const expiredReport = handler.handle({
    token: 'secret-webhook-verify-token',
    messageId: '5955619888423744721',
    status: 'EXPIRED',
    id: '74',
  });
  assert.equal(expiredReport.valid, true);
  assert.equal(expiredReport.type, 'DELIVERY_REPORT');
  assert.equal(expiredReport.data?.status, 'EXPIRED');

  // Valid WhatsApp Inbound User Response
  const whatsappResponse = handler.handle({
    token: 'secret-webhook-verify-token',
    messageId: '5955619888423744722',
    response: 'Ahsante, nimepata ripoti ya mwanangu',
    payload: 'report_ack_123',
    text: 'Ahsante, nimepata ripoti ya mwanangu',
  });
  assert.equal(whatsappResponse.valid, true);
  assert.equal(whatsappResponse.type, 'WHATSAPP_RESPONSE');
  assert.equal(whatsappResponse.data?.status, 'READ');
  assert.equal(whatsappResponse.data?.inboundText, 'Ahsante, nimepata ripoti ya mwanangu');
  assert.equal(whatsappResponse.data?.payloadKey, 'report_ack_123');
});

test('Security Gate Logic - Tenant isolation and expiring report links verification', () => {
  // 1. Report link expiration check
  const now = new Date('2026-10-19T12:00:00Z');
  const validLink = {
    id: 'link-1',
    schoolId: 'school-a',
    studentId: 'student-1',
    expiresAt: new Date('2026-10-25T12:00:00Z'),
    revokedAt: null,
    accessCount: 3,
    maxAccessCount: 25,
  };

  const isLinkActive = (link, currentTime) => {
    if (link.revokedAt !== null) return false;
    if (link.expiresAt <= currentTime) return false;
    if (link.accessCount >= link.maxAccessCount) return false;
    return true;
  };

  assert.equal(isLinkActive(validLink, now), true);

  // Expired link
  const expiredLink = { ...validLink, expiresAt: new Date('2026-10-18T12:00:00Z') };
  assert.equal(isLinkActive(expiredLink, now), false);

  // Revoked link
  const revokedLink = { ...validLink, revokedAt: new Date('2026-10-19T10:00:00Z') };
  assert.equal(isLinkActive(revokedLink, now), false);

  // Exceeded access count
  const maxedLink = { ...validLink, accessCount: 25, maxAccessCount: 25 };
  assert.equal(isLinkActive(maxedLink, now), false);

  // 2. Cross-school isolation check
  const verifyTenantAccess = (requestSchoolId, entitySchoolId, userRole) => {
    if (userRole === 'SUPER_ADMIN') return true;
    return requestSchoolId === entitySchoolId;
  };

  assert.equal(verifyTenantAccess('school-a', 'school-a', 'HEAD_TEACHER'), true);
  assert.equal(verifyTenantAccess('school-b', 'school-a', 'HEAD_TEACHER'), false);
  assert.equal(verifyTenantAccess('school-b', 'school-a', 'SUPER_ADMIN'), true);
});
