import { expect, test } from "./helpers/fixtures";

test.describe("Comme les autres", () => {
  test.setTimeout(120_000);

  test("réponses regroupées, points, bouton d'envoi qui change d'état, classement final", async ({ party }) => {
    const { tv } = party;
    const [a, b, c, d] = await party.addPhones("Alice", "Bob", "Chloé", "David");
    await party.startGame({ "comme-les-autres": 1 });
    const phones = [a!, b!, c!, d!];

    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    for (const p of phones) await expect(p.t("answer-input-0")).toBeVisible();
    await expect(tv.getByTestId("tv-answered-count")).toContainText("0 / 4");

    // Le bouton est inactif tant que le champ est vide.
    await expect(a!.t("answer-send")).toBeDisabled();

    // Alice envoie, la TV allume son avatar sans révéler la réponse.
    await a!.t("answer-input-0").fill("Fromage");
    await a!.t("answer-send").click();
    await expect(a!.t("answer-sent")).toBeVisible();
    await expect(tv.getByTestId("tv-answered-count")).toContainText("1 / 4");
    await expect(tv.getByTestId("tv-playing")).not.toContainText("Fromage");

    // Elle modifie sa réponse : le bouton repasse en "Renvoyer", puis revient à "Envoyé".
    await a!.t("answer-input-0").fill("Beurre");
    await expect(a!.t("answer-send")).toHaveText("Renvoyer");
    await a!.t("answer-input-0").fill("Les fromages !");
    await a!.t("answer-send").click();
    await expect(a!.t("answer-sent")).toBeVisible();

    // Bob (accents/pluriel/article ignorés) et Chloé donnent la même réponse ; David est tout seul.
    await b!.t("answer-input-0").fill("un FROMAGE");
    await b!.t("answer-input-0").press("Enter");
    await expect(b!.t("answer-sent")).toBeVisible();
    await c!.t("answer-input-0").fill("fromage");
    await c!.t("answer-send").click();
    await expect(tv.getByTestId("tv-answered-count")).toContainText("3 / 4");
    await expect(tv.getByTestId("tv-results")).toBeHidden();
    await d!.t("answer-input-0").fill("Beurre");
    await d!.t("answer-send").click();

    // Tout le monde a répondu : fin anticipée, groupes révélés.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 4_000 });
    await expect(tv.getByTestId("comme-results")).toHaveAttribute("data-done", "true", { timeout: 10_000 });
    const group = tv.locator('[data-testid="group"]');
    await expect(group).toHaveCount(1);
    await expect(group).toHaveAttribute("data-size", "3");
    await expect(group).toHaveAttribute("data-revealed", "true");
    await expect(group).toContainText("+150");
    await expect(tv.getByTestId("lonely")).toHaveCount(1);
    await expect(tv.getByTestId("lonely")).toContainText("Beurre");

    // 3 identiques : 2 x 50 + bonus 50 = 150 chacun ; le solitaire 0.
    expect(await party.tvDeltas(phones)).toEqual({ [a!.id!]: 150, [b!.id!]: 150, [c!.id!]: 150, [d!.id!]: 0 });
    await expect(a!.t("points-gained")).toHaveText("+150");
    await expect(a!.t("phone-comme-result")).toContainText("Fromage");
    await expect(d!.t("phone-comme-result")).toContainText("Beurre");
    expect(await party.phoneScore(a!)).toBe(150);

    await party.continueAll(phones);
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    for (const p of phones) await expect(p.t("phone-final")).toBeVisible();
    await expect(tv.getByTestId("podium-1")).toContainText("150", { timeout: 20_000 });
    await expect(d!.t("phone-final")).toContainText("0 pts");
  });
});
