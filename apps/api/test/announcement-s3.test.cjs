const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');

test('S3 SDK adapter signs private object requests against isolated storage', async () => {
  const objects = new Map();
  let signedRequests = 0;
  const server = createServer(async (req, res) => {
    const objectPath = new URL(req.url, 'http://localhost').pathname;
    assert.match(req.headers.authorization ?? '', /^AWS4-HMAC-SHA256 /);
    signedRequests++;
    if (req.method === 'PUT') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      objects.set(objectPath, Buffer.concat(chunks));
      res.writeHead(200); res.end();
    } else if (req.method === 'DELETE') {
      objects.delete(objectPath); res.writeHead(204); res.end();
    } else {
      const data = objects.get(objectPath);
      if (!data) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': data.length }); res.end(data);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  Object.assign(process.env, {
    NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@localhost:5432/media_test',
    APP_ORIGIN: 'http://localhost:8080', SESSION_SECRET: 't'.repeat(48), DATA_ENCRYPTION_KEY: 'a'.repeat(64),
    SMTP_HOST: 'localhost', MAIL_FROM: 'test@example.test', ANNOUNCEMENT_MEDIA_PROVIDER: 's3',
    ANNOUNCEMENT_MEDIA_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
    ANNOUNCEMENT_MEDIA_BUCKET: 'isolated-test-bucket', ANNOUNCEMENT_MEDIA_REGION: 'auto',
    ANNOUNCEMENT_MEDIA_ACCESS_KEY: 'isolated-test-access', ANNOUNCEMENT_MEDIA_SECRET_KEY: 'isolated-test-secret',
  });
  const { objectRequest } = require('../dist/announcement-media');
  const key = `announcements/${randomUUID()}/${randomUUID()}-thumbnail.png`;
  const bytes = Buffer.from('private test object');
  try {
    await objectRequest('PUT', key, bytes);
    assert.deepEqual(await objectRequest('GET', key), bytes);
    await objectRequest('DELETE', key);
    await assert.rejects(objectRequest('GET', key), error => error.status === 404);
    assert.equal(signedRequests, 4);
    assert.equal(objects.size, 0);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
