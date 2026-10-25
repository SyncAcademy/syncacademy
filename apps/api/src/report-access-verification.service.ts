import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { Database } from './database/database.service';
import { CommunicationService } from './communication/communication.service';
import { digest } from './security';

@Injectable()
export class ReportAccessVerificationService {
  constructor(
    private readonly db: Database,
    private readonly comms: CommunicationService,
  ) {}

  public async requestCode(
    schoolId: string,
    guardianId: string,
  ): Promise<{ success: boolean; resendAfter: string; destination: string }> {
    const guardian = await this.db.guardian.findFirst({ where: { id: guardianId, schoolId } });
    if (!guardian) throw new BadRequestException('Guardian not found in this school.');

    const destination = this.comms.normalizePhone(guardian.phone);
    if (!destination) throw new BadRequestException('Guardian does not have a valid phone number.');

    const recent = await this.db.contactVerification.findFirst({
      where: { schoolId, guardianId, channel: 'SMS', resendAfter: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new ConflictException(`Please wait until ${recent.resendAfter.toISOString()} before requesting another code.`);
    }

    const code = randomInt(100000, 999999).toString();
    const now = Date.now();
    const expiresAt = new Date(now + 15 * 60 * 1000);
    const resendAfter = new Date(now + 60 * 1000);

    await this.db.$transaction(async tx => {
      await tx.contactVerification.deleteMany({
        where: { schoolId, guardianId, channel: 'SMS', verifiedAt: null },
      });
      await tx.contactVerification.create({
        data: {
          schoolId,
          guardianId,
          channel: 'SMS',
          destination,
          codeHash: digest(code),
          expiresAt,
          resendAfter,
        },
      });
      await this.comms.enqueueMessage(tx, {
        schoolId,
        guardianId,
        channel: 'SMS',
        recipient: destination,
        subject: 'SyncAcademy Verification Code',
        body: `SyncAcademy verification code: ${code}. Valid for 15 minutes. Do not share this code.`,
        templateParams: { code, validity: '15 minutes' },
      });
      await tx.auditEvent.create({
        data: {
          schoolId,
          actorId: null,
          action: 'REPORT_ACCESS_OTP_REQUESTED',
          target: guardianId,
        },
      });
    });

    return {
      success: true,
      resendAfter: resendAfter.toISOString(),
      destination: destination.slice(0, 4) + '****' + destination.slice(-3),
    };
  }

  public async confirmCode(
    schoolId: string,
    guardianId: string,
    code: string,
  ): Promise<{ verified: boolean; message: string }> {
    const verification = await this.db.contactVerification.findFirst({
      where: { schoolId, guardianId, channel: 'SMS', verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) throw new BadRequestException('No pending verification request found. Request a new code.');
    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }
    if (verification.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Request a new code.');
    }
    if (verification.codeHash !== digest(code.trim())) {
      await this.db.contactVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code.');
    }

    const now = new Date();
    await this.db.$transaction(async tx => {
      await tx.contactVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: now },
      });
      const updateData: Prisma.GuardianUpdateInput = { phoneVerifiedAt: now };
      await tx.guardian.update({
        where: { id_schoolId: { id: guardianId, schoolId } },
        data: updateData,
      });
      await tx.auditEvent.create({
        data: { schoolId, actorId: null, action: 'REPORT_ACCESS_OTP_VERIFIED', target: guardianId },
      });
    });

    return { verified: true, message: 'SMS contact method has been successfully verified.' };
  }
}
