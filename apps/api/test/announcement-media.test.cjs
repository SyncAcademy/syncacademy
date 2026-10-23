const test = require('node:test');
const assert = require('node:assert/strict');
const { deflateSync } = require('node:zlib');
const { validateAnnouncementPng } = require('../dist/announcement-media');

function crc(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const body = Buffer.concat([Buffer.from(name), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0); body.copy(out, 4);
  out.writeUInt32BE(crc(body), out.length - 4);
  return out;
}
function png(width = 1, height = 1) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('tEXt', Buffer.from('secret metadata')), chunk('IDAT', deflateSync(Buffer.alloc(height * (1 + width * 3)))), chunk('IEND', Buffer.alloc(0))]);
}
test('announcement PNG accepts valid raster and removes ancillary metadata', () => {
  const input = png(); const output = validateAnnouncementPng(input);
  assert.equal(output.width, 1); assert.equal(output.height, 1);
  assert.ok(output.bytes.length < input.length);
  assert.equal(output.bytes.includes(Buffer.from('secret metadata')), false);
});
test('announcement PNG rejects oversized dimensions, corruption, and trailing bytes', () => {
  assert.throws(() => validateAnnouncementPng(png(4097, 1)));
  const corrupt = png(); corrupt[50] ^= 1;
  assert.throws(() => validateAnnouncementPng(corrupt));
  assert.throws(() => validateAnnouncementPng(Buffer.concat([png(), Buffer.from('trailing')])));
});
