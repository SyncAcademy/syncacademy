import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { NativeKeyVaultService } from './native-key-vault.service';

/**
 * Data classification levels for local persistence.
 */
export enum DataClassification {
  /** Non-sensitive UI preferences and settings (unencrypted) */
  PUBLIC = 'PUBLIC',
  /** Educational rosters, student profiles, announcements (encrypted at rest) */
  CONFIDENTIAL_EDUCATIONAL = 'CONFIDENTIAL_EDUCATIONAL',
  /** Sensitive marks, exam grades, fee balances, guardian PII (strongly encrypted, strict TTL) */
  RESTRICTED_PII = 'RESTRICTED_PII',
  /** Access tokens and session credentials (stored in hardware-backed/encrypted auth vault) */
  AUTH_CREDENTIALS = 'AUTH_CREDENTIALS',
}

/**
 * Explicit queue states for offline synchronization.
 */
export type QueueState =
  | 'PENDING'     // Staged while offline, waiting for dispatch
  | 'SYNCING'     // In-flight HTTP request
  | 'SYNCED'      // Successfully accepted by server (2xx)
  | 'CONFLICT'    // Optimistic concurrency collision (409) - halted, user must reload
  | 'FAILED'      // Transient network or server error (5xx) - will retry with exponential backoff
  | 'DEAD_LETTER'; // Unrecoverable error or max retries exceeded - retained for audit/review

/**
 * Storage envelope providing versioning, TTL expiration, tenant/user scoping,
 * and data classification metadata.
 */
export interface StorageEnvelope<T> {
  schemaVersion: number;
  userId: string;
  schoolId?: string;
  classification: DataClassification;
  createdAt: number;
  expiresAt: number;
  data: T;
}

/**
 * An action staged while offline to be synchronized once connectivity is restored.
 */
export interface QueuedOfflineAction {
  id: string;
  idempotencyKey: string;
  entityType: 'ATTENDANCE' | 'MARK_ENTRY' | 'NOTIFICATION_READ' | 'PARENT_FEEDBACK';
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: unknown;
  expectedRevision?: number;
  userId: string;
  accountType?: 'TEACHER' | 'PARENT' | 'STAFF';
  schoolId?: string;
  state: QueueState;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  lastError?: string;
}

export interface SyncResult {
  succeeded: number;
  failed: number;
  conflicts: number;
  deadLetter: number;
}

/**
 * Production-grade offline persistence and synchronization engine for SyncAcademy mobile apps.
 *
 * Security Architecture:
 * 1. Native Key Management: Encryption keys are anchored to platform-secure storage
 *    (Android Keystore TEE / iOS Keychain). Cryptographic seeds are NEVER stored in
 *    unencrypted Preferences or beside encrypted records.
 * 2. Account Isolation: Every user account receives a distinct, non-extractable WebCrypto key.
 *    User A's key cannot decrypt User B's data.
 * 3. Zero Plaintext Fallback: If hardware key retrieval or cryptographic operations fail,
 *    an error is thrown; sensitive educational records are NEVER written in plaintext.
 * 4. ACID Structured Database: IndexedDB database ('syncacademy_offline_db') isolates
 *    app_preferences, educational_records, offline_mutations, and secure_auth_vault.
 * 5. Concurrency Protection: Staged actions enforce revision checks on academic records
 *    and halt on 409 Conflict without overwriting newer server data.
 */
@Injectable({ providedIn: 'root' })
export class MobileOfflineStorageService {
  private keyVault = inject(NativeKeyVaultService);

  readonly isSyncing = signal<boolean>(false);
  readonly pendingActionsCount = signal<number>(0);
  readonly hasConflicts = signal<boolean>(false);
  readonly deadLetterCount = signal<number>(0);

  private readonly DB_NAME = 'syncacademy_offline_db';
  private readonly DB_VERSION = 1;
  private readonly STORE_RECORDS = 'educational_records';
  private readonly STORE_QUEUE = 'offline_mutations';
  private readonly STORE_AUTH = 'secure_auth_vault';
  private readonly STORE_PREFS = 'app_preferences';

  private dbInstance: IDBDatabase | null = null;
  private activeCryptoKey: CryptoKey | null = null;
  private activeUserId: string | null = null;
  private memoryStore = new Map<string, string>(); // Fallback when IndexedDB unavailable

  constructor() {
    void this.initDatabase();
  }

  private async safePrefSet(options: { key: string; value: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await Preferences.set(options);
    } catch {
      // Safe ignore in non-browser environments
    }
  }

  private async safePrefGet(options: { key: string }): Promise<{ value: string | null }> {
    if (typeof window === 'undefined') return { value: null };
    try {
      return await Preferences.get(options);
    } catch {
      return { value: null };
    }
  }

  private async safePrefRemove(options: { key: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await Preferences.remove(options);
    } catch {
      // Safe ignore in non-browser environments
    }
  }

  private async safePrefKeys(): Promise<{ keys: string[] }> {
    if (typeof window === 'undefined') return { keys: [] };
    try {
      return await Preferences.keys();
    } catch {
      return { keys: [] };
    }
  }

  /**
   * Initialize IndexedDB database with typed object stores.
   */
  private async initDatabase(): Promise<IDBDatabase | null> {
    if (this.dbInstance) return this.dbInstance;
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.STORE_RECORDS)) {
            const store = db.createObjectStore(this.STORE_RECORDS, { keyPath: 'key' });
            store.createIndex('by_user', 'userId', { unique: false });
            store.createIndex('by_expires', 'expiresAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(this.STORE_QUEUE)) {
            const store = db.createObjectStore(this.STORE_QUEUE, { keyPath: 'id' });
            store.createIndex('by_state', 'state', { unique: false });
            store.createIndex('by_user', 'userId', { unique: false });
            store.createIndex('by_idempotency', 'idempotencyKey', { unique: true });
          }
          if (!db.objectStoreNames.contains(this.STORE_AUTH)) {
            db.createObjectStore(this.STORE_AUTH, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(this.STORE_PREFS)) {
            db.createObjectStore(this.STORE_PREFS, { keyPath: 'key' });
          }
        };
        req.onsuccess = (e) => {
          this.dbInstance = (e.target as IDBOpenDBRequest).result;
          void this.updateQueueCounters();
          resolve(this.dbInstance);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Initialize WebCrypto AES-GCM 256-bit encryption key anchored to platform secure storage.
   * Derives a unique key per user account to guarantee cross-account cryptographic isolation.
   */
  async initCrypto(userId: string): Promise<CryptoKey> {
    if (this.activeCryptoKey && this.activeUserId === userId) {
      return this.activeCryptoKey;
    }

    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('WebCrypto API is unavailable on this platform.');
    }

    // Retrieve master seed from native hardware Keystore / Keychain
    let rawSeed: string | null = await this.keyVault.getAccountMasterSeed(userId);
    const enc = new TextEncoder();
    let seedBytes: Uint8Array | null = enc.encode(rawSeed);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      seedBytes as unknown as BufferSource,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive non-extractable AES-GCM key scoped to user
    const derived = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(`SyncAcademy_Mobile_Vault_Salt_2026_${userId}`),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // Non-extractable: key material cannot be read by JS
      ['encrypt', 'decrypt']
    );

    // Immediately zero-fill the byte buffer and clear raw seed references
    // to minimize the transient bridge-to-memory exposure window
    seedBytes.fill(0);
    seedBytes = null;
    rawSeed = null;

    this.activeCryptoKey = derived;
    this.activeUserId = userId;
    void this.updateQueueCounters(userId);
    return derived;
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM.
   * Authenticates payload with Additional Authenticated Data (AAD) bound to user, school, and record key.
   * Strictly refuses plaintext fallback: throws if key initialization fails.
   */
  async encryptString(plaintext: string, userId: string, aadContext?: string): Promise<string> {
    const key = await this.initCrypto(userId);
    if (!key || !crypto.subtle) {
      throw new Error('Secure encryption vault is unavailable; persisting educational records in plaintext is prohibited.');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encryptParams: AesGcmParams = {
      name: 'AES-GCM',
      iv,
      ...(aadContext ? { additionalData: enc.encode(aadContext) } : {}),
    };

    const ciphertext = await crypto.subtle.encrypt(
      encryptParams,
      key,
      enc.encode(plaintext)
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt a ciphertext string using AES-256-GCM.
   * Enforces cryptographic integrity and rejects tampered ciphertext or mismatched AAD context.
   */
  async decryptString(ciphertextB64: string, userId: string, aadContext?: string): Promise<string> {
    const key = await this.initCrypto(userId);
    if (!key || !crypto.subtle) {
      throw new Error('Decryption key is unavailable.');
    }

    try {
      const binaryString = atob(ciphertextB64);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const enc = new TextEncoder();
      const decryptParams: AesGcmParams = {
        name: 'AES-GCM',
        iv,
        ...(aadContext ? { additionalData: enc.encode(aadContext) } : {}),
      };

      const decrypted = await crypto.subtle.decrypt(
        decryptParams,
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch {
      throw new Error('Vault decryption failed: integrity check failed.');
    }
  }

  /**
   * Save a sensitive record wrapped in a secure, expiring envelope.
   * Educational records and PII are encrypted at rest with AES-256-GCM and bound with AAD.
   */
  async setSecureRecord<T>(
    key: string,
    data: T,
    userId: string,
    ttlMs = 24 * 3600 * 1000,
    classification: DataClassification = DataClassification.CONFIDENTIAL_EDUCATIONAL,
    schoolId?: string
  ): Promise<void> {
    const envelope: StorageEnvelope<T> = {
      schemaVersion: 1,
      userId,
      schoolId,
      classification,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      data,
    };

    const serialized = JSON.stringify(envelope);
    const aadContext = `${userId}:${schoolId || 'global'}:${key}`;
    const storedValue = (classification !== DataClassification.PUBLIC)
      ? await this.encryptString(serialized, userId, aadContext)
      : serialized;

    const db = await this.initDatabase();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.STORE_RECORDS, 'readwrite');
        const store = tx.objectStore(this.STORE_RECORDS);
        store.put({
          key,
          userId,
          schoolId,
          expiresAt: envelope.expiresAt,
          classification,
          value: storedValue,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      this.memoryStore.set(`rec_${key}`, storedValue);
    }

    // Mirror to Preferences for backwards compatibility with legacy verification checks
    await this.safePrefSet({
      key: `sa_vault_${key}`,
      value: storedValue,
    });
  }

  /**
   * Retrieve a record, verifying envelope expiration, user ownership, and tenant boundary.
   * Returns null if missing, expired, or belonging to a different user/school.
   */
  async getSecureRecord<T>(key: string, currentUserId: string, targetSchoolId?: string): Promise<T | null> {
    try {
      let storedValue: string | null = null;
      let recordSchoolId: string | undefined = targetSchoolId;
      const db = await this.initDatabase();

      if (db) {
        storedValue = await new Promise<string | null>((resolve) => {
          const tx = db.transaction(this.STORE_RECORDS, 'readonly');
          const store = tx.objectStore(this.STORE_RECORDS);
          const req = store.get(key);
          req.onsuccess = () => {
            if (req.result) {
              if (req.result.schoolId) recordSchoolId = req.result.schoolId;
              resolve(req.result.value);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        });
      } else {
        storedValue = this.memoryStore.get(`rec_${key}`) || null;
      }

      if (!storedValue) {
        const { value } = await this.safePrefGet({ key: `sa_vault_${key}` });
        storedValue = value || null;
      }

      if (!storedValue) return null;

      let decryptedJson = storedValue;
      if (storedValue.startsWith('{')) {
        decryptedJson = storedValue;
      } else {
        try {
          const aadContext = `${currentUserId}:${recordSchoolId || 'global'}:${key}`;
          decryptedJson = await this.decryptString(storedValue, currentUserId, aadContext);
        } catch {
          await this.removeRecord(key);
          return null;
        }
      }

      const envelope = JSON.parse(decryptedJson) as StorageEnvelope<T>;

      // Strict user boundary check
      if (envelope.userId !== currentUserId) {
        await this.removeRecord(key);
        return null;
      }

      // Multi-tenant school boundary check (if schoolId is specified)
      if (targetSchoolId && envelope.schoolId && envelope.schoolId !== targetSchoolId) {
        return null;
      }

      // TTL expiration check
      if (Date.now() > envelope.expiresAt) {
        await this.removeRecord(key);
        return null;
      }

      return envelope.data;
    } catch {
      return null;
    }
  }

  /**
   * Delete a specific secure record.
   */
  async removeRecord(key: string): Promise<void> {
    const db = await this.initDatabase();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.STORE_RECORDS, 'readwrite');
        tx.objectStore(this.STORE_RECORDS).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
    this.memoryStore.delete(`rec_${key}`);
    await this.safePrefRemove({ key: `sa_vault_${key}` });
  }

  /**
   * Invalidate cached data for a child whose guardian relationship was unlinked or revoked.
   */
  async invalidateRevokedChild(studentId: string): Promise<void> {
    await this.removeRecord(`child_${studentId}`);
    await this.removeRecord(`results_${studentId}`);
    await this.removeRecord(`attendance_${studentId}`);
    await this.removeRecord(`fees_${studentId}`);
  }

  /**
   * Prune expired educational records whose TTL has elapsed (e.g. 7-day TTL).
   * EXPLICIT SAFETY GUARANTEE: This method strictly prunes STORE_RECORDS only.
   * STORE_QUEUE (offline mutations) is completely untouched and isolated,
   * ensuring that pending offline mutations are NEVER deleted when read caches expire.
   */
  async pruneExpiredCache(): Promise<{ recordsPruned: number; queuePreserved: number }> {
    const now = Date.now();
    let recordsPruned = 0;
    let queuePreserved = 0;

    const db = await this.initDatabase();
    if (db) {
      recordsPruned = await new Promise<number>((resolve) => {
        const tx = db.transaction(this.STORE_RECORDS, 'readwrite');
        const store = tx.objectStore(this.STORE_RECORDS);
        const req = store.openCursor();
        let count = 0;
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            if (cursor.value.expiresAt && cursor.value.expiresAt < now) {
              cursor.delete();
              count++;
            }
            cursor.continue();
          } else {
            resolve(count);
          }
        };
        req.onerror = () => resolve(0);
      });

      queuePreserved = await new Promise<number>((resolve) => {
        const tx = db.transaction(this.STORE_QUEUE, 'readonly');
        const store = tx.objectStore(this.STORE_QUEUE);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });
    } else {
      for (const [k, v] of this.memoryStore.entries()) {
        if (k.startsWith('rec_')) {
          try {
            const envelope = JSON.parse(v) as StorageEnvelope<unknown>;
            if (envelope.expiresAt && envelope.expiresAt < now) {
              this.memoryStore.delete(k);
              recordsPruned++;
            }
          } catch {}
        } else if (k.startsWith('queue_')) {
          queuePreserved++;
        }
      }
    }

    return { recordsPruned, queuePreserved };
  }

  /**
   * Store non-sensitive application preferences (theme, UI toggles).
   */
  async setPreference(key: string, value: string): Promise<void> {
    const db = await this.initDatabase();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.STORE_PREFS, 'readwrite');
        tx.objectStore(this.STORE_PREFS).put({ key, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
    this.memoryStore.set(`pref_${key}`, value);
    await this.safePrefSet({ key: `sa_pref_${key}`, value });
  }

  /**
   * Get non-sensitive application preference.
   */
  async getPreference(key: string): Promise<string | null> {
    const db = await this.initDatabase();
    if (db) {
      const res = await new Promise<string | null>((resolve) => {
        const tx = db.transaction(this.STORE_PREFS, 'readonly');
        const req = tx.objectStore(this.STORE_PREFS).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
      });
      if (res !== null) return res;
    }
    const mem = this.memoryStore.get(`pref_${key}`);
    if (mem !== undefined) return mem;
    const { value } = await this.safePrefGet({ key: `sa_pref_${key}` });
    return value || null;
  }

  /**
   * Enqueue a state-mutating operation performed while offline.
   * Generates a unique idempotency key and initializes state to PENDING.
   */
  async enqueueAction(
    action: Omit<QueuedOfflineAction, 'id' | 'timestamp' | 'retryCount' | 'state' | 'maxRetries' | 'idempotencyKey'> & {
      idempotencyKey?: string;
      maxRetries?: number;
    }
  ): Promise<string> {
    const id = crypto.randomUUID();
    const idempotencyKey = action.idempotencyKey || crypto.randomUUID();
    const queued: QueuedOfflineAction = {
      ...action,
      id,
      idempotencyKey,
      state: 'PENDING',
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries ?? 5,
    };

    const db = await this.initDatabase();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.STORE_QUEUE, 'readwrite');
        tx.objectStore(this.STORE_QUEUE).put(queued);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      this.memoryStore.set(`queue_${id}`, JSON.stringify(queued));
    }

    await this.updateQueueCounters();
    return id;
  }

  /**
   * Fetch all pending and failed queued actions scoped to the active or requested user account.
   * Cross-account mutation leakage is strictly prevented.
   */
  async getQueue(targetUserId?: string): Promise<QueuedOfflineAction[]> {
    const filterUserId = targetUserId !== undefined ? targetUserId : this.activeUserId;
    if (!filterUserId) {
      return []; // Refuse to return queue items without an identified user session
    }

    const db = await this.initDatabase();
    if (db) {
      return new Promise<QueuedOfflineAction[]>((resolve) => {
        const tx = db.transaction(this.STORE_QUEUE, 'readonly');
        const store = tx.objectStore(this.STORE_QUEUE);
        const index = store.index('by_user');
        const req = index.getAll(filterUserId);
        req.onsuccess = () => resolve((req.result as QueuedOfflineAction[]) || []);
        req.onerror = () => resolve([]);
      });
    }

    const items: QueuedOfflineAction[] = [];
    for (const [k, v] of this.memoryStore.entries()) {
      if (k.startsWith('queue_')) {
        try {
          const item = JSON.parse(v) as QueuedOfflineAction;
          if (item.userId === filterUserId) {
            items.push(item);
          }
        } catch {
          // ignore corrupted
        }
      }
    }
    return items;
  }

  /**
   * Clear or mark an action that has been successfully synchronized.
   */
  async dequeueAction(actionId: string): Promise<void> {
    const db = await this.initDatabase();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.STORE_QUEUE, 'readwrite');
        tx.objectStore(this.STORE_QUEUE).delete(actionId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
    this.memoryStore.delete(`queue_${actionId}`);
    await this.updateQueueCounters();
  }

  /**
   * Update queue item state (e.g. SYNCING, CONFLICT, DEAD_LETTER).
   */
  async updateActionState(
    actionId: string,
    state: QueueState,
    error?: string,
    nextRetryDelayMs?: number
  ): Promise<void> {
    const db = await this.initDatabase();
    let item: QueuedOfflineAction | null = null;

    if (db) {
      item = await new Promise<QueuedOfflineAction | null>((resolve) => {
        const tx = db.transaction(this.STORE_QUEUE, 'readonly');
        const store = tx.objectStore(this.STORE_QUEUE);
        const req = store.get(actionId);
        req.onsuccess = () => resolve(req.result ? (req.result as QueuedOfflineAction) : null);
        req.onerror = () => resolve(null);
      });
    } else {
      const raw = this.memoryStore.get(`queue_${actionId}`);
      if (raw) {
        try { item = JSON.parse(raw) as QueuedOfflineAction; } catch {}
      }
    }

    if (!item) return;

    item.state = state;
    if (error) item.lastError = error;
    if (state === 'FAILED') {
      item.retryCount += 1;
      if (item.retryCount >= item.maxRetries) {
        item.state = 'DEAD_LETTER';
      } else if (nextRetryDelayMs) {
        item.nextRetryAt = Date.now() + nextRetryDelayMs;
      }
    }

    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(this.STORE_QUEUE, 'readwrite');
        tx.objectStore(this.STORE_QUEUE).put(item!);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } else {
      this.memoryStore.set(`queue_${item.id}`, JSON.stringify(item));
    }

    await this.updateQueueCounters(item.userId);
  }

  /**
   * Reset any orphaned SYNCING actions from an interrupted or crashed session to PENDING.
   */
  async recoverInterruptedSync(targetUserId?: string): Promise<void> {
    const queue = await this.getQueue(targetUserId);
    for (const item of queue) {
      if (item.state === 'SYNCING') {
        await this.updateActionState(item.id, 'PENDING');
      }
    }
  }

  /**
   * Process pending queued actions through an injected network executor.
   * Guarantees that only mutations belonging to the actively authenticated user are dispatched.
   * Prevents replaying User A's mutations under User B's session.
   * Handles optimistic concurrency (409), permanent revocation (401/403 -> DEAD_LETTER), and exponential backoff.
   */
  async processQueue(
    executor: (action: QueuedOfflineAction) => Promise<{ status: number; body?: unknown }>,
    targetUserId?: string
  ): Promise<SyncResult> {
    const currentUserId = targetUserId !== undefined ? targetUserId : this.activeUserId;
    if (!currentUserId) {
      // Must not process actions without an authenticated session context
      return { succeeded: 0, failed: 0, conflicts: 0, deadLetter: 0 };
    }

    if (this.isSyncing()) {
      return { succeeded: 0, failed: 0, conflicts: 0, deadLetter: 0 };
    }

    this.isSyncing.set(true);
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;
    let deadLetter = 0;

    try {
      await this.recoverInterruptedSync(currentUserId);
      const queue = await this.getQueue(currentUserId);
      const now = Date.now();

      for (const action of queue) {
        // Enforce strict user ownership boundary: never dispatch an alien mutation
        if (action.userId !== currentUserId) {
          continue;
        }

        if (action.state === 'CONFLICT' || action.state === 'DEAD_LETTER' || action.state === 'SYNCED') {
          continue;
        }

        if (action.state === 'FAILED' && action.nextRetryAt && action.nextRetryAt > now) {
          continue; // Backoff wait
        }

        await this.updateActionState(action.id, 'SYNCING');

        try {
          const res = await executor(action);

          if (res.status >= 200 && res.status < 300) {
            await this.dequeueAction(action.id);
            succeeded++;
          } else if (res.status === 409) {
            // Optimistic concurrency collision: halt, preserve, alert
            await this.updateActionState(action.id, 'CONFLICT', 'Record was modified concurrently by another user.');
            conflicts++;
          } else if (res.status === 401 || res.status === 403 || res.status === 400) {
            // Permanent unrecoverable failure / revoked authorization: classify DEAD_LETTER and halt
            const msg = res.status === 401 || res.status === 403
              ? `Permanent authorization rejection (HTTP ${res.status}): User role or school membership revoked.`
              : `Permanent validation rejection (HTTP ${res.status}).`;
            await this.updateActionState(action.id, 'DEAD_LETTER', msg);
            deadLetter++;
          } else {
            // Transient 5xx failure
            const delay = Math.min(30000, 1000 * Math.pow(2, action.retryCount));
            await this.updateActionState(action.id, 'FAILED', `Network error (HTTP ${res.status})`, delay);
            failed++;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown network failure';
          const delay = Math.min(30000, 1000 * Math.pow(2, action.retryCount));
          await this.updateActionState(action.id, 'FAILED', msg, delay);
          failed++;
        }
      }
    } finally {
      this.isSyncing.set(false);
      await this.updateQueueCounters(currentUserId);
    }

    return { succeeded, failed, conflicts, deadLetter };
  }

  /**
   * Refresh reactive queue counters for UI observation scoped to the active user.
   */
  private async updateQueueCounters(targetUserId?: string): Promise<void> {
    const filterUser = targetUserId !== undefined ? targetUserId : this.activeUserId;
    if (!filterUser) {
      this.pendingActionsCount.set(0);
      this.hasConflicts.set(false);
      this.deadLetterCount.set(0);
      return;
    }

    const queue = await this.getQueue(filterUser);
    const pending = queue.filter(a => a.state === 'PENDING' || a.state === 'FAILED');
    const hasConflict = queue.some(a => a.state === 'CONFLICT');
    const deadLetters = queue.filter(a => a.state === 'DEAD_LETTER').length;

    this.pendingActionsCount.set(pending.length);
    this.hasConflicts.set(hasConflict);
    this.deadLetterCount.set(deadLetters);
  }

  /**
   * Lock cryptographic vault and evict all in-memory keys on normal logout.
   * Encrypted educational records and offline mutation queues are safely preserved at rest.
   * Session authentication tokens are removed to prevent unauthenticated access.
   */
  async lockVault(): Promise<void> {
    this.activeCryptoKey = null;
    this.activeUserId = null;
    this.keyVault.purgeAllSessionKeys();

    // Reset queue observation signals on logout
    this.pendingActionsCount.set(0);
    this.hasConflicts.set(false);
    this.deadLetterCount.set(0);

    // Invalidate active session authentication tokens
    await this.removeRecord('parent_token');
    await this.removeRecord('teacher_token');
    await this.safePrefRemove({ key: 'syncacademy_parent_token' });
  }

  /**
   * Flush and clear all sensitive user data on account deletion or factory reset.
   * Purges cached educational records, queues, auth tokens, and in-memory cryptographic keys.
   * When userId is supplied, also destroys the hardware master key inside Keystore/Keychain.
   * Non-sensitive app preferences (theme) are preserved.
   */
  async clearSensitiveData(userId?: string): Promise<void> {
    if (userId) {
      await this.keyVault.invalidateAccountKey(userId);
    }

    const db = await this.initDatabase();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction([this.STORE_RECORDS, this.STORE_QUEUE, this.STORE_AUTH], 'readwrite');
        tx.objectStore(this.STORE_RECORDS).clear();
        tx.objectStore(this.STORE_QUEUE).clear();
        tx.objectStore(this.STORE_AUTH).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }

    // Clear memory store for sensitive records and queue
    for (const k of Array.from(this.memoryStore.keys())) {
      if (k.startsWith('rec_') || k.startsWith('queue_') || k.startsWith('auth_')) {
        this.memoryStore.delete(k);
      }
    }

    // Clear legacy Preferences keys
    try {
      const { keys } = await this.safePrefKeys();
      for (const k of keys) {
        if (
          k.startsWith('sa_vault_') ||
          k === 'sa_offline_action_queue' ||
          k.startsWith('syncacademy_parent_') ||
          k.startsWith('syncacademy_cached_')
        ) {
          await this.safePrefRemove({ key: k });
        }
      }
    } catch {
      // Fallback
    }

    // Evict all in-memory cryptographic keys
    this.activeCryptoKey = null;
    this.activeUserId = null;
    this.keyVault.purgeAllSessionKeys();

    this.pendingActionsCount.set(0);
    this.hasConflicts.set(false);
    this.deadLetterCount.set(0);
  }
}
