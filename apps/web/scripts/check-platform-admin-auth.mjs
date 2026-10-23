import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(webRoot, 'src', 'app');
const read = relative => readFile(path.join(webRoot, relative), 'utf8');

const [routes, loginPage, platformPage, platformTemplate, apiController] = await Promise.all([
  read('src/app/app.routes.ts'),
  read('src/app/features/auth/pages/login/login.page.ts'),
  read('src/app/features/platform-access/platform-admin-login.page.ts'),
  read('src/app/features/platform-access/platform-admin-login.page.html'),
  readFile(path.resolve(webRoot, '../api/src/api.controller.ts'), 'utf8'),
]);

assert.equal((routes.match(/path:'platform-access\/login'/g) ?? []).length, 1, 'manual admin login route is registered once');
assert.match(routes, /path:'platform-access\/login',loadComponent:\(\)=>import\('\.\/features\/platform-access\/platform-admin-login\.page'\)/);
assert.match(routes, /path:'platform-access\/login',[^\n]*PlatformAdminLoginPage/);

const roleOptions = loginPage.match(/readonly roleOptions = \[([\s\S]*?)\n  \];/);
assert.ok(roleOptions, 'public login has an explicit role list');
const publicRoles = [...roleOptions[1].matchAll(/\{\s*value:\s*'([^']+)'/g)].map(match => match[1]);
assert.deepEqual(publicRoles, ['HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER', 'BURSAR']);
assert.match(apiController, /const schoolRole = z\.enum\(\['HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER', 'BURSAR'\]\)/);

assert.match(platformPage, /auth\/platform\/login/);
assert.match(platformPage, /auth\/platform\/verify/);
assert.match(platformPage, /auth\/platform\/recovery/);
assert.match(platformPage, /togglePassword\(\)/);
assert.match(platformPage, /auth\.identity\.set\(null\)/);
assert.doesNotMatch(platformPage, /localStorage|sessionStorage|document\.cookie/);
assert.match(platformTemplate, /type="email"/);
assert.match(platformTemplate, /type="password"/);
assert.match(platformTemplate, /pattern="\[0-9\]\{6\}"/);
assert.match(platformTemplate, /One-time recovery code/);
assert.match(platformTemplate, /I saved my recovery codes/);
assert.doesNotMatch(platformTemplate, /Remember this device|Trust this browser|Create account|Register/i);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.(html|ts|scss)$/.test(entry.name) ? [target] : [];
  }));
  return nested.flat();
}

const files = await sourceFiles(appRoot);
const inboundLinks = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (!source.includes('/platform-access/login')) continue;
  const relative = path.relative(appRoot, file).replaceAll('\\', '/');
  inboundLinks.push(relative);
}
assert.deepEqual(inboundLinks.sort(), ['core/guards/auth.guard.ts', 'core/services/auth.service.ts', 'features/live/auth.page.ts'], 'the private route has no public navigation link');

console.log('Platform administrator auth checks passed: private route, public roles, MFA screens, and no client-side secret storage.');
