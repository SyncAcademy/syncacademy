const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { digest } = require('../dist/security');
const { parentActivationToken, parentInvitationMessage, queueParentInvitation } = require('../dist/parent-invitations');

test('new parent invitations use one random 32-character credential for link and manual entry', async () => {
  const tokens = new Set(Array.from({ length: 100 }, parentActivationToken));
  assert.equal(tokens.size, 100);
  for (const token of tokens) assert.match(token, /^[A-F0-9]{32}$/);
  let saved;
  let queued;
  const tx = {
    school: { findFirst: async () => ({ name: 'Example School' }) },
    $queryRaw: async () => [],
    guardian: { findFirst: async () => ({ id: 'guardian', phone: '255712345678', email: 'parent@example.test', optOutSms: false, students: [{ id: 'link' }] }) },
    parentInvitation: {
      findFirst: async () => null,
      create: async ({ data }) => { saved = data; return { id: 'invitation', expiresAt: data.expiresAt }; },
    },
    auditEvent: { create: async () => ({}) },
  };
  const comms = { enqueueMessage: async (_tx, message) => { queued = message; } };
  await queueParentInvitation(tx, comms, 'school', 'guardian', 'EMAIL', 'staff');
  const token = /token=([A-F0-9]{32})/.exec(queued.body)?.[1];
  assert.ok(token);
  assert.equal(saved.tokenHash, digest(token));
  assert.equal(saved.codeHash, digest(token));
  assert.equal(saved.expiresAt.getTime() > Date.now() + 47 * 3600000, true);
  assert.match(queued.html, /Example School/);
  assert.doesNotMatch(queued.body, /verification code|OTP/i);
});

test('invitation email escapes school names and SMS includes activation link', () => {
  const token = parentActivationToken();
  const email = parentInvitationMessage('<Example School>', token, 'EMAIL');
  assert.match(email.html, /&lt;Example School&gt;/);
  assert.doesNotMatch(email.html, /<Example School>/);
  const sms = parentInvitationMessage('Example School', token, 'SMS');
  assert.match(sms.body, /\/parent\/activate\?token=/);
  assert.equal(sms.html, undefined);
});

test('channel selection uses saved contact and rejects unavailable destinations', async () => {
  for (const [contact, channel, recipient] of [
    [{ phone: null, email: 'parent@example.test' }, 'EMAIL', 'parent@example.test'],
    [{ phone: '255712345678', email: null }, 'SMS', '255712345678'],
    [{ phone: '255712345678', email: 'parent@example.test' }, 'EMAIL', 'parent@example.test'],
  ]) {
    let queued;
    const tx = {
      school: { findFirst: async () => ({ name: 'Example School' }) },
      $queryRaw: async () => [],
      guardian: { findFirst: async () => ({ ...contact, students: [{ id: 'link' }], optOutSms: false }) },
      parentInvitation: { findFirst: async () => null, create: async ({ data }) => ({ id: 'invitation', expiresAt: data.expiresAt }) },
      auditEvent: { create: async () => ({}) },
    };
    await queueParentInvitation(tx, { enqueueMessage: async (_tx, message) => { queued = message; } }, 'school', 'guardian', channel, 'staff');
    assert.equal(queued.recipient, recipient);
  }
  const empty = {
    school: { findFirst: async () => ({ name: 'Example School' }) },
    $queryRaw: async () => [],
    guardian: { findFirst: async () => ({ phone: null, email: null, students: [{ id: 'link' }] }) },
  };
  await assert.rejects(queueParentInvitation(empty, {}, 'school', 'guardian', 'EMAIL', 'staff'), /cannot receive/);
});
