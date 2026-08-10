import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:43117",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm --filter @learn-anything/web dev --host 127.0.0.1 --port 43117 --strictPort",
    url: "http://127.0.0.1:43117",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
