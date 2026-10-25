import { PrismaClient } from '@prisma/client';
import { MediaProvider, objectRequest } from './announcement-media';

/** Claim one interrupted upload. READY media is never eligible for cleanup. */
export async function cleanupAnnouncementMedia(db: Pick<PrismaClient, 'parentAnnouncementMedia'>) {
  const now = new Date();
  const row = await db.parentAnnouncementMedia.findFirst({
    where: { status: { in: ['PENDING', 'FAILED', 'CLEANING'] }, cleanupAfter: { lte: now }, announcement: { publishedAt: null } },
    orderBy: { cleanupAfter: 'asc' },
  });
  if (!row) return false;
  const claimed = await db.parentAnnouncementMedia.updateMany({
    where: { id: row.id, schoolId: row.schoolId, status: row.status, cleanupAfter: { lte: now }, announcement: { publishedAt: null } },
    data: { status: 'CLEANING', cleanupAfter: new Date(Date.now() + 5 * 60000) },
  });
  if (!claimed.count) return false;
  try {
    if (!['local', 's3'].includes(row.storageProvider)) throw new Error('Unknown provider');
    for (const key of [row.storageKey, row.displayKey, row.thumbnailKey]) {
      if (key) await objectRequest('DELETE', key, undefined, row.storageProvider as MediaProvider);
    }
    await db.parentAnnouncementMedia.deleteMany({ where: { id: row.id, schoolId: row.schoolId, status: 'CLEANING', announcement: { publishedAt: null } } });
    console.log(JSON.stringify({ event: 'announcement_upload_cleaned', mediaId: row.id, schoolId: row.schoolId }));
    return true;
  } catch {
    console.error(JSON.stringify({ event: 'announcement_upload_cleanup_failed', mediaId: row.id, schoolId: row.schoolId }));
    return false;
  }
}
