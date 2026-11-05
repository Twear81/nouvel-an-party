import { AVATARS, COLORS, FRAMES } from "../../src/web/theme/profile-options";
import { expect, test } from "./helpers/fixtures";
import { takePhoto } from "./helpers/party";

// Petite image PNG (4x4 px) : le téléphone la recadre en carré et la ré-encode (webp, ou jpeg si le navigateur ne sait pas).
const PNG_4X4 = "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGM4YVMBRwzEcQBu0hfBUJ+tSwAAAABJRU5ErkJggg==";

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

  const NO_FAKE_CAMERA = "WebKit (Playwright) n'a pas de caméra factice : la prise de photo est testée sur Chromium et Firefox, le repli fichier sur les trois.";

  test("profil avec une photo prise à la caméra", { tag: "@compat" }, async ({ party, browserName }) => {
    test.skip(browserName === "webkit", NO_FAKE_CAMERA);
    const phone = await party.addPhone("Photographe", { photo: true });
    const tile = party.tvPlayer(phone.id!);
    const img = tile.locator("img");
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    expect(src).toMatch(/^\/photos\/.+\.(webp|jpg|png)$/);
    const res = await party.tv.request.get(new URL(src!, party.server.tvUrl).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^image\//);
    // Le téléphone affiche aussi la photo (servie en HTTPS).
    await expect(phone.t("phone-lobby-ready").locator("img")).toBeVisible();
  });

  test("on peut annuler la caméra et garder un avatar prédéfini", async ({ party, browserName }) => {
    test.skip(browserName === "webkit", NO_FAKE_CAMERA);
    const { page } = await party.openPhonePage();
    await page.getByTestId("take-photo").click();
    await expect(page.getByTestId("capture-photo")).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByTestId("profile-name")).toBeVisible();
    await page.getByTestId("profile-name").fill("Sans photo");
    await page.getByTestId("profile-submit").click();
    await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
  });

  test("sans caméra (refusée, iOS en HTTP…) : repli sur l'appareil photo / la galerie du téléphone", { tag: "@compat" }, async ({ party }) => {
    const { context, page } = await party.openPhonePage();
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    });
    await page.reload();
    await page.getByTestId("profile-name").fill("Galerie");
    await page.getByTestId("take-photo").click();
    // Le bouton de repli est proposé (la caméra n'a pas pu s'ouvrir) et la capture directe ne l'est pas.
    await expect(page.getByRole("button", { name: /Choisir/ })).toBeVisible();
    await expect(page.getByTestId("capture-photo")).toHaveCount(0);
    await page.getByTestId("photo-file").setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: Buffer.from(PNG_4X4, "base64") });
    await expect(page.getByTestId("profile-submit")).toBeVisible();
    await page.getByTestId("profile-submit").click();
    await expect(page.getByTestId("phone-lobby-ready").locator("img")).toBeVisible();
    const ids = await party.tvPlayerIds();
    await expect(party.tvPlayer(ids[0]!).locator("img")).toBeVisible();
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
