import { isIP } from 'node:net';
import { Request } from 'express';
import { config } from './config';

/** Browser writes require the configured origin, or a same-origin local development host. */
export function isAllowedBrowserOrigin(req: Request, origin?: string): boolean {
  const header = (name: string): string | undefined => {
    const value = typeof req.get === 'function' ? req.get(name) : req.headers?.[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };
  origin ??= header('Origin');
  if (!origin) return false;
  if (origin === config.APP_ORIGIN) return true;
  if (config.NODE_ENV === 'production') return false;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || parsed.host.toLowerCase() !== header('Host')?.toLowerCase()) return false;
    if (parsed.protocol !== (req.protocol ? `${req.protocol}:` : new URL(config.APP_ORIGIN).protocol)) return false;
    const host = parsed.hostname;
    const ipv4 = isIP(host) === 4 ? host.split('.').map(Number) : [];
    return ['localhost', '127.0.0.1', '[::1]'].includes(host) || ipv4.length === 4 &&
      (ipv4[0] === 10 || ipv4[0] === 192 && ipv4[1] === 168 || ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31);
  } catch {
    return false;
  }
}
