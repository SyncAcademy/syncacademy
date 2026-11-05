#!/usr/bin/env python3
import asyncio
import json
import urllib.request
import websockets
import subprocess
import time

def wait_for_devtools_socket(pid, timeout=12):
    start = time.time()
    while time.time() - start < timeout:
        out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'grep webview_devtools_remote_{pid} /proc/net/unix || true'", shell=True).decode()
        if f"webview_devtools_remote_{pid}" in out:
            return True
        time.sleep(0.5)
    return False

def refresh_forward(port, pkg):
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward --remove tcp:{port}", shell=True, stderr=subprocess.DEVNULL)
    out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'pidof {pkg}'", shell=True).decode().strip()
    pid = out.split()[0]
    wait_for_devtools_socket(pid)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward tcp:{port} localabstract:webview_devtools_remote_{pid}", shell=True, check=True)
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    return targets[0]["webSocketDebuggerUrl"]

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

async def main():
    ws_url = refresh_forward(9222, "tz.co.syncacademy.teachers")
    async with websockets.connect(ws_url) as ws:
        info = await cdp_eval(ws, """
            ({
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 500),
                cookies: document.cookie,
                inputs: Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, type: i.type, value: i.value }))
            })
        """)
        print("Page Info:", info)

        # Try logging in directly via fetch to check API response
        api_test = await cdp_eval(ws, """
            (async () => {
                try {
                    const res = await fetch('http://10.0.2.2:3101/api/v1/auth/login', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'SyncAcademy'
                        },
                        body: JSON.stringify({
                            email: 'teacher.alpha@example.test',
                            password: 'SyncPass123!',
                            role: 'TEACHER',
                            rememberMe: false
                        })
                    });
                    const data = await res.json().catch(() => ({}));
                    return { status: res.status, ok: res.ok, data };
                } catch (e) {
                    return { error: e.message || String(e) };
                }
            })()
        """)
        print("API Test:", api_test)

if __name__ == "__main__":
    asyncio.run(main())

