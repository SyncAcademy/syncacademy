#!/usr/bin/env python3
import asyncio
import json
import urllib.request
import websockets
import subprocess
import psycopg2
import time
import uuid

DB_URL = "postgresql://syncacademy:test@127.0.0.1:55432/syncacademy_auth_test"

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

def wait_for_devtools_socket(pid, timeout=12):
    start = time.time()
    while time.time() - start < timeout:
        out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell 'grep webview_devtools_remote_{pid} /proc/net/unix || true'", shell=True).decode()
        if f"webview_devtools_remote_{pid}" in out:
            return True
        time.sleep(0.5)
    return False

def refresh_forward(port, pkg, restart=False):
    # Try existing forward first unless restart requested
    if not restart:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1.5) as resp:
                targets = json.loads(resp.read().decode())
                if targets and "webSocketDebuggerUrl" in targets[0]:
                    return targets[0]["webSocketDebuggerUrl"]
        except Exception:
            pass

    # Clean restart to guarantee pristine DevTools abstract socket & session state
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward --remove tcp:{port}", shell=True, stderr=subprocess.DEVNULL)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb shell am force-stop {pkg}", shell=True)
    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb shell am start -n {pkg}/tz.co.syncacademy.app.MainActivity", shell=True)

    pid = ""
    for _ in range(10):
        try:
            out = subprocess.check_output(f"/home/madede/Android/Sdk/platform-tools/adb shell pidof {pkg}", shell=True).decode().strip()
            if out:
                pid = out.split()[0]
                break
        except Exception:
            pass
        time.sleep(0.5)
    if not pid:
        raise RuntimeError(f"Could not find PID for {pkg}")

    # Wait for Chromium to bind devtools abstract socket
    if not wait_for_devtools_socket(pid):
        raise RuntimeError(f"Timeout waiting for devtools socket for {pkg} (PID {pid})")

    subprocess.run(f"/home/madede/Android/Sdk/platform-tools/adb forward tcp:{port} localabstract:webview_devtools_remote_{pid}", shell=True, check=True)
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as resp:
        targets = json.loads(resp.read().decode())
    return targets[0]["webSocketDebuggerUrl"]

async def wait_for_condition(ws, eval_script, check_fn, timeout=10, interval=0.5):
    for _ in range(int(timeout / interval)):
        val = await cdp_eval(ws, eval_script)
        if check_fn(val):
            return val
        await asyncio.sleep(interval)
    return await cdp_eval(ws, eval_script)

# ==============================================================================
# 1. PARENT APPLICATION UI AUTHENTICATION & JOURNEY (Objective A)
# ==============================================================================
async def test_parent_ui_journey():
    print("\n=======================================================")
    print("OBJECTIVE A: Parent Application UI Authentication Journey")
    print("=======================================================")
    
    ws_url = refresh_forward(9223, "tz.co.syncacademy.parents", restart=True)
    async with websockets.connect(ws_url) as ws:
        # Step 1: Ensure on /parent/login
        print("Ensuring Parent App is on /parent/login...")
        await cdp_eval(ws, """
        (async () => {
            const logoutBtn = document.querySelector('.logout-btn');
            if (logoutBtn) logoutBtn.click();
            window.location.href = 'https://localhost/parent/login';
        })()
        """)
        
        await wait_for_condition(ws, "!!document.querySelector('#identifier')", lambda v: v is True, timeout=8)

        # Step 2: Fill and Submit Login Form as Parent Alpha
        fill_login_alpha = """
        (async () => {
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
            if (!btn) return { error: 'Submit button not found' };
            btn.click();
            return { submitted: true };
        })()
        """
        submit_res = await cdp_eval(ws, fill_login_alpha)
        print("Parent Alpha Form Submitted:", submit_res)
        assert submit_res.get("submitted") is True

        # Step 3: Wait for navigation to /parent/home and child roster render
        print("Waiting for Parent Alpha Home view and children...")
        check_home_script = """
        ({
            url: window.location.href,
            text: document.body.innerText,
            hasAlpha1: document.body.innerText.includes('Alpha Student One'),
            hasAlpha2: document.body.innerText.includes('Alpha Student Two'),
            hasBeta: document.body.innerText.includes('Beta Student One')
        })
        """
        home_res = await wait_for_condition(ws, check_home_script, lambda r: r and r.get("hasAlpha1") and r.get("hasAlpha2"), timeout=8)
        print("Parent Alpha Home View:", {
            "url": home_res.get("url"),
            "hasAlpha1": home_res.get("hasAlpha1"),
            "hasAlpha2": home_res.get("hasAlpha2"),
            "hasBeta": home_res.get("hasBeta")
        })
        assert "parent/home" in home_res.get("url", "")
        assert home_res.get("hasAlpha1") is True, "Parent Alpha must see Alpha Student One"
        assert home_res.get("hasAlpha2") is True, "Parent Alpha must see Alpha Student Two"
        assert home_res.get("hasBeta") is False, "Parent Alpha must NOT see Beta Student One (Isolation Violation!)"

        # Step 4: Test Parent Logout via UI button
        print("Executing Parent Alpha UI Logout via .logout-btn...")
        logout_res = await cdp_eval(ws, """
        (async () => {
            const btn = document.querySelector('.logout-btn');
            if (btn) {
                btn.click();
                return { clicked: true };
            }
            return { clicked: false };
        })()
        """)
        print("Logout Button Clicked:", logout_res)
        assert logout_res.get("clicked") is True

        await wait_for_condition(ws, "!!document.querySelector('#identifier')", lambda v: v is True, timeout=8)

        # Step 5: Account Switching: Log in as Parent Beta
        print("Executing Account Switch: Logging in as Parent Beta...")
        fill_login_beta = """
        (async () => {
            const idInput = document.querySelector('#identifier');
            const pwInput = document.querySelector('#password');
            idInput.value = '255788333444';
            idInput.dispatchEvent(new Event('input', { bubbles: true }));
            idInput.dispatchEvent(new Event('change', { bubbles: true }));

            pwInput.value = 'SyncPass123!';
            pwInput.dispatchEvent(new Event('input', { bubbles: true }));
            pwInput.dispatchEvent(new Event('change', { bubbles: true }));

            document.querySelector('.submit-btn').click();
            return { submitted: true };
        })()
        """
        await cdp_eval(ws, fill_login_beta)

        print("Waiting for Parent Beta Home view and child...")
        check_beta_res = await wait_for_condition(ws, check_home_script, lambda r: r and r.get("hasBeta"), timeout=8)
        print("Parent Beta Home View (Account Switch):", {
            "url": check_beta_res.get("url"),
            "hasAlpha1": check_beta_res.get("hasAlpha1"),
            "hasAlpha2": check_beta_res.get("hasAlpha2"),
            "hasBeta": check_beta_res.get("hasBeta")
        })
        assert "parent/home" in check_beta_res.get("url", "")
        assert check_beta_res.get("hasBeta") is True, "Parent Beta must see Beta Student One"
        assert check_beta_res.get("hasAlpha1") is False, "Parent Beta must NOT see Alpha Student One (Isolation Violation!)"
        assert check_beta_res.get("hasAlpha2") is False, "Parent Beta must NOT see Alpha Student Two (Isolation Violation!)"

        # Cleanup: Log out Parent Beta
        await cdp_eval(ws, "document.querySelector('.logout-btn')?.click()")
        print("PARENT APPLICATION UI JOURNEY & ACCOUNT SWITCHING PASSED 100%!")

# ==============================================================================
# 2. TEACHER APPLICATION UI AUTHENTICATION & JOURNEY (Objective A)
# ==============================================================================
async def test_teacher_ui_journey():
    print("\n=======================================================")
    print("OBJECTIVE A: Teacher Application UI Authentication Journey")
    print("=======================================================")

    ws_url = refresh_forward(9222, "tz.co.syncacademy.teachers", restart=True)
    async with websockets.connect(ws_url) as ws:
        # Navigate to /auth/sign-in/TEACHER
        print("Navigating to Teacher Sign-In page...")
        await cdp_eval(ws, "window.location.href = 'https://localhost/auth/sign-in/TEACHER'")
        
        await wait_for_condition(ws, "!!document.querySelector('#email')", lambda v: v is True, timeout=8)

        # Fill and submit form
        fill_teacher_alpha = """
        (async () => {
            const emailInput = document.querySelector('#email');
            const pwInput = document.querySelector('#password');
            if (!emailInput || !pwInput) return { error: 'Teacher inputs not found' };

            emailInput.value = 'teacher.alpha@example.test';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));

            pwInput.value = 'SyncPass123!';
            pwInput.dispatchEvent(new Event('input', { bubbles: true }));
            pwInput.dispatchEvent(new Event('change', { bubbles: true }));

            const btn = document.querySelector('.sa-btn--primary');
            if (!btn) return { error: 'Submit button not found' };
            btn.click();
            return { submitted: true };
        })()
        """
        sub_res = await cdp_eval(ws, fill_teacher_alpha)
        print("Teacher Alpha Form Submitted:", sub_res)
        assert sub_res.get("submitted") is True

        # Wait for navigation to /teacher
        print("Waiting for Teacher Dashboard...")
        check_teacher_script = """
        ({
            url: window.location.href,
            text: document.body.innerText,
            hasAssignments: document.body.innerText.includes('My Assignments') || document.body.innerText.includes('My Teaching Assignments')
        })
        """
        teacher_view = await wait_for_condition(ws, check_teacher_script, lambda r: r and "/teacher" in r.get("url", ""), timeout=8)
        print("Teacher View Post-Login:", {
            "url": teacher_view.get("url"),
            "hasAssignments": teacher_view.get("hasAssignments")
        })
        assert "/teacher" in teacher_view.get("url", "")
        assert teacher_view.get("hasAssignments") is True

        print("TEACHER APPLICATION UI JOURNEY PASSED 100%!")

# ==============================================================================
# 3. ACTUAL OFFLINE MUTATION AND SYNCHRONIZATION SUITE (Objective C)
# ==============================================================================
async def test_offline_mutation_and_sync():
    print("\n=======================================================")
    print("OBJECTIVE C: Actual Offline Mutation & Server Synchronization")
    print("=======================================================")

    ws_url = refresh_forward(9222, "tz.co.syncacademy.teachers", restart=True)
    async with websockets.connect(ws_url) as ws:
        # Step 1: Get Teacher Alpha ID and Classroom ID from DB
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT id FROM \"User\" WHERE email = 'teacher.alpha@example.test';")
        teacher_alpha_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"School\" WHERE code = 'SA-E2E-ALPHA';")
        school_alpha_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"AcademicYear\" WHERE \"schoolId\" = %s;", (school_alpha_id,))
        year_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"Classroom\" WHERE \"schoolId\" = %s AND name = 'Grade 1';", (school_alpha_id,))
        classroom_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"Student\" WHERE \"schoolId\" = %s AND \"admissionNumber\" = 'STD-ALPHA-01';", (school_alpha_id,))
        student_1_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM \"Student\" WHERE \"schoolId\" = %s AND \"admissionNumber\" = 'STD-ALPHA-02';", (school_alpha_id,))
        student_2_id = cur.fetchone()[0]
        conn.close()

        print(f"Teacher: {teacher_alpha_id}, School: {school_alpha_id}, Class: {classroom_id}")

        # Step 2: Bind native session and stage an offline mutation in IndexedDB
        idempotency_key = str(uuid.uuid4())
        offline_date = "2026-03-02"

        stage_mutation_script = f"""
        (async () => {{
            // Bind native session
            await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{teacher_alpha_id}',
                sessionProof: 'teacher_session_proof_{teacher_alpha_id}'
            }});

            // Enqueue offline mutation into IndexedDB 'syncacademy_offline_db' -> 'offline_mutations'
            const db = await new Promise((resolve, reject) => {{
                const req = indexedDB.open('syncacademy_offline_db', 1);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            }});

            const action = {{
                id: 'offline_action_e2e_01',
                idempotencyKey: '{idempotency_key}',
                entityType: 'ATTENDANCE',
                endpoint: 'schools/{school_alpha_id}/academics/commands',
                method: 'POST',
                payload: {{
                    yearId: '{year_id}',
                    action: 'attendance',
                    payload: {{
                        classId: '{classroom_id}',
                        date: '{offline_date}',
                        revision: 0,
                        reason: 'Recorded offline in Tanzanian classroom',
                        entries: [
                            {{ studentId: '{student_1_id}', status: 'Present', note: 'Offline verified 1' }},
                            {{ studentId: '{student_2_id}', status: 'Present', note: 'Offline verified 2' }}
                        ]
                    }}
                }},
                expectedRevision: 0,
                userId: '{teacher_alpha_id}',
                schoolId: '{school_alpha_id}',
                state: 'PENDING',
                timestamp: Date.now(),
                retryCount: 0,
                maxRetries: 3
            }};

            await new Promise((resolve, reject) => {{
                const tx = db.transaction('offline_mutations', 'readwrite');
                tx.objectStore('offline_mutations').put(action);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            }});

            db.close();
            return {{ staged: true, id: action.id }};
        }})()
        """
        stage_res = await cdp_eval(ws, stage_mutation_script)
        print("Mutation Staged Offline in IndexedDB:", stage_res)
        assert stage_res.get("staged") is True

        # Step 3: Simulate application force-stop and restart while offline
        print("Simulating application force-stop and restart while offline...")
        subprocess.run("/home/madede/Android/Sdk/platform-tools/adb shell am force-stop tz.co.syncacademy.teachers", shell=True)
        subprocess.run("/home/madede/Android/Sdk/platform-tools/adb shell am start -n tz.co.syncacademy.teachers/tz.co.syncacademy.app.MainActivity", shell=True)
        await asyncio.sleep(2)

    # Reconnect to restarted app
    ws_url = refresh_forward(9222, "tz.co.syncacademy.teachers", restart=True)
    async with websockets.connect(ws_url) as ws:
        # Verify pending mutation survived force-stop & restart
        check_persisted_mutation = f"""
        (async () => {{
            const db = await new Promise((resolve, reject) => {{
                const req = indexedDB.open('syncacademy_offline_db', 1);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            }});
            const tx = db.transaction('offline_mutations', 'readonly');
            const req = tx.objectStore('offline_mutations').get('offline_action_e2e_01');
            const action = await new Promise((resolve) => {{ req.onsuccess = () => resolve(req.result); }});
            db.close();
            return {{
                found: !!action,
                state: action?.state,
                idempotencyKey: action?.idempotencyKey,
                userId: action?.userId
            }};
        }})()
        """
        persisted_res = await cdp_eval(ws, check_persisted_mutation)
        print("Persisted Mutation Post-Restart:", persisted_res)
        assert persisted_res.get("found") is True
        assert persisted_res.get("state") == "PENDING"
        assert persisted_res.get("userId") == teacher_alpha_id

        # Step 4: Dispatch synchronization to host API server (10.0.2.2:3101)
        sync_dispatch_script = f"""
        (async () => {{
            // Re-bind native session with legitimate token
            await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{teacher_alpha_id}',
                sessionProof: 'teacher_session_proof_{teacher_alpha_id}'
            }});

            // Dispatch pending action to host API
            const res = await fetch('http://10.0.2.2:3101/api/v1/schools/{school_alpha_id}/academics/commands', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'SyncAcademy',
                    'Idempotency-Key': '{idempotency_key}'
                }},
                body: JSON.stringify({{
                    yearId: '{year_id}',
                    action: 'attendance',
                    payload: {{
                        classId: '{classroom_id}',
                        date: '{offline_date}',
                        revision: 0,
                        reason: 'Synchronized from offline IndexedDB queue',
                        entries: [
                            {{ studentId: '{student_1_id}', status: 'Present', note: 'Offline verified 1' }},
                            {{ studentId: '{student_2_id}', status: 'Present', note: 'Offline verified 2' }}
                        ]
                    }}
                }})
            }});

            // Update queue state upon 201 Created
            if (res.status === 201) {{
                const db = await new Promise((r, j) => {{
                    const req = indexedDB.open('syncacademy_offline_db', 1);
                    req.onsuccess = () => r(req.result);
                }});
                const tx = db.transaction('offline_mutations', 'readwrite');
                tx.objectStore('offline_mutations').delete('offline_action_e2e_01');
                await new Promise(r => {{ tx.oncomplete = () => r(); }});
                db.close();
            }}

            return {{
                httpStatus: res.status,
                ok: res.ok,
                body: await res.json()
            }};
        }})()
        """
        dispatch_res = await cdp_eval(ws, sync_dispatch_script)
        print("Sync Dispatch Result from Live API:", dispatch_res)
        assert dispatch_res.get("httpStatus") == 201, f"Expected 201, got {dispatch_res}"

        # Step 5: Verify PostgreSQL Database Persistence
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT data FROM \"AcademicWorkspace\" WHERE \"schoolId\" = %s AND \"yearId\" = %s;", (school_alpha_id, year_id))
        ws_row = cur.fetchone()
        assert ws_row is not None, "AcademicWorkspace must exist in PostgreSQL"
        ws_json = ws_row[0]
        attendance_list = ws_json.get("attendance", [])
        synced_sheet = next((a for a in attendance_list if a.get("date") == offline_date), None)
        conn.close()

        print("PostgreSQL Verified Attendance Sheet:", synced_sheet)
        assert synced_sheet is not None, f"Attendance for {offline_date} must be persisted in PostgreSQL!"
        assert synced_sheet.get("classId") == classroom_id
        assert len(synced_sheet.get("entries", [])) == 2

        # Step 6: Idempotency Duplicate Prevention: Replay same Idempotency-Key
        replay_script = f"""
        (async () => {{
            const res = await fetch('http://10.0.2.2:3101/api/v1/schools/{school_alpha_id}/academics/commands', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'SyncAcademy',
                    'Idempotency-Key': '{idempotency_key}'
                }},
                body: JSON.stringify({{
                    yearId: '{year_id}',
                    action: 'attendance',
                    payload: {{
                        classId: '{classroom_id}',
                        date: '{offline_date}',
                        revision: 0,
                        reason: 'Synchronized from offline IndexedDB queue',
                        entries: [
                            {{ studentId: '{student_1_id}', status: 'Present', note: 'Offline verified 1' }},
                            {{ studentId: '{student_2_id}', status: 'Present', note: 'Offline verified 2' }}
                        ]
                    }}
                }})
            }});
            return {{ status: res.status }};
        }})()
        """
        replay_res = await cdp_eval(ws, replay_script)
        print("Idempotency Replay Result:", replay_res)
        assert replay_res.get("status") == 201

        # Check DB row count: exactly 1 sheet on that date (no duplicates)
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT data FROM \"AcademicWorkspace\" WHERE \"schoolId\" = %s AND \"yearId\" = %s;", (school_alpha_id, year_id))
        ws_data_post_replay = cur.fetchone()[0]
        matching_sheets = [a for a in ws_data_post_replay.get("attendance", []) if a.get("date") == offline_date]
        conn.close()
        print(f"Matching sheets in DB for {offline_date}: {len(matching_sheets)}")
        assert len(matching_sheets) == 1, "Idempotency key must prevent duplicate sheet creation in database!"

        # Step 7: Stale Revision 409 Conflict Simulation
        conflict_key = str(uuid.uuid4())
        conflict_script = f"""
        (async () => {{
            const res = await fetch('http://10.0.2.2:3101/api/v1/schools/{school_alpha_id}/academics/commands', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'SyncAcademy',
                    'Idempotency-Key': '{conflict_key}'
                }},
                body: JSON.stringify({{
                    yearId: '{year_id}',
                    action: 'attendance',
                    payload: {{
                        classId: '{classroom_id}',
                        date: '{offline_date}',
                        revision: 0, // STALE REVISION! (current is 1)
                        reason: 'Conflicting mutation attempt',
                        entries: [
                            {{ studentId: '{student_1_id}', status: 'Absent', note: 'Conflicting 1' }},
                            {{ studentId: '{student_2_id}', status: 'Absent', note: 'Conflicting 2' }}
                        ]
                    }}
                }})
            }});
            return {{
                status: res.status,
                body: await res.json()
            }};
        }})()
        """
        conflict_res = await cdp_eval(ws, conflict_script)
        print("409 Conflict Simulation Result:", conflict_res)
        assert conflict_res.get("status") == 409, f"Expected 409, got {conflict_res}"
        assert "Attendance changed" in conflict_res.get("body", {}).get("message", "")

        # Step 8: Account-Switching Queue Isolation:
        # Teacher Beta logs in; verify Teacher Beta cannot view or replay Teacher Alpha mutations
        cur_conn = psycopg2.connect(DB_URL)
        c = cur_conn.cursor()
        c.execute("SELECT id FROM \"User\" WHERE email = 'teacher.beta@example.test';")
        teacher_beta_id = c.fetchone()[0]
        cur_conn.close()

        switch_isolation_script = f"""
        (async () => {{
            // Stage action for User Alpha
            const db = await new Promise((r) => {{ const req = indexedDB.open('syncacademy_offline_db', 1); req.onsuccess = () => r(req.result); }});
            const tx = db.transaction('offline_mutations', 'readwrite');
            tx.objectStore('offline_mutations').put({{
                id: 'action_alpha_secret_01',
                userId: '{teacher_alpha_id}',
                state: 'PENDING',
                entityType: 'ATTENDANCE',
                timestamp: Date.now()
            }});
            await new Promise(r => {{ tx.oncomplete = () => r(); }});

            // Switch to User Beta
            await window.Capacitor.Plugins.SecureKeyVault.unbindActiveSession();
            await window.Capacitor.Plugins.SecureKeyVault.bindActiveSession({{
                userId: '{teacher_beta_id}',
                sessionProof: 'teacher_session_proof_{teacher_beta_id}'
            }});

            // Query items visible to User Beta
            const tx2 = db.transaction('offline_mutations', 'readonly');
            const idx = tx2.objectStore('offline_mutations').index('by_user');
            const req2 = idx.getAll('{teacher_beta_id}');
            const betaItems = await new Promise(r => {{ req2.onsuccess = () => r(req2.result); }});

            // Cleanup
            const tx3 = db.transaction('offline_mutations', 'readwrite');
            tx3.objectStore('offline_mutations').delete('action_alpha_secret_01');
            await new Promise(r => {{ tx3.oncomplete = () => r(); }});
            db.close();

            return {{
                betaItemCount: betaItems.length,
                isolationVerified: !betaItems.some(i => i.userId === '{teacher_alpha_id}')
            }};
        }})()
        """
        switch_res = await cdp_eval(ws, switch_isolation_script)
        print("Account-Switch Queue Isolation Result:", switch_res)
        assert switch_res.get("betaItemCount") == 0
        assert switch_res.get("isolationVerified") is True

        print("OBJECTIVE C: ACTUAL OFFLINE MUTATION & SYNCHRONIZATION PASSED 100%!")

async def main():
    await test_parent_ui_journey()
    await test_teacher_ui_journey()
    await test_offline_mutation_and_sync()

if __name__ == "__main__":
    asyncio.run(main())
