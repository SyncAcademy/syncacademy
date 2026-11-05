#!/usr/bin/env python3
import asyncio
import json
import urllib.request
import websockets
import subprocess

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

import time

def wait_for_devtools_socket(pid, timeout=12):
    start = time.time()
    while time.time() - start < timeout:
        out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'grep webview_devtools_remote_{pid} /proc/net/unix || true'", shell=True).decode()
        if f"webview_devtools_remote_{pid}" in out:
            return True
        time.sleep(0.5)
    return False

def refresh_forward(port, pkg, restart=False):
    if not restart:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1.5) as resp:
                targets = json.loads(resp.read().decode())
                if targets and "webSocketDebuggerUrl" in targets[0]:
                    return targets[0]["webSocketDebuggerUrl"]
        except Exception:
            pass

    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward --remove tcp:{port}", shell=True, stderr=subprocess.DEVNULL)
    out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'pidof {pkg}'", shell=True).decode().strip()
    pids = out.split()
    if not pids:
        subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb shell monkey -p {pkg} 1", shell=True, check=True)
        time.sleep(2)
        out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'pidof {pkg}'", shell=True).decode().strip()
        pids = out.split()

    pid = pids[0]
    wait_for_devtools_socket(pid)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward tcp:{port} localabstract:webview_devtools_remote_{pid}", shell=True, check=True)

    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    return targets[0]["webSocketDebuggerUrl"]

async def run_objective_b_lifecycle(port, app_name):
    print(f"\n=================================================================")
    print(f"Objective B: Full 12-Step Cryptographic Lifecycle - {app_name} (Port {port})")
    print(f"=================================================================")

    pkg = "tz.co.syncacademy.teachers" if app_name == "Teacher" else "tz.co.syncacademy.parents"
    ws_url = refresh_forward(port, pkg, restart=True)

    async with websockets.connect(ws_url) as ws:
        user_a = f"obj_b_user_alpha_{app_name.lower()}"
        proof_a_session_1 = f"session_1_token_alpha_{app_name.lower()}_112233"
        proof_a_session_2 = f"session_2_token_alpha_{app_name.lower()}_445566"
        user_b = f"obj_b_user_beta_{app_name.lower()}"
        proof_b_session_1 = f"session_1_token_beta_{app_name.lower()}_778899"

        # Step 0: Ensure starting from clean slate
        await cdp_eval(ws, f"""
            (async () => {{
                await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user_a}', sessionProof: '{proof_a_session_1}' }});
                await window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: 'sa_vault_user_{user_a}' }});
                await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();

                await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user_b}', sessionProof: '{proof_b_session_1}' }});
                await window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: 'sa_vault_user_{user_b}' }});
                await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();
            }})()
        """)

        # Step 1: Authenticate as User A (Session 1)
        res_bind_a1 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_a}',
                sessionProof: '{proof_a_session_1}'
            }})
        """)
        print(f"Step 1: Authenticate as User A (Session 1): {res_bind_a1}")
        assert res_bind_a1.get("success") is True

        # Step 2: Create User A's master seed
        res_seed_a1 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: 'sa_vault_user_{user_a}'
            }})
        """)
        seed_a1 = res_seed_a1.get("seed")
        print(f"Step 2: Create User A master seed: {seed_a1[:16]}... (len={len(seed_a1)})")
        assert len(seed_a1) == 64

        # Step 3: Encrypt and persist an offline record using WebCrypto AES-GCM + PBKDF2 derived key
        sample_secret_payload = {"roster": ["Alpha Student One", "Alpha Student Two"], "marks": [95, 88]}
        res_enc = await cdp_eval(ws, f"""
            (async () => {{
                const seedHex = '{seed_a1}';
                const seedBytes = new Uint8Array(seedHex.match(/.{{1,2}}/g).map(byte => parseInt(byte, 16)));
                const baseKey = await crypto.subtle.importKey('raw', seedBytes, 'PBKDF2', false, ['deriveKey']);
                const salt = new TextEncoder().encode('SyncAcademy_Mobile_Vault_Salt_2026_{user_a}');
                const dek = await crypto.subtle.deriveKey(
                    {{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }},
                    baseKey,
                    {{ name: 'AES-GCM', length: 256 }},
                    false,
                    ['encrypt', 'decrypt']
                );
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const aad = new TextEncoder().encode('{user_a}:school_alpha:educational_records');
                const plaintext = new TextEncoder().encode(JSON.stringify({json.dumps(sample_secret_payload)}));
                const ciphertext = await crypto.subtle.encrypt(
                    {{ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }},
                    dek,
                    plaintext
                );
                // Store in IndexedDB
                const db = await new Promise((resolve) => {{
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                }});
                const record = {{
                    key: 'test_record_alpha',
                    userId: '{user_a}',
                    schoolId: 'school_alpha',
                    iv: Array.from(iv),
                    ciphertext: Array.from(new Uint8Array(ciphertext)),
                    expiresAt: Date.now() + 86400000
                }};
                await new Promise((resolve) => {{
                    const tx = db.transaction('educational_records', 'readwrite');
                    tx.objectStore('educational_records').put(record);
                    tx.oncomplete = () => resolve();
                }});
                return {{ success: true }};
            }})()
        """)
        print(f"Step 3: Encrypt and persist offline record into IndexedDB: {res_enc}")
        assert res_enc.get("success") is True

        # Step 4: Log out
        res_logout = await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        print(f"Step 4: Log out User A: {res_logout}")
        assert res_logout.get("isLocked") is True

        # Step 5: Authenticate again as User A with newly issued Session 2
        res_bind_a2 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_a}',
                sessionProof: '{proof_a_session_2}'
            }})
        """)
        print(f"Step 5: Authenticate again as User A with Session 2: {res_bind_a2}")
        assert res_bind_a2.get("success") is True

        # Step 6: Verify existing seed can be recovered
        res_seed_a2 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: 'sa_vault_user_{user_a}'
            }})
        """)
        seed_a2 = res_seed_a2.get("seed")
        print(f"Step 6: Recover existing master seed: {seed_a2[:16]}...")
        assert seed_a2 == seed_a1, "Recovered seed in Session 2 must exactly match Session 1!"

        # Step 7: Verify previously encrypted records can be decrypted
        res_dec = await cdp_eval(ws, f"""
            (async () => {{
                const seedHex = '{seed_a2}';
                const seedBytes = new Uint8Array(seedHex.match(/.{{1,2}}/g).map(byte => parseInt(byte, 16)));
                const baseKey = await crypto.subtle.importKey('raw', seedBytes, 'PBKDF2', false, ['deriveKey']);
                const salt = new TextEncoder().encode('SyncAcademy_Mobile_Vault_Salt_2026_{user_a}');
                const dek = await crypto.subtle.deriveKey(
                    {{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }},
                    baseKey,
                    {{ name: 'AES-GCM', length: 256 }},
                    false,
                    ['encrypt', 'decrypt']
                );
                // Read from IndexedDB
                const db = await new Promise((resolve) => {{
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                }});
                const record = await new Promise((resolve) => {{
                    const tx = db.transaction('educational_records', 'readonly');
                    const getReq = tx.objectStore('educational_records').get('test_record_alpha');
                    getReq.onsuccess = () => resolve(getReq.result);
                }});
                const iv = new Uint8Array(record.iv);
                const aad = new TextEncoder().encode('{user_a}:school_alpha:educational_records');
                const ciphertext = new Uint8Array(record.ciphertext);
                const decryptedBytes = await crypto.subtle.decrypt(
                    {{ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }},
                    dek,
                    ciphertext
                );
                return JSON.parse(new TextDecoder().decode(decryptedBytes));
            }})()
        """)
        print(f"Step 7: Decrypt offline record with recovered key: {res_dec}")
        assert res_dec == sample_secret_payload, "Decrypted payload must match original!"

    # Step 8: Restart application process cold via force-stop
    print(f"Step 8: Force-stop application {pkg} to simulate cold process termination...")
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb shell am force-stop {pkg}", shell=True, check=True)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb shell monkey -p {pkg} 1", shell=True, check=True)
    await asyncio.sleep(2)

    # Reconnect CDP
    ws_url = refresh_forward(port, pkg, restart=True)
    async with websockets.connect(ws_url) as ws:
        # Step 9: Repeat recovery test post-restart
        # Must bind first because app restarted cold (vault locked)
        await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_a}',
                sessionProof: '{proof_a_session_2}'
            }})
        """)
        res_seed_post_restart = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: 'sa_vault_user_{user_a}'
            }})
        """)
        assert res_seed_post_restart.get("seed") == seed_a1
        print(f"Step 9: Master seed verified post-cold-restart: {res_seed_post_restart.get('seed')[:16]}...")

        # Step 10: Switch to User B
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        res_bind_b = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_b}',
                sessionProof: '{proof_b_session_1}'
            }})
        """)
        print(f"Step 10: Authenticate as User B: {res_bind_b}")
        assert res_bind_b.get("success") is True

        res_seed_b = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: 'sa_vault_user_{user_b}'
            }})
        """)
        seed_b = res_seed_b.get("seed")
        print(f"Step 10b: User B master seed: {seed_b[:16]}...")
        assert seed_b != seed_a1

        # Step 11: Verify User B cannot access User A's records
        # Attempt 11a: User B queries User A's key -> rejected by plugin
        res_b_query_a_key = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: 'sa_vault_user_{user_a}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(e => ({{ success: false, error: e.message || e }}))
        """)
        print(f"Step 11a: User B access User A key rejected: {res_b_query_a_key}")
        assert res_b_query_a_key.get("success") is False

        # Attempt 11b: User B attempts to decrypt User A's IndexedDB record with User B's derived key -> AEAD failure
        res_b_decrypt_a_record = await cdp_eval(ws, f"""
            (async () => {{
                try {{
                    const seedHex = '{seed_b}';
                    const seedBytes = new Uint8Array(seedHex.match(/.{{1,2}}/g).map(byte => parseInt(byte, 16)));
                    const baseKey = await crypto.subtle.importKey('raw', seedBytes, 'PBKDF2', false, ['deriveKey']);
                    const salt = new TextEncoder().encode('SyncAcademy_Mobile_Vault_Salt_2026_{user_b}');
                    const dek = await crypto.subtle.deriveKey(
                        {{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }},
                        baseKey,
                        {{ name: 'AES-GCM', length: 256 }},
                        false,
                        ['encrypt', 'decrypt']
                    );
                    const db = await new Promise((resolve) => {{
                        const req = indexedDB.open('syncacademy_offline_db', 1);
                        req.onsuccess = () => resolve(req.result);
                    }});
                    const record = await new Promise((resolve) => {{
                        const tx = db.transaction('educational_records', 'readonly');
                        const getReq = tx.objectStore('educational_records').get('test_record_alpha');
                        getReq.onsuccess = () => resolve(getReq.result);
                    }});
                    const iv = new Uint8Array(record.iv);
                    const aad = new TextEncoder().encode('{user_a}:school_alpha:educational_records');
                    const ciphertext = new Uint8Array(record.ciphertext);
                    await crypto.subtle.decrypt(
                        {{ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }},
                        dek,
                        ciphertext
                    );
                    return {{ success: true }};
                }} catch (e) {{
                    return {{ success: false, error: e.name || e.message }};
                }}
            }})()
        """)
        print(f"Step 11b: User B decrypt User A record fails with AEAD tag error: {res_b_decrypt_a_record}")
        assert res_b_decrypt_a_record.get("success") is False
        assert "OperationError" in str(res_b_decrypt_a_record.get("error"))

        # Step 12: Return to User A and verify recovery again
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_a}',
                sessionProof: 'new_third_session_token_for_alpha_999'
            }})
        """)
        res_seed_return_a = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: 'sa_vault_user_{user_a}'
            }})
        """)
        assert res_seed_return_a.get("seed") == seed_a1
        print(f"Step 12: Return to User A: master seed verified intact: {res_seed_return_a.get('seed')[:16]}...")

        # Final cleanup
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: 'sa_vault_user_{user_a}' }})")
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user_b}', sessionProof: '{proof_b_session_1}' }})")
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: 'sa_vault_user_{user_b}' }})")
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")

        print(f"\n[{app_name}] ALL 12 OBJECTIVE B LIFECYCLE TESTS PASSED 100%!")

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
    name = sys.argv[2] if len(sys.argv) > 2 else "Teacher"
    asyncio.run(run_objective_b_lifecycle(port, name))
