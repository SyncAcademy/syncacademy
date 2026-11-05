#!/usr/bin/env python3
import asyncio
import json
import urllib.request
import websockets

async def cdp_eval(ws, expression):
    msg_id = 1
    req = {
        "id": msg_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True
        }
    }
    await ws.send(json.dumps(req))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            result = data.get("result", {})
            if "exceptionDetails" in result:
                return {"error": result["exceptionDetails"]}
            return result.get("result", {}).get("value")

async def test_offline_storage(port, app_name):
    print(f"\n=======================================================")
    print(f"Testing Offline Storage & IndexedDB on {app_name} (Port {port})")
    print(f"=======================================================")

    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    ws_url = targets[0]["webSocketDebuggerUrl"]

    async with websockets.connect(ws_url) as ws:
        # Check IndexedDB and WebCrypto availability
        check_apis = await cdp_eval(ws, """
            ({
                indexedDB: typeof window.indexedDB !== 'undefined',
                cryptoSubtle: typeof window.crypto?.subtle !== 'undefined'
            })
        """)
        print(f"[{app_name}] IndexedDB and WebCrypto available: {check_apis}")
        assert check_apis.get("indexedDB") is True
        assert check_apis.get("cryptoSubtle") is True

        # Test script executing inside WebView:
        # 1. Obtains master seed from native SecureKeyVault
        # 2. Derives AES-GCM 256 key via PBKDF2
        # 3. Encrypts payload with AES-GCM and AAD
        # 4. Stores encrypted envelope into IndexedDB 'syncacademy_offline_db'
        # 5. Retrieves and decrypts record
        # 6. Stages offline mutations into 'offline_mutations' store
        # 7. Verifies queue isolation between user_01 and user_02
        test_script = """
        (async () => {
            const results = {};
            const userId = 'user_test_mobile_01';
            const alias = 'sa_vault_user_' + userId;

            // 1. Bind and get seed from native Keystore
            await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({ userId });
            const seedRes = await window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({ alias });
            results.seedObtained = !!seedRes.seed;
            results.hardwareAssurance = seedRes.securityLevel;

            // 2. Derive WebCrypto AES-GCM 256 key
            const enc = new TextEncoder();
            const rawSeedBytes = enc.encode(seedRes.seed);
            const keyMaterial = await crypto.subtle.importKey(
                'raw', rawSeedBytes, { name: 'PBKDF2' }, false, ['deriveKey']
            );
            const aesKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: enc.encode('SyncAcademy_Mobile_Vault_Salt_2026_' + userId),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            results.keyDerived = !!aesKey;

            // 3. Encrypt educational roster payload with AAD
            const plaintext = JSON.stringify({
                classId: 'class_grade1_alpha',
                studentCount: 35,
                subject: 'Mathematics',
                roster: ['Alpha Student One', 'Beta Student Two']
            });
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const aad = enc.encode('school_alpha:' + userId + ':roster_cache');
            const cipherBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv, additionalData: aad },
                aesKey,
                enc.encode(plaintext)
            );
            
            const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(cipherBuffer), iv.length);
            const ciphertextB64 = btoa(String.fromCharCode(...combined));
            results.ciphertextLength = ciphertextB64.length;

            // 4. Open IndexedDB and store encrypted record
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open('syncacademy_offline_db', 1);
                req.onupgradeneeded = (e) => {
                    const d = e.target.result;
                    if (!d.objectStoreNames.contains('educational_records')) {
                        const s = d.createObjectStore('educational_records', { keyPath: 'key' });
                        s.createIndex('by_user', 'userId', { unique: false });
                    }
                    if (!d.objectStoreNames.contains('offline_mutations')) {
                        const s = d.createObjectStore('offline_mutations', { keyPath: 'id' });
                        s.createIndex('by_user', 'userId', { unique: false });
                        s.createIndex('by_state', 'state', { unique: false });
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            // Put encrypted record into educational_records
            await new Promise((resolve, reject) => {
                const tx = db.transaction('educational_records', 'readwrite');
                const store = tx.objectStore('educational_records');
                store.put({
                    key: 'roster_cache_grade1',
                    userId: userId,
                    schoolId: 'school_alpha',
                    classification: 'CONFIDENTIAL_EDUCATIONAL',
                    ciphertext: ciphertextB64,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 86400000
                });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });

            // 5. Read back from IndexedDB and decrypt
            const storedRecord = await new Promise((resolve, reject) => {
                const tx = db.transaction('educational_records', 'readonly');
                const store = tx.objectStore('educational_records');
                const req = store.get('roster_cache_grade1');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            // Decrypt ciphertext using derived key
            const rawEncrypted = atob(storedRecord.ciphertext);
            const bytes = new Uint8Array(rawEncrypted.length);
            for (let i = 0; i < rawEncrypted.length; i++) bytes[i] = rawEncrypted.charCodeAt(i);
            const decIv = bytes.slice(0, 12);
            const decData = bytes.slice(12);

            const decryptedBuf = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: decIv, additionalData: aad },
                aesKey,
                decData
            );
            const decryptedText = new TextDecoder().decode(decryptedBuf);
            const decryptedObj = JSON.parse(decryptedText);
            results.decryptedMatches = decryptedObj.classId === 'class_grade1_alpha' && decryptedObj.studentCount === 35;

            // 6. Stage Offline Mutation Queue items
            const action1 = {
                id: 'action_mut_001',
                idempotencyKey: 'idem_key_777_888',
                entityType: 'ATTENDANCE',
                endpoint: 'schools/school_alpha/academics/commands',
                method: 'POST',
                payload: { classId: 'class_grade1_alpha', date: '2026-02-25', revision: 2 },
                userId: userId,
                state: 'PENDING',
                timestamp: Date.now(),
                retryCount: 0,
                maxRetries: 3
            };
            const actionUser2 = {
                id: 'action_mut_002',
                idempotencyKey: 'idem_key_999_000',
                entityType: 'MARK_ENTRY',
                endpoint: 'schools/school_beta/academics/commands',
                method: 'POST',
                payload: { classId: 'class_grade2_beta', mark: 95 },
                userId: 'user_test_mobile_02', // Different user
                state: 'PENDING',
                timestamp: Date.now(),
                retryCount: 0,
                maxRetries: 3
            };

            await new Promise((resolve, reject) => {
                const tx = db.transaction('offline_mutations', 'readwrite');
                const store = tx.objectStore('offline_mutations');
                store.put(action1);
                store.put(actionUser2);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });

            // Query actions strictly scoped to userId
            const user1Actions = await new Promise((resolve) => {
                const tx = db.transaction('offline_mutations', 'readonly');
                const store = tx.objectStore('offline_mutations');
                const idx = store.index('by_user');
                const req = idx.getAll(userId);
                req.onsuccess = () => resolve(req.result);
            });

            results.user1ActionCount = user1Actions.length;
            results.user1ActionId = user1Actions[0]?.id;
            results.isolationVerified = !user1Actions.some(a => a.userId === 'user_test_mobile_02');

            // 7. Conflict handling simulation: update state to CONFLICT on 409
            action1.state = 'CONFLICT';
            action1.lastError = 'HTTP 409 Conflict: Attendance record was modified on server. Reload required.';
            await new Promise((resolve, reject) => {
                const tx = db.transaction('offline_mutations', 'readwrite');
                const store = tx.objectStore('offline_mutations');
                store.put(action1);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });

            const conflictAction = await new Promise((resolve) => {
                const tx = db.transaction('offline_mutations', 'readonly');
                const store = tx.objectStore('offline_mutations');
                const req = store.get('action_mut_001');
                req.onsuccess = () => resolve(req.result);
            });
            results.conflictHalted = conflictAction.state === 'CONFLICT';

            // Clean up test entries
            await new Promise((resolve) => {
                const tx = db.transaction(['educational_records', 'offline_mutations'], 'readwrite');
                tx.objectStore('educational_records').delete('roster_cache_grade1');
                tx.objectStore('offline_mutations').delete('action_mut_001');
                tx.objectStore('offline_mutations').delete('action_mut_002');
                tx.oncomplete = () => resolve();
            });

            // Unbind native session & clear test seed
            await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();
            await window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({ alias });

            db.close();
            return results;
        })()
        """

        res = await cdp_eval(ws, test_script)
        print(f"[{app_name}] Offline Storage & IndexedDB Results:")
        for k, v in res.items():
            print(f"   {k}: {v}")

        assert res.get("seedObtained") is True
        assert res.get("keyDerived") is True
        assert res.get("decryptedMatches") is True, "Decrypted record did not match plaintext!"
        assert res.get("user1ActionCount") == 1
        assert res.get("user1ActionId") == "action_mut_001"
        assert res.get("isolationVerified") is True, "Cross-user queue isolation failed!"
        assert res.get("conflictHalted") is True, "Conflict state was not preserved!"

        print(f"[{app_name}] OFFLINE ENCRYPTION & QUEUE ISOLATION TESTS PASSED 100%!")

async def main():
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
    app_name = sys.argv[2] if len(sys.argv) > 2 else "Teacher"
    await test_offline_storage(port, app_name)

if __name__ == "__main__":
    asyncio.run(main())
