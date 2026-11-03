import { BadRequestException, HttpException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { config } from './config';
import { MediaProvider, mediaProvider, objectRequest, validSchoolLogoKey } from './announcement-media';

/**
 * Server-side lifecycle for school logo storage objects.
 *
 * STAGED    uploaded, not yet referenced by School.logoStorageKey; expires.
 * COMMITTED published (referenced by, or previously committed to, a school).
 * RETIRED   superseded or removed; waiting for object deletion.
 * CLEANING  claimed by a deleter; the lease (expiresAt) allows safe retry.
 *
 * Only a STAGED, unexpired row can be committed, and only STAGED rows past expiry,
 * RETIRED rows, or CLEANING rows with an expired lease can be deleted. Both moves
 * are conditional updates on status, so a commit and a cleanup of the same key can
 * never both succeed. Deletion is always for one validated school-owned key.
 */
type LogoDb = Pick<PrismaClient, 'schoolLogoObject' | 'school'> | Prisma.TransactionClient;
export type LogoObjectDeleter = (key: string) => Promise<void>;

const CLEANUP_LEASE_MS = 5 * 60000;
export const maxPendingStagedLogosPerSchool = 20;
export const schoolLogoStagingTtlMs = () => config.SCHOOL_LOGO_STAGING_TTL_MINUTES * 60000;

const defaultDeleter = (provider: MediaProvider): LogoObjectDeleter => async key => {
  await objectRequest('DELETE', key, undefined, provider);
};

/** Record a freshly written staged object. Refuses when too many are pending for the school. */
export async function recordStagedLogo(db: LogoDb, schoolId: string, key: string, actorId: string | null, now = new Date()) {
  if (!validSchoolLogoKey(key, schoolId)) throw new BadRequestException('Invalid school logo key.');
  const pending = await db.schoolLogoObject.count({ where: { schoolId, status: 'STAGED', expiresAt: { gt: now } } });
  if (pending >= maxPendingStagedLogosPerSchool) throw new HttpException('Too many pending logo uploads. Publish or wait for them to expire.', 429);
  await db.schoolLogoObject.create({
    data: { schoolId, storageKey: key, status: 'STAGED', createdById: actorId, expiresAt: new Date(now.getTime() + schoolLogoStagingTtlMs()) },
  });
}

/** Mark a staged object committed inside the publishing transaction. Rejects anything that is not a live staged upload of this school. */
export async function commitStagedLogo(tx: Prisma.TransactionClient, schoolId: string, key: string, now = new Date()) {
  const claimed = await tx.schoolLogoObject.updateMany({
    where: { schoolId, storageKey: key, status: 'STAGED', expiresAt: { gt: now } },
    data: { status: 'COMMITTED', committedAt: now },
  });
  if (claimed.count !== 1) throw new BadRequestException('Staged school logo is unavailable or expired. Re-upload the logo and try again.');
}

/** Inside the transaction that replaces or removes a logo, queue the superseded key for deletion. */
export async function retireLogoKey(tx: Prisma.TransactionClient, schoolId: string, key: string, now = new Date()) {
  if (!validSchoolLogoKey(key, schoolId)) return;
  await tx.schoolLogoObject.upsert({
    where: { storageKey: key },
    create: { schoolId, storageKey: key, status: 'RETIRED', expiresAt: now, committedAt: now },
    update: { status: 'RETIRED', expiresAt: now },
  });
}

interface ClaimedRow { id: string; schoolId: string; storageKey: string }

async function purgeClaimed(db: LogoDb, row: ClaimedRow, deleteObject: LogoObjectDeleter): Promise<boolean> {
  // Recheck committed state: never delete an object a school currently references.
  const referenced = await db.school.findFirst({ where: { id: row.schoolId, logoStorageKey: row.storageKey }, select: { id: true } });
  if (referenced) {
    await db.schoolLogoObject.updateMany({ where: { id: row.id, status: 'CLEANING' }, data: { status: 'COMMITTED', committedAt: new Date() } });
    return false;
  }
  try {
    if (!validSchoolLogoKey(row.storageKey, row.schoolId)) throw new Error('invalid key');
    await deleteObject(row.storageKey);
    await db.schoolLogoObject.deleteMany({ where: { id: row.id, status: 'CLEANING' } });
    return true;
  } catch (error) {
    // The lease expires and the row is retried; no storage path is logged.
    console.error(JSON.stringify({ event: 'school_logo_cleanup_failed', logoObjectId: row.id, schoolId: row.schoolId, errorType: error instanceof Error ? error.name : 'unknown' }));
    return false;
  }
}

/** Best-effort immediate deletion of a retired key after the replacing transaction commits. */
export async function releaseRetiredLogo(db: LogoDb, schoolId: string, key: string | null, deleteObject: LogoObjectDeleter = defaultDeleter(mediaProvider())): Promise<boolean> {
  if (!key) return false;
  const row = await db.schoolLogoObject.findUnique({ where: { storageKey: key } });
  if (!row || row.schoolId !== schoolId || row.status !== 'RETIRED') return false;
  const claimed = await db.schoolLogoObject.updateMany({
    where: { id: row.id, schoolId, status: 'RETIRED' },
    data: { status: 'CLEANING', expiresAt: new Date(Date.now() + CLEANUP_LEASE_MS) },
  });
  if (!claimed.count) return false;
  return purgeClaimed(db, row, deleteObject);
}

/** Delete a staged object the caller no longer needs, only while it is still uncommitted. */
export async function discardStagedLogo(db: LogoDb, schoolId: string, key: string, deleteObject: LogoObjectDeleter = defaultDeleter(mediaProvider())): Promise<boolean> {
  const row = await db.schoolLogoObject.findUnique({ where: { storageKey: key } });
  if (!row || row.schoolId !== schoolId || row.status !== 'STAGED') return false;
  const claimed = await db.schoolLogoObject.updateMany({
    where: { id: row.id, schoolId, status: 'STAGED' },
    data: { status: 'CLEANING', expiresAt: new Date(Date.now() + CLEANUP_LEASE_MS) },
  });
  if (!claimed.count) return false;
  return purgeClaimed(db, row, deleteObject);
}

/** Claim and delete one expired/retired logo object. Idempotent and safe to retry; returns true when one was removed. */
export async function cleanupSchoolLogos(
  db: Pick<PrismaClient, 'schoolLogoObject' | 'school'>,
  options: { now?: Date; deleteObject?: LogoObjectDeleter } = {},
): Promise<boolean> {
  const now = options.now ?? new Date();
  const deleteObject = options.deleteObject ?? defaultDeleter(mediaProvider());
  const row = await db.schoolLogoObject.findFirst({
    where: { OR: [{ status: 'STAGED', expiresAt: { lte: now } }, { status: 'RETIRED' }, { status: 'CLEANING', expiresAt: { lte: now } }] },
    orderBy: { expiresAt: 'asc' },
  });
  if (!row) return false;
  const claimed = await db.schoolLogoObject.updateMany({
    where: { id: row.id, status: row.status, ...(row.status === 'RETIRED' ? {} : { expiresAt: { lte: now } }) },
    data: { status: 'CLEANING', expiresAt: new Date(now.getTime() + CLEANUP_LEASE_MS) },
  });
  if (!claimed.count) return false;
  const removed = await purgeClaimed(db, row, deleteObject);
  if (removed) console.log(JSON.stringify({ event: 'school_logo_cleaned', logoObjectId: row.id, schoolId: row.schoolId }));
  return removed;
}
