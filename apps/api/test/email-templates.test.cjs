const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Import compiled dist modules
const {
  buildInvitationEmail,
  buildPasswordResetEmail,
  buildContactInquiryEmail,
  buildDemoRequestAcknowledgementEmail,
  SYNCACADEMY_LOGO_CID,
  escapeHtml
} = require('../dist/communication/email/email-templates');

test('embedded email logo has a valid PNG signature and matching content ID', () => {
  const logo = fs.readFileSync(path.join(__dirname, '../src/communication/email/syncacademy-logo.png'));
  assert.deepEqual([...logo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(SYNCACADEMY_LOGO_CID, 'syncacademy-logo');
});

test('escapeHtml sanitizes unsafe input strings', () => {
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml('Hello & "World" \'test\''), 'Hello &amp; &quot;World&quot; &#39;test&#39;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('buildInvitationEmail uses one clear activation message for school invites', () => {
  const result = buildInvitationEmail({
    recipientName: 'Jane Doe',
    recipientEmail: 'jane@greenwood.test',
    organizationName: 'Greenwood High',
    roleDescription: 'to Greenwood High',
    roleLabel: 'TEACHER',
    expiryLabel: '2 days',
    token: 'test_token_abc_123',
    appOrigin: 'https://syncacademy.test'
  });

  assert.equal(result.subject, 'Invitation to Greenwood High');
  assert.match(
    result.text,
    /You have been invited to join Greenwood High on SyncAcademy\. To get started and set up your account, please click the activation button below:/,
  );
  assert.equal((result.text.match(/You have been invited/g) || []).length, 1);
  assert.match(result.text, /Accept within 2 days: https:\/\/syncacademy\.test\/auth\/invitation#token=test_token_abc_123/);

  // Logo & branding verification in HTML
  assert.match(result.html, /Sync/);
  assert.match(result.html, /Academy/);
  assert.match(result.html, /#E87E24/);
  assert.match(result.html, new RegExp(`src="cid:${SYNCACADEMY_LOGO_CID}"`));
  assert.match(result.html, /alt="SyncAcademy"/);
  assert.doesNotMatch(result.html, /height: 5px/);
  assert.match(result.html, /Welcome to SyncAcademy/);
  assert.match(
    result.html,
    /You have been invited to join <strong>Greenwood High<\/strong> on SyncAcademy\. To get started and set up your account, please click the activation button below:/,
  );
  assert.equal((result.html.match(/You have been invited/g) || []).length, 1);
  assert.match(result.html, /Greenwood High/);
  assert.match(result.html, /Jane Doe/);
  assert.match(result.html, /https:\/\/syncacademy\.test\/auth\/invitation#token=test_token_abc_123/);
  assert.match(result.html, /Accept Invitation & Activate/);
});

test('buildInvitationEmail handles platform super admin invitations correctly', () => {
  const result = buildInvitationEmail({
    recipientName: 'Admin Vance',
    recipientEmail: 'super@syncacademy.test',
    organizationName: 'the SyncAcademy platform',
    roleDescription: 'as a Super Admin',
    roleLabel: 'Platform Administrator (SUPER_ADMIN)',
    expiryLabel: '15 minutes',
    token: 'super_admin_token_456',
    appOrigin: 'https://syncacademy.test'
  });

  assert.equal(result.subject, 'Invitation to the SyncAcademy platform');
  assert.match(result.text, /within 15 minutes/);
  assert.match(
    result.text,
    /You have been invited to join the SyncAcademy platform as a Super Admin\. To get started and set up your account, please click the activation button below:/,
  );
  assert.match(result.text, /#token=super_admin_token_456/);

  assert.match(result.html, /Platform Administrator \(SUPER_ADMIN\)/);
  assert.match(result.html, /the SyncAcademy platform/);
  assert.match(result.html, /Valid for 15 minutes/);
});

test('buildPasswordResetEmail generates valid HTML and backwards-compatible text', () => {
  const result = buildPasswordResetEmail({
    recipientEmail: 'user@school.test',
    token: 'reset_token_xyz_789',
    appOrigin: 'https://syncacademy.test'
  });

  assert.equal(result.subject, 'Reset your SyncAcademy password');
  assert.match(result.text, /Reset your password within 30 minutes: https:\/\/syncacademy\.test\/auth\/reset#token=reset_token_xyz_789/);
  assert.match(result.text, /If you did not request this, ignore this message\./);

  // HTML checks
  assert.match(result.html, /Reset Your Password/);
  assert.match(result.html, /user@school\.test/);
  assert.match(result.html, /30 minutes/);
  assert.match(result.html, /https:\/\/syncacademy\.test\/auth\/reset#token=reset_token_xyz_789/);
  assert.match(result.html, /#E87E24/);
  assert.match(result.html, new RegExp(`src="cid:${SYNCACADEMY_LOGO_CID}"`));
  assert.doesNotMatch(result.html, /height: 5px/);
});

test('buildContactInquiryEmail generates valid HTML and text', () => {
  const result = buildContactInquiryEmail({
    fullName: 'Robert Frost',
    emailAddress: 'robert@poetry.test',
    phoneNumber: '+255 700 000 000',
    subject: 'School Onboarding Question',
    message: 'Hello, we would like to register 500 students.'
  });

  assert.equal(result.subject, 'SyncAcademy Inquiry: School Onboarding Question');
  assert.match(result.text, /Name: Robert Frost/);
  assert.match(result.html, /Robert Frost/);
  assert.match(result.html, /robert@poetry\.test/);
  assert.match(result.html, /\+255 700 000 000/);
  assert.match(result.html, /Hello, we would like to register 500 students\./);
  assert.match(result.html, /#E87E24/);
  assert.match(result.html, new RegExp(`src="cid:${SYNCACADEMY_LOGO_CID}"`));
  assert.doesNotMatch(result.html, /height: 5px/);
});

test('buildDemoRequestAcknowledgementEmail uses the shared logo and preserves the request message', () => {
  const result = buildDemoRequestAcknowledgementEmail({
    contactName: 'Amina Mushi',
    schoolName: 'Mlimani Primary School',
  });

  assert.equal(result.subject, 'SyncAcademy demo request received');
  assert.match(result.text, /Your demo request for Mlimani Primary School has been received/);
  assert.match(result.html, /Hello <strong>Amina Mushi<\/strong>/);
  assert.match(result.html, /Mlimani Primary School/);
  assert.match(result.html, new RegExp(`src="cid:${SYNCACADEMY_LOGO_CID}"`));
  assert.doesNotMatch(result.html, /height: 5px/);
});
