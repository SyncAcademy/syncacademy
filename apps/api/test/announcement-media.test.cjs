const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/media_test';
process.env.APP_ORIGIN = 'http://localhost:8080';
process.env.SESSION_SECRET = 't'.repeat(48);
process.env.DATA_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.SMTP_HOST = 'localhost';
process.env.MAIL_FROM = 'test@example.test';
process.env.ANNOUNCEMENT_MEDIA_PROVIDER = 'local';

test('local announcement media remains readable and rejects unsafe keys', async () => {
  const root = await mkdtemp(join(tmpdir(), 'syncacademy-media-test-'));
  process.env.ANNOUNCEMENT_MEDIA_DIRECTORY = root;
  // Load configuration after choosing the isolated test directory.
  const storage = require('../dist/announcement-media');
  const schoolId = randomUUID();
  const mediaId = randomUUID();
  const key = `announcements/${schoolId}/${mediaId}.png`;
  const bytes = Buffer.from('private-image-bytes');
  try {
    await storage.objectRequest('PUT', key, bytes);
    assert.deepEqual(await storage.objectRequest('GET', key), bytes);
    const restarted = execFileSync(process.execPath, ['-e', `require('./dist/announcement-media').objectRequest('GET', ${JSON.stringify(key)}).then(bytes => process.stdout.write(bytes))`], {
      cwd: join(__dirname, '..'), env: process.env, timeout: 30000,
    });
    assert.deepEqual(restarted, bytes, 'a new API process can read the stored image');
    assert.deepEqual(await readFile(join(root, 'announcements', schoolId, `${mediaId}.png`)), bytes);
    await assert.rejects(storage.objectRequest('GET', '../../outside.png'), error => error.status === 400);
    await storage.objectRequest('DELETE', key);
    await assert.rejects(storage.objectRequest('GET', key), error => error.status === 404);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('PNG decoding rejects invalid images and generates bounded mobile variants', async () => {
  const { validateAnnouncementPng } = require('../dist/announcement-media');
  const png = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#f78c25' } }).withMetadata().png().toBuffer();
  const result = await validateAnnouncementPng(png);
  assert.equal(result.width, 1600);
  assert.equal(result.height, 900);
  assert.equal((await sharp(result.display).metadata()).width, 1280);
  assert.equal((await sharp(result.thumbnail).metadata()).width, 480);
  assert.equal((await sharp(result.bytes).metadata()).exif, undefined);
  await assert.rejects(validateAnnouncementPng(Buffer.from('not a PNG')), error => error.status === 400);
  await assert.rejects(validateAnnouncementPng(Buffer.alloc(5 * 1024 * 1024 + 1)), error => error.status === 400);
  await assert.rejects(validateAnnouncementPng(png.subarray(0, png.length / 2)), error => error.status === 400);
  const jpeg = await sharp(png).jpeg().toBuffer();
  await assert.rejects(validateAnnouncementPng(jpeg), error => error.status === 400);
  const wide = await sharp({ create: { width: 5000, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(validateAnnouncementPng(wide), error => error.status === 400);
  const huge = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(validateAnnouncementPng(huge), error => error.status === 400);
  const concurrent = await Promise.allSettled([validateAnnouncementPng(png), validateAnnouncementPng(png), validateAnnouncementPng(png)]);
  assert.equal(concurrent.filter(item => item.status === 'fulfilled').length, 2);
  assert.equal(concurrent.find(item => item.status === 'rejected').reason.status, 429);
});
