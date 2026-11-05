import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";

const seconds = async (tv: Page) => Number((await tv.getByTestId("countdown").innerText()).trim());

test.describe("Contrôles du maître du jeu", () => {
  test("pause : écrans figés sur TV et téléphone, le chrono s'arrête puis repart", async ({ party }) => {
    const { tv } = party;
    const [a] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 0, "oui-non": 1 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();

    await tv.getByTestId("host-pause").click();
    await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    await expect(a!.t("paused-overlay")).toBeVisible();
    await expect(tv.getByTestId("host-pause")).toContainText("Reprendre");

    // Le chrono ne bouge plus (on laisse passer plus d'une seconde pour le prouver).
    const frozen = await seconds(tv);
    await tv.waitForTimeout(1500);
    expect(await seconds(tv)).toBe(frozen);

    // Reprise : overlays retirés et le chrono redescend.
    await tv.getByTestId("host-pause").click();
    await expect(tv.getByTestId("paused-overlay")).toHaveCount(0);
    await expect(a!.t("paused-overlay")).toHaveCount(0);
    await expect.poll(() => seconds(tv)).toBeLessThan(frozen);
  });

  test.describe("annonce longue", () => {
    // Annonce de 60 s : sans « Passer » on y resterait, ce qui prouve que le bouton agit.
    test.use({ serverOptions: { introSeconds: 60 } });

    test("passer : annonce, manche puis résultats puis manche suivante", async ({ party }) => {
      const { tv } = party;
      const [a] = await party.addPhones("Alice", "Bob");
      await party.startGame({ "qui-est-le-plus": 0, "oui-non": 2 });
      await expect(a!.t("phone-intro")).toBeVisible();
      await tv.getByTestId("host-skip").click();
      await expect(tv.getByTestId("tv-playing")).toBeVisible();
      await expect(a!.t("phone-playing")).toBeVisible();
      // Manche : « Passer » termine le chrono sans réponses.
      await tv.getByTestId("host-skip").click();
      await expect(tv.getByTestId("tv-results")).toBeVisible();
      await expect(a!.t("phone-results")).toBeVisible();
      // Résultats : « Passer » force la suite sans attendre les téléphones.
      await tv.getByTestId("host-skip").click();
      await expect(tv.getByTestId("tv-intro")).toContainText("Manche 2 / 2");
    });
  });

  test("+10 s ajoute du temps au chrono", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 0, "oui-non": 1 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    // Le chrono de base est de 8 s : au-dessus, c'est forcément le bonus.
    await expect.poll(() => seconds(tv)).toBeLessThanOrEqual(8);
    await tv.getByTestId("host-addtime").click();
    await expect.poll(() => seconds(tv)).toBeGreaterThan(8);
    expect(await seconds(tv)).toBeLessThanOrEqual(18);
  });

  test("retirer un joueur : il disparaît de la TV et son téléphone repart à zéro", async ({ party }) => {
    const { tv } = party;
    const [a, b] = await party.addPhones("Alice", "Bob");
    tv.on("dialog", (d) => void d.accept());

    await party.tvPlayer(b!.id!).hover();
    await tv.getByTestId(`kick-${b!.id}`).click();

    await expect(party.tvPlayer(b!.id!)).toHaveCount(0);
    await expect(party.tvPlayer(a!.id!)).toBeVisible();
    // Le téléphone retire son jeton et revient à la création de profil (profil vide).
    await expect(b!.t("profile-name")).toBeVisible();
    await expect(b!.t("profile-name")).toHaveValue("");
    await expect(b!.t("phone-lobby-ready")).toHaveCount(0);
    // Alice n'est pas touchée.
    await expect(a!.t("phone-lobby-ready")).toBeVisible();
    // Refuser la confirmation ne retire personne.
    tv.removeAllListeners("dialog");
    tv.on("dialog", (d) => void d.dismiss());
    await party.tvPlayer(a!.id!).hover();
    await tv.getByTestId(`kick-${a!.id}`).click();
    await expect(party.tvPlayer(a!.id!)).toBeVisible();
  });

  test("retour au lobby : joueurs conservés, scores remis à zéro", async ({ party }) => {
    const { tv } = party;
    const [a, b] = await party.addPhones("Alice", "Bob");
    tv.on("dialog", (d) => void d.accept());
    await party.startGame({ "qui-est-le-plus": 1, "oui-non": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await party.answerRound();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    expect(await party.phoneScore(a!)).toBeGreaterThan(0);

    await tv.getByTestId("host-lobby").click();
    await expect(tv.locator("[data-phase=lobby]")).toBeVisible();
    await expect(tv.getByTestId("start-game")).toBeVisible();
    for (const p of [a!, b!]) {
      await expect(p.t("phone-lobby-ready")).toBeVisible();
      await expect(party.tvPlayer(p.id!)).toContainText(p.name);
    }

    // Nouvelle partie où personne ne répond : les scores partent bien de 0.
    await party.startGame({ "qui-est-le-plus": 1, "oui-non": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await expect(a!.t("phone-final")).toContainText("0 pts");
    await expect(b!.t("phone-final")).toContainText("0 pts");
  });

  test("retour au lobby refusé : la partie continue", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    tv.on("dialog", (d) => void d.dismiss());
    await party.startGame({ "qui-est-le-plus": 1, "oui-non": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await tv.getByTestId("host-lobby").click();
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
  });
});
