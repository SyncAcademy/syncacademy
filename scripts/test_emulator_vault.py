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

async def test_app_vault(port, app_name):
    print(f"\n=======================================================")
    print(f"Testing SecureKeyVault on {app_name} (Port {port})")
    print(f"=======================================================")
    
    # 1. Fetch WebSocket URL from CDP /json
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    ws_url = targets[0]["webSocketDebuggerUrl"]
    print(f"Connecting to CDP WebSocket: {ws_url}")
    
    async with websockets.connect(ws_url) as ws:
        # Check plugin registration
        check_plugin = await cdp_eval(ws, "typeof window.Capacitor !== 'undefined' && typeof window.Capacitor.Plugins.SecureKeyVault !== 'undefined'")
        print(f"[{app_name}] Capacitor.Plugins.SecureKeyVault present: {check_plugin}")
        assert check_plugin is True, "SecureKeyVault plugin not found on window.Capacitor.Plugins"

        # Test 1: Uninitialized alias security level
        res1 = await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.getVaultSecurityLevel({ alias: 'sa_vault_user_test123' })")
        print(f"[{app_name}] Test 1 - Uninitialized alias security level: {res1}")
        assert res1.get("securityLevel") == "NOT_INITIALIZED", f"Expected NOT_INITIALIZED, got {res1}"

        # Test 2: Bind active session
        user_id = f"user_{app_name.lower()}_01"
        res2 = await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user_id}' }})")
        print(f"[{app_name}] Test 2 - Bind session '{user_id}': {res2}")
        assert res2.get("success") is True and res2.get("activeUser") == user_id

        # Test 3: Generate master seed for active session
        valid_alias = f"sa_vault_user_{user_id}"
        res3 = await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{ alias: '{valid_alias}' }})")
        print(f"[{app_name}] Test 3 - Create master seed for '{valid_alias}':")
        print(f"   seed length: {len(res3.get('seed', ''))} chars (hex)")
        print(f"   seed prefix: {res3.get('seed', '')[:16]}...")
        print(f"   isInsideSecureHardware: {res3.get('isInsideSecureHardware')}")
        print(f"   securityLevel: {res3.get('securityLevel')}")
        assert len(res3.get("seed", "")) == 64, "Seed must be 32 bytes (64 hex characters)"
        seed_1 = res3.get("seed")

        # Test 4: Deterministic seed retrieval (must match exactly)
        res4 = await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{ alias: '{valid_alias}' }})")
        print(f"[{app_name}] Test 4 - Deterministic retrieval match: {res4.get('seed') == seed_1}")
        assert res4.get("seed") == seed_1, "Subsequent seed retrieval must return identical seed!"

        # Test 5: Verify security level post-initialization
        res5 = await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.getVaultSecurityLevel({{ alias: '{valid_alias}' }})")
        print(f"[{app_name}] Test 5 - Initialized security level: {res5}")
        assert res5.get("securityLevel") in ["SOFTWARE", "TEE", "STRONGBOX"], f"Unexpected level {res5}"

        # Test 6: Cross-account isolation violation rejection
        alien_alias = f"sa_vault_user_alien_999"
        res6 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{ alias: '{alien_alias}' }})
                .then(r => ({{ success: true, res: r }}))
                .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 6 - Cross-account alien alias rejection: {res6}")
        assert res6.get("success") is False, "Accessing alien alias while session bound MUST fail"
        assert "Native security violation" in res6.get("error", ""), f"Unexpected error: {res6}"

        # Test 7: Unauthorized deletion of alien account rejection
        res7 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: '{alien_alias}' }})
                .then(r => ({{ success: true, res: r }}))
                .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"[{app_name}] Test 7 - Alien account key deletion rejection: {res7}")
        assert res7.get("success") is False, "Deleting alien alias while session bound MUST fail"
        assert "unauthorized deletion" in res7.get("error", ""), f"Unexpected error: {res7}"

        # Test 8: Unbind active session
        res8 = await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        print(f"[{app_name}] Test 8 - Unbind session: {res8}")
        assert res8.get("success") is True

        # Test 9: Clear master seed
        res9 = await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: '{valid_alias}' }})")
        print(f"[{app_name}] Test 9 - Clear master seed for '{valid_alias}': {res9}")
        assert res9.get("success") is True

        # Test 10: Verify alias is purged from Keystore
        res10 = await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.getVaultSecurityLevel({{ alias: '{valid_alias}' }})")
        print(f"[{app_name}] Test 10 - Post-deletion security level: {res10}")
        assert res10.get("securityLevel") == "NOT_INITIALIZED"

        print(f"[{app_name}] ALL 10 SECURE KEY VAULT NATIVE RUNTIME TESTS PASSED SUCCESSFULLY!")

async def main():
    import sys
    if len(sys.argv) > 2:
        await test_app_vault(int(sys.argv[1]), sys.argv[2])
    else:
        await test_app_vault(9222, "Teacher")

if __name__ == "__main__":
    asyncio.run(main())
