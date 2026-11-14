import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";

const seconds = async (tv: Page) => {
  // Le tableau Rocket League ajoute deux compteurs et affiche le temps en m:ss ; les autres skins restent en secondes.
  const text = (await tv.getByTestId("countdown").locator('[data-ui="countdown-num"]').textContent() ?? "").trim();
  if (!/^\d+(?::\d{2})?$/.test(text)) throw new Error(`Chrono illisible : « ${text} »`);
  return text.split(":").reduce((total, part) => total * 60 + Number(part), 0);
};

test.describe("Contrôles du maître du jeu", () => {
  test("pause : écrans figés sur TV et téléphone, le chrono s'arrête puis repart", { tag: "@fumee" }, async ({ party }) => {
    const { tv } = party;
    // Le format le plus riche doit vérifier la pause quel que soit le skin tiré au sort par le serveur.
    await tv.goto(`${party.server.tvUrl}?skin=rocket-league`);
    const [a] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 0, "ceci-ou-cela": 1 });
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

    test("passer : annonce, manche puis résultats puis manche suivante", { tag: "@fumee" }, async ({ party }) => {
      const { tv } = party;
      const [a] = await party.addPhones("Alice", "Bob");
      await party.startGame({ "qui-est-le-plus": 0, "ceci-ou-cela": 2 });
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
    await tv.goto(`${party.server.tvUrl}?skin=rocket-league`);
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 0, "ceci-ou-cela": 1 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    // Le chrono de base est de 25 s : au-dessus, c'est forcément le bonus.
    await expect.poll(() => seconds(tv)).toBeLessThanOrEqual(25);
    await tv.getByTestId("host-addtime").click();
    await expect.poll(() => seconds(tv)).toBeGreaterThan(25);
    expect(await seconds(tv)).toBeLessThanOrEqual(35);
  });

  test("retirer un joueur : bouton visible sans survol, confirmation dans le jeu, le joueur disparaît", async ({ party }) => {
    const { tv } = party;
    const [a, b] = await party.addPhones("Alice", "Bob");
    // Les deux boutons « retirer » sont visibles d'emblée (pas besoin de survoler la carte).
    await expect(tv.getByTestId(`kick-${a!.id}`)).toBeVisible();
    await expect(tv.getByTestId(`kick-${b!.id}`)).toBeVisible();

    // Annuler : personne n'est retiré et la boîte se ferme.
    await tv.getByTestId(`kick-${a!.id}`).click();
    await expect(tv.getByTestId("confirm-dialog")).toContainText("Retirer Alice");
    await tv.getByTestId("confirm-no").click();
    await expect(tv.getByTestId("confirm-dialog")).toHaveCount(0);
    await expect(party.tvPlayer(a!.id!)).toBeVisible();

    // Échap annule aussi.
    await tv.getByTestId(`kick-${a!.id}`).click();
    await tv.keyboard.press("Escape");
    await expect(tv.getByTestId("confirm-dialog")).toHaveCount(0);

    // Confirmer : Bob disparaît de la TV et son téléphone repart à zéro.
    await tv.getByTestId(`kick-${b!.id}`).click();
    await tv.getByTestId("confirm-yes").click();
    await expect(party.tvPlayer(b!.id!)).toHaveCount(0);
    await expect(party.tvPlayer(a!.id!)).toBeVisible();
    // Le téléphone retire son jeton et revient à la création de profil (profil vide).
    await expect(b!.t("profile-name")).toBeVisible();
    await expect(b!.t("profile-name")).toHaveValue("");
    await expect(b!.t("phone-lobby-ready")).toHaveCount(0);
    // Alice n'est pas touchée.
    await expect(a!.t("phone-lobby-ready")).toBeVisible();
  });

  test("les contrôles du maître sont toujours visibles, avec une icône et un mot, sans texte d'aide", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    // Aucun mouvement de souris : la barre est là, dans l'écran, avec ses 4 boutons.
    for (const [id, word] of [["host-pause", "Pause"], ["host-skip", "Passer"], ["host-addtime", "+10 s"], ["host-lobby", "Lobby"]] as const) {
      const button = tv.getByTestId(id);
      await expect(button).toBeVisible();
      await expect(button).toBeInViewport({ ratio: 1 });
      await expect(button).toContainText(word);
      await expect(button.locator("svg")).toHaveCount(1);
    }
    // Plus d'indication de raccourcis clavier : le design se suffit.
    await expect(tv.getByText(/Espace|raccourci/i)).toHaveCount(0);
    // Ils ne masquent ni le chrono ni la question.
    const bar = (await tv.getByTestId("host-bar").boundingBox())!;
    const countdown = (await tv.getByTestId("countdown").boundingBox())!;
    expect(bar.y).toBeGreaterThan(countdown.y + countdown.height);
    // Ils restent là après quelques secondes d'inactivité.
    await tv.waitForTimeout(3500);
    await expect(tv.getByTestId("host-pause")).toBeInViewport({ ratio: 1 });
  });

  test("raccourcis clavier : Espace met en pause, N passe", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await tv.keyboard.press("Space");
    await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    await tv.keyboard.press("Space");
    await expect(tv.getByTestId("paused-overlay")).toHaveCount(0);
    await tv.keyboard.press("n");
    await expect(tv.getByTestId("tv-results")).toBeVisible();
  });

  test.describe(() => {
    // Manche longue : sous charge, une manche de 8 s pourrait finir avant le clic sur Pause.
    test.use({ serverOptions: { duree: 60 } });
    test("le bouton Reprendre reste accessible pendant la pause", async ({ party }) => {
      const { tv } = party;
      await party.addPhones("Alice", "Bob");
      await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
      await expect(tv.getByTestId("tv-playing")).toBeVisible();
      await tv.getByTestId("host-pause").click();
      await expect(tv.getByTestId("paused-overlay")).toBeVisible();
      await expect(tv.getByTestId("host-pause")).toContainText("Reprendre");
      await tv.getByTestId("host-pause").click(); // le clic n'est pas intercepté par l'overlay
      await expect(tv.getByTestId("paused-overlay")).toHaveCount(0);
    });
  });

  test("retour au lobby : confirmation dans le jeu, joueurs conservés, scores remis à zéro", async ({ party }) => {
    const { tv } = party;
    const [a, b] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await party.answerRound();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    expect(await party.phoneScore(a!)).toBeGreaterThan(0);

    await tv.getByTestId("host-lobby").click();
    await expect(tv.getByTestId("confirm-dialog")).toContainText("Retourner au lobby");
    await tv.getByTestId("confirm-yes").click();
    await expect(tv.locator("[data-phase=lobby]")).toBeVisible();
    await expect(tv.getByTestId("start-game")).toBeVisible();
    for (const p of [a!, b!]) {
      await expect(p.t("phone-lobby-ready")).toBeVisible();
      await expect(party.tvPlayer(p.id!)).toContainText(p.name);
    }

    // Nouvelle partie où personne ne répond : les scores partent bien de 0.
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await expect(a!.t("phone-final")).toContainText("0 pts");
    await expect(b!.t("phone-final")).toContainText("0 pts");
    // Depuis le classement final, le maître peut aussi revenir au lobby.
    await tv.getByTestId("host-lobby").click();
    await tv.getByTestId("confirm-yes").click();
    await expect(tv.locator("[data-phase=lobby]")).toBeVisible();
  });

  test("retour au lobby refusé : la partie continue", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await tv.getByTestId("host-lobby").click();
    await tv.getByTestId("confirm-no").click();
    await expect(tv.getByTestId("confirm-dialog")).toHaveCount(0);
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
  });
});
