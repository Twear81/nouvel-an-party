import { describe, expect, it } from "bun:test";
import path from "node:path";
import YAML from "yaml";
import { readFileSync } from "node:fs";
import cultureGenante, { type Pub, type Priv, type Results, type TvPub } from "../../src/minigames/culture-genante/game";
import { draftToValue, formatNumber, pressKey } from "../../src/minigames/culture-genante/number";
import { revealSeconds, statLine } from "../../src/minigames/culture-genante/Reveal";
import { buildCatalog } from "../../src/server/engine/planner";
import { createTestEngine, startRounds } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = cultureGenante;
const accroche = { rigolo: "Haha !", serieux: "Bon." };
const qcm = { texte: "Capitale de l'Australie ?", reponses: ["Canberra", "Sydney"] };
const qcm4 = { texte: "Quel animal ?", reponses: ["Le moustique", "Le requin", "L'hippopotame", "Tonton"] };
const estim = { texte: "En quelle année ?", estimation: 1969, unite: "ans" };
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ accroches: [accroche], questions: [qcm], ...extra });

/** Une manche : start → onPlay, puis on avance jusqu'à l'étape « question ». */
function round(item: any = qcm, nPlayers = 4, cfgExtra: Record<string, unknown> = {}, rng: () => number = () => 0) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers), rng);
  const state = game.start(item, ctx);
  game.onPlay!(state, ctx);
  const toQuestion = () => ctx.advance((cfg.duree_accroche + cfg.duree_bascule) * 1000);
  const pub = () => game.publicView(state, ctx) as Pub;
  const tv = () => game.tvView!(state, ctx) as TvPub;
  /** Index (affiché) du choix dont le libellé est `label`. */
  const idx = (label: string) => (pub().choices ?? []).indexOf(label);
  const answer = (id: string, choice: unknown, ms: unknown = 1000) => game.input(state, id, { choice, ms }, ctx);
  const guess = (id: string, value: unknown) => game.input(state, id, { value }, ctx);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, pub, tv, idx, answer, guess, finish, toQuestion };
}

describe("culture-genante : config", () => {
  it("applique les valeurs par défaut et se déclare interlude", () => {
    const cfg = parse();
    expect(cfg).toMatchObject({ tous_les: 5, duree_accroche: 4, duree_bascule: 2, duree_question: 15, points: { bonne_reponse: 100, bonus_rapidite: 50, estimation_premier: 150, estimation_decroissance: 50 } });
    expect(game.interlude!(cfg)).toBe(5);
    expect(game.interlude!(parse({ tous_les: 3 }))).toBe(3);
    expect(game.roundSeconds(cfg, qcm)).toBeNull();
  });

  it("le catalogue du moteur expose N et pas d'intro dans la durée", () => {
    const cfg = parse();
    const [entry] = buildCatalog([{ game, cfg }], 4);
    expect(entry).toMatchObject({ interlude: 5, secondsPerRound: 4 + 2 + 15 + 8 });
  });

  it("exige au moins une accroche et une question", () => {
    expect(game.configSchema.safeParse({ accroches: [], questions: [qcm] }).success).toBe(false);
    expect(game.configSchema.safeParse({ accroches: [accroche], questions: [] }).success).toBe(false);
  });

  it("une question est un QCM de 2 à 4 réponses OU une estimation entière", () => {
    const ok = (q: unknown) => game.configSchema.safeParse({ accroches: [accroche], questions: [q] }).success;
    expect(ok(qcm)).toBe(true);
    expect(ok(qcm4)).toBe(true);
    expect(ok({ texte: "3 choix", reponses: ["a", "b", "c"] })).toBe(true);
    expect(ok(estim)).toBe(true);
    expect(ok({ texte: "1 choix", reponses: ["a"] })).toBe(false);
    expect(ok({ texte: "5 choix", reponses: ["a", "b", "c", "d", "e"] })).toBe(false);
    expect(ok({ texte: "doublon", reponses: ["a", "A"] })).toBe(false);
    expect(ok({ texte: "ni l'un ni l'autre" })).toBe(false);
    expect(ok({ texte: "les deux", reponses: ["a", "b"], estimation: 3 })).toBe(false);
    expect(ok({ texte: "décimal", estimation: 1.5 })).toBe(false);
    expect(ok({ texte: "négatif", estimation: -4 })).toBe(false);
    expect(ok({ texte: "trop grand", estimation: 1e12 })).toBe(false);
  });

  it("refuse un média hors du dossier medias", () => {
    for (const image of ["../x.png", "/etc/passwd", "C:\\x.png", "https://x/y.png"]) {
      expect(game.configSchema.safeParse({ accroches: [{ ...accroche, image }], questions: [qcm] }).success).toBe(false);
    }
    expect(game.configSchema.safeParse({ accroches: [{ ...accroche, image: "fete.jpg", son: "rires.mp3" }], questions: [qcm] }).success).toBe(true);
  });

  it("le vrai config/minijeux/culture-genante.yaml est valide, sans doublon", () => {
    const raw = YAML.parse(readFileSync(path.resolve(import.meta.dir, "../../config/minijeux/culture-genante.yaml"), "utf8"));
    delete raw.actif;
    const cfg = game.configSchema.parse(raw);
    expect(cfg.questions.length).toBeGreaterThanOrEqual(30);
    expect(cfg.accroches.length).toBeGreaterThanOrEqual(12);
    expect(new Set(cfg.questions.map((q) => q.texte)).size).toBe(cfg.questions.length);
  });
});

describe("culture-genante : étapes", () => {
  it("accroche → bascule → question, chacune avec son chrono, puis fin de manche", () => {
    const r = round();
    expect(r.pub().stage).toBe("accroche");
    expect(r.ctx.countdownState!.seconds).toBe(4);
    r.ctx.advance(3999);
    expect(r.pub().stage).toBe("accroche");
    r.ctx.advance(1);
    expect(r.pub().stage).toBe("bascule");
    expect(r.ctx.countdownState!.seconds).toBe(2);
    r.ctx.advance(2000);
    expect(r.pub().stage).toBe("question");
    expect(r.ctx.countdownState!.seconds).toBe(15);
    expect(r.ctx.ended).toBe(false);
    r.ctx.advance(15_000);
    expect(r.ctx.ended).toBe(true);
  });

  it("la durée d'une question peut être surchargée", () => {
    const r = round({ ...qcm, duree: 40 });
    r.toQuestion();
    expect(r.ctx.countdownState!.seconds).toBe(40);
  });

  it("rien ne fuit avant l'étape question (ni question, ni choix, ni bonne réponse)", () => {
    const r = round();
    expect(r.pub()).toMatchObject({ stage: "accroche", question: null, choices: null });
    r.ctx.advance(4000);
    expect(r.pub()).toMatchObject({ stage: "bascule", question: null, choices: null });
    r.toQuestion();
    const p = r.pub();
    expect(p.question).toBe(qcm.texte);
    expect([...p.choices!].sort()).toEqual(["Canberra", "Sydney"]);
    // La bonne réponse n'est jamais dans une vue publique, TV comprise.
    for (const view of [p, r.tv()]) expect(JSON.stringify(view)).not.toMatch(/correct/i);
  });

  it("la vue TV ajoute l'accroche et les durées, pas la vue des téléphones", () => {
    const r = round({ ...qcm, accroche: { rigolo: "Spécial", serieux: "Sérieux", image: "a.png" } });
    expect(r.tv()).toMatchObject({ accroche: { rigolo: "Spécial", serieux: "Sérieux", image: "a.png", son: null }, accrocheS: 4, basculeS: 2 });
    expect((r.pub() as any).accroche).toBeUndefined();
  });

  it("tire l'accroche au hasard dans la liste (avec ctx.rng)", () => {
    const accroches = [accroche, { rigolo: "B", serieux: "b" }, { rigolo: "C", serieux: "c" }];
    expect(round(qcm, 3, { accroches }, () => 0).tv().accroche.rigolo).toBe("Haha !");
    expect(round(qcm, 3, { accroches }, () => 0.5).tv().accroche.rigolo).toBe("B");
    expect(round(qcm, 3, { accroches }, () => 0.99).tv().accroche.rigolo).toBe("C");
  });

  it("mélange l'ordre des choix avec ctx.rng et retrouve la bonne réponse", () => {
    for (const rng of [() => 0, () => 0.3, () => 0.6, () => 0.99]) {
      const r = round(qcm4, 4, {}, rng);
      r.toQuestion();
      expect([...r.pub().choices!].sort()).toEqual([...qcm4.reponses].sort());
      r.answer("p1", r.idx("Le moustique"));
      expect(r.finish().scores.p1).toBeGreaterThan(0);
    }
    const shuffled = new Set([0.1, 0.4, 0.7, 0.95].map((x) => { const r = round(qcm4, 4, {}, () => x); r.toQuestion(); return String(r.pub().choices); }));
    expect(shuffled.size).toBeGreaterThan(1);
  });
});

describe("culture-genante : QCM", () => {
  it("ignore les réponses avant l'étape question", () => {
    const r = round();
    r.answer("p1", 0);
    r.ctx.advance(4000);
    r.answer("p1", 0);
    r.toQuestion();
    expect(r.pub().answeredIds).toEqual([]);
  });

  it("ignore les payloads invalides", () => {
    const r = round(qcm4);
    r.toQuestion();
    for (const payload of [null, undefined, "1", 1, {}, { choice: "0", ms: 1 }, { choice: 1.5, ms: 1 }, { choice: -1, ms: 1 }, { choice: 4, ms: 1 }, { choice: NaN, ms: 1 }, { choice: 0 }, { choice: 0, ms: "1" }, { choice: 0, ms: NaN }, { choice: 0, ms: Infinity }, { choice: [0], ms: 1 }]) {
      game.input(r.state, "p1", payload, r.ctx);
    }
    expect(r.pub().answeredIds).toEqual([]);
    expect(r.ctx.ended).toBe(false);
  });

  it("la première réponse est définitive", () => {
    const r = round(qcm4);
    r.toQuestion();
    const good = r.idx("Le moustique");
    const bad = r.idx("Le requin");
    r.answer("p1", bad);
    r.answer("p1", good);
    expect((game.privateView!(r.state, "p1", r.ctx) as Priv)).toEqual({ choice: bad, value: null });
    expect(r.finish().scores.p1).toBe(0);
  });

  it("bonne réponse = 100 + bonus de rapidité décroissant, mauvaise ou rien = 0", () => {
    const r = round(qcm4, 5);
    r.toQuestion();
    const good = r.idx("Le moustique");
    const bad = r.idx("Le requin");
    r.answer("p1", good, 0); // instantané : 100 + 50
    r.answer("p2", good, 7500); // la moitié du temps : 100 + 25
    r.answer("p3", good, 15_000); // à la dernière seconde : 100
    r.answer("p4", bad, 100); // faux
    const { scores, results } = r.finish();
    expect(scores).toEqual({ p1: 150, p2: 125, p3: 100, p4: 0 });
    const res = results as Results;
    expect(res).toMatchObject({ kind: "qcm", right: 3, total: 5, missingIds: ["p5"] });
    // Bonnes réponses d'abord, les plus rapides en tête.
    expect(res.answers.map((a) => a.playerId)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(res.correctIndex).toBe(good);
    expect(res.choices[res.correctIndex!]).toBe("Le moustique");
  });

  it("le temps mesuré est borné à [0, durée] (valeur délirante ou négative)", () => {
    const r = round(qcm, 4);
    r.toQuestion();
    const good = r.idx("Canberra");
    r.answer("p1", good, -5000); // négatif : traité comme instantané, jamais plus de 150
    r.answer("p2", good, 9e9); // énorme : traité comme la fin du temps
    const { scores } = r.finish();
    expect(scores).toEqual({ p1: 150, p2: 100 });
  });

  it("les points suivent la config", () => {
    const r = round(qcm, 3, { points: { bonne_reponse: 10, bonus_rapidite: 0 } });
    r.toQuestion();
    r.answer("p1", r.idx("Canberra"), 0);
    expect(r.finish().scores).toEqual({ p1: 10 });
  });

  it("fin anticipée quand tous les connectés ont répondu (et un déconnecté ne bloque pas)", () => {
    const r = round(qcm, 3);
    r.toQuestion();
    r.ctx.setConnected("p3", false);
    r.answer("p1", 0);
    expect(r.ctx.ended).toBe(false);
    r.answer("p2", 1);
    expect(r.ctx.ended).toBe(true);
    // Le déconnecté reste compté comme « sans réponse ».
    expect((r.finish().results as Results).missingIds).toEqual(["p3"]);
  });

  it("onPresenceChange : le dernier à répondre se déconnecte → la manche s'arrête", () => {
    const r = round(qcm, 3);
    r.toQuestion();
    r.answer("p1", 0);
    r.answer("p2", 0);
    expect(r.ctx.ended).toBe(false);
    r.ctx.setConnected("p3", false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.ctx.ended).toBe(true);
  });

  it("pas de fin anticipée pendant l'accroche, même si tout le monde est absent", () => {
    const r = round(qcm, 2);
    r.ctx.setConnected("p1", false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.ctx.ended).toBe(false);
  });

  it("personne n'a répondu : zéro point pour tout le monde", () => {
    const r = round(qcm, 3);
    r.toQuestion();
    r.ctx.advance(15_000);
    const { scores, results } = r.finish();
    expect(scores).toEqual({});
    expect(results).toMatchObject({ right: 0, total: 3, missingIds: ["p1", "p2", "p3"], answers: [] });
  });

  it("une manche terminée pendant l'accroche (« Passer ») se termine proprement", () => {
    const r = round(qcm, 3);
    const { scores, results } = r.finish();
    expect(scores).toEqual({});
    expect((results as Results).answers).toEqual([]);
  });
});

describe("culture-genante : estimation", () => {
  it("la vue publique indique l'estimation et l'unité, jamais la valeur", () => {
    const r = round(estim);
    r.toQuestion();
    expect(r.pub()).toMatchObject({ kind: "estimation", choices: null, unit: "ans", question: estim.texte });
    expect(JSON.stringify(r.pub())).not.toContain("1969");
  });

  it("ignore les payloads invalides", () => {
    const r = round(estim);
    r.toQuestion();
    for (const payload of [null, {}, { value: "1969" }, { value: 1969.5 }, { value: -1 }, { value: NaN }, { value: Infinity }, { value: 1e12 }, { choice: 0, ms: 1 }]) {
      game.input(r.state, "p1", payload, r.ctx);
    }
    expect(r.pub().answeredIds).toEqual([]);
  });

  it("le plus proche gagne ; 150, 100, 50, 0… ; ex æquo = même rang (1, 2, 2, 4, 5)", () => {
    const r = round(estim, 6);
    r.toQuestion();
    r.guess("p1", 1969); // pile
    r.guess("p2", 1960); // écart 9
    r.guess("p3", 1978); // écart 9 : ex æquo avec p2
    r.guess("p4", 1900); // écart 69
    r.guess("p5", 0); // écart 1969
    const { scores, results } = r.finish();
    expect(scores).toEqual({ p1: 150, p2: 100, p3: 100, p4: 0, p5: 0 });
    const res = results as Results;
    expect(res.answers.map((a) => [a.playerId, a.rank, a.gap])).toEqual([["p1", 1, 0], ["p2", 2, 9], ["p3", 2, 9], ["p4", 4, 69], ["p5", 5, 1969]]);
    expect(res).toMatchObject({ kind: "estimation", value: 1969, unit: "ans", missingIds: ["p6"] });
  });

  it("les ex æquo au 1er rang gagnent tous les points du 1er", () => {
    const r = round(estim, 3);
    r.toQuestion();
    r.guess("p1", 1970);
    r.guess("p2", 1968);
    expect(r.finish().scores).toEqual({ p1: 150, p2: 150 });
  });

  it("fin anticipée à la dernière estimation", () => {
    const r = round(estim, 2);
    r.toQuestion();
    r.guess("p1", 1);
    expect(r.ctx.ended).toBe(false);
    r.guess("p2", 2);
    expect(r.ctx.ended).toBe(true);
  });

  it("une seule estimation par joueur", () => {
    const r = round(estim, 3);
    r.toQuestion();
    r.guess("p1", 1969);
    r.guess("p1", 1);
    expect(r.finish().scores.p1).toBe(150);
  });
});

describe("culture-genante : textes de révélation et pavé", () => {
  const base: Results = { kind: "qcm", question: "?", choices: ["a", "b"], correctIndex: 0, value: null, unit: "", comment: null, answers: [], missingIds: [], right: 0, total: 7 };
  const ans = (n: number) => Array.from({ length: n }, (_, i) => ({ playerId: `p${i}`, choice: 0, value: null, ms: 1000, correct: true, gap: null, rank: null, points: 100 }));

  it("la stat gênante", () => {
    expect(statLine(base)).toContain("Personne n'a répondu");
    expect(statLine({ ...base, answers: ans(3), right: 0 })).toContain("Personne n'a trouvé");
    expect(statLine({ ...base, answers: ans(7), right: 7 })).toContain("Tout le monde a trouvé");
    expect(statLine({ ...base, answers: ans(7), right: 2 })).toBe("2 / 7 ont trouvé.");
    const est: Results = { ...base, kind: "estimation", value: 10, unit: "ans", answers: [{ ...ans(1)[0]!, value: 12, gap: 2, rank: 1 }] };
    expect(statLine(est)).toBe("Le plus proche était à 2 ans près.");
    expect(statLine({ ...est, answers: [{ ...est.answers[0]!, gap: 0 }] })).toContain("Pile");
  });

  it("revealSeconds grandit avec le nombre de réponses", () => {
    expect(revealSeconds({ ...base, answers: ans(2) })).toBeLessThan(revealSeconds({ ...base, answers: ans(8) }));
  });

  it("pavé numérique : 9 chiffres max, pas de zéro en tête, effacer", () => {
    expect(pressKey("", "1")).toBe("1");
    expect(pressKey("0", "5")).toBe("5");
    expect(pressKey("12", "back")).toBe("1");
    expect(pressKey("", "back")).toBe("");
    expect(pressKey("123456789", "0")).toBe("123456789");
    expect(pressKey("1", ",")).toBe("1");
    expect(draftToValue("")).toBeNull();
    expect(draftToValue("1969")).toBe(1969);
    expect(formatNumber(1969)).toBe("1969");
    expect(formatNumber(12000)).toBe("12\u202f000");
  });
});

describe("culture-genante : dans le moteur", () => {
  it("se joue comme un interlude : directement en jeu, accroche puis résultats avec points", () => {
    const cfg = parse({ duree_accroche: 1, duree_bascule: 1, duree_question: 5 });
    const t = createTestEngine({ games: [{ game, cfg }] });
    t.engine.setSetup({ counts: { "culture-genante": 1 } });
    startRounds(t.engine);
    let s = t.engine.snapshot(null);
    expect(s).toMatchObject({ phase: "playing", round: { interlude: true, gameId: "culture-genante" } });
    expect((s.round!.public as TvPub).stage).toBe("accroche");
    expect((t.engine.snapshot(t.ids[0]!).round!.public as any).accroche).toBeUndefined();
    t.clock.advance(2000);
    s = t.engine.snapshot(t.ids[0]!);
    expect((s.round!.public as Pub).stage).toBe("question");
    const pub = s.round!.public as Pub;
    t.engine.input(t.ids[0]!, { choice: pub.choices!.indexOf("Canberra"), ms: 0 });
    t.clock.advance(5000);
    s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [t.ids[0]!]: 150 });
  });
});

describe("culture-genante : progress", () => {
  it("null pendant l'accroche, puis compte les réponses de l'étape question", () => {
    const r = round(qcm, 4);
    expect(game.progress!(r.state, r.ctx)).toBeNull();
    r.toQuestion();
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 0, expected: 4 });
    r.answer("p1", 0);
    r.answer("p2", 1);
    r.ctx.setConnected("p4", false);
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 2, expected: 4 });
  });
});
