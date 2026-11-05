import { expect, test } from "./helpers/fixtures";

test.describe("Reconnexion", () => {
  test("recharger un téléphone en pleine manche garde le même joueur", async ({ party }) => {
    const { tv } = party;
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    const idsBefore = (await party.tvPlayerIds()).sort();
    await party.startGame({ "qui-est-le-plus": 1, "oui-non": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await expect(b!.t("phone-playing")).toBeVisible();

    // Alice vote puis recharge sa page.
    await a!.t(`vote-option-${b!.id}`).click();
    await expect(a!.t(`vote-option-${b!.id}`)).toHaveAttribute("aria-pressed", "true");
    await a!.page.reload();

    // Retour dans la manche, son vote est retrouvé, pas de page de profil.
    await expect(a!.t("phone-playing")).toBeVisible();
    await expect(a!.t(`vote-option-${b!.id}`)).toHaveAttribute("aria-pressed", "true");
    await expect(a!.t("profile-name")).toHaveCount(0);

    // Bob recharge sans avoir voté : il peut encore voter.
    await b!.page.reload();
    await expect(b!.t("phone-playing")).toBeVisible();
    await b!.t(`vote-option-${a!.id}`).click();
    await c!.t(`vote-option-${a!.id}`).click();

    // La manche se termine avec les 3 votes, et ce sont toujours les mêmes 3 joueurs (mêmes ids).
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 4_000 });
    const resultIds = await tv.locator('[data-testid^="delta-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.slice("delta-".length)));
    expect(resultIds.sort()).toEqual(idsBefore);
    expect(await party.tvDeltas()).toEqual({ [a!.id!]: 50, [b!.id!]: 100, [c!.id!]: 100 });
  });

  test("le profil est conservé après un rechargement dans le lobby", async ({ party }) => {
    const a = await party.addPhone("Alice");
    await a.page.reload();
    await expect(a.t("phone-lobby-ready")).toContainText("Alice");
    expect(await party.tvPlayerIds()).toEqual([a.id]);
    await expect(party.tvPlayer(a.id!)).toContainText("Alice");
  });

  test("un joueur déconnecté ne bloque pas « Continuer »", async ({ party }) => {
    const { tv } = party;
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-est-le-plus": 0, "oui-non": 2 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await party.answerRound();
    await expect(tv.getByTestId("tv-results")).toBeVisible();

    await a!.t("continue-button").click();
    await b!.t("continue-button").click();
    await expect(a!.t("waiting-others")).toContainText("2/3");
    // Chloé ferme son navigateur : on n'attend plus personne, la manche 2 démarre.
    await c!.page.close();
    await expect(tv.getByTestId("tv-playing")).toContainText("2 / 2");
    await expect(a!.t("phone-playing")).toBeVisible();

    // Chloé revient plus tard avec son jeton : même joueur, elle rejoint la partie en cours.
    const page = await c!.context.newPage();
    await page.goto(party.server.playUrl);
    await expect(page.getByTestId("profile-name")).toHaveCount(0);
    await expect(page.getByTestId("phone-playing")).toBeVisible();
  });

  test("un joueur qui se déconnecte pendant les résultats n'empêche pas d'avancer", async ({ party }) => {
    const { tv } = party;
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-est-le-plus": 0, "oui-non": 2 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await party.answerRound();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    // Chloé est déjà partie avant que les autres cliquent.
    await c!.page.close();
    await expect(tv.getByTestId("tv-results")).toContainText("En attente de 2 joueurs");
    await a!.t("continue-button").click();
    await b!.t("continue-button").click();
    await expect(tv.getByTestId("tv-playing")).toContainText("2 / 2");
  });
});
