import { test as base, expect } from './studio-test.mjs';

// These regression fixtures describe the original, single-map starter workspace.
// Authored bundled examples have their own integration test with the real library.
export const test = base.extend({
  page: async ({ page }, runFixture) => {
    await page.route('**/maps/kmutt/**', (route) =>
      route.fulfill({ status: 404, body: 'Starter-only fixture' }),
    );
    await runFixture(page);
  },
});
export { expect };
