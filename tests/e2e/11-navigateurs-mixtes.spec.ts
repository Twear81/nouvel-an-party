// Une vraie soirée : TV sur Chromium, et des téléphones Android (Chromium), Firefox et iPhone (WebKit) dans la même partie.
import { devices, type Browser } from "@playwright/test";
import { existsSync } from "node:fs";
import { expect, test } from "./helpers/fixtures";

test.describe("Navigateurs mixtes", () => {
  test("Chromium, Firefox et Safari jouent ensemble jusqu'au classement", async ({ party, browserName, playwright }) => {
    test.skip(browserName !== "chromium", "scénario lancé une seule fois, depuis le projet chromium");
    const missing = [playwright.firefox, playwright.webkit].filter((b) => !existsSync(b.executablePath()));
    test.skip(missing.length > 0, "Firefox / WebKit non installés (bunx playwright install firefox webkit)");

    const firefox = await playwright.firefox.launch();
    const webkit = await playwright.webkit.launch();
    const { defaultBrowserType: _, ...iphone } = devices["iPhone 14"];
    const others: Browser[] = [firefox, webkit];
    try {
      const android = await party.addPhone("Android");
      const fx = await party.addPhone("Firefox", { browser: { browser: firefox, options: { viewport: { width: 390, height: 844 }, hasTouch: true } } });
      const ios = await party.addPhone("iPhone", { browser: { browser: webkit, options: iphone } });

      await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 1 });
      for (let round = 0; round < 2; round++) {
        await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
        await party.answerRound();
        await expect(party.tv.getByTestId("tv-results")).toBeVisible();
        for (const p of [android, fx, ios]) await p.t("continue-button").click();
      }
      await expect(party.tv.getByTestId("tv-final")).toBeVisible();
      for (const p of [android, fx, ios]) await expect(p.t("phone-final")).toBeVisible();
    } finally {
      for (const b of others) await b.close();
    }
  });
});
