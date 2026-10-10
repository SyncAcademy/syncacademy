import { Injectable } from '@nestjs/common';
import {
  buildInvitationEmail,
  buildPasswordResetEmail,
  renderEmailLayout,
  escapeHtml,
} from './email-templates';

@Injectable()
export class EmailService {
  buildInvitationEmail(params: Parameters<typeof buildInvitationEmail>[0]) {
    return buildInvitationEmail(params);
  }

  buildPasswordResetEmail(params: Parameters<typeof buildPasswordResetEmail>[0]) {
    return buildPasswordResetEmail(params);
  }

  renderLayout(params: Parameters<typeof renderEmailLayout>[0]) {
    return renderEmailLayout(params);
  }

  escape(str: string | null | undefined) {
    return escapeHtml(str);
  }
}

export * from './email-templates';
