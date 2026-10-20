import { test as base, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

// Real disk-backed API, isolated per test. New tabs in the same context share its project.
export const test = base.extend({
  extraHTTPHeaders: async ({ baseURL }, runFixture, info) => {
    const namespace =
      'test-' +
      createHash('sha256')
        .update(`${baseURL}:${info.testId}:${info.retry}`)
        .digest('hex')
        .slice(0, 32);
    await runFixture({ 'x-studio-test-workspace': namespace });
  },
});
export { expect };
