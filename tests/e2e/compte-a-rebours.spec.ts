import { expect, test } from "./helpers/fixtures";

// Config de test : cible 2 s, visible 1 s, annonce 2 s, design digital, le compteur s'arrête au plus tard à 2 + 6 s.
test.describe("Compte à rebours chaotique", () => {
  test.setTimeout(120_000);

  test("tous en même temps : annonce, 3-2-1, STOP chacun, un joueur ne stoppe pas, révélation et points", async ({ party }) => {
    const { tv } = party;
    const [alice, bob, chloe, dan] = await party.addPhones("Alice", "Bob", "Chloé", "Dan");
    const stoppers = [alice!, bob!, chloe!];
    await party.startGame({ "compte-a-rebours": 1 });

    // Annonce : la cible en géant sur la TV, « prépare ton doigt » sur les téléphones, pas encore de bouton.
    await expect(tv.getByTestId("cabr-tv")).toHaveAttribute("data-stage", "announce", { timeout: 15_000 });
    await expect(tv.getByTestId("cabr-target-big")).toBeVisible();
    for (const p of [...stoppers, dan!]) {
      await expect(p.t("cabr-target")).toContainText("2,0 s");
      await expect(p.t("cabr-stop")).toHaveCount(0);
    }

    // « 3… 2… 1… » puis GO : un énorme STOP sur chaque téléphone, aucun compteur dessus ; le compteur de la TV démarre.
    await expect(tv.getByTestId("cabr-tv")).toHaveAttribute("data-stage", "ready");
    await expect(tv.getByTestId("cabr-lead")).toBeVisible();
    for (const p of [...stoppers, dan!]) await expect(p.t("cabr-stop")).toBeVisible({ timeout: 10_000 });
    await expect(tv.getByTestId("tv-counter")).toHaveAttribute("data-design", "digital");
    await expect(tv.getByTestId("tv-counter")).toHaveAttribute("data-mode", "chaos", { timeout: 5_000 });

    // Un appui par joueur, définitif : « Stoppé ! » sur le téléphone, pastille verte sur la TV (sans le temps).
    await alice!.t("cabr-stop").click();
    await expect(alice!.t("cabr-stopped")).toBeVisible();
    await expect(tv.getByTestId(`cabr-chip-${alice!.id}`)).toHaveAttribute("data-stopped", "true");
    await expect(tv.getByTestId(`cabr-chip-${bob!.id}`)).toHaveAttribute("data-stopped", "false");
    await expect(tv.getByTestId("cabr-tv")).not.toContainText(/[+−]\d,\d\d/);
    // Un téléphone qui recharge retrouve son « Stoppé ! » (l'état vit sur le serveur).
    await alice!.page.reload();
    await expect(alice!.t("cabr-stopped")).toBeVisible();
    await bob!.t("cabr-stop").click();
    await chloe!.t("cabr-stop").click();

    // Dan n'a pas stoppé : le compteur s'arrête à cible + marge, les résultats arrivent.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 20_000 });
    await expect(tv.getByTestId("cabr-axis")).toBeVisible();
    await expect(tv.getByTestId(`cabr-missed-${dan!.id}`)).toBeVisible();
    const deltas = await party.tvDeltas();
    expect(deltas[dan!.id!]).toBe(0);
    const scored = stoppers.map((p) => deltas[p.id!]!).sort((a, b) => b - a);
    expect(scored[0]).toBe(150);
    for (const s of scored) expect([150, 100, 70]).toContain(s);
    for (const p of stoppers) await expect(p.t("cabr-phone-result")).toHaveAttribute("data-rank", /[123]/);
    await expect(dan!.t("cabr-phone-result")).toContainText("Pas stoppé");

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("podium-1")).toContainText("150", { timeout: 20_000 });
  });

  test("fin anticipée : quand tout le monde a stoppé, pas besoin d'attendre la fin du compteur", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Eve", "Fox");
    await party.startGame({ "compte-a-rebours": 1 });
    for (const p of phones) await expect(p.t("cabr-stop")).toBeVisible({ timeout: 20_000 });
    for (const p of phones) await p.t("cabr-stop").click();
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 5_000 });
    await expect(tv.getByTestId("cabr-axis")).toBeVisible();
    await expect(tv.getByTestId(`cabr-drop-${phones[0]!.id}`)).toBeVisible();
  });
});
