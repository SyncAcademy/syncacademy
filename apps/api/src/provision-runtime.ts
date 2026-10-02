import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
const db = new PrismaClient();
async function main() {
  const secret = process.env.RUNTIME_DB_PASSWORD;
  if (!secret || !/^[a-f0-9]{48,}$/.test(secret)) throw new Error('RUNTIME_DB_PASSWORD must be generated hex.');
  const role = 'syncacademy_runtime';
  const roles = await db.$queryRaw<{rolname:string}[]>`SELECT rolname FROM pg_roles WHERE rolname = ${role}`;
  if (!roles.length) await db.$executeRawUnsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${secret}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
  else await db.$executeRawUnsafe(`ALTER ROLE ${role} PASSWORD '${secret}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
  await db.$executeRawUnsafe(`GRANT CONNECT ON DATABASE syncacademy TO ${role}`);
  await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
  const tables = await db.$queryRaw<{tablename:string}[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  for (const {tablename} of tables) {
    const table = '"' + tablename.replace(/"/g, '""') + '"';
    await db.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${role}`);
  }
  await db.$executeRawUnsafe(`REVOKE UPDATE, DELETE ON "AuditEvent" FROM ${role}`);
  console.log('Restricted runtime database privileges configured.');
}
main().catch(()=>{console.error('Runtime database provisioning failed');process.exitCode=1;}).finally(()=>db.$disconnect());
