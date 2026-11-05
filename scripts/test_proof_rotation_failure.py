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

async def test_rotation(port, app_name):
    pkg = "tz.co.syncacademy.teachers" if app_name == "Teacher" else "tz.co.syncacademy.parents"
    out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'ps -A | grep {pkg}'", shell=True).decode()
    pid = out.strip().split()[1]
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward --remove tcp:{port}", shell=True, stderr=subprocess.DEVNULL)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward tcp:{port} localabstract:webview_devtools_remote_{pid}", shell=True, check=True)

    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    ws_url = targets[0]["webSocketDebuggerUrl"]

    async with websockets.connect(ws_url) as ws:
        user = "test_user_rotation_123"
        alias = f"sa_vault_user_{user}"
        proof_session_1 = "session_token_day_1_abcdef123456"
        proof_session_2 = "session_token_day_2_987654fedcba"

        # 1. Clean any existing key
        await cdp_eval(ws, f"""
            (async () => {{
                await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user}', sessionProof: '{proof_session_1}' }});
                await window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: '{alias}' }});
                await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();
            }})()
        """)

        # 2. Login Session 1: Bind and generate seed
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user}', sessionProof: '{proof_session_1}' }})")
        res_seed_1 = await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{ alias: '{alias}' }})")
        seed_1 = res_seed_1.get("seed")
        print(f"Session 1: Generated master seed: {seed_1[:16]}...")
        assert len(seed_1) == 64

        # 3. Logout
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        print("Logged out cleanly (vault unbind).")

        # 4. Login Session 2: User logs in again, server issues proof_session_2
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user}', sessionProof: '{proof_session_2}' }})")
        print("Session 2: Bound active session with new rotated session token.")

        # 5. Attempt to retrieve existing master seed
        res_seed_2 = await cdp_eval(ws, f"""
            window.Capacitor.Plugins.SecureKeyVault.getOrCreateMasterSeed({{
                alias: '{alias}'
            }}).then(r => ({{ success: true, seed: r.seed }}))
              .catch(err => ({{ success: false, error: err.message || err }}))
        """)
        print(f"Session 2: Result of recovering master seed: {res_seed_2}")

        # Cleanup
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{ userId: '{user}', sessionProof: '{proof_session_1}' }})")
        await cdp_eval(ws, f"window.Capacitor.Plugins.SecureKeyVault.clearMasterSeed({{ alias: '{alias}' }})")
        await cdp_eval(ws, "window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession()")

if __name__ == "__main__":
    asyncio.run(test_rotation(9222, "Teacher"))

