import type { Party, Phone } from "./helpers/party";
import { expect, test } from "./helpers/fixtures";

/**
 * Joue le tournoi jusqu'à l'écran des résultats. Dans chaque duel, le joueur arrivé le plus tôt dans la liste
 * joue pierre et l'autre ciseaux : le 1er de la liste devient champion.
 * Avec `tie`, le premier duel rencontré commence par une égalité (pierre contre pierre), puis se rejoue.
 */
async function playTournament(party: Party, phones: Phone[], opts: { tie?: boolean } = {}) {
  const names = phones.map((p) => p.name);
  const seen = new Set<string>();
  let tiePair: string | null = null;
  const tied = new Set<string>();
  const results = party.tv.getByTestId("tv-results");
  await expect
    .poll(
      async () => {
        for (const p of phones) {
          const status = await p.t("pfc-phone").getAttribute("data-status", { timeout: 500 }).catch(() => null);
          if (status) seen.add(status);
          const rock = p.t("pfc-choice-0");
          if (!(await rock.isVisible()) || !(await rock.isEnabled())) continue;
          const opp = (await p.t("pfc-opponent").textContent() ?? "").trim();
          const pair = [p.name, opp].sort().join("|");
          let choice = names.indexOf(p.name) < names.indexOf(opp) ? 0 : 2;
          if (opts.tie) {
            tiePair ??= pair;
            if (pair === tiePair && !tied.has(p.name)) {
              choice = 0;
              tied.add(p.name);
            } else if (pair === tiePair) {
              // Rejeu : le téléphone l'annonce.
              await expect(p.page.getByText("Égalité ! On rejoue")).toBeVisible();
            }
          }
          await p.t(`pfc-choice-${choice}`).click({ timeout: 2_000 }).catch(() => {});
        }
        return results.isVisible();
      },
      { timeout: 150_000, intervals: [300] },
    )
    .toBe(true);
  return seen;
}

test.describe("Pierre-feuille-ciseaux : le tournoi", () => {
  test.setTimeout(240_000);

  test("3 joueurs : un exempt, un duel, la finale, points 300 / 150 / 75", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "pierre-feuille-ciseaux": 1 });

    // Tirage : l'arbre à 4 places avec un qualifié d'office.
    await expect(tv.getByTestId("pfc-tv")).toBeVisible();
    await expect(tv.getByTestId("pfc-bracket")).toBeVisible();
    await expect(tv.getByTestId("pfc-bye")).toHaveCount(1);
    for (const p of phones) await expect(p.t("pfc-phone")).toBeVisible();

    const seen = await playTournament(party, phones);
    expect(seen).toContain("pick");
    expect(seen).toContain("through");

    await expect(tv.getByTestId("pfc-champion")).toContainText("Alice");
    const deltas = await party.tvDeltas();
    expect(deltas[phones[0]!.id!]).toBe(300);
    expect(Object.values(deltas).sort((a, b) => b - a)).toEqual([300, 150, 75]);
    await expect(phones[0]!.t("pfc-phone-result")).toHaveAttribute("data-champion", "true");
    await expect(phones[1]!.t("pfc-phone-result")).toHaveAttribute("data-champion", "false");

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
  });

  test("5 joueurs : 3 exempts, une égalité rejouée, éliminés spectateurs, champion", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé", "David", "Emma");
    await party.startGame({ "pierre-feuille-ciseaux": 1 });

    await expect(tv.getByTestId("pfc-bracket")).toBeVisible();
    await expect(tv.getByTestId("pfc-bye")).toHaveCount(3);

    const seen = await playTournament(party, phones, { tie: true });
    expect(seen).toContain("out");
    expect(seen).toContain("through");
    expect(seen).toContain("reveal");

    await expect(tv.getByTestId("pfc-champion")).toContainText("Alice");
    const deltas = await party.tvDeltas();
    expect(deltas[phones[0]!.id!]).toBe(300);
    expect(Object.values(deltas).sort((a, b) => b - a)).toEqual([300, 150, 75, 75, 25]);
    await expect(tv.getByTestId("pfc-results-bracket")).toBeVisible();

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
  });
});
