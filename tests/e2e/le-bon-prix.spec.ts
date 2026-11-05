import { expect, test } from "./helpers/fixtures";
import type { Phone } from "./helpers/party";

/** Tape un montant au pavé numérique ("12,5") puis valide. */
async function typePrice(p: Phone, amount: string) {
  for (const k of amount) await p.t(k === "," ? "key-comma" : `key-${k}`).click();
  await p.t("submit-guess").click();
}

test.describe("Le bon prix", () => {
  test("photo de l'objet, pavé numérique, révélation et points", async ({ party }) => {
    const { tv } = party;
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "le-bon-prix": 1 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible({ timeout: 10_000 });

    // La photo du fixture (config/medias) est servie et affichée sur la TV et les téléphones.
    await expect(tv.getByTestId("bp-name")).toHaveText("Une pièce en or");
    const img = tv.getByTestId("bp-image");
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    const res = await tv.request.get(new URL("/medias/piece-test.png", tv.url()).href);
    expect(res.status()).toBe(200);
    await expect(a!.t("bp-image")).toBeVisible();

    // Bob valide 200, puis change d'avis : il efface et tape 9,5.
    await typePrice(b!, "200");
    await expect(b!.t("bp-amount")).toHaveAttribute("data-validated", "true");
    await expect(tv.getByTestId("tv-answered-count")).toContainText("1");
    for (let i = 0; i < 3; i++) await b!.t("key-back").click();
    await expect(b!.t("bp-amount")).toHaveAttribute("data-validated", "false");
    await expect(b!.t("submit-guess")).toBeDisabled();
    await typePrice(b!, "9,5");
    await expect(b!.t("bp-amount")).toContainText("9,5");
    await expect(b!.t("bp-amount")).toHaveAttribute("data-validated", "true");

    await typePrice(a!, "100"); // pile le bon prix
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await typePrice(c!, "150");

    // Tout le monde a validé : fin anticipée, puis révélation.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 5_000 });
    await expect(tv.getByTestId("bp-results")).toHaveAttribute("data-stage", "done", { timeout: 15_000 });
    await expect(tv.getByTestId("bp-real-price")).toHaveText("100 €");
    await expect(tv.getByTestId(`bp-guess-${a!.id}`)).toHaveAttribute("data-rank", "1");
    await expect(tv.getByTestId(`bp-gap-${a!.id}`)).toContainText("Pile");
    await expect(tv.getByTestId(`bp-gap-${b!.id}`)).toHaveText("−90,50 €");
    await expect(tv.getByTestId(`bp-gap-${c!.id}`)).toHaveText("+50 €");
    await expect(tv.getByTestId("bp-winner")).toContainText("Alice");

    // Exact : 150 + 100 de bonus ; Chloé (50 € d'écart) 2e ; Bob (90,50 €) 3e.
    expect(await party.tvDeltas()).toEqual({ [a!.id!]: 250, [c!.id!]: 100, [b!.id!]: 60 });
    await expect(a!.t("phone-bp-result")).toContainText("Pile le bon prix");
    await expect(c!.t("phone-bp-result")).toContainText("2e sur 3");
    await expect(b!.t("phone-bp-price")).toHaveText("100 €");

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible({ timeout: 10_000 });
    await expect(a!.t("phone-final")).toContainText("250 pts");
    await expect(a!.t("phone-final")).toContainText("1er");
  });

  test.describe(() => {
    test.use({ serverOptions: { duree: 12 } });
    test("chrono écoulé : seul le prix validé compte, sans réponse = 0", async ({ party }) => {
      const [a, b] = await party.addPhones("Alice", "Bob");
      await party.startGame({ "le-bon-prix": 1 });
      await expect(party.tv.getByTestId("tv-playing")).toBeVisible({ timeout: 10_000 });
      // Alice tape un prix sans valider, Bob valide.
      await a!.t("key-9").click();
      await typePrice(b!, "80");
      await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 15_000 });
      expect(await party.tvDeltas()).toEqual({ [a!.id!]: 0, [b!.id!]: 150 });
      await expect(a!.t("phone-bp-result")).toContainText("Tu n'as pas répondu");
    });
  });
});
