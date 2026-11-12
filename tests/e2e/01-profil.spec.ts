import { AVATARS, COLORS, FRAMES } from "../../src/web/theme/profile-options";
import { expect, test } from "./helpers/fixtures";

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
    await page.getByTestId("frame-option").nth(2).click();
    await page.getByTestId("color-option").nth(4).click();
    await expect(page.getByTestId("avatar-option").nth(3)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("frame-option").nth(2)).toHaveAttribute("aria-pressed", "true");
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
