import { SKINS } from "../../src/shared/skins";
import { AVATARS, COLORS, FRAMES } from "../../src/web/theme/profile-options";
import { expect, test } from "./helpers/fixtures";
import { summonFrame } from "./helpers/party";

// Les cadres doivent garder le choix du joueur sur les deux appareils, quelle que soit la silhouette du skin.
for (const skin of [null, ...SKINS]) {
  test(`avatars : tous les cadres suivent le skin ${skin ?? "base"}`, { tag: "@compat" }, async ({ party }, testInfo) => {
    const skinQuery = skin ? `?skin=${skin}` : "";
    await party.tv.goto(`${party.server.tvUrl}${skinQuery}`);
    const { page } = await party.openPhonePage({ viewport: { width: 360, height: 640 } });
    await page.goto(`${party.server.playUrl}${skinQuery}`);
    await page.getByTestId("profile-name").fill("Alexandre-Louis1");
    await page.getByTestId("avatar-option").first().click();
    await page.getByTestId("color-option").first().click();

    // Les aperçus d'avatar emploient le portrait de la liste, pas un emoji codé en dur.
    await expect(page.getByTestId("avatar-option")).toHaveCount(AVATARS.length);
    await expect(page.getByTestId("avatar-option").first()).toContainText(AVATARS[0]!.emoji);
    const id = (await party.tvPlayerIds())[0]!;
    const tile = party.tvPlayer(id);
    const portraits: { label: string; html: string }[] = [];
    const shape = skin === "overwatch" ? "hexagon" : ["dofus", "rocket-league", "plague-tale"].includes(skin ?? "") ? "square" : "circle";
    for (const frame of FRAMES) {
      await summonFrame(page, frame.id);
      await page.getByTestId("frame-summon").screenshot({ path: testInfo.outputPath(`invocation-${frame.id}.png`), animations: "disabled" });
      await page.getByTestId("profile-submit").click();
      await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
      await expect(tile.locator('[data-ui="avatar"]')).toHaveAttribute("data-frame", frame.id);
      await expect(tile.locator(`[data-ui="avatar-frame-outer"] [data-avatar-shape="${shape}"]`)).toBeVisible();
      for (const hiddenShape of ["circle", "square", "hexagon"].filter((s) => s !== shape)) {
        await expect(tile.locator(`[data-ui="avatar-frame-outer"] [data-avatar-shape="${hiddenShape}"]`)).toBeHidden();
      }
      if (["saiyan", "geass", "karmine", "tournesol"].includes(frame.id)) {
        await expect(tile.locator(`[data-ui="avatar-frame-deco"][data-avatar-shape="${shape}"]`)).toBeVisible();
      }
      await expect(tile).toContainText(AVATARS[0]!.emoji);
      await expect(tile.locator(`[style*="${COLORS[0]}"]`)).toBeVisible();
      portraits.push({ label: frame.label, html: await tile.locator('[data-ui="avatar"]').evaluate((el) => el.outerHTML) });
      // Reconnexion : le choix est toujours le même, sans dépendre d'un état React local.
      await page.reload();
      await expect(page.getByTestId("phone-lobby-ready").locator('[data-ui="avatar"]')).toHaveAttribute("data-frame", frame.id);
      await page.getByTestId("edit-profile").click();
    }

    await page.locator("form").evaluate((el) => { el.scrollTop = 0; });
    const submit = await page.getByTestId("profile-submit").boundingBox();
    expect(submit).not.toBeNull();
    expect(submit!.x).toBeGreaterThanOrEqual(0);
    expect(submit!.x + submit!.width).toBeLessThanOrEqual(360);
    expect(submit!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath("profil-360x640.png"), animations: "disabled" });
    await page.getByTestId("profile-submit").click();
    await expect(tile).toContainText(AVATARS[0]!.emoji);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // Planche de revue : les dix vrais portraits rendus ci-dessus, avec le CSS du thème courant.
    await party.tv.evaluate(({ portraits, theme }) => {
      const gallery = document.createElement("section");
      gallery.dataset.testid = "cadres-overview";
      gallery.style.cssText = "position:fixed;inset:0;z-index:10000;background:var(--color-bg);color:var(--color-ink);padding:3rem;display:grid;grid-template-columns:repeat(5,1fr);gap:2rem;align-content:center";
      const title = document.createElement("h1");
      title.textContent = `Cadres · ${theme}`;
      title.style.cssText = "grid-column:1/-1;text-align:center;font-size:3rem";
      gallery.append(title);
      for (const portrait of portraits) {
        const cell = document.createElement("figure");
        cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2rem;padding:2rem 0";
        cell.innerHTML = portrait.html;
        const avatar = cell.firstElementChild as HTMLElement;
        avatar.style.width = "11rem";
        avatar.style.height = "11rem";
        avatar.style.fontSize = "1.1rem";
        const caption = document.createElement("figcaption");
        caption.textContent = portrait.label;
        caption.style.cssText = "font-size:1.4rem;text-align:center";
        cell.append(caption);
        gallery.append(cell);
      }
      document.body.append(gallery);
    }, { portraits, theme: skin ?? "base" });
    await party.tv.getByTestId("cadres-overview").screenshot({ path: testInfo.outputPath("planche-cadres.png"), animations: "disabled" });
  });
}
