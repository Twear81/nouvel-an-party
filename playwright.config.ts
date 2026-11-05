// Tests E2E : la TV (HTTP) et plusieurs téléphones (HTTPS auto-signé) pilotés par un vrai navigateur.
// Chaque test lance son propre serveur (voir tests/e2e/helpers/server.ts).
// Trois projets = les trois moteurs des téléphones d'une soirée : Chromium (Android/Chrome), Firefox (Android), WebKit (iPhone/Safari).
// La TV (le PC de la soirée) est toujours un Chromium.
// Chromium joue toute la suite ; Firefox et WebKit ne rejouent que les tests marqués @compat
// (profil, caméra, partie complète, reconnexion, réglages tactiles, affichage 8 joueurs) pour garder une CI rapide.
import { defineConfig, devices } from "@playwright/test";
import type { TestOptions } from "./tests/e2e/helpers/fixtures";

const PHONE_SIZE = { width: 390, height: 844 };
// Les descripteurs d'appareils contiennent `defaultBrowserType`, qui n'est pas une option de contexte.
const { defaultBrowserType: _a, ...pixel } = devices["Pixel 7"];
const { defaultBrowserType: _b, ...iphone } = devices["iPhone 14"];

export default defineConfig<TestOptions>({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  workers: process.env.CI ? 3 : 4,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        // Caméra factice : permet de tester la prise de photo de profil sans matériel.
        launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
        phoneOptions: { ...pixel, viewport: PHONE_SIZE, permissions: ["camera"] },
      },
    },
    {
      name: "firefox",
      grep: /@compat/,
      use: {
        browserName: "firefox",
        launchOptions: {
          // Caméra factice + pas de demande d'autorisation.
          firefoxUserPrefs: { "media.navigator.streams.fake": true, "media.navigator.permission.disabled": true },
        },
        // Firefox ne gère pas `isMobile` : écran de la taille d'un téléphone + tactile, c'est ce qui compte pour la mise en page.
        phoneOptions: { viewport: PHONE_SIZE, hasTouch: true, deviceScaleFactor: 2 },
      },
    },
    {
      name: "webkit",
      grep: /@compat/,
      use: {
        browserName: "webkit",
        // iPhone : Safari mobile (user-agent, tactile, isMobile). Pas de caméra factice possible dans WebKit : voir les tests de photo.
        phoneOptions: { ...iphone, viewport: PHONE_SIZE },
      },
    },
  ],
});
