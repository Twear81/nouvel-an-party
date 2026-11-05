import { expect, test } from "./helpers/fixtures";

test.describe("Qui a dit ça ?", () => {
  test("écrire, deviner chaque citation, points, résultats et classement", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-a-dit": 1 });
    await expect(tv.getByTestId("tv-prompt")).toBeVisible({ timeout: 15_000 });

    // Étape écrire : chacun envoie sa citation ; on peut corriger tant que l'étape dure.
    const [a, b, c] = phones as [(typeof phones)[0], (typeof phones)[0], (typeof phones)[0]];
    await a.t("quote-input").fill("brouillon");
    await a.t("quote-send").click();
    await expect(a.t("quote-send")).toHaveAttribute("data-sent", "true");
    await expect(tv.getByTestId("tv-written-count")).toContainText("1 / 3");
    await a.t("quote-input").fill("Citation de Alice");
    await expect(a.t("quote-send")).toHaveAttribute("data-sent", "false"); // modifié : à renvoyer
    await a.t("quote-send").click();
    await expect(a.t("quote-send")).toHaveAttribute("data-sent", "true");
    for (const p of [b, c]) {
      await p.t("quote-input").fill(`  Citation   de ${p.name} `);
      await p.t("quote-send").click();
    }
    await expect(tv.getByTestId("tv-written-count")).toContainText("3 / 3");

    // Étape deviner : une citation à la fois, anonyme.
    const expected: Record<string, number> = { [a.id!]: 0, [b.id!]: 0, [c.id!]: 0 };
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      await expect(tv.getByTestId("tv-quote-index")).toHaveText(`${i + 1} / 3`, { timeout: 20_000 });
      const quote = await tv.getByTestId("tv-quote").innerText();
      const author = phones.find((p) => quote.includes(`de ${p.name}`))!;
      seen.push(author.name);
      const others = phones.filter((p) => p !== author);

      // L'auteur voit « c'est toi » et aucun choix possible.
      await expect(author.t("guess-author")).toBeVisible();
      await expect(author.page.locator('[data-testid^="guess-option-"]')).toHaveCount(0);
      // Les autres ne se voient pas dans la grille.
      await expect(others[0]!.t(`guess-option-${others[0]!.id}`)).toHaveCount(0);
      await expect(others[0]!.t("phone-quote")).toContainText(quote.replace(/\s+/g, " "));

      // Le premier devine juste, le second se trompe (il désigne l'autre votant), avec un changement d'avis.
      const [right, wrong] = others as [typeof author, typeof author];
      await wrong.t(`guess-option-${author.id}`).click();
      await expect(wrong.t(`guess-option-${author.id}`)).toHaveAttribute("aria-pressed", "true");
      await wrong.t(`guess-option-${right.id}`).click();
      await expect(wrong.t(`guess-option-${right.id}`)).toHaveAttribute("aria-pressed", "true");
      await expect(tv.getByTestId("tv-vote-count")).toContainText("1 / 2");
      await right.t(`guess-option-${author.id}`).click();

      // Révélation : l'auteur apparaît.
      await expect(tv.getByTestId("tv-reveal-author")).toContainText(author.name, { timeout: 10_000 });
      await expect(right.t("reveal-result")).toContainText("Bien vu");
      await expect(wrong.t("reveal-result")).toContainText("Raté");
      await expect(author.t("reveal-result")).toContainText("1 trompé");
      expected[right.id!]! += 100;
      expected[author.id!]! += 50;
    }
    expect(seen.sort()).toEqual(["Alice", "Bob", "Chloé"]);

    // Résultats : récap des citations et points.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("quotes-recap")).toContainText("Citation de Alice");
    await expect(tv.getByTestId("quotes-recap")).toContainText("Citation de Chloé");
    await expect(tv.getByTestId("award-trickster")).toBeVisible();
    expect(await party.tvDeltas()).toEqual(expected);
    for (const p of phones) await expect(p.t("phone-results")).toBeVisible();
    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
  });

  test("moins de deux citations : on passe directement aux résultats", async ({ party }) => {
    const [a, b] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-a-dit": 1 });
    await expect(party.tv.getByTestId("tv-prompt")).toBeVisible({ timeout: 15_000 });
    // Seule Alice écrit ; Bob envoie une réponse vide (= pas de citation) ; on termine l'étape avec « Passer ».
    await a!.t("quote-input").fill("Ma seule citation");
    await a!.t("quote-send").click();
    await expect(a!.t("quote-send")).toHaveAttribute("data-sent", "true");
    await expect(b!.t("quote-send")).toBeDisabled();
    await party.tv.getByTestId("host-skip").click();
    await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 40_000 });
    await expect(party.tv.getByTestId("quotes-recap")).toContainText("Ma seule citation");
  });
});
