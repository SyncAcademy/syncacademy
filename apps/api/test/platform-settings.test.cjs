const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ApiController } = require('../dist/api.controller');

test('platform settings returns defaults when no settings row has been saved', async () => {
  let authorized = false;
  const controller = new ApiController({
    administrator: async () => { authorized = true; },
    db: { platformSetting: { findUnique: async () => null } },
  });
  assert.deepEqual(await controller.platformSettings({}), {
    platformName: 'SyncAcademy', supportEmail: '', maintenanceMessage: '',
  });
  assert.equal(authorized, true);
});

test('platform settings preserves saved values and requires authorization', async () => {
  const saved = { id: 1, platformName: 'School Platform', supportEmail: 'support@example.test', maintenanceMessage: 'Scheduled maintenance' };
  const controller = new ApiController({
    administrator: async () => {},
    db: { platformSetting: { findUnique: async () => saved } },
  });
  assert.deepEqual(await controller.platformSettings({}), saved);
  const denied = new ApiController({ administrator: async () => { throw new Error('Forbidden'); } });
  await assert.rejects(denied.platformSettings({}), /Forbidden/);
});
