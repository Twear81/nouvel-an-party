import { expect, test } from "./helpers/fixtures";

// Soirée type : 8 invités, pseudos jusqu'à 16 caractères, petits téléphones (360x640, le plus petit à supporter).
const NAMES = ["Alexandre-Louis1", "Marie-Charlotte!", "Jean-Baptiste Jr", "Zoé", "Bob", "Chloé", "Maximilienne 2", "Anne-Sophie"];
const SMALL = { width: 360, height: 640 };
const TV = { width: 1920, height: 1080 };

test.describe("8 joueurs", () => {
  test.setTimeout(180_000);

  test("une manche de chaque jeu jusqu'au classement final, tout tient à l'écran", { tag: "@compat" }, async ({ party }) => {
    const { tv } = party;
    expect(NAMES.every((n) => n.length <= 16)).toBe(true);
    const phones = await party.addPhonesWith({ viewport: SMALL }, ...NAMES);
    expect(phones).toHaveLength(8);

    // ── Lobby : 8 cartes, chacune avec son bouton « retirer », rien de coupé.
    await expect(tv.locator('[data-testid^="tv-player-"]')).toHaveCount(8);
    for (const p of phones) {
      await expect(party.tvPlayer(p.id!)).toBeInViewport({ ratio: 1 });
      await expect(tv.getByTestId(`kick-${p.id}`)).toBeVisible();
    }
    await expect(tv.getByTestId("start-game")).toBeInViewport({ ratio: 1 });
    expect(await party.clippedIn("tv-lobby")).toEqual([]);
    await tv.screenshot({ path: test.info().outputPath("lobby-8.png") });
    // Aucune carte ne chevauche une autre.
    const boxes = await Promise.all(phones.map((p) => party.tvPlayer(p.id!).boundingBox()));
    for (const [i, x] of boxes.entries())
      for (const y of boxes.slice(i + 1)) {
        const overlap = x!.x < y!.x + y!.width - 4 && y!.x < x!.x + x!.width - 4 && x!.y < y!.y + y!.height - 4 && y!.y < x!.y + x!.height - 4;
        expect(overlap).toBe(false);
      }

    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 1 });

    const played = new Set<string>();
    for (let round = 1; round <= 2; round++) {
      await expect(tv.getByTestId("tv-playing")).toContainText(`${round} / 2`);
      const game = await party.gameOf(phones[0]!);
      played.add(game);

      // ── TV pendant la manche : les 8 avatars, non coupés.
      await expect(tv.getByTestId("tv-answered").locator("> div")).toHaveCount(8);
      expect(await party.clippedIn("tv-playing")).toEqual([]);
      await expect(tv.getByTestId("tv-answered")).toBeInViewport({ ratio: 1 });

      // ── Téléphones 360x640 : tout le monde voit et peut toucher toutes ses options sans défiler.
      for (const p of phones) {
        if (game === "qui-est-le-plus") {
          const options = p.page.locator('[data-testid^="vote-option-"]');
          await expect(options).toHaveCount(7);
          for (const o of await options.all()) await expect(o).toBeInViewport({ ratio: 1 });
          const scrolls = await options.first().evaluate((el) => {
            const grid = el.parentElement!;
            return grid.scrollHeight > grid.clientHeight + 1;
          });
          expect(scrolls).toBe(false);
        } else {
          await expect(p.t("choice-0")).toBeInViewport({ ratio: 1 });
          await expect(p.t("choice-1")).toBeInViewport({ ratio: 1 });
        }
      }
      if (round === 1) await phones[0]!.page.screenshot({ path: test.info().outputPath(`phone-${game}-360x640.png`) });

      await party.answerRound(phones, { spread: true });
      await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 6_000 });

      // ── Résultats : 8 barres (ou 2 camps), bande des points avec les 8 joueurs.
      await expect(tv.locator('[data-testid^="delta-"]')).toHaveCount(8);
      if (game === "qui-est-le-plus") await expect(tv.locator('[data-testid^="tally-"]')).toHaveCount(8);
      else await expect(tv.locator('[data-testid^="camp-"]')).toHaveCount(2);
      await tv.waitForTimeout(2500); // laisse finir les animations d'entrée
      expect(await party.clippedIn("tv-results")).toEqual([]);
      for (const p of phones) await expect(tv.getByTestId(`delta-${p.id}`)).toBeInViewport({ ratio: 1 });
      const area = await tv.getByTestId("tv-results").boundingBox();
      expect(area!.y + area!.height).toBeLessThanOrEqual(TV.height + 1);
      await tv.screenshot({ path: test.info().outputPath(`results-${game}-8.png`) });
      for (const p of phones) await expect(p.t("continue-button")).toBeInViewport({ ratio: 1 });

      // « Qui a continué ? » : après 3 clics, 3 pastilles ✓ et le compteur d'attente.
      await party.continueAll(phones.slice(0, 3));
      await expect(tv.getByTestId("tv-results")).toContainText("En attente de 5 joueurs");
      await expect(phones[3]!.t("continue-button")).toBeVisible();
      await expect(phones[0]!.t("waiting-others")).toContainText("3/8");
      await party.continueAll(phones.slice(3));
    }
    expect([...played].sort()).toEqual(["ceci-ou-cela", "qui-est-le-plus"]);

    // ── Classement final : podium + les 5 autres, avec suspense.
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await expect(tv.getByTestId("podium-1")).toContainText(/\d+/, { timeout: 30_000 });
    for (const n of [4, 5, 6, 7, 8]) await expect(tv.getByTestId(`rank-${n}`)).toBeVisible();
    for (const n of [1, 2, 3]) await expect(tv.getByTestId(`podium-${n}`)).toBeInViewport({ ratio: 1 });
    await tv.waitForTimeout(1500);
    expect(await party.clippedIn("tv-final")).toEqual([]);
    await tv.screenshot({ path: test.info().outputPath("final-8.png") });
    for (const p of phones) await expect(p.t("phone-final")).toContainText("sur 8 joueurs");
  });
});

test.describe("2 joueurs", () => {
  test.setTimeout(120_000);

  test("un lobby presque vide reste généreux, et le classement à deux n'a pas de 3e place", async ({ party }) => {
    const { tv } = party;
    const [a, b] = await party.addPhones("Alice", "Bob");
    // Les cartes sont grandes (avatars 15 rem = 240 px sur une TV 1080p) : le lobby n'a pas l'air vide.
    const box = (await party.tvPlayer(a!.id!).boundingBox())!;
    expect(box.height).toBeGreaterThan(220);
    expect(await party.clippedIn("tv-lobby")).toEqual([]);
    await tv.screenshot({ path: test.info().outputPath("lobby-2.png") });

    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    expect(await party.clippedIn("tv-playing")).toEqual([]);
    await party.answerRound([a!, b!]);
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await tv.waitForTimeout(2000);
    expect(await party.clippedIn("tv-results")).toEqual([]);
    await party.continueAll([a!, b!]);
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await expect(tv.getByTestId("podium-2")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("podium-3")).toHaveCount(0);
    await tv.waitForTimeout(1500);
    expect(await party.clippedIn("tv-final")).toEqual([]);
    await tv.screenshot({ path: test.info().outputPath("final-2.png") });
  });
});
