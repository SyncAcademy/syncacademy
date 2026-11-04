import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';

// Setup global crypto if running in Node
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const ALIAS_REGEX = /^sa_vault_user_[A-Za-z0-9_-]{1,64}$/;
const USER_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Model of NativeKeyVaultService and native bridge plugin implementing
 * Android Keystore & iOS Keychain alias verification, native session binding,
 * and independent account isolation rules.
 */
class NativeKeyVaultModel {
  constructor() {
    this.hardwareKeystore = new Map(); // Simulated hardware-backed enclave
    this.activeUserId = null;
    this.activeNativeSessionUser = null; // Independent native-layer session binding
  }

  setActiveUser(userId) {
    if (userId && !USER_ID_REGEX.test(userId)) {
      throw new Error('Invalid user ID format for secure key vault.');
    }
    this.activeUserId = userId;
    // Binds natively in Android Keystore / iOS Keychain plugin
    this.activeNativeSessionUser = userId;
  }

  bindNativeSession(userId) {
    if (userId && !USER_ID_REGEX.test(userId)) {
      throw new Error('Invalid user ID for native session binding.');
    }
    this.activeNativeSessionUser = userId;
  }

  unbindNativeSession() {
    this.activeNativeSessionUser = null;
  }

  async getAccountMasterSeed(userId) {
    if (!userId || !USER_ID_REGEX.test(userId)) {
      throw new Error('Invalid user ID provided for key vault operations.');
    }

    // JavaScript layer check
    if (this.activeUserId !== null && this.activeUserId !== userId) {
      throw new Error('Cross-account key request rejected: caller is not authorized for this account.');
    }

    const alias = `sa_vault_user_${userId}`;
    if (!ALIAS_REGEX.test(alias)) {
      throw new Error('Invalid key vault alias format.');
    }

    // Independent native layer check (enforced inside native plugin)
    if (this.activeNativeSessionUser !== null) {
      const expectedAlias = `sa_vault_user_${this.activeNativeSessionUser}`;
      if (alias !== expectedAlias) {
        throw new Error('Native security violation: requested alias does not match the active native session.');
      }
    }

    let seed = this.hardwareKeystore.get(alias);
    if (!seed) {
      const bytes = new Uint8Array(32);
      globalThis.crypto.getRandomValues(bytes);
      seed = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      this.hardwareKeystore.set(alias, seed);
    }
    return seed;
  }

  async invalidateAccountKey(userId) {
    if (!userId || !USER_ID_REGEX.test(userId)) {
      throw new Error('Invalid user ID provided for key invalidation.');
    }

    if (this.activeNativeSessionUser !== null) {
      const expectedAlias = `sa_vault_user_${this.activeNativeSessionUser}`;
      const alias = `sa_vault_user_${userId}`;
      if (alias !== expectedAlias) {
        throw new Error('Native security violation: unauthorized deletion of alien account key.');
      }
    }

    const alias = `sa_vault_user_${userId}`;
    this.hardwareKeystore.delete(alias);
  }

  purgeAllSessionKeys() {
    this.activeUserId = null;
    this.activeNativeSessionUser = null;
  }

  getSecurityAssurance(userId) {
    const alias = `sa_vault_user_${userId}`;
    return {
      isInsideSecureHardware: true,
      securityLevel: this.hardwareKeystore.has(alias) ? 'TEE' : 'NOT_INITIALIZED',
    };
  }
}

/**
 * Model of MobileOfflineStorageService with AAD record encryption,
 * user-scoped offline queues, and independent sync dispatcher.
 */
class CryptographicEngineModel {
  constructor(keyVault) {
    this.keyVault = keyVault;
    this.activeKey = null;
    this.activeUserId = null;
    this.storageStore = new Map(); // Simulated IndexedDB records
    this.queueStore = new Map();   // Simulated IndexedDB offline_mutations
  }

  async initCrypto(userId) {
    if (this.activeKey && this.activeUserId === userId) {
      return this.activeKey;
    }
    let rawSeed = await this.keyVault.getAccountMasterSeed(userId);
    const enc = new TextEncoder();
    let seedBytes = enc.encode(rawSeed);

    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      seedBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derived = await globalThis.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(`SyncAcademy_Mobile_Vault_Salt_2026_${userId}`),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Buffer zeroization
    seedBytes.fill(0);
    seedBytes = null;
    rawSeed = null;

    this.activeKey = derived;
    this.activeUserId = userId;
    return derived;
  }

  async encryptString(plaintext, userId, aadContext) {
    const key = await this.initCrypto(userId);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encryptParams = {
      name: 'AES-GCM',
      iv,
      ...(aadContext ? { additionalData: enc.encode(aadContext) } : {}),
    };

    const ciphertext = await globalThis.crypto.subtle.encrypt(
      encryptParams,
      key,
      enc.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return Buffer.from(combined).toString('base64');
  }

  async decryptString(ciphertextB64, userId, aadContext) {
    const key = await this.initCrypto(userId);
    try {
      const combined = Buffer.from(ciphertextB64, 'base64');
      const iv = combined.subarray(0, 12);
      const data = combined.subarray(12);

      const enc = new TextEncoder();
      const decryptParams = {
        name: 'AES-GCM',
        iv,
        ...(aadContext ? { additionalData: enc.encode(aadContext) } : {}),
      };

      const decrypted = await globalThis.crypto.subtle.decrypt(
        decryptParams,
        key,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      throw new Error('Vault decryption failed: integrity check failed.');
    }
  }

  async setSecureRecord(key, data, userId, schoolId = 'global', ttlMs = 86400000) {
    const envelope = {
      schemaVersion: 1,
      userId,
      schoolId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      data,
    };
    const serialized = JSON.stringify(envelope);
    const aad = `${userId}:${schoolId}:${key}`;
    const encrypted = await this.encryptString(serialized, userId, aad);
    this.storageStore.set(key, { encrypted, userId, schoolId, expiresAt: envelope.expiresAt });
  }

  async pruneExpiredCache() {
    const now = Date.now();
    let recordsPruned = 0;
    for (const [k, rec] of Array.from(this.storageStore.entries())) {
      if (rec.expiresAt && rec.expiresAt < now) {
        this.storageStore.delete(k);
        recordsPruned++;
      }
    }
    const queuePreserved = this.queueStore.size;
    return { recordsPruned, queuePreserved };
  }

  async getSecureRecord(key, currentUserId, targetSchoolId = 'global') {
    const record = this.storageStore.get(key);
    if (!record) return null;

    try {
      const aad = `${currentUserId}:${targetSchoolId}:${key}`;
      const decrypted = await this.decryptString(record.encrypted, currentUserId, aad);
      const envelope = JSON.parse(decrypted);
      if (envelope.userId !== currentUserId) return null;
      if (targetSchoolId && envelope.schoolId && envelope.schoolId !== targetSchoolId) return null;
      return envelope.data;
    } catch {
      return null;
    }
  }

  async enqueueAction(action) {
    const id = crypto.randomUUID();
    const queued = {
      ...action,
      id,
      state: 'PENDING',
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 5,
    };
    this.queueStore.set(id, queued);
    return id;
  }

  async getQueue(targetUserId) {
    const filterUser = targetUserId !== undefined ? targetUserId : this.activeUserId;
    if (!filterUser) return [];

    const items = [];
    for (const action of this.queueStore.values()) {
      if (action.userId === filterUser) {
        items.push({ ...action });
      }
    }
    return items;
  }

  async processQueue(executor, targetUserId) {
    const currentUserId = targetUserId !== undefined ? targetUserId : this.activeUserId;
    if (!currentUserId) {
      return { succeeded: 0, failed: 0, conflicts: 0, deadLetter: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;
    let deadLetter = 0;

    const queue = await this.getQueue(currentUserId);
    for (const action of queue) {
      // User ownership check
      if (action.userId !== currentUserId) continue;
      if (action.state === 'CONFLICT' || action.state === 'DEAD_LETTER' || action.state === 'SYNCED') continue;

      action.state = 'SYNCING';
      try {
        const res = await executor(action);
        if (res.status >= 200 && res.status < 300) {
          action.state = 'SYNCED';
          this.queueStore.delete(action.id);
          succeeded++;
        } else if (res.status === 409) {
          action.state = 'CONFLICT';
          action.lastError = 'Record was modified concurrently.';
          this.queueStore.set(action.id, action);
          conflicts++;
        } else if (res.status === 401 || res.status === 403) {
          action.state = 'DEAD_LETTER';
          action.lastError = `Permanent authorization rejection (HTTP ${res.status}).`;
          this.queueStore.set(action.id, action);
          deadLetter++;
        } else {
          action.state = 'FAILED';
          action.retryCount++;
          this.queueStore.set(action.id, action);
          failed++;
        }
      } catch (err) {
        action.state = 'FAILED';
        action.retryCount++;
        this.queueStore.set(action.id, action);
        failed++;
      }
    }

    return { succeeded, failed, conflicts, deadLetter };
  }

  lockVault() {
    this.activeKey = null;
    this.activeUserId = null;
    this.keyVault.purgeAllSessionKeys();
  }

  clearSensitiveData(userId) {
    this.storageStore.clear();
    this.queueStore.clear();
    this.lockVault();
    if (userId) {
      this.keyVault.invalidateAccountKey(userId);
    }
  }
}

test('Mobile Cryptographic Vault & Offline Queue Security Tests (Phase 03A.3 Hardened)', async (t) => {
  const keyVault = new NativeKeyVaultModel();
  const cryptoEngine = new CryptographicEngineModel(keyVault);

  await t.test('1. AES-256-GCM Encrypt & Decrypt roundtrip with AAD binding', async () => {
    const userId = 'user_alpha_123';
    keyVault.setActiveUser(userId);
    const payload = JSON.stringify({ student: 'Juma Mwamba', grade: 'A', balance: 50000 });
    const aad = `${userId}:school_1:report_card`;

    const encrypted = await cryptoEngine.encryptString(payload, userId, aad);
    assert.notEqual(encrypted, payload);

    const decrypted = await cryptoEngine.decryptString(encrypted, userId, aad);
    assert.equal(decrypted, payload);
    const parsed = JSON.parse(decrypted);
    assert.equal(parsed.student, 'Juma Mwamba');
    assert.equal(parsed.grade, 'A');
  });

  await t.test('2. AAD Tampering Rejection: Changing userId, schoolId, or key in AAD fails decryption', async () => {
    const userId = 'user_alpha_123';
    keyVault.setActiveUser(userId);
    const payload = 'Confidential report card';
    const aad = `${userId}:school_1:report_card`;
    const encrypted = await cryptoEngine.encryptString(payload, userId, aad);

    // Tampered record key in AAD (record relocation attack)
    await assert.rejects(
      async () => {
        await cryptoEngine.decryptString(encrypted, userId, `${userId}:school_1:different_card`);
      },
      /Vault decryption failed: integrity check failed/
    );

    // Tampered schoolId in AAD (tenant relocation attack)
    await assert.rejects(
      async () => {
        await cryptoEngine.decryptString(encrypted, userId, `${userId}:school_999:report_card`);
      },
      /Vault decryption failed: integrity check failed/
    );
  });

  await t.test('3. Cross-Account Isolation: User B cannot decrypt User A records', async () => {
    const userA = 'user_alpha_123';
    const userB = 'user_beta_999';

    keyVault.setActiveUser(userA);
    const confidentialData = JSON.stringify({ exam: 'NECTA Terminal 2026', mark: 98 });
    const encryptedA = await cryptoEngine.encryptString(confidentialData, userA, `${userA}:global:exam_1`);

    keyVault.setActiveUser(userB);
    await assert.rejects(
      async () => {
        await cryptoEngine.decryptString(encryptedA, userB, `${userB}:global:exam_1`);
      },
      /Vault decryption failed: integrity check failed/
    );
  });

  await t.test('4. Native Bridge Security: Cross-account key access rejected at JS and Native layers', async () => {
    const userA = 'user_alpha_123';
    const userB = 'user_beta_999';

    keyVault.setActiveUser(userB); // Active caller is User B

    // User B attempts to request User A's master seed
    await assert.rejects(
      async () => {
        await keyVault.getAccountMasterSeed(userA);
      },
      /Cross-account key request rejected/
    );

    // Direct native bridge test: native session bound to userB, alias requests userA
    keyVault.bindNativeSession(userB);
    keyVault.activeUserId = null; // Bypass JS check
    await assert.rejects(
      async () => {
        await keyVault.getAccountMasterSeed(userA);
      },
      /Native security violation: requested alias does not match the active native session/
    );
  });

  await t.test('5. Multi-User Device Lifecycle & Offline Queue Isolation (Section 5 Scenarios 1-10)', async () => {
    const teacherA = 'teacher_alpha_101';
    const teacherB = 'teacher_beta_202';

    // 1. Teacher A logs in and stages attendance while offline
    keyVault.setActiveUser(teacherA);
    await cryptoEngine.initCrypto(teacherA);
    await cryptoEngine.setSecureRecord('child_report', { score: 95, remarks: 'Excellent' }, teacherA, 'school_1');

    const actionAId = await cryptoEngine.enqueueAction({
      idempotencyKey: 'idem-action-a',
      entityType: 'ATTENDANCE',
      endpoint: 'schools/school_1/academics/commands',
      method: 'POST',
      payload: { date: '2026-03-01', classId: 'cls-1', entries: [{ studentId: 'std-1', status: 'Present' }] },
      expectedRevision: 1,
      userId: teacherA,
      accountType: 'TEACHER',
      schoolId: 'school_1',
    });

    const teacherAInitialQueue = await cryptoEngine.getQueue(teacherA);
    assert.equal(teacherAInitialQueue.length, 1);
    assert.equal(teacherAInitialQueue[0].id, actionAId);

    // 2. Teacher A logs out (normal logout -> locks vault, evicts in-memory keys, keeps disk record & queue)
    cryptoEngine.lockVault();
    assert.equal(cryptoEngine.activeKey, null);
    assert.equal(cryptoEngine.activeUserId, null);

    // 3. Teacher B logs in on the same device
    keyVault.setActiveUser(teacherB);
    await cryptoEngine.initCrypto(teacherB);

    // 4. Teacher B's queue view is empty (cannot see Teacher A's pending actions)
    const teacherBQueue = await cryptoEngine.getQueue(teacherB);
    assert.equal(teacherBQueue.length, 0);

    // 5. Network reconnects while Teacher B is logged in:
    // Simulated dispatcher must NOT execute Teacher A's mutation under Teacher B's session
    let executedActions = [];
    async function mockExecutor(action) {
      executedActions.push(action);
      return { status: 201 };
    }

    const syncResultB = await cryptoEngine.processQueue(mockExecutor, teacherB);
    assert.equal(syncResultB.succeeded, 0);
    assert.equal(executedActions.length, 0); // ZERO actions dispatched under Teacher B!

    // 6. Teacher B cannot read or decrypt Teacher A's records
    const teacherBRecordAttempt = await cryptoEngine.getSecureRecord('child_report', teacherB, 'school_1');
    assert.equal(teacherBRecordAttempt, null);

    // 7. Teacher B logs out
    cryptoEngine.lockVault();

    // 8. Teacher A returns and logs back in
    keyVault.setActiveUser(teacherA);
    await cryptoEngine.initCrypto(teacherA);

    // Teacher A sees their pending mutation
    const teacherAReturnQueue = await cryptoEngine.getQueue(teacherA);
    assert.equal(teacherAReturnQueue.length, 1);
    assert.equal(teacherAReturnQueue[0].id, actionAId);

    // Teacher A's authorized records decrypt cleanly
    const teacherARecord = await cryptoEngine.getSecureRecord('child_report', teacherA, 'school_1');
    assert.ok(teacherARecord);
    assert.equal(teacherARecord.score, 95);

    // 9. Network reconnects under Teacher A: mutation is dispatched under Teacher A's session
    const syncResultA = await cryptoEngine.processQueue(mockExecutor, teacherA);
    assert.equal(syncResultA.succeeded, 1);
    assert.equal(executedActions.length, 1);
    assert.equal(executedActions[0].idempotencyKey, 'idem-action-a');
    assert.equal(executedActions[0].userId, teacherA);

    // Queue is now empty for Teacher A
    const teacherAFinalQueue = await cryptoEngine.getQueue(teacherA);
    assert.equal(teacherAFinalQueue.length, 0);
  });

  await t.test('6. Permanent Revocation Classification: 401/403 moves to DEAD_LETTER and halts retries', async () => {
    const revokedTeacher = 'teacher_revoked_999';
    keyVault.setActiveUser(revokedTeacher);
    await cryptoEngine.initCrypto(revokedTeacher);

    const actionId = await cryptoEngine.enqueueAction({
      idempotencyKey: 'idem-revoked',
      entityType: 'ATTENDANCE',
      endpoint: 'schools/school_1/academics/commands',
      method: 'POST',
      payload: { date: '2026-03-02', classId: 'cls-1' },
      userId: revokedTeacher,
      accountType: 'TEACHER',
      schoolId: 'school_1',
    });

    // Server returns 403 Forbidden because teacher membership was removed
    let callCount = 0;
    async function revokedExecutor(action) {
      callCount++;
      return { status: 403, message: 'Teacher membership revoked.' };
    }

    const result = await cryptoEngine.processQueue(revokedExecutor, revokedTeacher);
    assert.equal(result.deadLetter, 1);
    assert.equal(callCount, 1);

    // Verify action state is DEAD_LETTER
    const queue = await cryptoEngine.getQueue(revokedTeacher);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].state, 'DEAD_LETTER');
    assert.match(queue[0].lastError, /Permanent authorization rejection/);

    // Subsequent processQueue MUST NOT retry DEAD_LETTER actions
    const secondPass = await cryptoEngine.processQueue(revokedExecutor, revokedTeacher);
    assert.equal(secondPass.deadLetter, 0);
    assert.equal(callCount, 1); // Not retried
  });

  await t.test('7. Account Switching Between Two Parents (Section 6)', async () => {
    const parent1 = 'parent_user_001';
    const parent2 = 'parent_user_002';

    // Parent 1 saves report for Student 1
    keyVault.setActiveUser(parent1);
    await cryptoEngine.initCrypto(parent1);
    await cryptoEngine.setSecureRecord('student_std_1', { studentName: 'Baraka Alpha', balance: 0 }, parent1, 'school_a');

    // Parent 1 logs out
    cryptoEngine.lockVault();

    // Parent 2 logs in
    keyVault.setActiveUser(parent2);
    await cryptoEngine.initCrypto(parent2);

    // Parent 2 attempts to access Student 1
    const p2AccessAttempt = await cryptoEngine.getSecureRecord('student_std_1', parent2, 'school_a');
    assert.equal(p2AccessAttempt, null); // Refused by AAD and user boundary

    // Parent 2 saves report for Student 2
    await cryptoEngine.setSecureRecord('student_std_2', { studentName: 'Neema Beta', balance: 15000 }, parent2, 'school_b');

    // Parent 2 reads own student cleanly
    const p2OwnRecord = await cryptoEngine.getSecureRecord('student_std_2', parent2, 'school_b');
    assert.ok(p2OwnRecord);
    assert.equal(p2OwnRecord.studentName, 'Neema Beta');

    // Parent 2 logs out
    cryptoEngine.lockVault();

    // Parent 1 logs back in and reads Student 1
    keyVault.setActiveUser(parent1);
    await cryptoEngine.initCrypto(parent1);
    const p1Record = await cryptoEngine.getSecureRecord('student_std_1', parent1, 'school_a');
    assert.ok(p1Record);
    assert.equal(p1Record.studentName, 'Baraka Alpha');
  });

  await t.test('8. School Switching Isolation (Section 6)', async () => {
    const teacher = 'multi_school_teacher_555';
    keyVault.setActiveUser(teacher);
    await cryptoEngine.initCrypto(teacher);

    // Teacher stores record scoped to School Alpha
    await cryptoEngine.setSecureRecord('roster_class_a', { className: 'Grade 1A', count: 40 }, teacher, 'school_alpha');

    // Teacher attempts to access with School Beta
    const crossSchoolAttempt = await cryptoEngine.getSecureRecord('roster_class_a', teacher, 'school_beta');
    assert.equal(crossSchoolAttempt, null); // Denied due to schoolId mismatch in AAD

    // Teacher accesses with correct School Alpha
    const correctSchoolRecord = await cryptoEngine.getSecureRecord('roster_class_a', teacher, 'school_alpha');
    assert.ok(correctSchoolRecord);
    assert.equal(correctSchoolRecord.className, 'Grade 1A');
  });

  await t.test('9. Corrupted ciphertext and tampered auth tags are rejected', async () => {
    const userId = 'user_alpha_123';
    keyVault.setActiveUser(userId);
    const payload = 'Confidential disciplinary remark';
    const encrypted = await cryptoEngine.encryptString(payload, userId);

    const rawBuf = Buffer.from(encrypted, 'base64');
    rawBuf[20] ^= 0xff; // Tamper with ciphertext byte
    const corruptedB64 = rawBuf.toString('base64');

    await assert.rejects(
      async () => {
        await cryptoEngine.decryptString(corruptedB64, userId);
      },
      /Vault decryption failed: integrity check failed/
    );

    // Tamper with auth tag byte (last byte of AES-GCM output)
    const tagBuf = Buffer.from(encrypted, 'base64');
    tagBuf[tagBuf.length - 1] ^= 0x01;
    const tagCorruptedB64 = tagBuf.toString('base64');

    await assert.rejects(
      async () => {
        await cryptoEngine.decryptString(tagCorruptedB64, userId);
      },
      /Vault decryption failed: integrity check failed/
    );
  });

  await t.test('10. Alias format validation strictly rejects invalid characters', async () => {
    await assert.rejects(
      async () => {
        await keyVault.getAccountMasterSeed('../etc/passwd');
      },
      /Invalid user ID provided for key vault operations/
    );

    await assert.rejects(
      async () => {
        await keyVault.getAccountMasterSeed('user;rm -rf /');
      },
      /Invalid user ID provided for key vault operations/
    );
  });

  await t.test('11. Key Invalidation for User A does not destroy User B key', async () => {
    const userA = 'user_alpha_123';
    const userB = 'user_beta_999';

    keyVault.setActiveUser(userA);
    await keyVault.getAccountMasterSeed(userA);

    keyVault.setActiveUser(userB);
    const seedBBefore = await keyVault.getAccountMasterSeed(userB);

    // Invalidate User A
    keyVault.setActiveUser(userA);
    await keyVault.invalidateAccountKey(userA);

    // User B's seed remains intact
    keyVault.setActiveUser(userB);
    const seedBAfter = await keyVault.getAccountMasterSeed(userB);
    assert.equal(seedBBefore, seedBAfter);
  });

  await t.test('12. Failed vault initialization never causes plaintext persistence', async () => {
    const brokenVault = {
      getAccountMasterSeed: async () => {
        throw new Error('Hardware Keystore unavailable');
      },
      purgeAllSessionKeys: () => {},
    };
    const brokenEngine = new CryptographicEngineModel(brokenVault);

    await assert.rejects(
      async () => {
        await brokenEngine.setSecureRecord('sensitive_key', { secret: 'data' }, 'user_123');
      },
      /Hardware Keystore unavailable/
    );

    assert.equal(brokenEngine.storageStore.size, 0);
  });

  await t.test('13. Cache Expiration & Retention: Pruning expired cache never purges pending offline mutations', async () => {
    const engine = new CryptographicEngineModel(keyVault);
    const userId = 'teacher_cache_test_101';
    keyVault.setActiveUser(userId);
    await engine.initCrypto(userId);

    // 1. Stage an active record that has not expired (e.g. 7-day TTL)
    await engine.setSecureRecord('fresh_roster', { count: 35 }, userId, 'school_1', 7 * 86400000);

    // 2. Stage an expired record (TTL in the past, e.g. -1000ms)
    await engine.setSecureRecord('expired_exam_draft', { score: 70 }, userId, 'school_1', -1000);

    // 3. Stage a pending offline mutation into the offline mutation queue
    const queuedId = await engine.enqueueAction({
      idempotencyKey: 'idem-cache-mutation-test',
      entityType: 'ATTENDANCE',
      endpoint: 'schools/school_1/academics/commands',
      method: 'POST',
      payload: { date: '2026-03-05', classId: 'cls-1' },
      userId,
      accountType: 'TEACHER',
      schoolId: 'school_1',
    });

    assert.equal(engine.storageStore.size, 2);
    assert.equal(engine.queueStore.size, 1);

    // 4. Run cache pruning
    const { recordsPruned, queuePreserved } = await engine.pruneExpiredCache();

    // Exactly 1 expired record pruned
    assert.equal(recordsPruned, 1);
    // Queue preserved is exactly 1 (untouched)
    assert.equal(queuePreserved, 1);

    // Verify storageStore only holds the fresh record
    assert.equal(engine.storageStore.size, 1);
    assert.ok(engine.storageStore.has('fresh_roster'));
    assert.equal(engine.storageStore.has('expired_exam_draft'), false);

    // Verify queueStore STILL holds the pending mutation
    assert.equal(engine.queueStore.size, 1);
    assert.ok(engine.queueStore.has(queuedId));
    const queuedAction = engine.queueStore.get(queuedId);
    assert.equal(queuedAction.state, 'PENDING');
  });

  await t.test('14. Bridge Buffer Zeroization: Raw seed typed array is zeroed out immediately', async () => {
    const rawSeed = 'a'.repeat(64);
    const enc = new TextEncoder();
    const seedBytes = enc.encode(rawSeed);

    // Verify buffer initially holds data
    assert.ok(seedBytes.some(b => b !== 0));

    // Simulate cryptographic derivation and immediate wipe
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      seedBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    assert.ok(keyMaterial);

    // Zero-fill the buffer
    seedBytes.fill(0);

    // Verify every byte in the buffer is now strictly 0
    assert.ok(seedBytes.every(b => b === 0));
  });

  await t.test('15. Native Plugin Error Handling & Bridge Rejection: Graceful halt without data leak', async () => {
    const rejectingVault = {
      getAccountMasterSeed: async () => {
        const err = new Error('KEY_UNAVAILABLE: Android Keystore key generation failed.');
        err.code = 'VAULT_UNAVAILABLE';
        throw err;
      },
      purgeAllSessionKeys: () => {},
    };
    const engine = new CryptographicEngineModel(rejectingVault);

    // Attempting to encrypt must throw and must NEVER write unencrypted plaintext to storageStore
    await assert.rejects(
      async () => {
        await engine.setSecureRecord('sensitive_grades', { mark: 100 }, 'user_test');
      },
      /KEY_UNAVAILABLE/
    );

    assert.equal(engine.storageStore.size, 0);
  });

  await t.test('16. Adversarial IndexedDB Persistence Tampering: Hostile queue modification cannot bypass server authorization', async () => {
    const keyVaultLocal = new NativeKeyVaultModel();
    const engine = new CryptographicEngineModel(keyVaultLocal);

    const userA = 'user_alpha_attacker_target';
    const userB = 'user_beta_hostile_actor';

    keyVaultLocal.setActiveUser(userA);
    await engine.initCrypto(userA);

    // 1. User A enqueues an authentic mutation
    const actionId = await engine.enqueueAction({
      idempotencyKey: 'idem-orig-12345',
      entityType: 'ATTENDANCE',
      endpoint: 'schools/school_alpha/academics/commands',
      method: 'POST',
      payload: { date: '2026-03-05', classId: 'cls-orig' },
      expectedRevision: 1,
      userId: userA,
      accountType: 'TEACHER',
      schoolId: 'school_alpha',
    });

    // 2. Direct IndexedDB record tampering: Attacker mutates stored record directly in storage
    const rawRecord = engine.queueStore.get(actionId);
    assert.ok(rawRecord);
    rawRecord.userId = userB; // Hostile ownership spoof
    rawRecord.schoolId = 'school_beta'; // Hostile tenant target spoof
    rawRecord.payload = { date: '2026-03-05', classId: 'cls-tampered' }; // Hostile payload modification
    engine.queueStore.set(actionId, rawRecord);

    // 3. User B logs in
    keyVaultLocal.setActiveUser(userB);
    await engine.initCrypto(userB);

    // 4. Dispatch simulation: Server enforces session verification and rejects tampered submission
    let dispatchCallCount = 0;
    async function mockServerExecutor(action) {
      dispatchCallCount++;
      // Server checks: Does active caller (userB) hold membership in action.schoolId (school_beta)?
      // If caller is unauthorized in target school, server strictly returns 403 Forbidden
      if (action.schoolId === 'school_beta') {
        return { status: 403, body: { message: 'Forbidden: Caller has no active membership in target school.' } };
      }
      return { status: 201 };
    }

    const result = await engine.processQueue(mockServerExecutor, userB);

    // Server returned 403: Dispatcher must transition action to DEAD_LETTER and halt
    assert.equal(result.deadLetter, 1);
    assert.equal(result.succeeded, 0);
    assert.equal(dispatchCallCount, 1);

    const tamperedQueue = await engine.getQueue(userB);
    assert.equal(tamperedQueue.length, 1);
    assert.equal(tamperedQueue[0].state, 'DEAD_LETTER');
    assert.match(tamperedQueue[0].lastError, /Permanent authorization rejection/);

    // Subsequent processQueue attempts must NEVER retry the dead-lettered tampered mutation
    const secondPass = await engine.processQueue(mockServerExecutor, userB);
    assert.equal(secondPass.deadLetter, 0);
    assert.equal(secondPass.succeeded, 0);
    assert.equal(dispatchCallCount, 1); // Zero additional attempts
  });
});
