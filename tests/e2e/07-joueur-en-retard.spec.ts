import { expect, test } from "./helpers/fixtures";

test.describe("Joueur en retard", () => {
  // Chrono de 60 s : le temps de créer un profil en pleine manche.
  test.use({ serverOptions: { duree: 60 } });

  test("un profil créé pendant une manche attend la manche suivante", async ({ party }) => {
    const { tv } = party;
    const [a, b] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 2, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    for (const p of [a!, b!]) await expect(p.t(`vote-option-${p === a ? b!.id : a!.id}`)).toBeVisible();

    // Chloé arrive en pleine manche et crée son profil.
    const late = await party.addPhone("Chloé");
    await expect(late.t("phone-playing")).toContainText("Tu joues à la prochaine manche");
    await expect(late.t(`vote-option-${a!.id}`)).toHaveCount(0);
    // Pas encore dans la manche : on ne peut pas voter pour elle.
    await expect(a!.page.locator('[data-testid^="vote-option-"]')).toHaveCount(1);

    // Les deux joueurs de la manche votent : elle se termine sans attendre Chloé.
    await a!.t(`vote-option-${b!.id}`).click();
    await b!.t(`vote-option-${a!.id}`).click();
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 4_000 });
    // Chloé a un profil : elle voit les résultats et doit aussi cliquer sur « Continuer ».
    await expect(late.t("phone-results")).toBeVisible();
    await a!.t("continue-button").click();
    await b!.t("continue-button").click();
    await expect(a!.t("waiting-others")).toContainText("2/3");
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await late.t("continue-button").click();

    // Manche 2 : Chloé joue vraiment, et les autres peuvent voter pour elle.
    await expect(tv.getByTestId("tv-playing")).toContainText("2 / 2");
    await expect(late.t("phone-playing")).not.toContainText("prochaine manche");
    const optionIds = (page: typeof a.page) =>
      page.locator('[data-testid^="vote-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.slice("vote-option-".length)));
    // Chloé voit Alice et Bob (pas elle-même) ; Alice voit Bob et Chloé.
    await expect.poll(async () => (await optionIds(late.page)).sort()).toEqual([a!.id, b!.id].sort());
    const chloeId = (await optionIds(a!.page)).find((id) => id !== b!.id)!;
    late.id = chloeId;

    // Elle vote et son vote compte : manche terminée quand les 3 ont voté.
    await late.t(`vote-option-${a!.id}`).click();
    await a!.t(`vote-option-${chloeId}`).click();
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await b!.t(`vote-option-${chloeId}`).click();
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 4_000 });
    // Chloé a deux voix (élue : +50), Alice a un vote.
    const deltas = await party.tvDeltas([a!, b!, late]);
    expect(deltas[late.id!]).toBe(50);
    expect(deltas[a!.id!]).toBe(100);
    expect(deltas[b!.id!]).toBe(100);
  });
});
