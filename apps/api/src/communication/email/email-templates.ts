/**
 * SyncAcademy Branded Email Templates
 *
 * Implements high-conversion, mobile-responsive HTML email templates
 * compatible with major email clients (Gmail, Outlook, Apple Mail, Webmail).
 * Features SyncAcademy brand logo, orange (#E87E24) and slate (#0F172A) palettes.
 */

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const SYNCACADEMY_LOGO_CID = 'syncacademy-logo';

export interface BaseEmailOptions {
  title: string;
  previewText?: string;
  badgeText?: string;
  badgeType?: 'default' | 'alert' | 'info';
  contentHtml: string;
  logoSrc?: string;
}

/**
 * Master layout wrapper for all SyncAcademy emails.
 * Renders consistent header with brand logo, 600px container, and footer.
 */
export function renderEmailLayout(options: BaseEmailOptions): string {
  const preview = options.previewText
    ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #F1F5F9;">${escapeHtml(options.previewText)}</div>`
    : '';
  const logo = options.logoSrc
    ? `<img src="${escapeHtml(options.logoSrc)}" width="40" height="40" alt="SyncAcademy" style="display: block; width: 40px; height: 40px; border: 0;" />`
    : `<div style="width: 40px; height: 40px; background-color: #E87E24; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF" style="display: block; margin: auto;" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"/>
        </svg>
      </div>`;

  let badgeHtml = '';
  if (options.badgeText) {
    let badgeBg = '#FFF7ED';
    let badgeBorder = '#FFEDD5';
    let badgeColor = '#E87E24';

    if (options.badgeType === 'alert') {
      badgeBg = '#FEF3C7';
      badgeBorder = '#FDE68A';
      badgeColor = '#B45309';
    } else if (options.badgeType === 'info') {
      badgeBg = '#EFF6FF';
      badgeBorder = '#DBEAFE';
      badgeColor = '#1D4ED8';
    }

    badgeHtml = `
      <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 600; color: ${badgeColor}; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 20px;">
        ${escapeHtml(options.badgeText)}
      </span>
    `;
  }

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(options.title)}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${preview}
  <!-- OUTER WRAPPER -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F1F5F9; width: 100%; margin: 0; padding: 32px 12px;">
    <tr>
      <td align="center" valign="top">
        <!-- EMAIL CARD (MAX 600px) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- TOP ORANGE BRAND ACCENT LINE -->
          <tr>
            <td style="background-color: #E87E24; height: 5px; font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- HEADER: BRAND LOGO & BADGE -->
          <tr>
            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #F1F5F9;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Logo Emblem -->
                        <td valign="middle" style="padding-right: 12px;">
                          ${logo}
                        </td>
                        <!-- Logo Wordmark -->
                        <td valign="middle">
                          <div style="font-size: 21px; font-weight: 800; line-height: 1.1; letter-spacing: -0.5px;">
                            <span style="color: #0F172A;">Sync</span><span style="color: #E87E24;">Academy</span>
                          </div>
                          <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #94A3B8; margin-top: 2px;">
                            School Management Platform
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    ${badgeHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              ${options.contentHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8; line-height: 1.6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748B;">
                      SyncAcademy &bull; Modern Education Management
                    </p>
                    <p style="margin: 0 0 8px 0; color: #94A3B8;">
                      This is an automated operational notification. Never share your password, links, or MFA recovery codes with anyone.
                    </p>
                    <p style="margin: 0; color: #CBD5E1; font-size: 11px;">
                      &copy; ${new Date().getFullYear()} SyncAcademy. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Creates the Invitation Email (HTML + PlainText)
 */
export function buildInvitationEmail(params: {
  recipientName?: string;
  recipientEmail: string;
  organizationName: string;
  roleDescription: string;
  roleLabel: string;
  expiryLabel: string;
  token: string;
  appOrigin: string;
}): { subject: string; html: string; text: string } {
  const invitationUrl = `${params.appOrigin}/auth/invitation#token=${params.token}`;
  const subject = `Invitation to ${params.organizationName}`;
  const isPlatformInvitation = params.roleLabel === 'Platform Administrator (SUPER_ADMIN)';
  const invitationMessage = isPlatformInvitation
    ? `You have been invited to join the ${params.organizationName.replace(/^the /, '')} ${params.roleDescription}. To get started and set up your account, please click the activation button below:`
    : `You have been invited to join ${params.organizationName} on SyncAcademy. To get started and set up your account, please click the activation button below:`;
  const previewText = `Complete your account setup for ${params.organizationName}. This invitation expires in ${params.expiryLabel}.`;
  const text = `${invitationMessage} Accept within ${params.expiryLabel}: ${invitationUrl}\nIf you already have an account, sign in to that account to accept. If unexpected, ignore this email.`;

  const displayName = params.recipientName ? params.recipientName : params.recipientEmail;

  const contentHtml = `
    <!-- Top Greeting -->
    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #E87E24; margin-bottom: 6px;">
      Welcome Aboard
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1.3;">
      Welcome to SyncAcademy
    </h1>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569; line-height: 1.6;">
      Hello <strong>${escapeHtml(displayName)}</strong>,
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
      ${isPlatformInvitation
        ? `You have been invited to join <strong>${escapeHtml(params.organizationName.replace(/^the /, ''))}</strong> ${escapeHtml(params.roleDescription)}. To get started and set up your account, please click the activation button below:`
        : `You have been invited to join <strong>${escapeHtml(params.organizationName)}</strong> on SyncAcademy. To get started and set up your account, please click the activation button below:`}
    </p>

    <!-- INVITATION DETAILS CARD -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 28px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="35%" style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">
                Organization:
              </td>
              <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 600;">
                ${escapeHtml(params.organizationName)}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">
                Assigned Role:
              </td>
              <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 600;">
                ${escapeHtml(params.roleLabel)}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">
                Account Email:
              </td>
              <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 500;">
                ${escapeHtml(params.recipientEmail)}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">
                Expiration:
              </td>
              <td style="padding: 6px 0; font-size: 13px; color: #B45309; font-weight: 600;">
                <span style="display: inline-block; background-color: #FEF3C7; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                  Valid for ${escapeHtml(params.expiryLabel)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- PRIMARY CTA BUTTON -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(invitationUrl)}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="18%" strokecolor="#E87E24" fillcolor="#E87E24">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Accept Invitation & Activate</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="border-radius: 8px; background-color: #E87E24;">
                <a href="${escapeHtml(invitationUrl)}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                  Accept Invitation & Activate &rarr;
                </a>
              </td>
            </tr>
          </table>
          <!--<![endif]-->
        </td>
      </tr>
    </table>

    <!-- GUIDANCE CALLOUT -->
    <div style="background-color: #F8FAFC; border-left: 3px solid #E87E24; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px; font-size: 13px; color: #475569; line-height: 1.5;">
      <strong>Use your existing account</strong> Sign in with this email to add the invited role to your existing SyncAcademy account.
    </div>

    <!-- FALLBACK LINK -->
    <div style="padding-top: 14px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #64748B; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;">If you are unable to click the button, copy and paste this URL into your browser:</p>
      <p style="margin: 0; word-break: break-all;">
        <a href="${escapeHtml(invitationUrl)}" style="color: #E87E24; text-decoration: underline;">${escapeHtml(invitationUrl)}</a>
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    title: subject,
    previewText,
    badgeText: 'Invitation',
    badgeType: 'default',
    logoSrc: `cid:${SYNCACADEMY_LOGO_CID}`,
    contentHtml,
  });

  return { subject, html, text };
}

/**
 * Creates the Password Reset Email (HTML + PlainText)
 */
export function buildPasswordResetEmail(params: {
  recipientEmail: string;
  token: string;
  appOrigin: string;
}): { subject: string; html: string; text: string } {
  const resetUrl = `${params.appOrigin}/auth/reset#token=${params.token}`;
  const subject = 'Reset your SyncAcademy password';
  const text = `Reset your password within 30 minutes: ${resetUrl}\nIf you did not request this, ignore this message.`;

  const contentHtml = `
    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #E87E24; margin-bottom: 6px;">
      Account Recovery
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1.3;">
      Reset Your Password
    </h1>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569; line-height: 1.6;">
      Hello,
    </p>
    
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
      We received a request to reset the password for your SyncAcademy account (<strong style="color: #0F172A;">${escapeHtml(params.recipientEmail)}</strong>). Click the button below to choose a new password:
    </p>

    <!-- URGENCY CALLOUT (30-MINUTE EXPIRATION) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; margin-bottom: 28px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" width="28" style="padding-right: 12px;">
                <span style="font-size: 20px; line-height: 1;">⏱️</span>
              </td>
              <td valign="top" style="font-size: 13px; color: #92400E; line-height: 1.5;">
                <strong>Time-sensitive link:</strong> This reset link expires in <strong>30 minutes</strong> and can only be used once. If it expires, you will need to request a new one from the sign-in screen.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- PRIMARY CTA BUTTON -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(resetUrl)}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="18%" strokecolor="#E87E24" fillcolor="#E87E24">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reset Password</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="border-radius: 8px; background-color: #E87E24;">
                <a href="${escapeHtml(resetUrl)}" target="_blank" style="display: inline-block; padding: 14px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                  Reset Password &rarr;
                </a>
              </td>
            </tr>
          </table>
          <!--<![endif]-->
        </td>
      </tr>
    </table>

    <!-- SECURITY REASSURANCE -->
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; font-size: 13px; color: #475569; line-height: 1.5;">
      <strong style="color: #0F172A;">If you did not request this password reset</strong><br>
      If you did not request this change, you can safely ignore this email. Your current password remains active and secure.
    </div>

    <!-- FALLBACK LINK -->
    <div style="padding-top: 14px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #64748B; line-height: 1.6;">
      <p style="margin: 0 0 6px 0;">If you are unable to click the button, copy and paste this URL into your browser:</p>
      <p style="margin: 0; word-break: break-all;">
        <a href="${escapeHtml(resetUrl)}" style="color: #E87E24; text-decoration: underline;">${escapeHtml(resetUrl)}</a>
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    title: subject,
    previewText: 'Reset your SyncAcademy password. This secure link expires in 30 minutes.',
    badgeText: 'Security Alert',
    badgeType: 'alert',
    logoSrc: `cid:${SYNCACADEMY_LOGO_CID}`,
    contentHtml,
  });

  return { subject, html, text };
}

/**
 * Creates Contact Us Inquiry Email (HTML + PlainText)
 */
export function buildContactInquiryEmail(params: {
  fullName: string;
  emailAddress: string;
  phoneNumber?: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const emailSubject = `SyncAcademy Inquiry: ${params.subject.replace(/[\r\n\u2028\u2029]+/g, ' ').trim()}`;
  const text = `New Contact Form Submission\n\nName: ${params.fullName}\nEmail: ${params.emailAddress}\nPhone: ${params.phoneNumber || 'Not provided'}\nSubject: ${params.subject}\n\nMessage:\n${params.message}`;

  const contentHtml = `
    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #E87E24; margin-bottom: 6px;">
      Customer Inquiry
    </div>
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1.3;">
      New Contact Form Message
    </h1>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="30%" style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">Name:</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${escapeHtml(params.fullName)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">Email:</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 500;">
                <a href="mailto:${escapeHtml(params.emailAddress)}" style="color: #E87E24; text-decoration: underline;">${escapeHtml(params.emailAddress)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">Phone:</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 500;">${escapeHtml(params.phoneNumber || 'Not provided')}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #64748B; font-weight: 500;">Subject:</td>
              <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 600;">${escapeHtml(params.subject)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="margin-top: 10px; background-color: #F8FAFC; border-left: 3px solid #E87E24; padding: 16px 20px; border-radius: 0 8px 8px 0; color: #334155; line-height: 1.6; white-space: pre-wrap; font-size: 14px;">
      <strong>Message:</strong><br><br>${escapeHtml(params.message)}
    </div>
  `;

  const html = renderEmailLayout({
    title: emailSubject,
    previewText: `Inquiry from ${params.fullName}: ${params.subject}`,
    badgeText: 'Contact Form',
    badgeType: 'info',
    logoSrc: `cid:${SYNCACADEMY_LOGO_CID}`,
    contentHtml,
  });

  return { subject: emailSubject, html, text };
}
