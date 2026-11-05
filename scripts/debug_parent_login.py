import asyncio
import json
import urllib.request
import websockets
import subprocess

def refresh_forward(port, pkg):
    out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell pidof {pkg}", shell=True).decode().strip()
    pid = out.split()[0]
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward --remove tcp:{port}", shell=True, stderr=subprocess.DEVNULL)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward tcp:{port} localabstract:webview_devtools_remote_{pid}", shell=True, check=True)
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    return targets[0]["webSocketDebuggerUrl"]

async def cdp_eval(ws, expression):
    msg_id = 100
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
            return data.get("result", {}).get("result", {}).get("value")

async def main():
    ws_url = refresh_forward(9223, "tz.co.syncacademy.parents")
    async with websockets.connect(ws_url) as ws:
        # Enable console and runtime
        await ws.send(json.dumps({"id": 1, "method": "Console.enable"}))
        await ws.send(json.dumps({"id": 2, "method": "Runtime.enable"}))
        
        # Navigate to login
        print("Navigating to /parent/login...")
        await cdp_eval(ws, "window.location.href = 'https://localhost/parent/login'")
        await asyncio.sleep(2)
        
        # Fill login
        fill_script = """
        (() => {
            const idInput = document.querySelector('#identifier');
            const pwInput = document.querySelector('#password');
            if (!idInput || !pwInput) return { error: 'Inputs not found' };

            idInput.value = '255788111222';
            idInput.dispatchEvent(new Event('input', { bubbles: true }));
            idInput.dispatchEvent(new Event('change', { bubbles: true }));

            pwInput.value = 'SyncPass123!';
            pwInput.dispatchEvent(new Event('input', { bubbles: true }));
            pwInput.dispatchEvent(new Event('change', { bubbles: true }));

            const btn = document.querySelector('.submit-btn');
            btn.click();
            return { submitted: true };
        })()
        """
        res = await cdp_eval(ws, fill_script)
        print("Submit result:", res)
        
        # Poll for 15 seconds to see where it lands and print logs
        for i in range(15):
            await asyncio.sleep(1)
            info = await cdp_eval(ws, "({ url: window.location.href, text: document.body.innerText.slice(0, 300) })")
            print(f"[{i+1}s] URL: {info.get('url')}")
            if "parent/home" in info.get("url", ""):
                print("Landed on parent/home! Content preview:\n", info.get("text"))
                break

if __name__ == "__main__":
    asyncio.run(main())

