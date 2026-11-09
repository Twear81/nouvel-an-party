import { SKINS } from "../../src/shared/skins";
import { AVATARS, COLORS, FRAMES } from "../../src/web/theme/profile-options";
import { expect, test } from "./helpers/fixtures";

// Les cadres doivent garder le choix du joueur sur les deux appareils, quelle que soit la silhouette du skin.
for (const skin of SKINS) {
  test(`avatars : les six cadres et la photo suivent le skin ${skin}`, { tag: "@compat" }, async ({ party }, testInfo) => {
    await party.tv.goto(`${party.server.tvUrl}?skin=${skin}`);
    const { page } = await party.openPhonePage({ viewport: { width: 360, height: 640 } });
    await page.goto(`${party.server.playUrl}?skin=${skin}`);
    await page.getByTestId("profile-name").fill("Alexandre-Louis1");
    await page.getByTestId("avatar-option").first().click();
    await page.getByTestId("color-option").first().click();

    // Les six aperçus emploient le portrait choisi, pas un emoji codé en dur.
    await expect(page.getByTestId("frame-option")).toHaveCount(FRAMES.length);
    for (const option of await page.getByTestId("frame-option").all()) {
      await expect(option).toContainText(AVATARS[0]!.emoji);
    }
    await page.getByTestId("profile-frames").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("profile-frames").screenshot({ path: testInfo.outputPath("cadres-emoji.png"), animations: "disabled" });
    const id = (await party.tvPlayerIds())[0]!;
    const tile = party.tvPlayer(id);
    for (const frame of FRAMES) {
      await page.getByTestId("frame-option").filter({ has: page.locator(`[data-frame="${frame.id}"]`) }).click();
      await expect(page.getByTestId("profile-preview").locator('[data-ui="avatar"]')).toHaveAttribute("data-frame", frame.id);
      await page.getByTestId("profile-submit").click();
      await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
      await expect(tile.locator('[data-ui="avatar"]')).toHaveAttribute("data-frame", frame.id);
      await expect(tile).toContainText(AVATARS[0]!.emoji);
      await expect(tile.locator(`[style*="${COLORS[0]}"]`)).toBeVisible();
      // Reconnexion : le choix est toujours le même, sans dépendre d'un état React local.
      await page.reload();
      await expect(page.getByTestId("phone-lobby-ready").locator('[data-ui="avatar"]')).toHaveAttribute("data-frame", frame.id);
      await page.getByTestId("edit-profile").click();
    }

    // Un portrait photo doit bénéficier exactement des mêmes aperçus et cadres.
    await page.context().addInitScript(() => Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true }));
    await page.reload();
    await page.getByTestId("edit-profile").click();
    await page.getByTestId("take-photo").click();
    await page.getByTestId("photo-file").setInputFiles("tests/e2e/fixtures/config/medias/piece-test.png");
    await expect(page.getByTestId("profile-preview").locator("img")).toBeVisible();
    for (const option of await page.getByTestId("frame-option").all()) {
      await expect(option.locator("img")).toBeVisible();
    }
    await page.getByTestId("profile-frames").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("profile-frames").screenshot({ path: testInfo.outputPath("cadres-photo.png"), animations: "disabled" });
    await page.locator("form").evaluate((el) => { el.scrollTop = 0; });
    const submit = await page.getByTestId("profile-submit").boundingBox();
    expect(submit).not.toBeNull();
    expect(submit!.x).toBeGreaterThanOrEqual(0);
    expect(submit!.x + submit!.width).toBeLessThanOrEqual(360);
    expect(submit!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath("profil-360x640.png"), animations: "disabled" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const animatedFrames = page.getByTestId("profile-frames").locator('[data-ui="avatar-frame"] g');
    expect(await animatedFrames.evaluateAll((els) => els.some((el) => getComputedStyle(el).animationName !== "none"))).toBe(false);
    await page.getByTestId("profile-submit").click();
    await expect(tile.locator("img")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
