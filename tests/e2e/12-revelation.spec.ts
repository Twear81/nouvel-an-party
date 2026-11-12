import { expect, test } from "./helpers/fixtures";
import { REVEAL_TIMEOUT, type Phone } from "./helpers/party";

/** Tape un montant au pavé numérique puis valide. */
async function typePrice(p: Phone, amount: string) {
  for (const k of amount) await p.t(k === "," ? "key-comma" : `key-${k}`).click();
  await p.t("submit-guess").click();
}

test.describe("Révélation des résultats", () => {
  test("le final reste sur la TV jusqu'à la fin du podium, même après rechargement", { tag: "@compat" }, async ({ party }, testInfo) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "ceci-ou-cela": 1 });
    await party.answerRound();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await party.continueAll();

    await expect(tv.getByTestId("tv-final")).toHaveAttribute("data-stage", "reveal");
    for (const p of phones) {
      await expect(p.t("phone-final-wait")).toBeVisible();
      await expect(p.t("phone-final")).toHaveCount(0);
      await expect(p.page.locator('[data-ui="score-row"][data-rank]')).toHaveCount(0);
    }

    // Une horloge en avance d'une heure ne doit pas contourner le suspense après rechargement.
    await phones[0]!.context.addInitScript(() => {
      const now = Date.now.bind(Date);
      Date.now = () => now() + 3_600_000;
    });
    await phones[0]!.page.reload();
    await expect(phones[0]!.t("phone-final-wait")).toBeVisible();
    await phones[0]!.page.screenshot({ path: testInfo.outputPath("final-telephone-attente.png") });
    await expect(tv.getByTestId("tv-final")).toHaveAttribute("data-stage", "done", { timeout: 15_000 });
    for (const p of phones) {
      await expect(p.t("phone-final")).toBeVisible();
      await expect(p.t("phone-final-wait")).toHaveCount(0);
    }

    // Le rechargement de la TV terminée ne doit pas rejouer son classement ni bloquer les téléphones.
    await tv.reload();
    await expect(tv.getByTestId("tv-final")).toHaveAttribute("data-stage", "done");
    await expect(tv.getByTestId("podium-1")).toContainText(/\d+/);
    await phones[0]!.page.reload();
    await expect(phones[0]!.t("phone-final")).toBeVisible();
    await expect(phones[0]!.t("phone-final-wait")).toHaveCount(0);

    const spectator = await party.addPhone("Retardataire");
    await expect(spectator.t("phone-final-spectator")).toBeVisible();
    await expect(spectator.page.locator('[data-ui="score-row"][data-rank]')).toHaveCount(0);
    await expect(tv.getByTestId("podium-1")).toContainText(/\d+/);
    for (const p of phones) await expect(p.t("phone-final")).toContainText("sur 3 joueurs");
    await tv.screenshot({ path: testInfo.outputPath("final-tv.png") });
  });

  test("ni points ni rang avant la fin de l'animation, sur la TV comme sur les téléphones", async ({ party }) => {
    const { tv } = party;
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "le-bon-prix": 1 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible({ timeout: 10_000 });
    await typePrice(a!, "100");
    await typePrice(b!, "9,5");
    await typePrice(c!, "150");

    // Début des résultats : la bande de la TV montre les joueurs mais aucun « +N », les téléphones disent de regarder la TV.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 5_000 });
    await expect(tv.getByTestId("bp-results")).not.toHaveAttribute("data-stage", "done");
    for (const p of [a!, b!, c!]) {
      await expect(tv.getByTestId(`delta-${p.id}`)).toBeVisible();
      await expect(tv.getByTestId(`delta-value-${p.id}`)).toHaveCount(0);
      await expect(p.t("phone-reveal-wait")).toBeVisible();
      await expect(p.t("points-gained")).toHaveCount(0);
      await expect(p.t("continue-button")).toHaveCount(0);
      await expect(p.t("phone-bp-result")).toHaveCount(0);
    }

    // Un téléphone qui recharge en pleine révélation retombe sur le même état (l'heure vient du serveur).
    await b!.page.reload();
    await expect(b!.t("phone-results")).toBeVisible();
    await expect(b!.t("phone-reveal-wait")).toBeVisible();

    // La révélation finie : les points arrivent partout en même temps, le bouton Continuer aussi.
    await expect(tv.getByTestId("bp-results")).toHaveAttribute("data-stage", "done", { timeout: REVEAL_TIMEOUT });
    for (const p of [a!, b!, c!]) {
      await expect(tv.getByTestId(`delta-value-${p.id}`)).toBeVisible({ timeout: 5_000 });
      await expect(p.t("points-gained")).toBeVisible({ timeout: 5_000 });
      await expect(p.t("phone-reveal-wait")).toHaveCount(0);
      await expect(p.t("continue-button")).toBeVisible();
    }
    await expect(a!.t("phone-bp-result")).toContainText("Pile le bon prix");
    expect(await party.tvDeltas()).toEqual({ [a!.id!]: 250, [c!.id!]: 100, [b!.id!]: 60 });
  });

  test("un jeu sans animation (ceci ou cela) : pas d'attente inutile", async ({ party }) => {
    const [a, b] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "ceci-ou-cela": 1 });
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible({ timeout: 10_000 });
    await party.answerRound([a!, b!]);
    for (const p of [a!, b!]) {
      await expect(p.t("points-gained")).toBeVisible({ timeout: 8_000 });
      await expect(p.t("continue-button")).toBeVisible();
    }
  });
});
