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

async def run_adversarial_vault_suite(port, app_name):
    print(f"\n=======================================================")
    print(f"Adversarial Native Vault Security Suite: {app_name} (Port {port})")
    print(f"=======================================================")

    import subprocess
    pkg = "tz.co.syncacademy.teachers" if app_name == "Teacher" else "tz.co.syncacademy.parents"
    out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'ps -A | grep {pkg}'", shell=True).decode()
    pid = out.strip().split()[1]
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward --remove tcp:{port}", shell=True, stderr=subprocess.DEVNULL)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward tcp:{port} localabstract:webview_devtools_remote_{pid}", shell=True, check=True)

    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    ws_url = targets[0]["webSocketDebuggerUrl"]
    print(f"Connecting to CDP WebSocket: {ws_url}")

    async with websockets.connect(ws_url) as ws:
        # Step 0: Ensure starting from clean state
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")

        # Verification 1 & 2: Authenticate and Bind User A with legitimate session proof
        user_a = f"user_{app_name.lower()}_alpha"
        proof_a = f"token_auth_proof_alpha_{app_name.lower()}_9988776655"
        alias_a = f"sa_vault_user_{user_a}"

        # Clean existing test keys if present
        await cdp_eval(ws, f"""
            (async () => {{
                await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user_a}', sessionProof: '{proof_a}' }});
                await window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: '{alias_a}' }});
                await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();
            }})()
        """)

        # TEST 1 & 2: Legitimate Binding of User A
        res_bind_a = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_a}',
                sessionProof: '{proof_a}'
            }})
        """)
        print(f"[{app_name}] Test 1/2 - Legitimate bind User A: {res_bind_a}")
        assert res_bind_a.get("success") is True
        assert res_bind_a.get("activeUser") == user_a
        assert res_bind_a.get("isLocked") is False

        # TEST 3: User A generates and retrieves own master seed
        res_seed_a = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: '{alias_a}'
            }})
        """)
        seed_a_val = res_seed_a.get("seed")
        print(f"[{app_name}] Test 3 - User A master seed generated ({len(seed_a_val)} hex chars): {seed_a_val[:16]}...")
        assert len(seed_a_val) == 64

        # TEST 4: Direct Rebinding Attack: Attempt to bind User B directly without unbind
        user_b = f"user_{app_name.lower()}_beta"
        proof_b = f"token_auth_proof_beta_{app_name.lower()}_1122334455"
        alias_b = f"sa_vault_user_{user_b}"

        res_rebind_attack = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_b}',
                sessionProof: '{proof_b}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 4 - Direct Rebinding Attack rejected: {res_rebind_attack}")
        assert res_rebind_attack.get("success") is False
        assert "unauthorized rebinding" in res_rebind_attack.get("error", "")

        # TEST 5: Cross-Account Access Attack: Attempt to access User B's key while bound to User A
        res_cross_access = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: '{alias_b}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 5 - Cross-Account key access rejected: {res_cross_access}")
        assert res_cross_access.get("success") is False
        assert "requested alias does not match" in res_cross_access.get("error", "")

        # TEST 6: Unbind User A and Attempt to Bind User B without Legitimate Session Proof
        res_unbind = await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        print(f"[{app_name}] Test 6a - Unbind User A: {res_unbind}")
        assert res_unbind.get("isLocked") is True

        # While locked, access must fail
        res_locked_access = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: '{alias_a}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 6b - Access while vault locked rejected: {res_locked_access}")
        assert res_locked_access.get("success") is False
        assert "vault is locked" in res_locked_access.get("error", "")

        # Attempt to bind User B with invalid / trivial proof
        res_fake_proof = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_b}',
                sessionProof: 'short'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 6c - Binding with trivial proof rejected: {res_fake_proof}")
        assert res_fake_proof.get("success") is False
        assert "session proof required" in res_fake_proof.get("error", "")

        # TEST 7: Unauthorized Deletion Attack: Attempt to delete User B's key while bound to User A
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user_a}', sessionProof: '{proof_a}' }})")
        res_delete_alien = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{
                alias: '{alias_b}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 7 - Alien account key deletion rejected: {res_delete_alien}")
        assert res_delete_alien.get("success") is False
        assert "unauthorized deletion" in res_delete_alien.get("error", "")

        # TEST 8: Log out User A: Vault is locked
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        res_post_logout_del = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{
                alias: '{alias_a}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 8 - Post-logout operation rejected (vault locked): {res_post_logout_del}")
        assert res_post_logout_del.get("success") is False
        assert "vault is locked" in res_post_logout_del.get("error", "")

        # TEST 9: Authenticate legitimately as User B with authentic session proof
        res_bind_b = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{user_b}',
                sessionProof: '{proof_b}'
            }})
        """)
        print(f"[{app_name}] Test 9a - Legitimate bind User B: {res_bind_b}")
        assert res_bind_b.get("success") is True
        assert res_bind_b.get("activeUser") == user_b

        res_seed_b = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: '{alias_b}'
            }})
        """)
        seed_b_val = res_seed_b.get("seed")
        print(f"[{app_name}] Test 9b - User B master seed generated: {seed_b_val[:16]}...")
        assert len(seed_b_val) == 64
        assert seed_b_val != seed_a_val, "User B seed must be distinct from User A seed!"

        # Verify User B cannot access User A's seed
        res_b_access_a = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: '{alias_a}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 9c - User B cannot access User A's seed: {res_b_access_a}")
        assert res_b_access_a.get("success") is False

        # Cleanup User B and User A
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: '{alias_b}' }})")
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user_a}', sessionProof: '{proof_a}' }})")
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: '{alias_a}' }})")
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")

        print(f"[{app_name}] ALL 10 ADVERSARIAL NATIVE VAULT TESTS PASSED!")

async def main():
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
    name = sys.argv[2] if len(sys.argv) > 2 else "Teacher"
    await run_adversarial_vault_suite(port, name)

if __name__ == "__main__":
    asyncio.run(main())
