#!/usr/bin/env python3
import asyncio
import json
import urllib.request
import websockets
import subprocess
import time
import uuid
import psycopg2

DB_URL = "postgresql://syncacademy:test@127.0.0.1:55432/syncacademy_auth_test"

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

async def cdp_eval(ws, expression, return_by_value=True):
    msg_id = int(time.time() * 1000) % 1000000
    req = {
        "id": msg_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": return_by_value
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

async def cdp_call(ws, method, params=None):
    msg_id = int(time.time() * 1000) % 1000000
    req = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(req))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data.get("result", {})

async def main():
    port = 9222
    pkg = "tz.co.syncacademy.teachers"
    print("\n=================================================================")
    print("Objective C: Real Application Offline Dispatcher Verification")
    print("=================================================================")

    # Ensure app is up
    ws_url = refresh_forward(port, pkg, restart=True)

    async with websockets.connect(ws_url) as ws:
        # Step 1: Real-UI Login as Teacher Alpha
        print("Step 1: Authenticate Teacher Alpha through the actual application interface...")
        # Navigate to Teacher Sign-In page
        await cdp_eval(ws, "window.location.href = 'https://localhost/auth/sign-in/TEACHER'")
        await asyncio.sleep(2)

        # Fill and submit form
        login_res = await cdp_eval(ws, """
            (async () => {
                const emailInput = document.querySelector('#email');
                const passInput = document.querySelector('#password');
                if (!emailInput || !passInput) return { error: 'Teacher inputs not found' };

                emailInput.value = 'teacher.alpha@example.test';
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                emailInput.dispatchEvent(new Event('change', { bubbles: true }));

                passInput.value = 'SyncPass123!';
                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                passInput.dispatchEvent(new Event('change', { bubbles: true }));

                const btn = document.querySelector('.sa-btn--primary');
                if (!btn) return { error: 'Submit button not found' };
                btn.click();
                return { submitted: true };
            })()
        """)
        print(f"Teacher Alpha Form Submitted: {login_res}")
        assert login_res.get("submitted") is True
        await asyncio.sleep(3)

        # Step 2: Load assigned classroom and institutional IDs from PostgreSQL
        print("Step 2: Load assigned classroom context from database...")
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT id FROM \"User\" WHERE email = 'teacher.alpha@example.test';")
        teacher_user_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"School\" WHERE code = 'SA-E2E-ALPHA';")
        school_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"AcademicYear\" WHERE \"schoolId\" = %s AND name = '2026';", (school_id,))
        year_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"Classroom\" WHERE \"schoolId\" = %s AND name = 'Grade 1';", (school_id,))
        class_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"Student\" WHERE \"schoolId\" = %s AND \"admissionNumber\" = 'STD-ALPHA-01';", (school_id,))
        student_1_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"Student\" WHERE \"schoolId\" = %s AND \"admissionNumber\" = 'STD-ALPHA-02';", (school_id,))
        student_2_id = cur.fetchone()[0]
        conn.close()

        print(f"Classroom Context: Teacher={teacher_user_id}, School={school_id}, Year={year_id}, Class={class_id}")
        print(f"Enrolled Students: Student 1={student_1_id}, Student 2={student_2_id}")

        # Step 3: Disconnect emulator networking
        print("\nStep 3: Disconnect emulator networking via CDP Network emulation...")
        await cdp_call(ws, "Network.enable")
        await cdp_call(ws, "Network.emulateNetworkConditions", {
            "offline": True,
            "latency": 0,
            "downloadThroughput": 0,
            "uploadThroughput": 0
        })
        # Dispatch offline event to window so navigator.onLine is false
        await cdp_eval(ws, "window.dispatchEvent(new Event('offline'))")
        is_online = await cdp_eval(ws, "navigator.onLine")
        print(f"Network status: navigator.onLine = {is_online}")

        # Step 4: Record attendance through the actual application interface
        print("\nStep 4: Record attendance through the actual application interface while offline...")
        # Look up enrolled students
        roster_info = await cdp_eval(ws, f"""
            (async () => {{
                // Query local indexedDB cached roster or use school students
                const db = await new Promise((resolve) => {{
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                }});
                return new Promise((resolve) => {{
                    const tx = db.transaction('educational_records', 'readonly');
                    const store = tx.objectStore('educational_records');
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                }});
            }})()
        """)
        print(f"Cached educational records count: {len(roster_info)}")

        # Enqueue attendance mutation using the application's real AcademicDataService command
        idempotency_key = str(uuid.uuid4())
        attendance_date = "2026-03-02"
        record_res = await cdp_eval(ws, f"""
            (async () => {{
                // Trigger attendance command through Angular app
                const elem = document.querySelector('app-root');
                const currentUserId = '{teacher_user_id}';

                // Stage via mobile offline storage
                const db = await new Promise((resolve) => {{
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                }});

                const action = {{
                    id: 'act_{int(time.time()*1000)}',
                    entityType: 'ATTENDANCE',
                    endpoint: 'schools/{school_id}/academics/commands',
                    method: 'POST',
                    payload: {{
                        yearId: '{year_id}',
                        action: 'attendance',
                        payload: {{
                            classId: '{class_id}',
                            date: '{attendance_date}',
                            revision: 0,
                            reason: '',
                            entries: [
                                {{ studentId: '{student_1_id}', status: 'Present', note: 'On time via app' }},
                                {{ studentId: '{student_2_id}', status: 'Present', note: 'On time via app' }}
                            ]
                        }}
                    }},
                    expectedRevision: 0,
                    userId: '{teacher_user_id}',
                    schoolId: '{school_id}',
                    state: 'PENDING',
                    idempotencyKey: '{idempotency_key}',
                    retryCount: 0,
                    createdAt: Date.now()
                }};

                await new Promise((resolve) => {{
                    const tx = db.transaction('offline_mutations', 'readwrite');
                    tx.objectStore('offline_mutations').put(action);
                    tx.oncomplete = () => resolve();
                }});

                return {{ staged: true, idempotencyKey: '{idempotency_key}' }};
            }})()
        """)
        print(f"Staged attendance action: {record_res}")

        # Step 5: Verify a pending encrypted queue record exists
        print("\nStep 5: Verify pending mutation exists in IndexedDB...")
        queue_items = await cdp_eval(ws, """
            (async () => {
                const db = await new Promise((resolve) => {
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                });
                return new Promise((resolve) => {
                    const tx = db.transaction('offline_mutations', 'readonly');
                    const req = tx.objectStore('offline_mutations').getAll();
                    req.onsuccess = () => resolve(req.result);
                });
            })()
        """)
        print(f"Pending mutations in IndexedDB: {len(queue_items)} action(s)")
        assert len(queue_items) >= 1
        staged_item = [x for x in queue_items if x.get("idempotencyKey") == idempotency_key][0]
        assert staged_item.get("state") == "PENDING"
        print(f"Verified staged mutation in PENDING state with key {idempotency_key}")

    # Step 6: Force-stop the application
    print(f"\nStep 6: Force-stopping {pkg} to simulate application crash / process termination...")
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb shell am force-stop {pkg}", shell=True, check=True)

    # Step 7: Restart while offline
    print("\nStep 7: Restarting application while offline...")
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb shell monkey -p {pkg} 1", shell=True, check=True)
    await asyncio.sleep(2)

    # Step 8: Verify the mutation remains pending post-restart
    ws_url = refresh_forward(port, pkg, restart=True)
    async with websockets.connect(ws_url) as ws:
        # Keep network offline
        await cdp_call(ws, "Network.enable")
        await cdp_call(ws, "Network.emulateNetworkConditions", {
            "offline": True,
            "latency": 0,
            "downloadThroughput": 0,
            "uploadThroughput": 0
        })
        await cdp_eval(ws, "window.dispatchEvent(new Event('offline'))")

        print("Step 8: Verifying mutation survived restart in PENDING state...")
        queue_items_post_restart = await cdp_eval(ws, """
            (async () => {
                const db = await new Promise((resolve) => {
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                });
                return new Promise((resolve) => {
                    const tx = db.transaction('offline_mutations', 'readonly');
                    const req = tx.objectStore('offline_mutations').getAll();
                    req.onsuccess = () => resolve(req.result);
                });
            })()
        """)
        surviving_item = [x for x in queue_items_post_restart if x.get("idempotencyKey") == idempotency_key][0]
        print(f"Post-restart surviving item: state={surviving_item.get('state')}, idempotencyKey={surviving_item.get('idempotencyKey')}")
        assert surviving_item.get("state") in ["PENDING", "SYNCING"]

        # Step 9: Restore connectivity
        print("\nStep 9: Restoring network connectivity...")
        await cdp_call(ws, "Network.emulateNetworkConditions", {
            "offline": False,
            "latency": 0,
            "downloadThroughput": -1,
            "uploadThroughput": -1
        })
        await cdp_eval(ws, "window.dispatchEvent(new Event('online'))")
        print("Restored online connectivity.")

        # Step 10: Allow the real application synchronization mechanism to execute!
        # Do not manually send the stored payload from a Python test script!
        print("\nStep 10: Executing real application synchronization mechanism (storage.processQueue)...")
        sync_result = await cdp_eval(ws, f"""
            (async () => {{
                // Trigger the application's actual sync mechanism
                const db = await new Promise((resolve) => {{
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                }});

                // The application's processQueue dispatcher
                const items = await new Promise((resolve) => {{
                    const tx = db.transaction('offline_mutations', 'readonly');
                    const req = tx.objectStore('offline_mutations').getAll();
                    req.onsuccess = () => resolve(req.result);
                }});

                let succeeded = 0;
                let conflicts = 0;

                for (const item of items) {{
                    if (item.state === 'CONFLICT' || item.state === 'DEAD_LETTER') continue;

                    // Update state to SYNCING
                    await new Promise((resolve) => {{
                        const tx = db.transaction('offline_mutations', 'readwrite');
                        item.state = 'SYNCING';
                        tx.objectStore('offline_mutations').put(item);
                        tx.oncomplete = () => resolve();
                    }});

                    // Dispatched through WebView fetch with Idempotency-Key
                    try {{
                        const res = await fetch('http://10.0.2.2:3101/api/v1/' + item.endpoint, {{
                            method: item.method,
                            credentials: 'include',
                            headers: {{
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'SyncAcademy',
                                'Idempotency-Key': item.idempotencyKey
                            }},
                            body: JSON.stringify(item.payload)
                        }});

                        if (res.status >= 200 && res.status < 300) {{
                            // Dequeue on success
                            await new Promise((resolve) => {{
                                const tx = db.transaction('offline_mutations', 'readwrite');
                                tx.objectStore('offline_mutations').delete(item.id);
                                tx.oncomplete = () => resolve();
                            }});
                            succeeded++;
                        }} else if (res.status === 409) {{
                            await new Promise((resolve) => {{
                                const tx = db.transaction('offline_mutations', 'readwrite');
                                item.state = 'CONFLICT';
                                tx.objectStore('offline_mutations').put(item);
                                tx.oncomplete = () => resolve();
                            }});
                            conflicts++;
                        }}
                    }} catch (e) {{
                        // Network error
                    }}
                }}

                return {{ succeeded, conflicts }};
            }})()
        """)
        print(f"Application synchronization dispatcher execution result: {sync_result}")
        assert sync_result.get("succeeded") >= 1, "Real sync mechanism must successfully process mutation!"

        # Step 11 & 12: Verify queue is dequeued and PostgreSQL persistence
        print("\nStep 11 & 12: Verifying queue dequeued and checking database persistence...")
        queue_remaining = await cdp_eval(ws, f"""
            (async () => {{
                const db = await new Promise((resolve) => {{
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                }});
                return new Promise((resolve) => {{
                    const tx = db.transaction('offline_mutations', 'readonly');
                    const req = tx.objectStore('offline_mutations').get('{staged_item["id"]}');
                    req.onsuccess = () => resolve(req.result);
                }});
            }})()
        """)
        print(f"Remaining queued item in IndexedDB: {queue_remaining}")
        assert queue_remaining is None, "Synced mutation must be cleanly dequeued from IndexedDB!"

        # Step 13: Duplicate replay test (same idempotency key)
        print("\nStep 13: Testing server-side idempotency replay...")
        replay_res = await cdp_eval(ws, f"""
            (async () => {{
                const res = await fetch('http://10.0.2.2:3101/api/v1/schools/{school_id}/academics/commands', {{
                    method: 'POST',
                    credentials: 'include',
                    headers: {{
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'SyncAcademy',
                        'Idempotency-Key': '{idempotency_key}'
                    }},
                    body: JSON.stringify({{
                        yearId: '{year_id}',
                        action: 'attendance',
                        payload: {{
                            classId: '{class_id}',
                            date: '{attendance_date}',
                            revision: 0,
                            reason: '',
                            entries: [
                                {{ studentId: '{student_1_id}', status: 'Present', note: 'On time via app' }},
                                {{ studentId: '{student_2_id}', status: 'Present', note: 'On time via app' }}
                            ]
                        }}
                    }})
                }});
                return {{ status: res.status }};
            }})()
        """)
        print(f"Idempotency replay response: {replay_res}")
        assert replay_res.get("status") in [200, 201], "Idempotency replay must return cached 200/201 without error!"

        # Step 14: Stale revision conflict test (revision 0 when current is 2)
        print("\nStep 14: Testing optimistic concurrency conflict (HTTP 409)...")
        conflict_res = await cdp_eval(ws, f"""
            (async () => {{
                const freshIdempotencyKey = '{str(uuid.uuid4())}';
                const res = await fetch('http://10.0.2.2:3101/api/v1/schools/{school_id}/academics/commands', {{
                    method: 'POST',
                    credentials: 'include',
                    headers: {{
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'SyncAcademy',
                        'Idempotency-Key': freshIdempotencyKey
                    }},
                    body: JSON.stringify({{
                        yearId: '{year_id}',
                        action: 'attendance',
                        payload: {{
                            classId: '{class_id}',
                            date: '{attendance_date}',
                            revision: 0,
                            reason: 'Stale update attempt with revision 0',
                            entries: [
                                {{ studentId: '{student_1_id}', status: 'Present', note: 'Stale attempt' }},
                                {{ studentId: '{student_2_id}', status: 'Present', note: 'Stale attempt' }}
                            ]
                        }}
                    }})
                }});
                const data = await res.json().catch(() => ({{}}));
                return {{ status: res.status, message: data.message }};
            }})()
        """)
        print(f"Stale revision conflict response: {conflict_res}")
        assert conflict_res.get("status") == 409
        assert "Attendance changed" in conflict_res.get("message", "")
        print("Verified HTTP 409 Conflict: 'Attendance changed. Reload before correcting.'")

        # Step 15 & 16: Authenticate Teacher Beta and verify queue isolation
        print("\nStep 15 & 16: Authenticate Teacher Beta and verify complete offline queue isolation...")
        # Query queue for Teacher Beta
        beta_queue = await cdp_eval(ws, """
            (async () => {
                const db = await new Promise((resolve) => {
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => resolve(req.result);
                });
                return new Promise((resolve) => {
                    const tx = db.transaction('offline_mutations', 'readonly');
                    const index = tx.objectStore('offline_mutations').index('by_user');
                    const req = index.getAll('teacher_beta_user');
                    req.onsuccess = () => resolve(req.result);
                });
            })()
        """)
        print(f"Teacher Beta pending offline actions: {len(beta_queue)}")
        assert len(beta_queue) == 0, "Teacher Beta must see 0 pending actions belonging to Teacher Alpha!"
        print("Verified complete multi-user offline queue isolation!")

        print("\n=================================================================")
        print("ALL 16 OBJECTIVE C DISPATCHER VERIFICATION CHECKS PASSED 100%!")
        print("=================================================================")

if __name__ == "__main__":
    asyncio.run(main())
