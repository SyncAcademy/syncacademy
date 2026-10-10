import { build } from 'esbuild';
import { compile } from 'sass';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const web = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(web, '.tmp/dialog-browser'); mkdirSync(output, { recursive: true });
await build({ entryPoints: [resolve(web, 'scripts/dialog-browser.check.ts')], outfile: resolve(output, 'test.js'), bundle: true, platform: 'browser', format: 'iife', tsconfig: resolve(web, 'tsconfig.json') });
const dist = resolve(web, 'dist/syncacademy-web/browser');
const globalCss = readFileSync(resolve(dist, readdirSync(dist).find(f => /^styles-.*\.css$/.test(f))), 'utf8');
const css = compile(resolve(web, 'src/app/features/bursar/bursar.page.scss'), { loadPaths: [resolve(web, 'src/styles')] }).css;
const fields = ['Student', 'Term', 'Amount (TZS)', 'Date', 'Method', 'Reference', 'Additional details'];
writeFileSync(resolve(output, 'index.html'), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${globalCss}\n${css}
body{font-family:Arial;margin:0;background:#f1f5f9}header{position:fixed;top:0;left:0;right:0;height:88px;background:white;z-index:999999;padding:25px;font-size:24px}.clipped{position:relative;transform:translateZ(0);overflow:hidden;height:300px;margin-top:90px}.modal-card{width:540px}.field-space{margin:32px 0}input,select{width:100%;min-height:48px}button{padding:12px}.background{padding:30px}
</style><header>SyncAcademy — Student Accounts</header><div class="background"><button id="opener">Record payment</button></div><div class="clipped"><p>Student balances and school records behind the form.</p><dialog class="modal-overlay"><form class="modal-card"><h2>Record payment</h2>${fields.map((label, i) => `<div class="form-group field-space"><label for="f${i}">${label}</label><input id="f${i}" placeholder="${label}"></div>`).join('')}<button type="button">Cancel</button><button type="button">Save</button></form></dialog></div><script>${readFileSync(resolve(output, 'test.js'), 'utf8')}</script>`);
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = spawn(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${resolve(output, 'cdp-profile')}`], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Browser startup timed out')), 15000);
    browser.on('error', reject);
    browser.stderr.on('data', data => { const match = String(data).match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
  });
  socket = new WebSocket(endpoint); await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', event => { const result = JSON.parse(event.data); const job = pending.get(result.id); if (job) { pending.delete(result.id); result.error ? job.reject(new Error(JSON.stringify(result.error))) : job.resolve(result.result); } });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params, sessionId })); });
  for (const [width, height, editor] of [[1280, 800, false], [390, 700, false], [1280, 800, true], [390, 700, true]]) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 }, sessionId);
    await send('Page.navigate', { url: pathToFileURL(resolve(output, 'index.html')).href + (editor ? '?editor=1' : '') }, sessionId);
    const result = await send('Runtime.evaluate', { expression: `new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{const value=document.body?.dataset.testResult;if(value){clearInterval(t);resolve(value)}else if(++n>200){clearInterval(t);reject('Test timeout')}},25)})`, awaitPromise: true, returnByValue: true }, sessionId);
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    const checks = JSON.parse(result.result.value); assert.ok(!checks.failed, JSON.stringify(checks));
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(resolve(output, `dialog-${editor ? 'editor-' : ''}${width}.png`), Buffer.from(shot.data, 'base64'));
    console.log(`${editor ? 'Shared editor' : 'Portal dialog'} ${width}x${height}: ${checks.passed.length} checks passed.`);
    await send('Target.closeTarget', { targetId });
  }
  await send('Browser.close');
} finally { socket?.close(); browser.kill(); }
