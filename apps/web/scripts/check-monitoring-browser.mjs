import { build } from 'esbuild';
import { compile } from 'sass';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const web = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(web, '.tmp/monitoring-browser'); mkdirSync(output, { recursive: true });
await build({ entryPoints: [resolve(web, 'scripts/monitoring-browser.check.ts')], outfile: resolve(output, 'test.js'), bundle: true, platform: 'browser', format: 'iife', tsconfig: resolve(web, 'tsconfig.json'), plugins: [{ name:'inline-angular-resources', setup(builder) {
 builder.onLoad({filter:/\.ts$/}, args => {
  if (!args.path.includes('apps') || args.path.includes('node_modules')) return;
  let source=readFileSync(args.path,'utf8');
  source=source.replace(/templateUrl:\s*'([^']+)'/g, (_, file) => 'template: '+JSON.stringify(readFileSync(resolve(args.path, '..', file),'utf8')));
  source=source.replace(/styleUrls:\s*\[([^\]]+)\]/g, (_, files) => 'styles: '+JSON.stringify([...files.matchAll(/'([^']+)'/g)].map(match => compile(resolve(args.path,'..',match[1]),{loadPaths:[resolve(web,'src/styles')]}).css)));
  return {contents:source,loader:'ts'};
 });
}}] });
const dist = resolve(web, 'dist/syncacademy-web/browser');
const globalCss = compile(resolve(web, 'src/global.scss'), { loadPaths: [resolve(web, 'src/styles'), resolve(web, '../../node_modules')] }).css;
writeFileSync(resolve(output, 'index.html'), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${globalCss}body{font-family:Arial;margin:0;padding:20px;background:#f1f5f9}</style><body><script>window.onerror=(message)=>{document.body.dataset.testResult=JSON.stringify({failed:String(message)});};window.onunhandledrejection=(event)=>{document.body.dataset.testResult=JSON.stringify({failed:String(event.reason)});};</script><script>${readFileSync(resolve(output,'test.js'),'utf8')}</script>`);
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
  for (const [width, height, editor, zoom] of [[1440, 1000, false], [820, 1000, false], [390, 844, true], [320, 844, true], [720, 1000, false, true]]) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 }, sessionId);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: editor ? 'reduce' : 'no-preference' }] }, sessionId);
    await send('Page.navigate', { url: pathToFileURL(resolve(output, 'index.html')).href + (editor ? '?stress=1' : zoom ? '?zoom=1' : '') }, sessionId);
    const result = await send('Runtime.evaluate', { expression: `new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{const value=document.body?.dataset.testResult;if(value){clearInterval(t);resolve(value)}else if(++n>650){clearInterval(t);reject('Test timeout')}},25)})`, awaitPromise: true, returnByValue: true }, sessionId);
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    const checks = JSON.parse(result.result.value); assert.ok(!checks.failed, JSON.stringify(checks));
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(resolve(output, `monitoring-${width}.png`), Buffer.from(shot.data, 'base64'));
    await send('Runtime.evaluate', { expression: `document.querySelector('.chart-grid')?.scrollIntoView({block:'start',behavior:'instant'})` }, sessionId);
    const chartShot=await send('Page.captureScreenshot',{format:'png'},sessionId);
    writeFileSync(resolve(output, `charts-${width}.png`),Buffer.from(chartShot.data,'base64'));
    console.log(`Monitoring dashboard ${width}x${height}: ${checks.passed.length} checks passed.`);
    await send('Target.closeTarget', { targetId });
  }
  await send('Browser.close');
} finally { socket?.close(); browser.kill(); }


