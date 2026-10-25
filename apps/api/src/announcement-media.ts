import { BadRequestException, HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { config } from './config';

export type MediaProvider = 'local' | 's3';
export const mediaProvider = (): MediaProvider => config.ANNOUNCEMENT_MEDIA_PROVIDER ?? (config.NODE_ENV === 'production' ? 's3' : 'local');
const maxBytes = 5 * 1024 * 1024;
const signature = Buffer.from('89504e470d0a1a0a', 'hex');
sharp.concurrency(2);
sharp.cache({ memory: 32, files: 0, items: 32 });
let processing = 0;

export async function validateAnnouncementPng(bytes: Buffer) {
  if (bytes.length > maxBytes || bytes.length < 57 || !bytes.subarray(0, 8).equals(signature)) throw new BadRequestException('A PNG image up to 5 MB is required.');
  if (processing >= 2) throw new HttpException('Image processing is busy. Try again shortly.', 429);
  processing++;
  const started = performance.now();
  try {
    const source = sharp(bytes, { limitInputPixels: 12000000, failOn: 'warning', animated: false });
    const metadata = await source.metadata();
    if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || (metadata.pages ?? 1) > 1) throw new Error('Unsupported image');
    // Re-encoding verifies the complete raster and removes metadata by default.
    const original = await source.clone().rotate().png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
    const display = await source.clone().rotate().resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    const thumbnail = await source.clone().rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    if ([original.data, display, thumbnail].some(image => image.length > maxBytes)) throw new Error('Processed image is too large');
    console.log(JSON.stringify({ event: 'announcement_image_processed', durationMs: Math.round(performance.now() - started), inputBytes: bytes.length, originalBytes: original.data.length, displayBytes: display.length, thumbnailBytes: thumbnail.length }));
    return { bytes: original.data, width: original.info.width, height: original.info.height, display, thumbnail };
  } catch {
    throw new BadRequestException('PNG image could not be decoded or exceeds the image limits.');
  } finally { processing--; }
}

let client: S3Client | undefined;
function s3() {
  if (client) return client;
  const { ANNOUNCEMENT_MEDIA_ENDPOINT: endpoint, ANNOUNCEMENT_MEDIA_BUCKET: bucket, ANNOUNCEMENT_MEDIA_ACCESS_KEY: accessKeyId, ANNOUNCEMENT_MEDIA_SECRET_KEY: secretAccessKey } = config;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new ServiceUnavailableException('Announcement media storage is not configured.');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(config.NODE_ENV !== 'production' && url.hostname === '127.0.0.1')) throw new ServiceUnavailableException('Announcement media requires HTTPS storage.');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new ServiceUnavailableException('Invalid announcement media endpoint.');
  client = new S3Client({ endpoint, region: config.ANNOUNCEMENT_MEDIA_REGION, forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }, maxAttempts: 3,
    requestHandler: { connectionTimeout: 3000, requestTimeout: 15000 },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  return client;
}

const validKey = (key: string) => /^announcements\/[0-9a-f-]{36}\/[0-9a-f-]{36}(?:-(?:display|thumbnail))?\.png$/.test(key);
function localPath(key: string) {
  if (config.NODE_ENV === 'production') throw new ServiceUnavailableException('Local announcement media is disabled in production.');
  const root = config.ANNOUNCEMENT_MEDIA_DIRECTORY ?? join(process.cwd(), '.runtime', 'announcement-media');
  if (!isAbsolute(root)) throw new ServiceUnavailableException('Announcement media directory must be absolute.');
  return join(root, ...key.split('/'));
}

export async function openObjectStream(key: string, provider = mediaProvider()): Promise<{ stream: Readable; byteSize: number | undefined }> {
  if (!validKey(key)) throw new BadRequestException('Invalid media key.');
  try {
    if (provider === 'local') {
      const path = localPath(key);
      const info = await stat(path);
      if (!info.isFile() || info.size > maxBytes) throw new ServiceUnavailableException('Stored image is too large or unavailable.');
      return { stream: createReadStream(path), byteSize: info.size };
    }
    const result = await s3().send(new GetObjectCommand({ Bucket: config.ANNOUNCEMENT_MEDIA_BUCKET, Key: key }));
    const stream = result.Body as Readable | undefined;
    if (!stream || (result.ContentLength ?? 0) > maxBytes) {
      stream?.destroy();
      throw new ServiceUnavailableException('Stored image is too large or unavailable.');
    }
    return { stream, byteSize: result.ContentLength };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    const failure = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
    if (failure.code === 'ENOENT' || failure.$metadata?.httpStatusCode === 404) throw new NotFoundException('Announcement media unavailable.');
    console.error(JSON.stringify({ event: 'announcement_storage_failed', method: 'GET', provider, errorType: failure.name ?? 'unknown' }));
    throw new ServiceUnavailableException('Announcement media storage is unavailable.');
  }
}

export async function objectRequest(method: 'PUT' | 'GET' | 'DELETE', key: string, payload?: Buffer, provider = mediaProvider()): Promise<Buffer | null> {
  if (!validKey(key)) throw new BadRequestException('Invalid media key.');
  if (payload && (payload.length === 0 || payload.length > maxBytes)) throw new BadRequestException('Invalid image size.');
  if (method === 'GET') {
    const { stream } = await openObjectStream(key, provider);
    const chunks: Buffer[] = [];
    let received = 0;
    try {
      for await (const chunk of stream) {
        received += chunk.length;
        if (received > maxBytes) throw new ServiceUnavailableException('Stored image is too large.');
        chunks.push(Buffer.from(chunk));
      }
    } finally { stream.destroy(); }
    return Buffer.concat(chunks, received);
  }
  try {
    if (provider === 'local') {
      const path = localPath(key);
      if (method === 'PUT') {
        if (!payload) throw new BadRequestException('Image bytes are required.');
        await mkdir(dirname(path), { recursive: true, mode: 0o700 });
        const temporary = `${path}.${randomUUID()}.tmp`;
        try {
          await writeFile(temporary, payload, { flag: 'wx', mode: 0o600 });
          await rename(temporary, path);
        } finally { await rm(temporary, { force: true }).catch(() => undefined); }
        return null;
      }
      if (method === 'DELETE') {
        await rm(path, { force: true });
        const temporaryFiles = await readdir(dirname(path)).catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return [];
          throw error;
        });
        for (const file of temporaryFiles) {
          if (file.startsWith(`${basename(path)}.`) && /^[0-9a-f-]{36}\.tmp$/.test(file.slice(basename(path).length + 1))) await rm(join(dirname(path), file), { force: true });
        }
        return null;
      }
    }
    const Bucket = config.ANNOUNCEMENT_MEDIA_BUCKET;
    if (method === 'PUT') {
      if (!payload) throw new BadRequestException('Image bytes are required.');
      await s3().send(new PutObjectCommand({ Bucket, Key: key, Body: payload, ContentType: 'image/png', CacheControl: 'private, no-store' }));
      return null;
    }
    if (method === 'DELETE') { await s3().send(new DeleteObjectCommand({ Bucket, Key: key })); return null; }
    return null;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    const failure = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
    console.error(JSON.stringify({ event: 'announcement_storage_failed', method, provider, errorType: failure.name ?? 'unknown' }));
    throw new ServiceUnavailableException('Announcement media storage is unavailable.');
  }
}
