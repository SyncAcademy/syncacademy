import { Prisma, PrismaClient } from '@prisma/client';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { config } from './config';
import { decrypt, encrypt } from './security';

type Db = Prisma.TransactionClient | PrismaClient;

export async function enqueueParentPush(tx: Prisma.TransactionClient, notification: { id: string; userId: string; schoolId: string }) {
  const devices = await tx.parentPushDevice.findMany({
    where: { userId: notification.userId, revokedAt: null, enabled: true },
    select: { id: true }, take: 100,
  });
  if (!devices.length) return;
  await tx.outbox.createMany({
    data: devices.map(device => ({
      schoolId: notification.schoolId,
      channel: 'PUSH',
      idempotencyKey: `parent-push:${notification.id}:${device.id}`,
      payload: encrypt(JSON.stringify({ notificationId: notification.id, deviceId: device.id })),
    })),
    skipDuplicates: true,
  });
}

export async function deliverParentPush(db: Db, notificationId: string, deviceId: string): Promise<'SENT' | 'CANCELLED'> {
  const now = new Date();
  const device = await db.parentPushDevice.findFirst({ where: { id: deviceId, enabled: true, revokedAt: null } });
  if (!device) return 'CANCELLED';
  const session = await db.parentMobileSession.findFirst({
    where: { id: device.sessionId, userId: device.userId, revokedAt: null, expiresAt: { gt: now }, user: { enabled: true, parentAccount: { isNot: null } } },
    select: { version: true, user: { select: { sessionVersion: true } } },
  });
  if (!session || session.version !== session.user.sessionVersion) return 'CANCELLED';
  const notification = await db.parentNotification.findFirst({
    where: { id: notificationId, userId: device.userId, school: { active: true } },
    select: { id: true, schoolId: true, studentId: true, kind: true, targetId: true, dedupeKey: true },
  });
  if (!notification) return 'CANCELLED';
  if (notification.studentId) {
    const link = await db.studentGuardian.findFirst({ where: {
      studentId: notification.studentId, schoolId: notification.schoolId, active: true,
      ...(notification.kind === 'RESULT' ? { canReceiveReports: true } : {}),
      guardian: { userId: device.userId },
    }, select: { id: true } });
    if (!link) return 'CANCELLED';
  } else {
    const link = await db.studentGuardian.findFirst({ where: {
      schoolId: notification.schoolId, active: true, guardian: { userId: device.userId },
    }, select: { id: true } });
    if (!link) return 'CANCELLED';
  }
  if (notification.kind === 'ANNOUNCEMENT') {
    const published = await db.parentAnnouncement.findFirst({ where: {
      id: notification.targetId || '', schoolId: notification.schoolId,
      publishedAt: { lte: now }, unpublishedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    }, select: { id: true, yearId: true, classId: true } });
    if (!published) return 'CANCELLED';
    const eligible = await db.studentGuardian.findFirst({ where: {
      schoolId: notification.schoolId, active: true, guardian: { userId: device.userId },
      student: { schoolId: notification.schoolId, enrollments: { some: {
        schoolId: notification.schoolId, status: 'active',
        ...(published.classId ? { classroomId: published.classId } : {}),
        classroom: { yearId: published.yearId },
      } } },
    }, select: { id: true } });
    if (!eligible) return 'CANCELLED';
  }
  if (notification.kind === 'RESULT' && notification.studentId) {
    const reportCardId = notification.dedupeKey.split(':').slice(2, -1).join(':');
    const publication = await db.parentResultPublication.findFirst({ where: {
      schoolId: notification.schoolId, studentId: notification.studentId,
      reportCardId, withdrawnAt: null,
    }, select: { id: true } });
    if (!publication) return 'CANCELLED';
  }
  if (!config.FIREBASE_PROJECT_ID) throw new Error('Firebase project is not configured');
  if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: config.FIREBASE_PROJECT_ID });
  try {
    await getMessaging().send({
      fid: decrypt(device.fidEncrypted),
      notification: { title: 'SyncAcademy update', body: 'Open the parent app to view your alert.' },
      data: { notificationId: notification.id, kind: notification.kind },
      android: { priority: 'high', notification: { channelId: `syncacademy_${device.sound ? 'sound' : 'silent'}_${device.vibration ? 'vibrate' : 'still'}`, defaultSound: device.sound, defaultVibrateTimings: device.vibration } },
      apns: { payload: { aps: { sound: device.sound ? 'default' : undefined, contentAvailable: true } } },
    });
    return 'SENT';
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'messaging/installation-id-not-registered' || code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      await db.parentPushDevice.updateMany({ where: { id: device.id, fidHash: device.fidHash }, data: { revokedAt: new Date(), fidEncrypted: '' } });
      return 'CANCELLED';
    }
    throw error;
  }
}
