// Fixtures Playwright : `party` = un serveur neuf + une TV ouverte + des téléphones à ajouter à la demande.
import { test as base, expect } from "@playwright/test";
import { Party } from "./party";
import { createServer, type ServerOptions } from "./server";

export const test = base.extend<{ party: Party; serverOptions: ServerOptions }>({
  serverOptions: [{}, { option: true }],
  party: async ({ browser, serverOptions }, use) => {
    const server = await createServer(serverOptions);
    const party = new Party(browser, server);
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
