// Tests E2E : la TV (HTTP) et plusieurs téléphones (HTTPS auto-signé) pilotés par Chromium.
// Chaque test lance son propre serveur (voir tests/e2e/helpers/server.ts).
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    launchOptions: {
      // Caméra factice : permet de tester la prise de photo de profil sans matériel.
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
