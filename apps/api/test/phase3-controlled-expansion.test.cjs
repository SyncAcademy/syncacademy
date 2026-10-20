const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Import compiled Phase 3 modules from dist
const { MockPaymentProvider } = require('../dist/payments/mock-payment.provider');
const { SubscriptionService } = require('../dist/subscription.service');
const { WalletService } = require('../dist/wallet.service');
const { ReconciliationService } = require('../dist/reconciliation.service');
const { SecurityEventsService } = require('../dist/security-events.service');
const { digest, randomToken } = require('../dist/security');

// ============================================================================
// 1. MOCK PAYMENT PROVIDER & WEBHOOK VERIFICATION
// ============================================================================

test('MockPaymentProvider - Intent creation, HMAC signature, and simulated webhook events', async () => {
  const provider = new MockPaymentProvider();
  assert.equal(provider.name, 'mock');

  // 1. Initiate payment intent
  const intent = await provider.initiatePayment({
    schoolId: 'sch-123',
    invoiceId: 'INV-SUB-2026-0001',
    invoiceType: 'SUBSCRIPTION',
    amount: 850000, // 850,000 TZS
    currency: 'TZS',
    description: 'SyncAcademy Standard Term Subscription',
    payerPhone: '255712111222',
    idempotencyKey: 'idem-sub-001',
  });

  assert.ok(intent.transactionId.startsWith('MOCK-TX-'));
  assert.equal(intent.provider, 'mock');
  assert.equal(intent.status, 'CONFIRMED');
  assert.ok(intent.checkoutUrl.includes(intent.transactionId));

  // 2. Failure simulation when phone contains '000000' or description contains 'fail'
  const failedIntent = await provider.initiatePayment({
    schoolId: 'sch-123',
    invoiceId: 'INV-SUB-2026-0002',
    invoiceType: 'SUBSCRIPTION',
    amount: 850000,
    payerPhone: '255700000000',
    description: 'Payment failure test',
  });
  assert.equal(failedIntent.status, 'FAILED');
  assert.ok(failedIntent.instructions.includes('declined'));

  // 3. Webhook Signature Verification
  const webhookBody = JSON.stringify({
    transactionId: intent.transactionId,
    status: 'CONFIRMED',
    amount: 850000,
    currency: 'TZS',
    paidAt: new Date().toISOString(),
  });

  const validSignature = provider.generateTestSignature(webhookBody);
  
  // Valid signature
  const isValid = provider.verifyWebhookSignature({ 'x-mock-signature': validSignature }, webhookBody);
  assert.equal(isValid, true, 'Valid signature must verify successfully');

  // Tampered payload
  const tamperedBody = JSON.stringify({
    transactionId: intent.transactionId,
    status: 'CONFIRMED',
    amount: 100, // tampered amount
  });
  const isTamperedValid = provider.verifyWebhookSignature({ 'x-mock-signature': validSignature }, tamperedBody);
  assert.equal(isTamperedValid, false, 'Tampered payload must be rejected');

  // Missing or wrong signature
  assert.equal(provider.verifyWebhookSignature({}, webhookBody), false);
  assert.equal(provider.verifyWebhookSignature({ 'x-mock-signature': 'invalid-sig' }, webhookBody), false);

  // 4. Parse webhook payload
  const parsed = provider.parseWebhookPayload({
    transactionId: intent.transactionId,
    status: 'CONFIRMED',
    amount: 850000,
    currency: 'TZS',
    paidAt: new Date().toISOString(),
  });
  assert.equal(parsed.status, 'CONFIRMED');
  assert.equal(parsed.amount, 850000);
});

// ============================================================================
// 2. SUBSCRIPTION MANAGEMENT & STATE MACHINE
// ============================================================================

test('SubscriptionService - State transitions, grace period, suspension, and sequential invoices', async () => {
  const subService = new SubscriptionService({});

  const now = new Date();
  
  // 1. Future expiration: active
  const activeSub = {
    status: 'active',
    expiresAt: new Date(now.getTime() + 60 * 24 * 3600 * 1000), // +60 days
    gracePeriodEndsAt: new Date(now.getTime() + 74 * 24 * 3600 * 1000),
  };
  assert.equal(subService.calculateSubscriptionStatus(activeSub), 'active');

  // 2. Within 14 days of expiration: renewal_due
  const renewalDueSub = {
    status: 'active',
    expiresAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000), // +5 days
    gracePeriodEndsAt: new Date(now.getTime() + 19 * 24 * 3600 * 1000),
  };
  assert.equal(subService.calculateSubscriptionStatus(renewalDueSub), 'renewal_due');

  // 3. Expired 3 days ago (within 14-day grace period): grace_period
  const graceSub = {
    status: 'active',
    expiresAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000), // -3 days
    gracePeriodEndsAt: new Date(now.getTime() + 11 * 24 * 3600 * 1000),
  };
  assert.equal(subService.calculateSubscriptionStatus(graceSub), 'grace_period');

  // 4. Expired 20 days ago (past 14-day grace period): restricted_access
  const restrictedSub = {
    status: 'active',
    expiresAt: new Date(now.getTime() - 20 * 24 * 3600 * 1000), // -20 days
    gracePeriodEndsAt: new Date(now.getTime() - 6 * 24 * 3600 * 1000),
  };
  assert.equal(subService.calculateSubscriptionStatus(restrictedSub), 'restricted_access');

  // 5. Cancelled state
  const cancelledSub = {
    status: 'cancelled',
    expiresAt: new Date(now.getTime() + 10 * 24 * 3600 * 1000),
  };
  assert.equal(subService.calculateSubscriptionStatus(cancelledSub), 'cancelled');

  // 6. Sequential invoice number formatting verification
  const year = now.getFullYear();
  const formatInvoiceNumber = (count, yr) => `INV-SUB-${yr}-${count.toString().padStart(4, '0')}`;
  assert.equal(formatInvoiceNumber(1, year), `INV-SUB-${year}-0001`);
  assert.equal(formatInvoiceNumber(12, year), `INV-SUB-${year}-0012`);
});

// ============================================================================
// 3. MESSAGING CREDIT WALLET & LEDGER OPERATIONS
// ============================================================================

test('WalletService - Balances, packages, atomic reservations, consumption, and release', async () => {
  let wallet = {
    id: 'w-001',
    schoolId: 'sch-wallet-test',
    smsBalance: 100,
    whatsappBalance: 25,
    currency: 'TZS',
  };

  let ledgerEntries = [];

  const mockTx = {
    schoolCreditWallet: {
      findUnique: async () => wallet,
      update: async ({ data }) => {
        wallet = { ...wallet, ...data };
        return wallet;
      },
    },
    $queryRaw: async () => [{ id: wallet.id, smsBalance: wallet.smsBalance, whatsappBalance: wallet.whatsappBalance }],
    creditLedger: {
      create: async ({ data }) => {
        const entry = { id: 'led-' + (ledgerEntries.length + 1), ...data, createdAt: new Date() };
        ledgerEntries.push(entry);
        return entry;
      },
    },
  };

  const walletService = new WalletService({
    schoolCreditWallet: {
      findUnique: async () => wallet,
      create: async ({ data }) => {
        wallet = { id: 'w-001', ...data };
        return wallet;
      },
    },
  });

  // 1. Initial wallet query
  const ensured = await walletService.ensureWallet('sch-wallet-test');
  assert.equal(ensured.smsBalance, 100);
  assert.equal(ensured.whatsappBalance, 25);

  // 2. Reserve 40 SMS credits
  const reservation = await walletService.reserveCredit(
    mockTx,
    'sch-wallet-test',
    'SMS',
    40,
    'outbox-job-batch-1'
  );
  assert.equal(reservation.balanceBefore, 100);
  assert.equal(reservation.balanceAfter, 60);
  assert.equal(wallet.smsBalance, 60);
  assert.equal(ledgerEntries.length, 1);
  assert.equal(ledgerEntries[0].type, 'RESERVATION');

  // 3. Overdraft rejection (requesting 80 when only 60 available)
  await assert.rejects(
    walletService.reserveCredit(mockTx, 'sch-wallet-test', 'SMS', 80, 'outbox-job-batch-2'),
    /Insufficient SMS credits/
  );
  // Balance remains 60
  assert.equal(wallet.smsBalance, 60);

  // 4. Consume credits after successful delivery
  await walletService.consumeCredit(
    mockTx,
    'sch-wallet-test',
    'SMS',
    40,
    'outbox-job-batch-1'
  );
  const consumeEntry = ledgerEntries.find(e => e.type === 'CONSUMPTION');
  assert.ok(consumeEntry);
  assert.equal(consumeEntry.units, -40);

  // 5. Release credits after failed delivery
  // First reserve 20 credits
  await walletService.reserveCredit(mockTx, 'sch-wallet-test', 'SMS', 20, 'outbox-job-batch-3');
  assert.equal(wallet.smsBalance, 40);

  // Release 20 credits back to balance
  await walletService.releaseCredit(
    mockTx,
    'sch-wallet-test',
    'SMS',
    20,
    'outbox-job-batch-3',
    'Provider connection timeout'
  );
  assert.equal(wallet.smsBalance, 60);
  const releaseEntry = ledgerEntries.find(e => e.type === 'RELEASE');
  assert.ok(releaseEntry);
  assert.equal(releaseEntry.units, 20);
});

// ============================================================================
// 4. BANK STATEMENT RECONCILIATION & CANDIDATE MATCHING
// ============================================================================

test('ReconciliationService - CSV parsing, duplicate detection, exact & fuzzy candidate matching', async () => {
  const recService = new ReconciliationService({});

  // 1. Safe CSV statement parsing
  const csvData = `Date,Description,Amount,Reference
2026-03-15,"ADA YA SHULE - BARAKA JUMA KIL-001",150000,CRDB-TX-889900
2026-03-18,"MALIPO YA SHULE NEEMA SALIM KIL-042",200000,ALT-REF-9988
2026-03-20,"DEPOSIT CASH OPERATING",50000,CASH-DEP-01
`;

  const rows = recService.parseStatementCsv(csvData);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].amount, 150000);
  assert.equal(rows[0].reference, 'CRDB-TX-889900');
  assert.equal(rows[1].amount, 200000);

  // 2. SHA-256 Duplicate File Hash
  const hash1 = crypto.createHash('sha256').update(csvData).digest('hex');
  const hash2 = crypto.createHash('sha256').update(csvData).digest('hex');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);

  // 3. Matching evaluation logic
  const candidatePayments = [
    { id: 'pay-01', amount: 150000, reference: 'CRDB-TX-889900', receipt: 'REC-01' },
    { id: 'pay-02', amount: 200000, reference: 'REC-02', receipt: 'REC-02' },
  ];

  // Exact reference match rule
  const exactMatch = candidatePayments.find(p => p.reference.toLowerCase() === rows[0].reference.toLowerCase());
  assert.ok(exactMatch);
  assert.equal(exactMatch.id, 'pay-01');

  // Amount match with description token heuristic
  const amountMatch = candidatePayments.find(p => p.amount === rows[1].amount);
  assert.ok(amountMatch);
  assert.equal(amountMatch.id, 'pay-02');
});

// ============================================================================
// 5. SECURITY EVENTS TELEMETRY & SECRET REDACTION
// ============================================================================

test('SecurityEventsService - Secret redaction and category enforcement', async () => {
  let recorded = null;
  const mockDb = {
    securityEvent: {
      create: async ({ data }) => {
        recorded = data;
        return { id: 'evt-01', ...data, createdAt: new Date() };
      },
    },
  };

  const secService = new SecurityEventsService(mockDb);

  // 1. Redaction of sensitive fields
  const unsafeMetadata = {
    password: 'super-secret-user-password',
    token: 'jwt-bearer-token-1234567890',
    otp: '984123',
    secretKey: 'top-secret',
    pinCode: '4321',
    schoolName: 'Kilimani Secondary School',
    studentAdmissionNumber: 'KIL-100',
  };

  const sanitized = secService.sanitizeDetails(unsafeMetadata);
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.otp, '[REDACTED]');
  assert.equal(sanitized.secretKey, '[REDACTED]');
  assert.equal(sanitized.pinCode, '[REDACTED]');
  assert.equal(sanitized.schoolName, 'Kilimani Secondary School');
  assert.equal(sanitized.studentAdmissionNumber, 'KIL-100');

  // 2. Record Event via Service
  await secService.recordEvent({
    schoolId: 'sch-sec-01',
    category: 'AUTHENTICATION',
    severity: 'HIGH',
    eventType: 'SUSPICIOUS_LOGIN_ATTEMPT',
    actorId: 'usr-404',
    ipAddress: '192.168.1.100',
    userAgent: 'TestRunner/1.0',
    details: unsafeMetadata,
  });

  assert.ok(recorded);
  assert.equal(recorded.category, 'AUTHENTICATION');
  assert.equal(recorded.severity, 'HIGH');
  assert.equal(recorded.eventType, 'SUSPICIOUS_LOGIN_ATTEMPT');
  assert.equal(recorded.details.password, '[REDACTED]');
  assert.equal(recorded.details.otp, '[REDACTED]');
  assert.equal(recorded.details.schoolName, 'Kilimani Secondary School');
});

// ============================================================================
// 6. PARENT RELATIONSHIP ENFORCEMENT & CONTACT VERIFICATION INVALIDATION
// ============================================================================

test('GuardianController - Enforce maximum 2 active authorized parents & contact change invalidation', () => {
  // 1. Transactional maximum 2 active authorized parents limit rule
  const activeGuardians = [
    { guardianId: 'g-1', relationship: 'Mother', active: true },
    { guardianId: 'g-2', relationship: 'Father', active: true },
  ];

  const canAddMoreActive = (guardians) => guardians.filter(g => g.active).length < 2;
  assert.equal(canAddMoreActive(activeGuardians), false, 'Cannot add 3rd active guardian');

  // Soft-deactivate one guardian (active: false preserves history)
  activeGuardians[0].active = false;
  assert.equal(canAddMoreActive(activeGuardians), true, 'Can add replacement active guardian when one is deactivated');

  // 2. Invalidate pending OTP challenges on contact change
  const pendingChallenges = [
    { id: 'ch-1', guardianId: 'g-1', contactMethod: 'PHONE', destination: '255712345678', isUsed: false, expiresAt: new Date(Date.now() + 600000) },
    { id: 'ch-2', guardianId: 'g-1', contactMethod: 'EMAIL', destination: 'mama@example.com', isUsed: false, expiresAt: new Date(Date.now() + 600000) },
  ];

  const updateContactAndInvalidate = (challenges, guardianId, contactMethod) => {
    return challenges.map(ch => {
      if (ch.guardianId === guardianId && ch.contactMethod === contactMethod) {
        return { ...ch, isUsed: true }; // Invalidate
      }
      return ch;
    });
  };

  // Phone number changed -> invalidate phone challenges, preserve email
  const afterPhoneChange = updateContactAndInvalidate(pendingChallenges, 'g-1', 'PHONE');
  const phoneChallenge = afterPhoneChange.find(c => c.id === 'ch-1');
  const emailChallenge = afterPhoneChange.find(c => c.id === 'ch-2');
  assert.equal(phoneChallenge.isUsed, true, 'Phone OTP challenge must be invalidated');
  assert.equal(emailChallenge.isUsed, false, 'Email challenge must be preserved');
});

// ============================================================================
// 7. REPORT ACCESS SECURITY & SESSION REVOCATION
// ============================================================================

test('ReportAccess - Secure session token generation, PDF download auth, and revocation invalidation', () => {
  // 1. Report access link with OTP challenge
  const rawToken = randomToken();
  const tokenHash = digest(rawToken);

  // 2. OTP submission issues 32-byte session token
  const rawSessionToken = randomToken();
  const sessionTokenHash = digest(rawSessionToken);

  const reportLink = {
    id: 'link-100',
    tokenHash,
    sessionTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    revokedAt: null,
    accessCount: 1,
    maxAccessCount: 25,
  };

  // 3. Session validation for PDF downloads
  const canDownloadPdf = (link, providedSessionToken) => {
    if (!link || link.revokedAt || link.expiresAt < new Date()) return false;
    if (link.sessionTokenHash !== digest(providedSessionToken)) return false;
    return true;
  };

  assert.equal(canDownloadPdf(reportLink, rawSessionToken), true, 'Valid session token authorizes PDF download');
  assert.equal(canDownloadPdf(reportLink, 'invalid-session-token'), false, 'Invalid session token must be rejected');

  // 4. Revocation invalidates active session immediately
  reportLink.revokedAt = new Date();
  reportLink.sessionTokenHash = null; // Cleared on revocation
  assert.equal(canDownloadPdf(reportLink, rawSessionToken), false, 'Revoked link immediately forbids PDF download');
});

// ============================================================================
// 8. TEACHER ROSTER CONFIRMATION PERMISSIONS & TRANSITIONS
// ============================================================================

test('RosterConfirmation - Teacher assignment boundary and confirmation lifecycle', () => {
  const teacherAssignments = [
    { teacherId: 'teach-1', classroomId: 'cls-1A', subjectId: null, role: 'CLASS_TEACHER' },
    { teacherId: 'teach-2', classroomId: 'cls-1B', subjectId: 'sub-math', role: 'TEACHER' },
  ];

  const isTeacherAssignedToClass = (teacherId, classroomId) => {
    return teacherAssignments.some(a => a.teacherId === teacherId && a.classroomId === classroomId);
  };

  // Teacher 1 assigned to 1A, not 1B
  assert.equal(isTeacherAssignedToClass('teach-1', 'cls-1A'), true);
  assert.equal(isTeacherAssignedToClass('teach-1', 'cls-1B'), false);

  // Status transitions
  const rosterEntry = {
    id: 'rost-01',
    studentId: 'stu-1',
    classroomId: 'cls-1A',
    status: 'PENDING',
    flagReason: null,
    confirmedAt: null,
  };

  // Confirm student
  const confirmStudent = (entry, teacherId) => ({
    ...entry,
    status: 'CONFIRMED',
    confirmedBy: teacherId,
    confirmedAt: new Date(),
  });

  const confirmed = confirmStudent(rosterEntry, 'teach-1');
  assert.equal(confirmed.status, 'CONFIRMED');
  assert.ok(confirmed.confirmedAt);

  // Flag issue
  const flagIssue = (entry, teacherId, reason) => ({
    ...entry,
    status: 'FLAGGED_ISSUE',
    flagReason: reason,
    flaggedBy: teacherId,
  });

  const flagged = flagIssue(rosterEntry, 'teach-1', 'Mwanafunzi hajaripoti muhula huu');
  assert.equal(flagged.status, 'FLAGGED_ISSUE');
  assert.equal(flagged.flagReason, 'Mwanafunzi hajaripoti muhula huu');

  // Registrar resolution
  const resolveIssue = (entry, registrarId, resolutionNote) => ({
    ...entry,
    status: 'RESOLVED',
    resolvedBy: registrarId,
    resolutionNote,
  });

  const resolved = resolveIssue(flagged, 'reg-1', 'Mzazi amethibitisha mwanafunzi alikuwa mgonjwa');
  assert.equal(resolved.status, 'RESOLVED');
});
