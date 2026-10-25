import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommunicationChannel, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { CommunicationService } from './communication/communication.service';
import { config } from './config';
import { digest } from './security';

export const parentActivationToken = () => randomBytes(16).toString('hex').toUpperCase();

export function parentInvitationMessage(schoolName: string, token: string, channel: CommunicationChannel) {
  const safeName = schoolName.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
  const link = `${config.APP_ORIGIN}/parent/activate?token=${encodeURIComponent(token)}`;
  const body = channel === 'EMAIL'
    ? `${safeName} invites you to activate your SyncAcademy parent account. Open ${link} or enter code ${token} in the SyncAcademy Parents app. Expires in 48 hours.`
    : `${safeName}: activate your SyncAcademy parent account: ${link} Enter ${token} in the Parents app if the link cannot open it. Expires in 48h.`;
  const html = channel === 'EMAIL' ? `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172338"><h1 style="color:#b45309">SyncAcademy</h1><h2>Parent invitation</h2><p>${escapeHtml(safeName)} invites you to activate your parent account and view your linked children.</p><p><a href="${link}" style="display:inline-block;background:#b45309;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Activate account</a></p><p>Open the link on your phone. If the app is not installed, install SyncAcademy Parents and enter this invitation code: <strong>${token}</strong>.</p><p>This invitation expires in 48 hours. If you did not expect it, contact the school.</p></div>` : undefined;
  return { subject: `${safeName} parent invitation | SyncAcademy`, body, html };
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!); }

export async function queueParentInvitation(tx: Prisma.TransactionClient, comms: CommunicationService, schoolId: string, guardianId: string, channel: CommunicationChannel, actorId: string) {
  const school = await tx.school.findFirst({ where: { id: schoolId, active: true }, select: { name: true } });
  if (!school) throw new BadRequestException('School is unavailable.');
  await tx.$queryRaw`SELECT id FROM "Guardian" WHERE id = ${guardianId}::uuid AND "schoolId" = ${schoolId}::uuid FOR UPDATE`;
  const guardian = await tx.guardian.findFirst({ where: { id: guardianId, schoolId }, select: { id: true, phone: true, whatsappPhone: true, email: true, optOutSms: true, optOutWhatsapp: true, students: { where: { schoolId, active: true }, take: 1, select: { id: true } } } });
  if (!guardian || !guardian.students.length) throw new BadRequestException('Guardian has no active student relationship.');
  const destination = channel === 'EMAIL' ? guardian.email : channel === 'WHATSAPP' ? guardian.whatsappPhone : guardian.phone;
  if (!destination || (channel === 'SMS' && guardian.optOutSms) || (channel === 'WHATSAPP' && guardian.optOutWhatsapp)) throw new BadRequestException('Guardian cannot receive the selected channel.');
  const pending = await tx.parentInvitation.findFirst({ where: { schoolId, guardianId, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
  if (pending) throw new ConflictException('An active parent invitation already exists.');
  const token = parentActivationToken();
  const invitation = await tx.parentInvitation.create({ data: { schoolId, guardianId, invitedBy: actorId, channel, destination, tokenHash: digest(token), codeHash: digest(token), expiresAt: new Date(Date.now() + 48 * 3600000) }, select: { id: true, expiresAt: true } });
  await comms.enqueueMessage(tx, { schoolId, guardianId, channel, recipient: destination, ...parentInvitationMessage(school.name, token, channel), idempotencyKey: `parent-invitation:${invitation.id}` });
  await tx.auditEvent.create({ data: { schoolId, actorId, action: 'PARENT_INVITATION_QUEUED', target: invitation.id } });
  return invitation;
}
