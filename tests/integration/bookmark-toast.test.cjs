const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createAppEnv } = require('../helpers/create-app-env.cjs');

describe('bookmark toast lifecycle', () => {
  it('schedules the initial toast after 60 seconds', () => {
    const env = createAppEnv({ captureTimers: true });
    const scheduledToast = env.timers.timeouts.find((entry) => entry.delay === 60000);

    assert.ok(scheduledToast, 'bookmark toast should wait 60000ms before showing');

    env.cleanup();
  });
});
