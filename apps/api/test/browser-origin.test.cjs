const { test } = require('node:test');
const assert = require('node:assert/strict');
Object.assign(process.env, {
  NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@localhost:5432/origin_test',
  APP_ORIGIN: 'http://localhost:8080', SESSION_SECRET: 't'.repeat(48),
  DATA_ENCRYPTION_KEY: 'a'.repeat(64), SMTP_HOST: 'localhost', MAIL_FROM: 'test@example.test',
});
const { isAllowedBrowserOrigin } = require('../dist/browser-origin');
const { config } = require('../dist/config');

test('browser origin checks preserve LAN testing without allowing school hostnames or cross-origin writes', () => {
  const request = { headers: { host: '192.168.0.108:8080', origin: 'http://192.168.0.108:8080' } };
  assert.equal(isAllowedBrowserOrigin(request), true);
  assert.equal(isAllowedBrowserOrigin(request, 'http://192.168.0.109:8080'), false);
  assert.equal(isAllowedBrowserOrigin(request, 'http://192.168.0.108:8081'), false);
  assert.equal(isAllowedBrowserOrigin(request, 'https://192.168.0.108:8080'), false);
  assert.equal(isAllowedBrowserOrigin({ headers: { host: 'school.localhost:8080', origin: 'http://school.localhost:8080' } }), false);
  assert.equal(isAllowedBrowserOrigin({ headers: { host: 'public.example', origin: 'http://public.example' } }), false);
  assert.equal(isAllowedBrowserOrigin({ headers: {} }), false);
  assert.equal(isAllowedBrowserOrigin(request, config.APP_ORIGIN), true);
  config.NODE_ENV = 'production';
  try {
    assert.equal(isAllowedBrowserOrigin(request), false);
    assert.equal(isAllowedBrowserOrigin(request, config.APP_ORIGIN), true);
  } finally { config.NODE_ENV = 'test'; }
});
