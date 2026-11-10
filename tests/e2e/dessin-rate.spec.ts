import { expect, test } from "./helpers/fixtures";
import type { Phone } from "./helpers/party";

/** Trace un trait à la souris/au doigt sur la page de dessin d'un téléphone (coordonnées relatives 0..1). */
async function stroke(p: Phone, pts: [number, number][]) {
  const box = (await p.t("draw-canvas").boundingBox())!;
  const at = ([x, y]: [number, number]) => [box.x + x * box.width, box.y + y * box.height] as const;
  await p.page.mouse.move(...at(pts[0]!));
  await p.page.mouse.down();
  for (const pt of pts.slice(1)) await p.page.mouse.move(...at(pt), { steps: 2 });
  await p.page.mouse.up();
}
const TRIANGLE: [number, number][] = [[0.5, 0.15], [0.85, 0.8], [0.15, 0.8], [0.5, 0.15]];
const WAVE: [number, number][] = Array.from({ length: 14 }, (_, i) => [0.08 + i * 0.06, i % 2 ? 0.7 : 0.3]);

test.describe("Dessin raté", () => {
  test("dessiner, galerie, vote, révélation, points @compat", async ({ party }) => {
    const { tv } = party;
    const [alice, bob, chloe] = (await party.addPhones("Alice", "Bob", "Chloé")) as [Phone, Phone, Phone];
    await party.startGame({ "dessin-rate": 1 });

    // Dessin : un mot différent par joueur (jamais sur la TV), la difficulté s'affiche sur la TV.
    await expect(alice.t("draw-canvas")).toBeVisible({ timeout: 20_000 });
    await expect(tv.getByTestId("tv-dessin")).toHaveAttribute("data-stage", "draw");
    await expect(tv.getByTestId("difficulty-badge")).toHaveAttribute("data-difficulty", "facile");
    const words = await Promise.all([alice, bob, chloe].map(async (p) => (await p.t("draw-word").textContent()) ?? ""));
    expect(new Set(words).size).toBe(3);
    for (const w of words) await expect(tv.getByTestId("tv-dessin")).not.toContainText(w);

    // Alice dessine, annule, redessine ; la TV suit en direct ; Chloé ne dessine rien.
    await stroke(alice, WAVE);
    await alice.t("draw-color-1").click();
    await stroke(alice, TRIANGLE);
    await expect(alice.t("draw-canvas")).toHaveAttribute("data-strokes", "2");
    await expect(tv.getByTestId(`tv-live-${alice.id}`)).toHaveAttribute("data-strokes", "2");
    await alice.t("draw-undo").click();
    await expect(tv.getByTestId(`tv-live-${alice.id}`)).toHaveAttribute("data-strokes", "1");
    await alice.t("draw-width-0").click();
    await stroke(alice, TRIANGLE);
    await expect(tv.getByTestId(`tv-live-${alice.id}`)).toHaveAttribute("data-strokes", "2");
    // Rechargement d'un téléphone : il retrouve son mot et son dessin.
    await alice.page.reload();
    await expect(alice.t("draw-canvas")).toHaveAttribute("data-strokes", "2");
    await expect(alice.t("draw-word")).toHaveText(words[0]!);
    await bob.t("draw-color-2").click();
    await stroke(bob, TRIANGLE);
    await expect(tv.getByTestId(`tv-live-${bob.id}`)).toHaveAttribute("data-strokes", "1");

    // Galerie : le dessin passe en grand avec son mot et son auteur.
    await expect(tv.getByTestId("tv-dessin")).toHaveAttribute("data-stage", "gallery", { timeout: 40_000 });
    await expect(tv.getByTestId("tv-gallery-word")).toHaveText(/Mot A\d/);
    await expect(tv.getByTestId("tv-gallery-author")).toHaveText(/Alice|Bob/);
    await expect(chloe.t("phone-dessin")).toHaveAttribute("data-stage", "gallery");

    // Vote : pas de vote pour soi, la page blanche n'est pas votable.
    await expect(tv.getByTestId("tv-dessin")).toHaveAttribute("data-stage", "vote", { timeout: 20_000 });
    await expect(alice.t(`vote-card-${alice.id}`)).toHaveCount(0);
    await expect(alice.t(`vote-card-${chloe.id}`)).toBeDisabled();
    await expect(alice.t(`vote-card-${chloe.id}`)).toHaveAttribute("data-blank", "true");
    await alice.t(`vote-card-${bob.id}`).click();
    await expect(alice.t(`vote-card-${bob.id}`)).toHaveAttribute("aria-pressed", "true");
    await expect(tv.getByTestId("tv-vote-count")).toContainText("1 / 3");
    await chloe.t(`vote-card-${alice.id}`).click();
    await chloe.t(`vote-card-${bob.id}`).click(); // elle change d'avis
    await expect(chloe.t(`vote-card-${bob.id}`)).toHaveAttribute("aria-pressed", "true");
    await bob.t(`vote-card-${alice.id}`).click(); // dernier vote : fin anticipée

    // Tout le monde a voté : révélation du moins voté au plus voté, Bob (2 votes) gagne.
    await expect(tv.getByTestId("dessin-results")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("dessin-results")).toHaveAttribute("data-done", "true", { timeout: 30_000 });
    await expect(tv.getByTestId(`dessin-big-${bob.id}`)).toBeVisible();
    await expect(tv.getByTestId(`dessin-small-${alice.id}`)).toBeVisible();
    await party.phoneRevealed(bob);
    await expect(bob.t("my-votes")).toContainText("2 votes");
    await expect(alice.t("my-votes")).toContainText("1 vote");
    expect(await party.tvDeltas([alice, bob, chloe])).toEqual({ [alice.id!]: 50, [bob.id!]: 2 * 50 + 100, [chloe.id!]: 0 });
    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
  });

  test("personne ne dessine : directement les résultats, sans points", async ({ party }) => {
    const phones = await party.addPhones("Alice", "Bob");
    await party.startGame({ "dessin-rate": 1 });
    await expect(phones[0]!.t("draw-canvas")).toBeVisible({ timeout: 20_000 });
    await expect(party.tv.getByTestId("dessin-results")).toBeVisible({ timeout: 40_000 });
    expect(await party.tvDeltas(phones)).toEqual({ [phones[0]!.id!]: 0, [phones[1]!.id!]: 0 });
  });

  test("un téléphone déconnecté ne bloque pas le vote", async ({ party }) => {
    const [alice, bob, chloe] = (await party.addPhones("Alice", "Bob", "Chloé")) as [Phone, Phone, Phone];
    await party.startGame({ "dessin-rate": 1 });
    await expect(alice.t("draw-canvas")).toBeVisible({ timeout: 20_000 });
    await stroke(alice, WAVE);
    await stroke(bob, TRIANGLE);
    await stroke(chloe, WAVE.slice(0, 6));
    await expect(party.tv.getByTestId(`tv-live-${chloe.id}`)).toHaveAttribute("data-strokes", "1");
    await expect(party.tv.getByTestId("tv-dessin")).toHaveAttribute("data-stage", "vote", { timeout: 60_000 });
    await chloe.page.close(); // le téléphone de Chloé plante : il ne doit pas bloquer le vote
    await alice.t(`vote-card-${bob.id}`).click();
    await bob.t(`vote-card-${alice.id}`).click();
    await expect(party.tv.getByTestId("dessin-results")).toBeVisible({ timeout: 15_000 });
  });
});
