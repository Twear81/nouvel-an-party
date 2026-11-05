import { expect, test } from "./helpers/fixtures";
import type { Phone } from "./helpers/party";

// Config de test : une seule variante, cible 2 s, visible 1 s, 6 s pour démarrer, révélation 3 s.
test.describe("Compte à rebours chaotique", () => {
  test.setTimeout(120_000);

  test("chacun son tour : START / STOP, un tour sauté, résultats et classement final", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "compte-a-rebours": 1 });
    await expect(tv.getByTestId("cabr-tv")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("cabr-board").locator('[data-testid^="cabr-row-"]')).toHaveCount(3);

    /** Le téléphone dont c'est le tour : le seul qui affiche START. */
    const activePhone = async (exclude: Phone[]) => {
      let found: Phone | undefined;
      await expect
        .poll(async () => {
          for (const p of phones) if (!exclude.includes(p) && (await p.t("cabr-start").isVisible())) found = p;
          return found?.name ?? null;
        }, { timeout: 15_000 })
        .not.toBeNull();
      return found!;
    };

    const played: Phone[] = [];
    for (let turn = 0; turn < 2; turn++) {
      const p = await activePhone(played);
      // Les autres voient à qui c'est le tour, sans bouton.
      for (const o of phones.filter((x) => x !== p)) {
        await expect(o.t("cabr-turn")).toContainText(p.name);
        await expect(o.t("cabr-start")).toHaveCount(0);
      }
      await p.t("cabr-start").click();
      await expect(p.t("cabr-stop")).toBeVisible();
      // La TV montre le compteur qui tourne, puis qui devient chaotique (après 1 s visible).
      await expect(tv.getByTestId("tv-counter")).not.toHaveAttribute("data-kind", "idle");
      await expect(tv.getByTestId("tv-counter")).not.toHaveAttribute("data-kind", "clear", { timeout: 5_000 });
      await p.t("cabr-stop").click();
      // Révélation : écart signé sur la TV et sur le téléphone du joueur.
      await expect(tv.getByTestId("tv-reveal")).toHaveAttribute("data-status", "done");
      await expect(tv.getByTestId("tv-reveal")).toContainText(/[+−]\d+,\d\d/);
      await expect(p.t("cabr-mine")).toContainText(/[+−]\d+,\d\d/);
      await expect(tv.getByTestId(`cabr-row-${p.id}`)).toHaveAttribute("data-status", "done");
      played.push(p);
    }

    // Le 3e joueur ne démarre pas : son tour est sauté au bout du délai.
    const lazy = await activePhone(played);
    await expect(tv.getByTestId("tv-reveal")).toHaveAttribute("data-status", "missed", { timeout: 15_000 });
    await expect(tv.getByTestId(`cabr-row-${lazy.id}`)).toHaveAttribute("data-status", "missed");
    for (const p of played) await expect(p.t("cabr-me")).toHaveAttribute("data-status", "done");

    // Résultats : podium, le joueur sauté ne marque rien.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("cabr-rank-1")).toBeVisible();
    await expect(tv.getByTestId(`cabr-missed-${lazy.id}`)).toBeVisible();
    const deltas = await party.tvDeltas();
    expect(deltas[lazy.id!]).toBe(0);
    const scored = played.map((p) => deltas[p.id!]!).sort((a, b) => b - a);
    expect(scored[0]).toBe(150);
    expect([100, 150]).toContain(scored[1]!);
    await expect(lazy.t("cabr-phone-result")).toContainText("Tour raté");
    for (const p of played) await expect(p.t("cabr-phone-result")).toHaveAttribute("data-rank", /[12]/);

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("podium-1")).toContainText("150", { timeout: 20_000 });
  });
});
