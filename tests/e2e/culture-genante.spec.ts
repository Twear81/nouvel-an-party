import { expect, test } from "./helpers/fixtures";
import { REVEAL_TIMEOUT, type Party, type Phone } from "./helpers/party";

const CG = "culture-genante";
// Le fixture a 3 questions (une tirée au hasard par manche) : on lit laquelle à l'écran.
// QCM : la bonne réponse est la 1re du yaml, l'ordre est mélangé à l'écran.
const GOOD: Record<string, string> = {
  "Capitale de l'Australie ?": "Canberra",
  "Quel animal tue le plus d'humains ?": "Le moustique",
};
const BAD: Record<string, string> = {
  "Capitale de l'Australie ?": "Sydney",
  "Quel animal tue le plus d'humains ?": "Le requin",
};

/** Attend l'étape « question » sur un téléphone et renvoie le texte de la question. */
async function questionOf(p: Phone): Promise<string> {
  await expect(p.t("cg-phone")).toHaveAttribute("data-stage", "question", { timeout: 20_000 });
  const q = p.t("cg-phone-question");
  await expect(q).toBeVisible();
  return (await q.innerText()).trim();
}

const choice = (p: Phone, label: string) => p.page.locator('[data-testid^="cg-choice-"]', { hasText: label });

async function typeNumber(p: Phone, n: number) {
  for (const k of String(n)) await p.t(`cg-key-${k}`).click();
  await p.t("cg-submit").click();
}

/**
 * Tout le monde répond à la question en cours : le 1er joueur donne la bonne réponse, le 2e une mauvaise (QCM) ;
 * estimation : 1969 pile, puis des écarts croissants. Renvoie le type de question.
 */
async function answerInterlude(phones: Phone[]): Promise<"qcm" | "estimation"> {
  const question = await questionOf(phones[0]!);
  if (GOOD[question]) {
    for (const [i, p] of phones.entries()) await choice(p, i === 1 ? BAD[question]! : GOOD[question]!).click();
    return "qcm";
  }
  for (const [i, p] of phones.entries()) await typeNumber(p, 1969 - i * 10);
  return "estimation";
}

/** Lance une partie réduite à une manche surprise. */
async function startInterlude(party: Party) {
  await party.startGame({ [CG]: 1 });
  await expect(party.tv.getByTestId("cg-tv")).toBeVisible({ timeout: 10_000 });
}

test.describe("Culture gênante", () => {
  test.setTimeout(120_000);

  test("une manche seule : accroche, bascule, question, résultats et points @compat", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await expect(tv.getByTestId(`setup-toggle-${CG}`)).toHaveAttribute("data-on", "true");
    await startInterlude(party);

    // Surprise : pas d'écran d'annonce ni de « Prépare-toi ! », la TV est en plein écran sans en-tête ni chrono standard.
    await expect(tv.getByTestId("tv-intro")).toHaveCount(0);
    await expect(tv.getByTestId("tv-playing")).toHaveAttribute("data-interlude", "true");
    await expect(tv.getByTestId("countdown")).toHaveCount(0);
    for (const p of phones) {
      await expect(p.t("phone-intro")).toHaveCount(0);
      await expect(p.t("phone-playing")).toHaveAttribute("data-interlude", "true");
    }

    // Accroche (TV festive), puis bascule (écran sérieux), puis question.
    await expect(tv.getByTestId("cg-tv")).toHaveAttribute("data-stage", "accroche");
    await expect(tv.getByTestId("cg-accroche-text")).toContainText("quelle ambiance", { timeout: 10_000 });
    // Pendant l'accroche et la bascule, les téléphones restent neutres : aucun choix, aucun pavé.
    await expect(phones[0]!.t("cg-phone")).toHaveAttribute("data-stage", "accroche");
    await expect(phones[0]!.page.locator('[data-testid^="cg-choice-"], [data-testid="cg-amount"]')).toHaveCount(0);
    await expect(tv.getByTestId("cg-tv")).toHaveAttribute("data-stage", "bascule", { timeout: 10_000 });
    await expect(tv.getByTestId("cg-bascule")).toContainText("Bon. Plus sérieusement.");
    await expect(phones[0]!.page.locator('[data-testid^="cg-choice-"], [data-testid="cg-amount"]')).toHaveCount(0);
    await expect(tv.getByTestId("cg-tv")).toHaveAttribute("data-stage", "question", { timeout: 10_000 });
    await expect(tv.getByTestId("cg-timer")).toBeVisible();

    const kind = await answerInterlude(phones);

    // Tout le monde a répondu : fin anticipée, résultats sans numéro de manche (il spoilerait la surprise).
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 10_000 });
    await expect(tv.getByTestId("cg-results")).toHaveAttribute("data-kind", kind);
    await expect(tv.getByTestId("tv-results")).not.toContainText("1 / 1");
    await expect(tv.getByTestId("cg-stat")).toBeVisible({ timeout: REVEAL_TIMEOUT });

    const deltas = await party.tvDeltas();
    const [a, b, c] = phones;
    if (kind === "qcm") {
      // Alice : bonne réponse + bonus de rapidité (100 à 150) ; Bob : faux ; Chloé : bonne réponse.
      expect(deltas[a!.id!]).toBeGreaterThanOrEqual(100);
      expect(deltas[a!.id!]).toBeLessThanOrEqual(150);
      expect(deltas[b!.id!]).toBe(0);
      expect(deltas[c!.id!]).toBeGreaterThanOrEqual(100);
      await expect(tv.getByTestId("cg-stat")).toHaveText("2 / 3 ont trouvé.");
      await expect(a!.t("phone-cg-result")).toHaveAttribute("data-ok", "true");
      await expect(b!.t("phone-cg-result")).toHaveAttribute("data-ok", "false");
    } else {
      // 1969, 1959, 1949 : 150, 100, 50.
      expect(deltas).toEqual({ [a!.id!]: 150, [b!.id!]: 100, [c!.id!]: 50 });
      await expect(tv.getByTestId("cg-exact")).toContainText("1969");
    }
    for (const p of phones) await expect(p.t("phone-cg-result")).toBeVisible();

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible({ timeout: 10_000 });
  });

  test("rien répondu : « Passer » pendant la question donne 0 point", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob");
    await startInterlude(party);
    await expect(tv.getByTestId("cg-tv")).toHaveAttribute("data-stage", "question", { timeout: 15_000 });
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await expect(tv.getByTestId("cg-stat")).toContainText("Personne n'a répondu", { timeout: REVEAL_TIMEOUT });
    expect(Object.values(await party.tvDeltas())).toEqual([0, 0]);
    await expect(phones[0]!.t("phone-cg-result")).toContainText("Tu n'as pas répondu");
  });

  test("pause pendant l'accroche et pendant la question : tout se fige, puis reprend", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob");
    await startInterlude(party);
    const stage = tv.getByTestId("cg-tv");

    await expect(stage).toHaveAttribute("data-stage", "accroche");
    await tv.getByTestId("host-pause").click();
    await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    await expect(phones[0]!.t("paused-overlay")).toBeVisible();
    await tv.waitForTimeout(3500); // plus long que l'accroche du fixture (2 s)
    await expect(stage).toHaveAttribute("data-stage", "accroche");
    await tv.getByTestId("host-pause").click();
    await expect(stage).toHaveAttribute("data-stage", "question", { timeout: 15_000 });

    await tv.getByTestId("host-pause").click();
    await expect(phones[0]!.t("paused-overlay")).toBeVisible();
    await tv.getByTestId("host-pause").click();
    await expect(phones[0]!.t("paused-overlay")).toHaveCount(0);
    await answerInterlude(phones);
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 10_000 });
  });

  test("un téléphone déconnecté ne bloque pas la manche", async ({ party }) => {
    const { tv } = party;
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await startInterlude(party);
    await expect(tv.getByTestId("cg-tv")).toHaveAttribute("data-stage", "question", { timeout: 15_000 });
    await questionOf(a!);
    await c!.context.close(); // le téléphone de Chloé plante
    await answerInterlude([a!, b!]);
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 10_000 });
  });

  test("un téléphone qui recharge retrouve la question et sa réponse", async ({ party }) => {
    const { tv } = party;
    const [a, b] = await party.addPhones("Alice", "Bob");
    await startInterlude(party);
    const question = await questionOf(a!);
    await a!.page.reload();
    expect(await questionOf(a!)).toBe(question);

    // Alice répond, recharge : sa réponse est verrouillée.
    if (GOOD[question]) await choice(a!, GOOD[question]!).click();
    else await typeNumber(a!, 1969);
    await expect(tv.getByTestId("cg-answered-count")).toContainText("1");
    await a!.page.reload();
    await questionOf(a!);
    await expect(a!.page.getByText("Réponse enregistrée")).toBeVisible();
    await expect(tv.getByTestId("tv-results")).toHaveCount(0);

    // Bob répond : fin anticipée.
    await answerInterlude([b!]);
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 10_000 });
  });

  test("après un crash du serveur pendant l'interlude, la partie reprend directement en jeu", async ({ party }) => {
    const { tv, server } = party;
    const phones = await party.addPhones("Alice", "Bob");
    await startInterlude(party);
    await expect(tv.getByTestId("cg-tv")).toHaveAttribute("data-stage", "question", { timeout: 15_000 });

    await server.kill();
    await expect(tv.getByTestId("reconnecting")).toBeVisible();
    await server.start();
    await expect(tv.getByTestId("resume-game")).toBeVisible();
    await tv.getByTestId("resume-game").click();

    // L'interlude repart depuis son accroche, sans annonce.
    await expect(tv.getByTestId("tv-intro")).toHaveCount(0);
    await expect(tv.getByTestId("cg-tv")).toBeVisible();
    await answerInterlude(phones);
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 15_000 });
    await party.continueAll(phones);
    await expect(tv.getByTestId("tv-final")).toBeVisible({ timeout: 10_000 });
  });

  test("partie mélangée : l'interlude surgit tous les 2 jeux, sans écran d'annonce, sans fausser la numérotation", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    // Compte les écrans d'annonce affichés sur la TV (un par manche normale seulement).
    await tv.evaluate(() => {
      const w = window as unknown as { __intros: string[] };
      w.__intros = [];
      new MutationObserver((records) => {
        for (const r of records)
          for (const n of r.addedNodes) {
            const el = n as HTMLElement;
            if (el.querySelector?.('[data-testid="tv-intro"]') || el.dataset?.testid === "tv-intro") w.__intros.push(document.body.innerText.match(/Manche \d+ \/ \d+/)?.[0] ?? "?");
          }
      }).observe(document.body, { childList: true, subtree: true });
    });
    await party.startGame({ "qui-est-le-plus": 2, "ceci-ou-cela": 2, [CG]: 1 });

    // 4 manches normales + 2 interludes (tous_les: 2) = 6 manches.
    const seen: string[] = [];
    for (let round = 0; round < 6; round++) {
      await expect(tv.getByTestId("tv-playing")).toBeVisible({ timeout: 20_000 });
      const interlude = (await tv.getByTestId("tv-playing").getAttribute("data-interlude")) === "true";
      seen.push(interlude ? "I" : "N");
      if (interlude) await answerInterlude(phones);
      else await party.answerRound(phones);
      await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 10_000 });
      if (interlude) await expect(tv.getByTestId("tv-results")).not.toContainText(/\d \/ 4/);
      else await expect(tv.getByTestId("tv-results")).toContainText(`${seen.filter((s) => s === "N").length} / 4`);
      await party.continueAll(phones);
    }
    await expect(tv.getByTestId("tv-final")).toBeVisible({ timeout: 10_000 });

    expect(seen.filter((s) => s === "I")).toHaveLength(2);
    expect(seen[0]).toBe("N"); // jamais en première position
    expect(seen.join("")).not.toContain("II"); // jamais deux de suite
    const intros = await tv.evaluate(() => (window as unknown as { __intros: string[] }).__intros);
    expect(intros).toEqual(["Manche 1 / 4", "Manche 2 / 4", "Manche 3 / 4", "Manche 4 / 4"]);
  });

  test("lobby : l'interrupteur remplace le compteur, la durée l'inclut", async ({ party }) => {
    const { tv } = party;
    const row = tv.getByTestId(`setup-row-${CG}`);
    await expect(row).toHaveAttribute("data-interlude", "true");
    const toggle = tv.getByTestId(`setup-toggle-${CG}`);
    const planned = tv.getByTestId(`setup-planned-${CG}`);
    await expect(tv.getByTestId(`setup-inc-${CG}`)).toHaveCount(0);
    const total = tv.getByTestId("setup-total");

    await party.setOnly({ "ceci-ou-cela": 4 });
    await expect(toggle).toHaveAttribute("data-on", "false");
    await expect(total).toContainText("4 manches");
    await expect(planned).toHaveText("—");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-on", "true");
    await expect(planned).toContainText("×2"); // 4 manches normales, une surprise toutes les 2
    await expect(total).toContainText("6 manches"); // 4 normales + 2 surprises
    await party.setOnly({ "ceci-ou-cela": 1, [CG]: 1 });
    await expect(total).toContainText("1 manche"); // moins de 2 manches normales : pas de surprise
    await expect(planned).toHaveText("×0");
    await party.setOnly({ [CG]: 1 });
    await expect(total).toContainText("1 manche"); // aucune normale : une seule surprise
    await expect(tv.getByTestId("start-game")).toBeDisabled(); // pas de joueur prêt, mais pas à cause des manches
    await expect(tv.getByTestId("start-blocked")).toContainText("joueur prêt");
  });
});
