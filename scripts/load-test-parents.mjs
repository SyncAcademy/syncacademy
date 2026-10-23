import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const base = process.env.PARENT_LOAD_BASE_URL || 'http://127.0.0.1:3000';
const url = new URL(base);
if (process.env.PARENT_LOAD_TEST_ISOLATED !== '1' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
  throw new Error('Parent load testing requires PARENT_LOAD_TEST_ISOLATED=1 and a local disposable API.');
}
const fixturePath = resolve(process.env.PARENT_LOAD_FIXTURE || '.runtime/parent-load-fixture.json');
if (!fixturePath.startsWith(resolve('.runtime') + sep)) throw new Error('Keep load-test credentials in the ignored .runtime directory.');
const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'));
if (!Array.isArray(fixtures) || fixtures.length < 1 || fixtures.some(row => !row.accessToken || !row.studentId || !row.yearId)) {
  throw new Error('Fixture must be a nonempty array of {accessToken, studentId, yearId}.');
}
const durationMs = Math.max(10_000, Math.min(600_000, Number(process.env.PARENT_LOAD_DURATION_MS || 60_000)));
const concurrency = Math.max(1, Math.min(1000, Number(process.env.PARENT_LOAD_CLIENTS || 100)));
const thinkMinMs = Math.max(250, Number(process.env.PARENT_LOAD_THINK_MIN_MS || 2000));
const thinkMaxMs = Math.max(thinkMinMs, Number(process.env.PARENT_LOAD_THINK_MAX_MS || 6000));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
const started = performance.now();
const routes = row => [
  `/api/v1/parent/children/${row.studentId}`,
  `/api/v1/parent/children/${row.studentId}/home`,
  `/api/v1/parent/children/${row.studentId}/results?limit=10`,
  `/api/v1/parent/children/${row.studentId}/fees?yearId=${row.yearId}&limit=10`,
  `/api/v1/parent/children/${row.studentId}/attendance?yearId=${row.yearId}&limit=10`,
  '/api/v1/parent/announcements?limit=10',
  '/api/v1/parent/notifications?limit=10',
];
await Promise.all(Array.from({ length: concurrency }, async (_, client) => {
  const row = fixtures[client % fixtures.length];
  const paths = routes(row);
  for (let index = 0; performance.now() - started < durationMs; index++) {
    const path = paths[(client + index) % paths.length];
    const requestStarted = performance.now();
    try {
      const response = await fetch(new URL(path, url), { headers: { Authorization: `Bearer ${row.accessToken}` }, signal: AbortSignal.timeout(15000) });
      const bytes = (await response.arrayBuffer()).byteLength;
      results.push({ path: path.split('?')[0], status: response.status, ms: performance.now() - requestStarted, bytes });
    } catch {
      results.push({ path: path.split('?')[0], status: 0, ms: performance.now() - requestStarted, bytes: 0 });
    }
    await sleep(thinkMinMs + Math.random() * (thinkMaxMs - thinkMinMs));
  }
}));
const percentile = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] : null;
const elapsedSeconds = (performance.now() - started) / 1000;
const summarize = rows => {
  const durations = rows.map(row => row.ms).sort((a, b) => a - b);
  return { requests: rows.length, errors: rows.filter(row => row.status < 200 || row.status >= 400).length, p50Ms: percentile(durations, .5), p95Ms: percentile(durations, .95), p99Ms: percentile(durations, .99), averagePayloadBytes: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.bytes, 0) / rows.length) : null };
};
const byRoute = Object.fromEntries([...new Set(results.map(row => row.path))].map(path => [path, summarize(results.filter(row => row.path === path))]));
console.log(JSON.stringify({ clients: concurrency, fixtureAccounts: fixtures.length, elapsedSeconds, requestsPerSecond: results.length / elapsedSeconds, overall: summarize(results), byRoute }, null, 2));
