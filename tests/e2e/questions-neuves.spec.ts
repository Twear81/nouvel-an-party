import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";

/** Fait défiler une partie sans répondre : « Passer » sur chaque manche puis sur ses résultats, jusqu'au classement final. */
async function playThrough(tv: Page, rounds: number) {
  for (let i = 0; i < rounds; i++) {
    await expect(tv.getByTestId("tv-playing")).toBeVisible({ timeout: 20_000 });
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await tv.getByTestId("host-skip").click();
  }
  await expect(tv.getByTestId("tv-final")).toBeVisible();
}

test.describe("Questions neuves d'une partie à l'autre", () => {
  test("deux parties de suite : aucune question rejouée tant qu'il en reste de neuves", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    const fresh = tv.getByTestId("setup-fresh-qui-est-le-plus");
    // La config de test a 5 questions « qui est le plus » : toutes neuves au départ.
    await expect(fresh).toHaveAttribute("data-fresh", "5");

    const playedKeys = () => {
      const save = JSON.parse(readFileSync(path.join(party.server.dataDir, "deja-vu.json"), "utf8"));
      return Object.keys(save.items["qui-est-le-plus"] as Record<string, number>);
    };

    // Partie 1 : 3 questions.
    await party.startGame({ "qui-est-le-plus": 3 });
    await playThrough(tv, 3);
    const first = playedKeys();
    expect(first).toHaveLength(3);

    // Retour au lobby : l'hôte voit combien de questions neuves il reste.
    await tv.getByTestId("host-lobby").click();
    await tv.getByTestId("confirm-yes").click();
    await expect(tv.locator("[data-phase=lobby]")).toBeVisible();
    await expect(fresh).toHaveAttribute("data-fresh", "2");

    // Partie 2 : 2 questions, ce sont exactement les 2 neuves (5 questions distinctes au total, aucune rejouée).
    await party.startGame({ "qui-est-le-plus": 2 });
    await playThrough(tv, 2);
    const all = playedKeys();
    expect(all).toHaveLength(5);
    expect(new Set(all).size).toBe(5);

    await tv.getByTestId("host-lobby").click();
    await tv.getByTestId("confirm-yes").click();
    await expect(tv.locator("[data-phase=lobby]")).toBeVisible();
    await expect(fresh).toHaveAttribute("data-fresh", "0");

    // Stock neuf épuisé : on peut quand même jouer une 3e partie (les plus anciennes reviennent), sans blocage.
    await party.startGame({ "qui-est-le-plus": 1 });
    await playThrough(tv, 1);
  });
});
