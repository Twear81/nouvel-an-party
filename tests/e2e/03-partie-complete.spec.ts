import { expect, test } from "./helpers/fixtures";

test.describe("Partie complète à 3 téléphones", () => {
  test("une manche de chaque mini-jeu, scores cohérents, classement final", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    const [a, b, c] = phones as [typeof phones[0], typeof phones[0], typeof phones[0]];
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 1 });

    const expected: Record<string, number> = { [a.id!]: 0, [b.id!]: 0, [c.id!]: 0 };
    const played = new Set<string>();

    for (let round = 1; round <= 2; round++) {
      // La manche (après 1 s d'annonce) : les 3 téléphones affichent le jeu.
      await expect(tv.getByTestId("tv-playing")).toContainText(`${round} / 2`);
      for (const p of phones) await expect(p.t("phone-playing")).toBeVisible();

      const game = await party.answerRound();
      played.add(game);

      // Tout le monde a répondu : la manche s'arrête bien avant les 8 s du chrono.
      await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 4_000 });
      for (const p of phones) await expect(p.t("phone-results")).toBeVisible();

      const deltas = await party.tvDeltas();
      if (game === "qui-est-le-plus") {
        // Bob et Chloé votent pour Alice (élue), Alice vote pour Bob.
        expect(deltas).toEqual({ [a.id!]: 50, [b.id!]: 100, [c.id!]: 100 });
      } else if ((await tv.getByTestId("ceci-results").getAttribute("data-mode")) === "majorite") {
        // Question d'opinion : tout le monde est dans le camp majoritaire.
        expect(deltas).toEqual({ [a.id!]: 100, [b.id!]: 100, [c.id!]: 100 });
      } else {
        // Question sur un invité : la cible (0 point) répond la 1re réponse, les deux autres l'ont bien deviné.
        expect(Object.values(deltas).sort()).toEqual([0, 100, 100]);
      }
      for (const [id, d] of Object.entries(deltas)) expected[id]! += d;

      // Les téléphones affichent les points gagnés et le total.
      for (const p of phones) {
        await expect(p.t("points-gained")).toHaveText(deltas[p.id!]! > 0 ? `+${deltas[p.id!]}` : "+0");
        expect(await party.phoneScore(p)).toBe(expected[p.id!]);
      }

      // Le jeu attend TOUS les téléphones : après 2 clics sur 3 on reste sur les résultats.
      await a.t("continue-button").click();
      await b.t("continue-button").click();
      await expect(a.t("waiting-others")).toContainText("2/3");
      await expect(b.t("waiting-others")).toContainText("2/3");
      await expect(c.t("continue-button")).toBeVisible();
      await expect(tv.getByTestId("tv-results")).toBeVisible();
      await expect(tv.getByTestId("tv-results")).toContainText("En attente de 1 joueur");
      // Le 3e clique : on passe à la suite.
      await c.t("continue-button").click();
    }

    // Les deux mini-jeux ont bien été joués (un de chaque).
    expect([...played].sort()).toEqual(["ceci-ou-cela", "qui-est-le-plus"]);

    // Classement final.
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await expect(tv.locator("[data-phase]")).toHaveAttribute("data-phase", "final");
    await expect(tv.getByTestId("podium-1")).toContainText(/\d+/, { timeout: 20_000 });
    const sorted = Object.entries(expected).sort((x, y) => y[1] - x[1]);
    const best = sorted[0]![1];
    await expect(tv.getByTestId("podium-1")).toContainText(String(best));
    await expect(tv.getByTestId("podium-3")).toBeVisible();
    for (const p of phones) {
      await expect(p.t("phone-final")).toContainText(`${expected[p.id!]} pts`);
      await expect(p.t("phone-final")).toContainText("sur 3 joueurs");
    }
    // Le gagnant (score strictement supérieur aux autres) voit "1er".
    const winners = sorted.filter(([, s]) => s === best);
    if (winners.length === 1) {
      const winner = phones.find((p) => p.id === winners[0]![0])!;
      await expect(winner.t("phone-final")).toContainText("1er");
      await expect(tv.getByTestId("podium-1")).toContainText(winner.name);
    }
  });

  test("qui-est-le-plus : on peut changer son vote avant la fin de la manche", async ({ party }) => {
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
    // Alice vote d'abord pour Chloé, puis change d'avis pour Bob.
    await a!.t(`vote-option-${c!.id}`).click();
    await expect(a!.t(`vote-option-${c!.id}`)).toHaveAttribute("aria-pressed", "true");
    await a!.t(`vote-option-${b!.id}`).click();
    await expect(a!.t(`vote-option-${b!.id}`)).toHaveAttribute("aria-pressed", "true");
    await expect(a!.t(`vote-option-${c!.id}`)).toHaveAttribute("aria-pressed", "false");
    // On ne peut pas voter pour soi-même (vote_pour_soi: false).
    await expect(a!.t(`vote-option-${a!.id}`)).toHaveCount(0);
    // Bob et Chloé votent pour Alice : elle est élue (2 voix contre 1).
    await b!.t(`vote-option-${a!.id}`).click();
    await c!.t(`vote-option-${a!.id}`).click();
    await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 4_000 });
    expect(await party.tvDeltas()).toEqual({ [a!.id!]: 50, [b!.id!]: 100, [c!.id!]: 100 });
    await expect(a!.t("phone-results")).toContainText("élu");
  });

  test("ceci-ou-cela : si le chrono se termine, les non-répondants ne marquent pas", async ({ party }) => {
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-est-le-plus": 0, "ceci-ou-cela": 1 });
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
    // Seuls Alice et Bob répondent (1re réponse) ; Chloé laisse le chrono (8 s) aller au bout.
    await a!.t("choice-0").click();
    await b!.t("choice-0").click();
    await expect(c!.t("phone-playing")).toBeVisible();
    await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 15_000 });
    const deltas = await party.tvDeltas();
    expect(deltas[c!.id!]).toBe(0);
    expect(deltas[a!.id!]! + deltas[b!.id!]!).toBeGreaterThanOrEqual(0);
    await expect(c!.t("phone-results")).toContainText("Tu n'as pas répondu");
  });
});
