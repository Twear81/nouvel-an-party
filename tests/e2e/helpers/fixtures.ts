// Fixtures Playwright : `party` = un serveur neuf + une TV ouverte + des téléphones à ajouter à la demande.
import { test as base, expect, type Browser, type BrowserContextOptions } from "@playwright/test";
import { DEFAULT_PHONE, Party } from "./party";
import { createServer, type ServerOptions } from "./server";

/** Options propres à nos tests, réglées par projet dans playwright.config.ts. */
export interface TestOptions {
  /** Contexte navigateur d'un téléphone (taille, tactile, user-agent…) : Android, Firefox mobile ou iPhone selon le projet. */
  phoneOptions: BrowserContextOptions;
}

export const test = base.extend<{ party: Party; serverOptions: ServerOptions } & TestOptions, { tvBrowser: Browser }>({
  serverOptions: [{}, { option: true }],
  phoneOptions: [DEFAULT_PHONE, { option: true }],
  // La TV est toujours un Chromium (le PC de la soirée) ; seuls les téléphones changent de moteur selon le projet.
  tvBrowser: [
    async ({ browser, browserName, playwright }, use) => {
      if (browserName === "chromium") return use(browser);
      const tv = await playwright.chromium.launch({ args: [], firefoxUserPrefs: undefined });
      await use(tv);
      await tv.close();
    },
    { scope: "worker" },
  ],
  party: async ({ browser, tvBrowser, serverOptions, phoneOptions }, use) => {
    const server = await createServer(serverOptions);
    const party = new Party(browser, server, phoneOptions, tvBrowser);
    try {
      await party.openTv();
      await use(party);
    } finally {
      await party.close();
      await server.dispose();
    }
  },
});

export { expect };
