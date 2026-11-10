// Tests E2E : la TV (HTTP) et plusieurs téléphones (HTTPS auto-signé) pilotés par un vrai navigateur.
// Chaque test lance son propre serveur (voir tests/e2e/helpers/server.ts).
// Trois projets = les trois moteurs des téléphones d'une soirée : Chromium (Android/Chrome), Firefox (Android), WebKit (iPhone/Safari).
// La TV (le PC de la soirée) est toujours un Chromium.
// Chromium joue toute la suite ; Firefox et WebKit ne rejouent que les tests marqués @compat
// (profil, partie complète, reconnexion, réglages tactiles) ; l'affichage à 8 joueurs reste testé sous Chromium pour garder une CI rapide.
import { defineConfig, devices } from "@playwright/test";
import type { TestOptions } from "./tests/e2e/helpers/fixtures";

const PHONE_SIZE = { width: 390, height: 844 };
// Les descripteurs d'appareils contiennent `defaultBrowserType`, qui n'est pas une option de contexte.
const { defaultBrowserType: _a, ...pixel } = devices["Pixel 7"];
const { defaultBrowserType: _b, ...iphone } = devices["iPhone 14"];

// WebKit sous Linux utilise le proxy de l'environnement, même pour nos serveurs locaux.
// Conserver les exclusions existantes et ajouter celles de la fixture (y compris les navigateurs mixtes).
const proxyBypass = [process.env.NO_PROXY, process.env.no_proxy, "localhost", "127.0.0.1", "::1"].filter(Boolean).join(",");
process.env.NO_PROXY = proxyBypass;
process.env.no_proxy = proxyBypass;

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
        phoneOptions: { ...pixel, viewport: PHONE_SIZE },
      },
    },
    {
      name: "firefox",
      grep: /@compat/,
      use: {
        browserName: "firefox",
        // Firefox ne gère pas `isMobile` : écran de la taille d'un téléphone + tactile, c'est ce qui compte pour la mise en page.
        phoneOptions: { viewport: PHONE_SIZE, hasTouch: true, deviceScaleFactor: 2 },
      },
    },
    {
      name: "webkit",
      grep: /@compat/,
      use: {
        browserName: "webkit",
        // iPhone : Safari mobile (user-agent, tactile, isMobile).
        phoneOptions: { ...iphone, viewport: PHONE_SIZE },
      },
    },
  ],
});
