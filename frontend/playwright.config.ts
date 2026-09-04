import { defineConfig, devices } from "@playwright/test";

const PORT = 3417;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Statically exported (output: "export") - "next start" no longer applies, so
    // serve the exported "out/" directory the same way the FastAPI backend does.
    command: `npm run build && python3 -m http.server ${PORT} --directory out`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
