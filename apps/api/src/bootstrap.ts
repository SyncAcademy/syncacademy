import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { passwordHash, randomToken } from './security';
const db = new PrismaClient();
async function main() {
  const email = z.string().email().parse(process.env.BOOTSTRAP_EMAIL).toLowerCase();
  const name = z.string().min(2).parse(process.env.BOOTSTRAP_NAME);
  const folder = resolve(process.env.CREDENTIALS_DIRECTORY || '.runtime');
  await mkdir(folder, { recursive: true, mode: 0o700 });
  try { await access(resolve(folder, 'admin.credentials.txt')); throw new Error('Credential file already exists. Refusing to replace it.'); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  const password = randomToken(); const hash = await passwordHash(password);
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(81129374)`;
    if (await tx.user.count({ where: { platformAdmin: true } })) throw new Error('An administrator already exists. Bootstrap cannot overwrite credentials.');
    const user = await tx.user.create({ data: { email, name, passwordHash: hash, platformAdmin: true, mustChangePassword: true } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: 'PLATFORM_BOOTSTRAPPED', target: user.id } });
  });
  await writeFile(resolve(folder, 'admin.credentials.txt'), `Super Admin email: ${email}\nTemporary password: ${password}\nChange this password at first login, then enroll an authenticator.\nKeep this file private and delete it after setup.\n`, { mode: 0o600, flag: 'wx' });
  console.log('Administrator created. Credentials saved to the private runtime directory.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Bootstrap failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
