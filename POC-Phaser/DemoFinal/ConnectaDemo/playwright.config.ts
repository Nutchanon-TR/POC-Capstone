import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./apps/web/tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3110",
    channel: "msedge",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start --workspace @connecta/web -- --port 3110",
    url: "http://127.0.0.1:3110",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
