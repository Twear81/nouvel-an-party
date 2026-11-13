import { expect, test } from "./helpers/fixtures";

test.describe("Cérémonie dans la pièce", () => {
  test.use({ serverOptions: { outro: true, ceremonyTimeScale: 1 } });
  test("huit invités, petits téléphones et classement de nuit", { tag: "@compat" }, async ({ party }, testInfo) => {
    test.setTimeout(150_000);
    const names = Array.from({ length: 8 }, (_, i) => `Invite${i + 1}123456789`);
    const phones = await party.addPhones(...names);
    for (const phone of phones) await phone.page.setViewportSize({ width: 360, height: 640 });
    await party.startGame({ "qui-est-le-plus": 1 });
    await party.answerRound();
    await party.continueAll();
    const ceremony = party.tv.getByTestId("tv-ceremony");
    await expect(ceremony).toBeVisible({ timeout: 15_000 });
    await party.tv.getByTestId("host-pause").click();
    await expect(party.tv.getByTestId("paused-overlay")).toBeVisible();
    const captured = new Set<string>();
    for (let i = 0; i < 30 && await ceremony.count(); i++) {
      const step = (await ceremony.getAttribute("data-step"))!;
      const index = await ceremony.getAttribute("data-index");
      if (!captured.has(step)) {
        await party.tv.screenshot({ path: testInfo.outputPath(`tv-${step}.png`), animations: "disabled", style: '[data-testid="paused-overlay"] { visibility: hidden; }' });
        await phones[0]!.page.screenshot({ path: testInfo.outputPath(`phone-${step}.png`), animations: "disabled", style: '[data-testid="paused-overlay"] { visibility: hidden; }' });
        captured.add(step);
      }
      await expect(phones[0]!.t("phone-ceremony")).toHaveAttribute("data-step", step);
      await expect(phones[0]!.t("phone-final")).toHaveCount(0);
      await party.tv.getByTestId("host-skip").click();
      await expect.poll(() => party.tv.evaluate(() => {
        const element = document.querySelector('[data-testid="tv-ceremony"]');
        return element ? `${element.getAttribute("data-step")}:${element.getAttribute("data-index")}` : "final";
      })).not.toBe(`${step}:${index}`);
    }
    const final = party.tv.getByTestId("tv-final");
    await expect(final).toHaveAttribute("data-stage", "reveal");
    await party.tv.getByTestId("host-pause").click();
    await party.tv.screenshot({ path: testInfo.outputPath("tv-final-nuit.png"), animations: "disabled", style: '[data-testid="paused-overlay"] { visibility: hidden; }' });
    await party.tv.reload();
    await expect(party.tv.getByTestId("paused-overlay")).toBeVisible();
    for (let i = 0; i < 9; i++) await party.tv.getByTestId("host-skip").click();
    await expect(final).toHaveAttribute("data-stage", "done");
    await expect(party.tv.getByTestId("final-ranking-board")).toBeVisible();
    for (const name of names) await expect(party.tv.getByTestId("final-ranking-board")).toContainText(name);
    for (const n of [1, 2, 3]) await expect(party.tv.getByTestId(`podium-${n}`)).toBeInViewport({ ratio: 1 });
    for (const n of [4, 5, 6, 7, 8]) await expect(party.tv.getByTestId(`rank-${n}`)).toBeVisible();
    // Les invités installés dans le décor laissent les trois portraits du podium visibles.
    for (const rank of [4, 5, 6, 7, 8]) for (const place of [1, 2, 3]) {
      const other = await party.tv.getByTestId(`rank-${rank}`).locator('[data-ui="avatar"]').boundingBox();
      const podium = await party.tv.getByTestId(`podium-${place}`).locator('[data-ui="avatar"]').boundingBox();
      expect(other).not.toBeNull(); expect(podium).not.toBeNull();
      const width = Math.max(0, Math.min(other!.x + other!.width, podium!.x + podium!.width) - Math.max(other!.x, podium!.x));
      const height = Math.max(0, Math.min(other!.y + other!.height, podium!.y + podium!.height) - Math.max(other!.y, podium!.y));
      expect(width * height, `portrait ${rank} devant le podium ${place}`).toBe(0);
    }
    await party.tv.screenshot({ path: testInfo.outputPath("tv-final-done.png"), animations: "disabled", style: '[data-testid="paused-overlay"] { visibility: hidden; }' });
    await party.tv.getByTestId("host-pause").click();
    await expect(phones[0]!.t("phone-final")).toBeVisible();
    await phones[0]!.page.screenshot({ path: testInfo.outputPath("phone-final.png") });
    expect(await phones[0]!.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
