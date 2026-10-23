import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommunicationChannel, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { CommunicationService } from './communication/communication.service';
import { config } from './config';
import { digest, randomToken } from './security';

export async function queueParentInvitation(tx: Prisma.TransactionClient, comms: CommunicationService, schoolId: string, guardianId: string, channel: CommunicationChannel, actorId: string) {
  if (!await tx.school.findFirst({ where: { id: schoolId, active: true }, select: { id: true } })) throw new BadRequestException('School is unavailable.');
  await tx.$queryRaw`SELECT id FROM "Guardian" WHERE id = ${guardianId}::uuid AND "schoolId" = ${schoolId}::uuid FOR UPDATE`;
  const guardian = await tx.guardian.findFirst({ where: { id: guardianId, schoolId }, select: { id: true, phone: true, whatsappPhone: true, email: true, optOutSms: true, optOutWhatsapp: true, students: { where: { schoolId, active: true }, take: 1, select: { id: true } } } });
  if (!guardian || !guardian.students.length) throw new BadRequestException('Guardian has no active student relationship.');
  const destination = channel === 'EMAIL' ? guardian.email : channel === 'WHATSAPP' ? guardian.whatsappPhone : guardian.phone;
  if (!destination || (channel === 'SMS' && guardian.optOutSms) || (channel === 'WHATSAPP' && guardian.optOutWhatsapp)) throw new BadRequestException('Guardian cannot receive the selected channel.');
  const pending = await tx.parentInvitation.findFirst({ where: { schoolId, guardianId, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
  if (pending) throw new ConflictException('An active parent invitation already exists.');
  const token = randomToken();
  const code = randomBytes(16).toString('hex').toUpperCase();
  const invitation = await tx.parentInvitation.create({ data: { schoolId, guardianId, invitedBy: actorId, channel, destination, tokenHash: digest(token), codeHash: digest(code), expiresAt: new Date(Date.now() + 48 * 3600000) }, select: { id: true, expiresAt: true } });
  await comms.enqueueMessage(tx, { schoolId, guardianId, channel, recipient: destination, subject: 'SyncAcademy parent invitation', body: `SyncAcademy parent invitation. Open the app and enter code ${code}, or use ${config.APP_ORIGIN}/parent/activate?token=${token}. This invitation expires in 48 hours. A separate verification code is required.`, idempotencyKey: `parent-invitation:${invitation.id}` });
  await tx.auditEvent.create({ data: { schoolId, actorId, action: 'PARENT_INVITATION_QUEUED', target: invitation.id } });
  return invitation;
}
