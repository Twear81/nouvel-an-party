import { expect, test } from "./helpers/fixtures";

test.describe("Tier list", () => {
  test("tout le monde note tout le monde : fin anticipée, tier list révélée, points et classement", async ({ party }) => {
    test.setTimeout(120_000);
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    const [a, b, c] = phones as [(typeof phones)[0], (typeof phones)[0], (typeof phones)[0]];
    await party.startGame({ "tier-list": 1 });

    // TV : le tableau vide (4 étages S/A/B/C) ; téléphones : une rangée par joueur (soi-même compris).
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await expect(tv.getByTestId("tier-board").locator('[data-testid^="tier-row-"]')).toHaveCount(4);
    await expect(a.page.locator('[data-testid^="rate-row-"]')).toHaveCount(3);
    await expect(tv.getByTestId("tv-answered-count")).toContainText("0 / 3");

    // Alice se trompe puis corrige : S → C pour Bob, la note se change.
    await a.t(`rate-${b.id}-0`).click();
    await expect(a.t(`rate-${b.id}-0`)).toHaveAttribute("aria-pressed", "true");
    await a.t(`rate-${b.id}-3`).click();
    await expect(a.t(`rate-${b.id}-3`)).toHaveAttribute("aria-pressed", "true");
    await expect(a.t(`rate-${b.id}-0`)).toHaveAttribute("aria-pressed", "false");

    // Tout le monde met tout le monde en S, sauf Alice qui laisse Bob en C.
    for (const p of [a, b, c]) for (const target of phones) {
      if (p === a && target === b) continue;
      await p.t(`rate-${target.id}-0`).click();
    }
    // Tout le monde a noté tout le monde : la manche s'arrête avant le chrono.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 6_000 });

    // Bob : 2 S (Bob, Chloé) + 1 C (Alice) → valeurs 3,3,0 → moyenne 2 → étage A (index 1) ; les autres sont en S.
    const results = tv.getByTestId("tier-results");
    await expect(results).toHaveAttribute("data-revealed", "3", { timeout: 20_000 });
    await expect(tv.getByTestId("tier-row-0").getByTestId(`placed-${a.id}`)).toBeVisible();
    await expect(tv.getByTestId("tier-row-0").getByTestId(`placed-${c.id}`)).toBeVisible();
    await expect(tv.getByTestId("tier-row-1").getByTestId(`placed-${b.id}`)).toBeVisible();

    // Points : Alice et Chloé ont mis Alice et Chloé en S (2 × 25) ; Bob a mis Alice et Chloé en S aussi ;
    // Alice a mis Bob en C et Bob s'est mis en S : personne n'a mis Bob en A.
    expect(await party.tvDeltas()).toEqual({ [a.id!]: 50, [b.id!]: 50, [c.id!]: 50 });
    await expect(a.t("tier-phone-results")).toContainText("2 / 3");

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    for (const p of phones) await expect(p.t("phone-final")).toContainText("50 pts");
  });

  test.describe(() => {
    // Chrono court : on attend vraiment sa fin ; les notes partielles comptent.
    test.use({ serverOptions: { duree: 5 } });
    test("le chrono se termine : les notes données comptent, un joueur sans note ne marque pas", async ({ party }) => {
      test.setTimeout(120_000);
      const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
      await party.startGame({ "tier-list": 1 });
      await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
      // Alice et Bob mettent Chloé en B ; Chloé ne fait rien.
      await a!.t(`rate-${c!.id}-2`).click();
      await b!.t(`rate-${c!.id}-2`).click();
      await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 15_000 });
      const deltas = await party.tvDeltas();
      expect(deltas).toEqual({ [a!.id!]: 25, [b!.id!]: 25, [c!.id!]: 0 });
      await expect(c!.t("tier-phone-results")).toContainText("Tu n'as noté personne");
    });
  });
});
