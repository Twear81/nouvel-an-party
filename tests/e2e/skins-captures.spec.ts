// Outil (pas un test de non-régression) : photographie TOUS les écrans du jeu dans un skin donné, pour que les
// designers de skins vérifient leur travail. Ne s'exécute que si CAPTURES_SKIN est défini :
//   CAPTURES_SKIN=dofus bun run captures:skin          (captures dans test-results/skins/dofus/)
//   CAPTURES_DIR=/chemin CAPTURES_SKIN=dofus bun run captures:skin
// Voir docs/skins.md. Le skin est forcé sur la TV ET sur tous les téléphones (localStorage "skin-force").
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { isSkinId, SKINS } from "../../src/shared/skins";
import { expect, test as base } from "./helpers/fixtures";
import { GAME_NAMES, type Party, type Phone } from "./helpers/party";

const SKIN = process.env.CAPTURES_SKIN ?? "";
const DIR = path.resolve(process.env.CAPTURES_DIR ?? path.join("test-results", "skins", SKIN || "_"));
const SMALL = { width: 360, height: 640 }; // le plus petit téléphone à supporter

// Force le skin dans tous les contextes créés par la fixture `party` (TV et téléphones), avant le chargement de l'app.
const test = base.extend<{ forceSkin: void }>({
  forceSkin: [
    async ({ browser, tvBrowser }, use) => {
      const originals = [...new Set([browser, tvBrowser])].map((target) => {
        const original = target.newContext.bind(target);
        target.newContext = (async (...args: Parameters<typeof original>) => {
          const context = await original(...args);
          await context.addInitScript((skin) => {
            try {
              localStorage.setItem("skin-force", skin);
            } catch {}
          }, SKIN);
          return context;
        }) as typeof target.newContext;
        return { target, original };
      });
      try {
        await use();
      } finally {
        for (const { target, original } of originals) target.newContext = original;
      }
    },
    { auto: true },
  ],
});

test.describe("Captures de tous les écrans par skin", { tag: "@compat" }, () => {
  test.skip(!SKIN, "outil : définir CAPTURES_SKIN=<id> (voir docs/skins.md)");
  test.beforeAll(() => {
    if (SKIN && !isSkinId(SKIN)) throw new Error(`CAPTURES_SKIN inconnu : « ${SKIN} » (skins : ${SKINS.join(", ")})`);
    mkdirSync(DIR, { recursive: true });
  });
  test.setTimeout(240_000);
  // Annonce de 5 s (le temps de photographier l'intro) ; chrono de 20 s (les manches finissent dès que tout le monde a joué).
  test.use({ serverOptions: { introSeconds: 5, duree: 20 } });

  /** Capture après une courte attente (≤ 1 s) pour laisser finir les animations d'entrée. */
  async function shot(page: Page, name: string) {
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(DIR, `${name}.png`) });
  }

  const GAMES = Object.keys(GAME_NAMES);
  /** Nommage : `<10+n°>-<jeu>-<étape>-tv|tel`, donc triable et groupé par jeu. */
  function shooter(party: Party, id: string) {
    const prefix = `${10 + GAMES.indexOf(id)}-${id}`;
    return {
      tv: (step: string) => shot(party.tv, `${prefix}-${step}-tv`),
      tel: (step: string, p: Phone = party.phones[0]!) => shot(p.page, `${prefix}-${step}-tel`),
    };
  }
  type Shooter = ReturnType<typeof shooter>;

  /** Lance une manche du jeu avec 4 téléphones 360x640 et photographie l'annonce (absente pour les manches surprise). */
  async function begin(party: Party, id: string) {
    const phones = await party.addPhonesWith({ viewport: SMALL }, "Alice", "Bob", "Chloé", "David");
    await party.startGame({ [id]: 1 });
    const S = shooter(party, id);
    // Les manches surprise (culture-genante) n'ont pas d'annonce.
    if (id !== "culture-genante" && (await party.tv.getByTestId("tv-intro").waitFor({ timeout: 8_000 }).then(() => true, () => false))) {
      // La règle du jeu n'apparaît qu'à 1,6 s sous le titre (IntroScreen) : on attend qu'elle soit là.
      await party.tv.waitForTimeout(1_500);
      await S.tv("intro");
      await S.tel("intro");
    }
    return { phones: phones as [Phone, Phone, Phone, Phone], S };
  }

  /** Résultats : attend la fin de la révélation (pas de spoil) puis photographie TV et téléphone. */
  async function results(party: Party, S: Shooter) {
    await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 60_000 });
    await party.tvDeltas();
    await S.tv("resultats");
    await party.phoneRevealed(party.phones[0]!);
    await S.tel("resultats");
  }

  // ───────────── Lobby et profil ─────────────

  test("lobby : 8 joueurs à pseudos de 16 caractères, profil, lobby téléphone", async ({ party }) => {
    test.setTimeout(300_000);
    const names = ["Alexandre-Louis1", "Marie-Charlotte!", "Jean-Baptiste Jr", "Zoé", "Bob", "Chloé", "Maximilienne 2", "Anne-Sophie"];
    // 1er joueur à la main (pour photographier l'écran de profil), les 7 autres via la fixture.
    const { context, page } = await party.openPhonePage({ viewport: SMALL });
    const id = (await party.tvPlayerIds())[0]!;
    await page.getByTestId("profile-name").fill(names[0]!);
    await shot(page, "02-profil-telephone");
    await page.getByTestId("profile-submit").click();
    await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
    party.phones.push({ context, page, name: names[0]!, id, t: (tid) => page.getByTestId(tid) });
    await party.addPhonesWith({ viewport: SMALL }, ...names.slice(1));
    await expect(party.tv.locator('[data-testid^="tv-player-"]')).toHaveCount(8);
    await shot(party.tv, "01-lobby-tv");
    await shot(party.phones[0]!.page, "03-lobby-telephone");
    await shot(party.phones[7]!.page, "03-lobby-telephone-8e");
  });

  // ───────────── Un test par mini-jeu ─────────────

  for (const id of ["qui-est-le-plus", "ceci-ou-cela"] as const) {
    test(id, async ({ party }) => {
      const { phones, S } = await begin(party, id);
      await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
      await expect(phones[0].t("phone-playing")).toBeVisible();
      await S.tv("jeu");
      await S.tel("jeu");
      // Un choix sélectionné sur le premier téléphone.
      await phones[0].t(id === "ceci-ou-cela" ? "choice-0" : `vote-option-${phones[1].id}`).click();
      await S.tv("choix");
      await S.tel("choix");
      await party.answerRound(phones);
      await results(party, S);
    });
  }

  test("tier-list", async ({ party }) => {
    const { phones, S } = await begin(party, "tier-list");
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
    await S.tv("jeu");
    await S.tel("jeu");
    await phones[0].t(`rate-${phones[1].id}-0`).click();
    await phones[0].t(`rate-${phones[2].id}-2`).click();
    await S.tel("choix");
    for (const [i, p] of phones.entries()) for (const [j, target] of phones.entries()) await p.t(`rate-${target.id}-${(i + j) % 4}`).click();
    await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 20_000 });
    await S.tv("revelation");
    await results(party, S);
  });

  test("comme-les-autres", async ({ party }) => {
    const { phones, S } = await begin(party, "comme-les-autres");
    await expect(phones[0].t("answer-input-0")).toBeVisible();
    await S.tv("jeu");
    await S.tel("jeu");
    await phones[0].t("answer-input-0").fill("Fromage");
    await S.tel("saisie");
    await phones[0].t("answer-send").click();
    await expect(phones[0].t("answer-sent")).toBeVisible();
    await S.tv("un-repondu");
    await S.tel("envoye");
    for (const [i, p] of phones.entries()) {
      if (i === 0) continue;
      await p.t("answer-input-0").fill(i === 3 ? "Beurre" : "un fromage");
      await p.t("answer-send").click();
    }
    await results(party, S);
  });

  test("le-bon-prix", async ({ party }) => {
    const { phones, S } = await begin(party, "le-bon-prix");
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible({ timeout: 10_000 });
    await S.tv("jeu");
    await S.tel("jeu");
    for (const k of "12") await phones[0].t(`key-${k}`).click();
    await S.tel("saisie");
    await phones[0].t("submit-guess").click();
    await expect(phones[0].t("bp-amount")).toHaveAttribute("data-validated", "true");
    await S.tel("valide");
    for (const [i, p] of phones.entries()) {
      if (i === 0) continue;
      for (const k of String(50 * i)) await p.t(`key-${k}`).click();
      await p.t("submit-guess").click();
    }
    await expect(party.tv.getByTestId("tv-results")).toBeVisible({ timeout: 10_000 });
    await expect(party.tv.getByTestId("bp-results")).toHaveAttribute("data-stage", "done", { timeout: 20_000 });
    await results(party, S);
  });

  test("split-the-room", async ({ party }) => {
    const { phones, S } = await begin(party, "split-the-room");
    await expect(party.tv.getByTestId("tv-start")).toBeVisible({ timeout: 15_000 });
    await S.tv("debut");
    await S.tel("ecrire");
    await phones[0].t("split-input").fill("Fin de Alice");
    await S.tel("saisie");
    await phones[0].t("split-send").click();
    await S.tv("ecrire");
    for (const p of phones.slice(1)) {
      await p.t("split-input").fill(`Fin de ${p.name}`);
      await p.t("split-send").click();
    }
    for (let i = 0; i < 4; i++) {
      await expect(party.tv.getByTestId("tv-sentence-index")).toHaveText(`${i + 1} / 4`, { timeout: 30_000 });
      const sentence = await party.tv.getByTestId("tv-sentence").textContent() ?? "";
      const author = phones.find((p) => sentence.includes(`de ${p.name}`))!;
      const voters = phones.filter((p) => p !== author);
      if (i === 0) {
        await S.tv("vote");
        await S.tel("vote", voters[0]!);
        await S.tel("auteur", author);
        await voters[0]!.t("vote-yes").click();
        await S.tel("vote-choisi", voters[0]!);
      }
      for (const [k, v] of voters.entries()) await v.t(k === 1 ? "vote-no" : "vote-yes").click();
      await expect(party.tv.getByTestId("tv-reveal-author")).toContainText(author.name, { timeout: 15_000 });
      if (i === 0) {
        await S.tv("revelation");
        await S.tel("revelation", voters[0]!);
      }
    }
    await results(party, S);
  });

  test("compte-a-rebours", async ({ party }) => {
    const { phones, S } = await begin(party, "compte-a-rebours");
    await expect(party.tv.getByTestId("cabr-tv")).toHaveAttribute("data-stage", "announce", { timeout: 20_000 });
    await S.tv("annonce");
    await S.tel("annonce");
    for (const p of phones) await expect(p.t("cabr-stop")).toBeVisible({ timeout: 20_000 });
    await S.tv("compteur");
    await S.tel("stop");
    await phones[0].t("cabr-stop").click();
    await expect(phones[0].t("cabr-stopped")).toBeVisible();
    await S.tel("stoppe");
    for (const p of phones.slice(1, 3)) await p.t("cabr-stop").click(); // David ne stoppe pas
    await results(party, S);
  });

  test("simon", async ({ party }) => {
    const { phones, S } = await begin(party, "simon");
    const [a, b, c, d] = phones;
    const simonTv = party.tv.getByTestId("simon-tv");
    const readSequence = async (length: number) => {
      await expect(simonTv).toHaveAttribute("data-stage", "show", { timeout: 20_000 });
      await expect(simonTv).toHaveAttribute("data-length", String(length));
      return (await simonTv.getAttribute("data-sequence"))!.split(",").map(Number);
    };
    const tap = async (p: Phone, seq: number[]) => {
      for (const pad of seq) await p.t(`simon-pad-${pad}`).click();
    };
    let seq = await readSequence(2);
    await S.tv("suite");
    await S.tel("regarde");
    for (const p of phones) await expect(p.t("simon-phone")).toHaveAttribute("data-status", "play", { timeout: 15_000 });
    await S.tel("a-toi");
    await S.tv("a-toi");
    await tap(a, seq.slice(0, 1));
    await S.tel("en-cours");
    await tap(a, seq.slice(1));
    for (const p of [b, c, d]) await tap(p, seq);
    seq = await readSequence(3);
    for (const p of phones) await expect(p.t("simon-phone")).toHaveAttribute("data-status", "play", { timeout: 15_000 });
    for (const p of [b, d]) await p.t(`simon-pad-${(seq[0]! + 1) % 4}`).click();
    await expect(b.t("simon-phone")).toHaveAttribute("data-status", "out");
    await S.tel("elimine", b);
    await tap(a, seq);
    await tap(c, seq);
    seq = await readSequence(4);
    await expect(c.t("simon-phone")).toHaveAttribute("data-status", "play", { timeout: 15_000 });
    await c.t(`simon-pad-${(seq[0]! + 1) % 4}`).click();
    await tap(a, seq);
    await expect(simonTv).toHaveAttribute("data-stage", "over");
    await S.tv("fin");
    await S.tel("gagnant");
    await results(party, S);
  });

  test("pierre-feuille-ciseaux", async ({ party }) => {
    test.setTimeout(300_000);
    const { phones, S } = await begin(party, "pierre-feuille-ciseaux");
    await expect(party.tv.getByTestId("pfc-bracket")).toBeVisible();
    await S.tv("tirage");
    const shotStatuses = new Set<string>();
    const names = phones.map((p) => p.name);
    const resultsEl = party.tv.getByTestId("tv-results");
    await expect
      .poll(
        async () => {
          for (const p of phones) {
            const status = await p.t("pfc-phone").getAttribute("data-status", { timeout: 500 }).catch(() => null);
            // Une capture par statut vu (TV + téléphone), la première fois.
            if (status && p === phones[0] && !shotStatuses.has(status)) {
              shotStatuses.add(status);
              await S.tv(status);
              await S.tel(status);
            }
            const rock = p.t("pfc-choice-0");
            if (!(await rock.isVisible()) || !(await rock.isEnabled())) continue;
            const opp = (await p.t("pfc-opponent").textContent() ?? "").trim();
            const choice = names.indexOf(p.name) < names.indexOf(opp) ? 0 : 2;
            if (p === phones[0] && !shotStatuses.has("choix")) {
              shotStatuses.add("choix");
              await p.t(`pfc-choice-${choice}`).click({ timeout: 2_000 }).catch(() => {});
              await S.tel("choix");
              await S.tv("choix");
              continue;
            }
            await p.t(`pfc-choice-${choice}`).click({ timeout: 2_000 }).catch(() => {});
          }
          return resultsEl.isVisible();
        },
        { timeout: 200_000, intervals: [300] },
      )
      .toBe(true);
    await results(party, S);
  });

  test("culture-genante", async ({ party }) => {
    const { phones, S } = await begin(party, "culture-genante");
    const [a, ...others] = phones;
    // Accroche et bascule sont brèves : on les photographie si on les attrape, sans échouer sinon.
    const cgTv = party.tv.getByTestId("cg-tv");
    await expect(cgTv).toBeVisible({ timeout: 15_000 });
    if ((await cgTv.getAttribute("data-stage")) === "accroche") {
      await S.tv("accroche");
      await S.tel("accroche");
    }
    if (["accroche", "bascule"].includes((await cgTv.getAttribute("data-stage")) ?? "")) {
      await expect(cgTv).toHaveAttribute("data-stage", "bascule", { timeout: 15_000 });
      await S.tv("bascule");
    }
    await expect(a.t("cg-phone")).toHaveAttribute("data-stage", "question", { timeout: 20_000 });
    await S.tv("question");
    await S.tel("question");
    const choices = a.page.locator('[data-testid^="cg-choice-"]');
    if (await choices.count()) {
      await choices.first().click();
      await S.tel("choix");
      await S.tv("choix");
      for (const p of others) await p.page.locator('[data-testid^="cg-choice-"]').first().click();
    } else {
      for (const k of "19") await a.t(`cg-key-${k}`).click();
      await S.tel("saisie");
      await a.t("cg-submit").click();
      for (const p of others) {
        for (const k of "1969") await p.t(`cg-key-${k}`).click();
        await p.t("cg-submit").click();
      }
    }
    await results(party, S);
  });

  test("imposteur", async ({ party }) => {
    test.setTimeout(300_000);
    const { phones, S } = await begin(party, "imposteur");
    const tv = party.tv;
    await expect(tv.getByTestId("tv-word-title")).toBeVisible({ timeout: 15_000 });
    // L'étape « mot » ne dure que 2 s dans la config de test : on lit les mots d'abord (en parallèle), on photographie ensuite.
    const words = await Promise.all(phones.map(async (p) => (await p.t("word-big").textContent() ?? "").toLowerCase()));
    await S.tel("mot");
    await S.tv("mots");
    const impIdx = words.findIndex((w) => words.filter((x) => x === w).length === 1);
    const imp = phones[impIdx]!;
    const others = phones.filter((p) => p !== imp);

    await expect(tv.getByTestId("tv-speaker")).toBeVisible({ timeout: 15_000 });
    await S.tv("parole");
    const speakerId = await tv.getByTestId("tv-speaker").getAttribute("data-speaker");
    await S.tel("orateur", phones.find((p) => p.id === speakerId)!);
    await S.tel("attente", phones.find((p) => p.id !== speakerId)!);
    // Un seul tour : chaque orateur touche « J'ai dit mon indice » à son tour.
    const step = () => tv.getByTestId("tv-imposteur").getAttribute("data-step", { timeout: 1000 }).catch(() => null);
    const speaker = () => tv.getByTestId("tv-speaker").getAttribute("data-speaker", { timeout: 500 }).catch(() => null);
    for (let guard = 0; guard < 30 && (await step()) === "parole"; guard++) {
      const cur = await speaker();
      const phone = phones.find((p) => p.id === cur);
      if (phone) await phone.t("speech-done").click();
      await expect.poll(async () => (await step()) !== "parole" || (await speaker()) !== cur, { timeout: 15_000 }).toBe(true);
    }
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "decision", { timeout: 15_000 });
    await S.tv("decision");
    await S.tel("decision");
    for (const p of phones) await p.t("decision-vote").click();
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "vote", { timeout: 15_000 });
    await S.tv("vote");
    await S.tel("vote", others[0]!);
    await others[0]!.t(`vote-option-${imp.id}`).click();
    await S.tel("vote-choisi", others[0]!);
    for (const p of others.slice(1)) await p.t(`vote-option-${imp.id}`).click();
    await imp.t(`vote-option-${others[0]!.id}`).click();
    await expect(tv.getByTestId("tv-verdict")).toBeVisible({ timeout: 30_000 });
    await S.tv("verdict");
    await S.tel("verdict", imp);
    await results(party, S);
  });

  test("dessin-rate", async ({ party }) => {
    test.setTimeout(300_000);
    const { phones, S } = await begin(party, "dessin-rate");
    const tv = party.tv;
    const stroke = async (p: Phone, wobble: number) => {
      await expect(p.t("draw-canvas")).toBeVisible({ timeout: 20_000 });
      const box = (await p.t("draw-canvas").boundingBox())!;
      const pts = Array.from({ length: 12 }, (_, i) => [box.x + box.width * (0.1 + i * 0.07), box.y + box.height * (i % 2 ? 0.7 - wobble : 0.3 + wobble)] as const);
      await p.page.mouse.move(...pts[0]!);
      await p.page.mouse.down();
      for (const pt of pts.slice(1)) await p.page.mouse.move(...pt, { steps: 2 });
      await p.page.mouse.up();
    };
    await expect(phones[0].t("draw-canvas")).toBeVisible({ timeout: 20_000 });
    await S.tv("dessin");
    await S.tel("mot");
    await stroke(phones[0], 0);
    await S.tel("dessin");
    await S.tv("dessin-en-direct");
    for (const [i, p] of phones.entries()) if (i > 0) await stroke(p, i * 0.05);
    await expect(tv.getByTestId("tv-dessin")).toHaveAttribute("data-stage", "gallery", { timeout: 60_000 });
    await S.tv("galerie");
    await S.tel("galerie");
    await expect(tv.getByTestId("tv-dessin")).toHaveAttribute("data-stage", "vote", { timeout: 60_000 });
    await S.tv("vote");
    await S.tel("vote");
    await phones[0].t(`vote-card-${phones[1].id}`).click();
    await S.tel("vote-choisi");
    for (const [i, p] of phones.entries()) if (i > 0) await p.t(`vote-card-${phones[(i + 1) % 4]!.id}`).click();
    await expect(tv.getByTestId("dessin-results")).toBeVisible({ timeout: 30_000 });
    await expect(tv.getByTestId("dessin-results")).toHaveAttribute("data-done", "true", { timeout: 45_000 });
    await results(party, S);
  });

  // ───────────── Pause, confirmation, classement final ─────────────

  test("pause, boîte de confirmation, classement final", async ({ party }) => {
    const { phones } = await begin(party, "ceci-ou-cela");
    const tv = party.tv;
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await tv.getByTestId("host-pause").click();
    await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    await expect(phones[0].t("paused-overlay")).toBeVisible();
    await shot(tv, "30-pause-tv");
    await shot(phones[0].page, "31-pause-telephone");
    await tv.getByTestId("host-pause").click();
    await expect(tv.getByTestId("paused-overlay")).toHaveCount(0);
    await tv.getByTestId("host-lobby").click();
    await expect(tv.getByTestId("confirm-dialog")).toBeVisible();
    await shot(tv, "32-confirmation-tv");
    await tv.getByTestId("confirm-no").click();
    await expect(tv.getByTestId("confirm-dialog")).toHaveCount(0);

    await party.answerRound(phones);
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await party.tvDeltas();
    await party.continueAll(phones);
    await expect(tv.getByTestId("tv-final")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId("podium-1")).toContainText(/\d+/, { timeout: 30_000 });
    await shot(tv, "40-final-tv");
    await expect(phones[0].t("phone-final")).toBeVisible();
    await shot(phones[0].page, "41-final-telephone");
    await shot(phones[3].page, "41-final-telephone-dernier");
  });
});
