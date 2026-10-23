import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { config } from './config';

const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();
const signature = Buffer.from('89504e470d0a1a0a', 'hex');
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (bytes: Buffer) => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (kind: string, data: Buffer) => { const body = Buffer.concat([Buffer.from(kind), data]); const result = Buffer.alloc(body.length + 8); result.writeUInt32BE(data.length, 0); body.copy(result, 4); result.writeUInt32BE(crc(body), result.length - 4); return result; };

export function validateAnnouncementPng(bytes: Buffer) {
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 57 || !bytes.subarray(0, 8).equals(signature)) throw new BadRequestException('A PNG image up to 5 MB is required.');
  let offset = 8; let width = 0; let height = 0; let ended = false;
  const data: Buffer[] = [];
  let phase: 'header' | 'data' | 'end' = 'header';
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset); const end = offset + 12 + size;
    if (size > bytes.length || end > bytes.length) throw new BadRequestException('Invalid PNG image.');
    const kind = bytes.toString('ascii', offset + 4, offset + 8);
    if (crc(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) throw new BadRequestException('Invalid PNG checksum.');
    if (kind === 'IHDR' && phase === 'header' && size === 13) {
      width = bytes.readUInt32BE(offset + 8); height = bytes.readUInt32BE(offset + 12);
      if (!width || !height || width > 4096 || height > 4096 || width * height > 12000000 || bytes[offset + 16] !== 8 || ![2, 6].includes(bytes[offset + 17]) || bytes[offset + 18] || bytes[offset + 19] || bytes[offset + 20]) throw new BadRequestException('Unsupported PNG dimensions or encoding.');
      phase = 'data';
    } else if (kind === 'IDAT' && phase === 'data') data.push(bytes.subarray(offset + 8, end - 4));
    else if (kind === 'IEND' && phase === 'data' && size === 0 && data.length) { ended = true; phase = 'end'; }
    else if (!['IHDR', 'IDAT', 'IEND'].includes(kind) && phase === 'data') { /* Strip ancillary metadata. */ }
    else throw new BadRequestException('Invalid PNG structure.');
    offset = end;
    if (ended) break;
  }
  if (!ended || offset !== bytes.length) throw new BadRequestException('Invalid PNG image.');
  const expected = height * (1 + width * (bytes[25] === 6 ? 4 : 3));
  try { if (inflateSync(Buffer.concat(data), { maxOutputLength: expected + 1 }).length !== expected) throw new Error('Invalid raster'); }
  catch { throw new BadRequestException('PNG image could not be decoded.'); }
  return { bytes: Buffer.concat([signature, chunk('IHDR', bytes.subarray(16, 29)), chunk('IDAT', Buffer.concat(data)), chunk('IEND', Buffer.alloc(0))]), width, height };
}

function settings() {
  const { ANNOUNCEMENT_MEDIA_ENDPOINT: endpoint, ANNOUNCEMENT_MEDIA_BUCKET: bucket, ANNOUNCEMENT_MEDIA_ACCESS_KEY: access, ANNOUNCEMENT_MEDIA_SECRET_KEY: secret } = config;
  if (!endpoint || !bucket || !access || !secret) throw new ServiceUnavailableException('Announcement media storage is not configured.');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(config.NODE_ENV !== 'production' && url.hostname === '127.0.0.1')) throw new ServiceUnavailableException('Announcement media requires HTTPS storage.');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new ServiceUnavailableException('Invalid announcement media endpoint.');
  return { url, bucket, access, secret };
}

export async function objectRequest(method: 'PUT' | 'GET' | 'DELETE', key: string, payload?: Buffer) {
  if (!/^announcements\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/.test(key)) throw new BadRequestException('Invalid media key.');
  const { url, bucket, access, secret } = settings();
  url.pathname = `/${bucket}/${key}`;
  const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = now.slice(0, 8); const region = 'auto';
  const hash = sha(payload ?? Buffer.alloc(0));
  const headers = { host: url.host, 'x-amz-content-sha256': hash, 'x-amz-date': now };
  const canonical = `${method}\n${url.pathname}\n\nhost:${url.host}\nx-amz-content-sha256:${hash}\nx-amz-date:${now}\n\nhost;x-amz-content-sha256;x-amz-date\n${hash}`;
  const scope = `${date}/${region}/s3/aws4_request`;
  const signing = hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request');
  const sig = hmac(signing, `AWS4-HMAC-SHA256\n${now}\n${scope}\n${sha(canonical)}`).toString('hex');
  const response = await fetch(url, { method, headers: { ...headers, Authorization: `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${sig}`, ...(method === 'PUT' ? { 'Content-Type': 'image/png' } : {}) }, body: payload });
  if (!response.ok) throw new ServiceUnavailableException('Announcement media storage is unavailable.');
  if (method === 'GET') {
    const length = Number(response.headers.get('content-length'));
    if (length > 5 * 1024 * 1024) throw new ServiceUnavailableException('Stored image is too large.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) throw new ServiceUnavailableException('Stored image is too large.');
    return bytes;
  }
  return null;
}
