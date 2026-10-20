import { createHmac, timingSafeEqual } from 'node:crypto';

interface ResendWebhookHeaders {
  id?: string;
  timestamp?: string;
  signature?: string;
}

export function verifyResendWebhookSignature(
  secret: string | undefined,
  headers: ResendWebhookHeaders,
  rawBody: Buffer | undefined,
  now = Date.now(),
): boolean {
  if (!secret || !rawBody || !headers.id || !headers.timestamp || !headers.signature) return false;
  const match = /^whsec_([A-Za-z0-9+/=]+)$/.exec(secret);
  if (!match || !/^\d{1,12}$/.test(headers.timestamp)) return false;

  const timestamp = Number(headers.timestamp);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > 300) return false;

  const key = Buffer.from(match[1], 'base64');
  if (!key.length) return false;
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', key).update(signedContent).digest();
  return headers.signature.split(' ').some(candidate => {
    const [version, value] = candidate.split(',', 2);
    if (version !== 'v1' || !value) return false;
    const provided = Buffer.from(value, 'base64');
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
}
