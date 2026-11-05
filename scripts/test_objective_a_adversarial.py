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

async def run_objective_a_audit(port, app_name):
    print(f"\n=================================================================")
    print(f"Objective A: Session Proof Trust Model Audit - {app_name} (Port {port})")
    print(f"=================================================================")

    pkg = "tz.co.syncacademy.teachers" if app_name == "Teacher" else "tz.co.syncacademy.parents"
    out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'ps -A | grep {pkg}'", shell=True).decode()
    pid = out.strip().split()[1]
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward --remove tcp:{port}", shell=True, stderr=subprocess.DEVNULL)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward tcp:{port} localabstract:webview_devtools_remote_{pid}", shell=True, check=True)

    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    ws_url = targets[0]["webSocketDebuggerUrl"]

    async with websockets.connect(ws_url) as ws:
        # Start from clean unbind
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")

        # Test 1: Attempt to bind an arbitrary user ID with a fabricated proof
        # Check: Does native plugin accept a completely fabricated userId and proof?
        res_t1 = await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({
                userId: 'arbitrary_fake_user_999',
                sessionProof: 'completely_fabricated_client_side_proof_string'
            }).then(r => ({ success: true, res: r }))
              .catch(e => ({ success: false, error: e.message || e }))
        """)
        print(f"[Adv 1] Bind arbitrary user ID with fabricated proof: {res_t1}")

        # Test 2: Attempt to bind another user's identity
        # While unbound, can caller bind victim_user_id with fabricated proof?
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        res_t2 = await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({
                userId: 'victim_school_principal_id',
                sessionProof: 'unauthenticated_attacker_session_proof_123'
            }).then(r => ({ success: true, res: r }))
              .catch(e => ({ success: false, error: e.message || e }))
        """)
        print(f"[Adv 2] Bind victim user identity: {res_t2}")

        # Test 3: Attempt to rebind without a legitimate authentication transition
        # Caller is currently bound to victim_school_principal_id.
        # Direct attempt to switch to 'attacker_user_id' while bound
        res_t3 = await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({
                userId: 'attacker_user_id',
                sessionProof: 'attacker_session_proof_456'
            }).then(r => ({ success: true, res: r }))
              .catch(e => ({ success: false, error: e.message || e }))
        """)
        print(f"[Adv 3] Direct rebinding without unbind: {res_t3}")

        # Test 4: Attempt to reuse an expired proof
        # Check: Can an old/expired proof string be supplied to unlock/bind?
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        expired_proof = "expired_session_token_from_30_days_ago_123456"
        res_t4 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: 'user_with_expired_session',
                sessionProof: '{expired_proof}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(e => ({{ success: false, error: e.message || e }}))
        """)
        print(f"[Adv 4] Reuse expired proof: {res_t4}")

        # Test 5: Attempt to reuse a revoked session proof
        # Check: Can a revoked session token be supplied to unlock/bind?
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        revoked_proof = "revoked_parent_mobile_session_token_999888777"
        res_t5 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: 'user_with_revoked_session',
                sessionProof: '{revoked_proof}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(e => ({{ success: false, error: e.message || e }}))
        """)
        print(f"[Adv 5] Reuse revoked session proof: {res_t5}")

        # Test 6: Attempt to replay a proof from another account
        # User B supplies User A's session token to bind User B
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        proof_user_a = "genuine_token_belonging_to_user_alpha_112233"
        res_t6 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: 'user_beta',
                sessionProof: '{proof_user_a}'
            }}).then(r => ({{ success: true, res: r }}))
              .catch(e => ({{ success: false, error: e.message || e }}))
        """)
        print(f"[Adv 6] Replay proof from another account (User B uses User A's proof): {res_t6}")

        # Test 7: Attempt to access and delete another account's vault
        # Setup: Create User Alpha's seed
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        await cdp_eval(ws, """
            (async () => {
                await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({
                    userId: 'legit_user_alpha',
                    sessionProof: 'legit_session_proof_for_alpha_12345'
                });
                await window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({
                    alias: 'sa_vault_user_legit_user_alpha'
                });
                await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();
            })()
        """)
        # Now bind as User Beta and attempt to read or delete User Alpha's key
        await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({
                userId: 'alien_user_beta',
                sessionProof: 'session_proof_for_beta_678901'
            })
        """)
        res_t7_read = await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({
                alias: 'sa_vault_user_legit_user_alpha'
            }).then(r => ({ success: true, res: r }))
              .catch(e => ({ success: false, error: e.message || e }))
        """)
        res_t7_del = await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({
                alias: 'sa_vault_user_legit_user_alpha'
            }).then(r => ({ success: true, res: r }))
              .catch(e => ({ success: false, error: e.message || e }))
        """)
        print(f"[Adv 7a] User Beta read User Alpha vault: {res_t7_read}")
        print(f"[Adv 7b] User Beta delete User Alpha vault: {res_t7_del}")

        # Test 8: Attempt to access the vault after logout
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        res_t8 = await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({
                alias: 'sa_vault_user_legit_user_alpha'
            }).then(r => ({ success: true, res: r }))
              .catch(e => ({ success: false, error: e.message || e }))
        """)
        print(f"[Adv 8] Access vault after logout: {res_t8}")

        # Test 9: Attempt to bind a new account after logout without authenticating again
        res_t9 = await cdp_eval(ws, """
            window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({
                userId: 'new_unauthenticated_user_777',
                sessionProof: 'fabricated_post_logout_string_123'
            }).then(r => ({ success: true, res: r }))
              .catch(e => ({ success: false, error: e.message || e }))
        """)
        print(f"[Adv 9] Bind new account post-logout without authenticating: {res_t9}")

        # Cleanup
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        await cdp_eval(ws, """
            (async () => {
                await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({
                    userId: 'legit_user_alpha',
                    sessionProof: 'legit_session_proof_for_alpha_12345'
                });
                await window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({
                    alias: 'sa_vault_user_legit_user_alpha'
                });
                await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();
            })()
        """)

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
    name = sys.argv[2] if len(sys.argv) > 2 else "Teacher"
    asyncio.run(run_objective_a_audit(port, name))

