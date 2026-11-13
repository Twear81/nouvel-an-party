import { AVATARS, COLORS, FRAMES } from "../../src/web/theme/profile-options";
import { expect, test } from "./helpers/fixtures";
import { summonFrame } from "./helpers/party";

test.describe("Profil", () => {
  test("un pseudo vide ne peut pas être validé", async ({ party }) => {
    const { page } = await party.openPhonePage();
    const submit = page.getByTestId("profile-submit");
    await expect(submit).toBeDisabled();
    await page.getByTestId("profile-name").fill("   ");
    await expect(submit).toBeDisabled();
    await page.getByTestId("profile-name").fill("Zoé");
    await expect(submit).toBeEnabled();
    await page.getByTestId("profile-name").fill("");
    await expect(submit).toBeDisabled();
    // Le joueur existe sur la TV mais "crée son profil…" : il n'est pas prêt.
    await expect(party.tv.getByText("crée son profil…")).toBeVisible();
  });

  test("avatar, cadre et couleur choisis apparaissent sur la TV", { tag: "@compat" }, async ({ party }) => {
    const { page } = await party.openPhonePage();
    await page.getByTestId("profile-name").fill("Camille");

    await page.getByTestId("avatar-option").nth(3).click();
    await summonFrame(page, FRAMES[2]!.id);
    await page.getByTestId("color-option").nth(4).click();
    await expect(page.getByTestId("avatar-option").nth(3)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("color-option").nth(4)).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("profile-submit").click();
    await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
    await expect(page.getByTestId("phone-lobby-ready")).toContainText("Camille");

    const ids = await party.tvPlayerIds();
    expect(ids).toHaveLength(1);
    const tile = party.tvPlayer(ids[0]!);
    await expect(tile).toContainText("Camille");
    await expect(tile).toContainText(AVATARS[3]!.emoji);
    await expect(tile.locator(`.${FRAMES[2]!.className}`)).toBeVisible();
    await expect(tile.locator(`[style*="${COLORS[4]}"]`)).toBeVisible();
    // Le QR code d'inscription est affiché dans le lobby.
    await expect(party.tv.getByTestId("tv-qr")).toBeVisible();
  });

  test("l'invocation tire un cadre, annonce sa rareté et se relance", async ({ party }) => {
    const { page } = await party.openPhonePage();
    await page.getByTestId("profile-name").fill("Gacha");
    const summon = page.getByTestId("frame-summon");
    const button = page.getByTestId("frame-summon-button");
    await button.scrollIntoViewIfNeeded();
    await expect(button).toContainText("Invoquer");
    // Rareté SSR forcée : étoiles et étiquette, et la validation du profil attend la fin du tirage.
    await page.evaluate(() => localStorage.setItem("summon-force", "saiyan"));
    await button.click();
    await expect(summon).toHaveAttribute("data-phase", "summoning");
    await expect(button).toBeDisabled();
    await expect(page.getByTestId("profile-submit")).toBeDisabled();
    await expect(summon).toHaveAttribute("data-phase", "done", { timeout: 10_000 });
    await expect(page.getByTestId("frame-result")).toHaveAttribute("data-rarity", "SSR");
    await expect(page.locator(".summon-star")).toHaveCount(5);
    await expect(button).toContainText("Relancer");
    // Relancer à volonté : un tirage libre donne toujours un cadre existant.
    await page.evaluate(() => localStorage.removeItem("summon-force"));
    await button.click();
    await expect(summon).toHaveAttribute("data-phase", "summoning");
    await expect(summon).toHaveAttribute("data-phase", "done", { timeout: 10_000 });
    const got = await page.getByTestId("frame-result").getAttribute("data-frame");
    expect(FRAMES.map((f) => f.id)).toContain(got);
    await expect(page.getByTestId("profile-preview").locator('[data-ui="avatar"]')).toHaveAttribute("data-frame", got!);
  });

  test("les avatars à image (sans emoji) s'affichent sur la TV", { tag: "@compat" }, async ({ party }) => {
    const { page } = await party.openPhonePage();
    await page.getByTestId("profile-name").fill("Image");
    const tile = party.tvPlayer((await party.tvPlayerIds())[0]!);
    for (const avatar of AVATARS.filter((a) => a.image)) {
      await page.getByTestId("avatar-option").nth(AVATARS.indexOf(avatar)).click();
      await expect(page.getByTestId("profile-preview").locator('[data-ui="avatar-image"]')).toBeVisible();
      await page.getByTestId("profile-submit").click();
      await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
      const image = tile.locator('[data-ui="avatar-image"]');
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute("src", /^(data:image\/svg\+xml|.*\.svg)/);
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await page.getByTestId("edit-profile").click();
    }
  });

  test("modifier son profil depuis le lobby change le nom sur la TV", async ({ party }) => {
    const phone = await party.addPhone("Ancien nom");
    const tile = party.tvPlayer(phone.id!);
    await expect(tile).toContainText("Ancien nom");

    await phone.t("edit-profile").click();
    await expect(phone.t("profile-name")).toHaveValue("Ancien nom");
    await phone.t("profile-name").fill("Nouveau nom");
    await phone.t("avatar-option").nth(7).click();
    await phone.t("profile-submit").click();

    await expect(phone.t("phone-lobby-ready")).toContainText("Nouveau nom");
    await expect(tile).toContainText("Nouveau nom");
    await expect(tile).not.toContainText("Ancien nom");
    await expect(tile).toContainText(AVATARS[7]!.emoji);
    // Toujours le même joueur : pas de doublon.
    expect(await party.tvPlayerIds()).toEqual([phone.id]);
  });
});
