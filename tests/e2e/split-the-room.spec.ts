import { expect, test } from "./helpers/fixtures";

test.describe("Split the Room", () => {
  test("écrire, voter OUI / NON, jauge, points de l'auteur, résultats et classement", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé", "Dan");
    await party.startGame({ "split-the-room": 1 });
    await expect(tv.getByTestId("tv-start")).toBeVisible({ timeout: 15_000 });

    // Étape écrire : une phrase envoyée est verrouillée.
    const [a, ...others] = phones;
    await a!.t("split-input").fill("Fin de Alice");
    await a!.t("split-send").click();
    await expect(a!.t("split-send")).toHaveAttribute("data-sent", "true");
    await expect(tv.getByTestId("tv-written-count")).toContainText("1 / 4");
    await expect(a!.t("split-input")).toBeDisabled();
    await expect(a!.t("split-send")).toBeDisabled();
    await a!.page.reload();
    await expect(a!.t("split-input")).toBeDisabled();
    await expect(a!.t("split-input")).toHaveValue("Fin de Alice");
    for (const p of others) {
      await p.t("split-input").fill(`  Fin   de ${p.name} `);
      await p.t("split-send").click();
    }
    await expect(tv.getByTestId("tv-written-count")).toContainText("4 / 4");

    // Étape voter : une phrase à la fois, anonyme. 2 OUI + 1 NON = parfait (3 votes : 2-1 est le mieux possible).
    const expected: Record<string, number> = Object.fromEntries(phones.map((p) => [p.id!, 0]));
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      await expect(tv.getByTestId("tv-sentence-index")).toHaveText(`${i + 1} / 4`, { timeout: 25_000 });
      const sentence = await tv.getByTestId("tv-sentence").textContent() ?? "";
      const author = phones.find((p) => sentence.includes(`de ${p.name}`))!;
      seen.push(author.name);
      const [v1, v2, v3] = phones.filter((p) => p !== author) as [typeof author, typeof author, typeof author];

      // L'auteur voit « C'est ta phrase » et aucun bouton.
      await expect(author.t("vote-author")).toBeVisible();
      await expect(author.t("vote-yes")).toHaveCount(0);
      await expect(v1.t("phone-sentence")).toContainText(`de ${author.name}`);

      // On peut changer d'avis ; la progression est anonyme.
      await v1.t("vote-no").click();
      await expect(v1.t("vote-no")).toHaveAttribute("aria-pressed", "true");
      await v1.t("vote-yes").click();
      await expect(v1.t("vote-yes")).toHaveAttribute("aria-pressed", "true");
      await expect(tv.getByTestId("tv-vote-count")).toContainText("1 / 3");
      await v2.t("vote-no").click();
      await v3.t("vote-yes").click();

      // Révélation : verdict puis auteur démasqué, en même temps sur les téléphones.
      await expect(tv.getByTestId("tv-verdict")).toHaveAttribute("data-verdict", "perfect", { timeout: 10_000 });
      await expect(tv.getByTestId("tv-reveal-author")).toContainText(author.name, { timeout: 10_000 });
      await expect(tv.getByTestId("tv-gauge-yes")).toContainText("2");
      await expect(tv.getByTestId("tv-gauge-no")).toContainText("1");
      await expect(v1.t("reveal-result")).toHaveAttribute("data-verdict", "perfect");
      await expect(author.t("reveal-gain")).toContainText("+300");
      expected[author.id!]! += 300;
    }
    expect(seen.sort()).toEqual(["Alice", "Bob", "Chloé", "Dan"]);

    // Résultats : récap des phrases et points.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 20_000 });
    await expect(tv.getByTestId("sentences-recap")).toContainText("Fin de Alice");
    await expect(tv.getByTestId("sentences-recap")).toContainText("Fin de Dan");
    expect(await party.tvDeltas()).toEqual(expected);
    for (const p of phones) await expect(p.t("phone-results")).toBeVisible();
    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
  });

  test("moins de deux phrases : directement aux résultats", async ({ party }) => {
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "split-the-room": 1 });
    await expect(party.tv.getByTestId("tv-start")).toBeVisible({ timeout: 15_000 });
    // Seule Alice écrit ; on termine l'étape avec « Passer » : pas de vote possible.
    await a!.t("split-input").fill("Ma seule fin");
    await a!.t("split-send").click();
    await expect(a!.t("split-send")).toHaveAttribute("data-sent", "true");
    await expect(b!.t("split-send")).toBeDisabled();
    await expect(c!.t("split-send")).toBeDisabled();
    await party.tv.getByTestId("host-skip").click();
    await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 40_000 });
    await expect(party.tv.getByTestId("sentences-recap")).toContainText("Ma seule fin");
    expect(await party.tvDeltas()).toEqual({ [a!.id!]: 0, [b!.id!]: 0, [c!.id!]: 0 });
  });
});
