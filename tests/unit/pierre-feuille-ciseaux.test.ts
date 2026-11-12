import { describe, expect, it } from "bun:test";
import game, { TIMINGS, type Priv, type Pub, type Results } from "../../src/minigames/pierre-feuille-ciseaux/game";
import {
  advanceWinners,
  applyThrow,
  beats,
  bracketSize,
  buildBracket,
  championOf,
  completeBracket,
  judgeThrow,
  pendingDuels,
  roundLabel,
  tournamentScores,
} from "../../src/minigames/pierre-feuille-ciseaux/bracket";
import { createTestEngine, startRounds } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";
import { seededRng } from "./helpers/rng";

const ROCK = 0;
const PAPER = 1;
const SCISSORS = 2;
const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const rules = { winsNeeded: 1, maxReplays: 3 };

describe("pfc : règles", () => {
  it("feuille bat pierre, ciseaux bat feuille, pierre bat ciseaux", () => {
    expect(beats(PAPER, ROCK)).toBe(true);
    expect(beats(SCISSORS, PAPER)).toBe(true);
    expect(beats(ROCK, SCISSORS)).toBe(true);
    expect(beats(ROCK, PAPER)).toBe(false);
    expect(beats(ROCK, ROCK)).toBe(false);
  });

  it("un seul a joué : il gagne ; personne : hasard", () => {
    expect(judgeThrow(ROCK, null, () => 0.9)).toEqual({ result: "a", random: false });
    expect(judgeThrow(null, PAPER, () => 0.1)).toEqual({ result: "b", random: false });
    expect(judgeThrow(null, null, () => 0.1)).toEqual({ result: "a", random: true });
    expect(judgeThrow(null, null, () => 0.9)).toEqual({ result: "b", random: true });
    expect(judgeThrow(ROCK, ROCK, () => 0.5).result).toBe("tie");
  });
});

describe("pfc : tirage de l'arbre", () => {
  it("taille = puissance de 2 suivante", () => {
    expect([2, 3, 4, 5, 8, 9, 16].map(bracketSize)).toEqual([2, 4, 4, 8, 8, 16, 16]);
  });

  for (let n = 2; n <= 9; n++) {
    it(`${n} joueurs : bon nombre de tours, d'exempts, chacun placé une fois`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const b = buildBracket(ids(n), seededRng(seed));
        const size = bracketSize(n);
        expect(b.length).toBe(Math.log2(size));
        expect(b[0]!.length).toBe(size / 2);
        const byes = b[0]!.filter((d) => d.bye);
        expect(byes.length).toBe(size - n);
        // Les exempts sont déjà qualifiés ; les autres duels ont deux joueurs.
        for (const d of b[0]!) {
          if (d.bye) expect(d).toMatchObject({ b: null, winner: d.a });
          else expect(d).toMatchObject({ winner: null });
          expect(d.a).not.toBeNull();
        }
        const placed = b[0]!.flatMap((d) => [d.a, d.b]).filter((x) => x !== null);
        expect(placed.sort()).toEqual(ids(n).sort());
        // Au moins un duel à jouer au 1er tour.
        expect(pendingDuels(b, 0).length).toBeGreaterThanOrEqual(1);
        // Les exempts sont déjà placés dans le tour suivant.
        for (const [i, d] of b[0]!.entries()) if (d.bye) expect(b[1]![Math.floor(i / 2)]![i % 2 === 0 ? "a" : "b"]).toBe(d.a);
      }
    });
  }

  it("6 joueurs : 2 exempts dans deux duels différents, un joueur ne peut avoir un exempt et un adversaire", () => {
    const b = buildBracket(ids(6), seededRng(7));
    expect(b[0]!.filter((d) => d.bye)).toHaveLength(2);
    expect(b[0]!.filter((d) => d.b !== null)).toHaveLength(2);
  });

  it("le hasard change qui est exempt", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const b = buildBracket(ids(5), seededRng(seed));
      for (const d of b[0]!) if (d.bye) seen.add(d.a!);
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it("moins de 2 joueurs : pas d'arbre", () => {
    expect(buildBracket([], () => 0.5)).toEqual([]);
    expect(buildBracket(["p1"], () => 0.5)).toEqual([]);
  });
});

describe("pfc : lancers, égalités, avancement", () => {
  it("un lancer gagnant décide le duel (meilleur des 1)", () => {
    const b = buildBracket(ids(2), () => 0.5);
    const d = b[0]![0]!;
    const rec = applyThrow(d, PAPER, ROCK, rules, () => 0.5);
    expect(rec.result).toBe("a");
    expect(d.winner).toBe(d.a);
    expect(d.wins).toEqual([1, 0]);
  });

  it("égalité : pas de gagnant, on rejoue ; au-delà de rejouer_max, tirage au sort", () => {
    const d = buildBracket(ids(2), () => 0.5)[0]![0]!;
    for (let i = 0; i < 3; i++) {
      applyThrow(d, ROCK, ROCK, rules, () => 0.1);
      expect(d.winner).toBeNull();
    }
    expect(d.ties).toBe(3);
    applyThrow(d, ROCK, ROCK, rules, () => 0.9); // 4e égalité : plus de rejeu
    expect(d.winner).toBe(d.b);
    expect(d.byChance).toBe(true);
  });

  it("rejouer_max = 0 : la première égalité est tranchée au sort", () => {
    const d = buildBracket(ids(2), () => 0.5)[0]![0]!;
    applyThrow(d, SCISSORS, SCISSORS, { winsNeeded: 1, maxReplays: 0 }, () => 0.1);
    expect(d.winner).toBe(d.a);
  });

  it("2 manches gagnantes : il faut gagner deux lancers, les égalités ne comptent pas", () => {
    const d = buildBracket(ids(2), () => 0.5)[0]![0]!;
    const r2 = { winsNeeded: 2, maxReplays: 3 };
    applyThrow(d, PAPER, ROCK, r2, () => 0.5);
    expect(d.winner).toBeNull();
    applyThrow(d, ROCK, ROCK, r2, () => 0.5);
    applyThrow(d, ROCK, PAPER, r2, () => 0.5); // 1-1
    expect(d.winner).toBeNull();
    expect(d.wins).toEqual([1, 1]);
    applyThrow(d, SCISSORS, PAPER, r2, () => 0.5);
    expect(d.winner).toBe(d.a);
  });

  it("non-réponse : l'autre gagne ; personne : hasard compté comme un point", () => {
    const d = buildBracket(ids(2), () => 0.5)[0]![0]!;
    expect(applyThrow(d, null, SCISSORS, rules, () => 0.5).result).toBe("b");
    expect(d.winner).toBe(d.b);
    const e = buildBracket(ids(2), () => 0.5)[0]![0]!;
    const rec = applyThrow(e, null, null, rules, () => 0.2);
    expect(rec).toMatchObject({ result: "a", random: true });
    expect(e.winner).toBe(e.a);
  });

  it("les gagnants avancent dans le bon duel et la bonne place", () => {
    const b = buildBracket(ids(8), seededRng(3));
    for (const d of b[0]!) applyThrow(d, PAPER, ROCK, rules, () => 0.5);
    advanceWinners(b, 0);
    b[0]!.forEach((d, i) => expect(b[1]![Math.floor(i / 2)]![i % 2 === 0 ? "a" : "b"]).toBe(d.winner));
    expect(pendingDuels(b, 1)).toHaveLength(2);
  });

  it("un tournoi entier (2..9 joueurs) a un champion et un seul", () => {
    for (let n = 2; n <= 9; n++) {
      const b = buildBracket(ids(n), seededRng(n));
      for (let r = 0; r < b.length; r++) {
        for (const { duel } of pendingDuels(b, r)) applyThrow(duel, PAPER, ROCK, rules, () => 0.5);
        advanceWinners(b, r);
      }
      const champ = championOf(b);
      expect(champ).not.toBeNull();
      expect(ids(n)).toContain(champ!);
      // Le champion a gagné dans chaque tour où il a joué (exempt ou duel).
      expect(b.every((round) => round.every((d) => d.winner !== null))).toBe(true);
    }
  });

  it("completeBracket termine au hasard un tournoi inachevé", () => {
    const b = buildBracket(ids(6), seededRng(11));
    completeBracket(b, seededRng(1));
    expect(championOf(b)).not.toBeNull();
  });
});

describe("pfc : points", () => {
  const play = (n: number) => {
    const b = buildBracket(ids(n), seededRng(n + 100));
    for (let r = 0; r < b.length; r++) {
      for (const { duel } of pendingDuels(b, r)) applyThrow(duel, PAPER, ROCK, rules, () => 0.5);
      advanceWinners(b, r);
    }
    return b;
  };

  it("8 joueurs : 300 / 150 / 75 x2 / 25 x4", () => {
    const scores = tournamentScores(play(8), 300, [150, 75, 25]);
    expect(Object.values(scores).sort((a, b) => b - a)).toEqual([300, 150, 75, 75, 25, 25, 25, 25]);
  });

  it("6 joueurs : les exempts comptent leur tour d'office (jamais moins que le tour atteint)", () => {
    const b = play(6);
    const scores = tournamentScores(b, 300, [150, 75, 25]);
    expect(Object.keys(scores)).toHaveLength(6);
    expect(Math.max(...Object.values(scores))).toBe(300);
    expect(Object.values(scores).filter((s) => s === 150)).toHaveLength(1);
    expect(Object.values(scores).filter((s) => s === 75)).toHaveLength(2);
    // Les 2 autres sont battus en quart (25), ou exempts battus en demi (75) : jamais plus de 6 au total.
    expect(Object.values(scores).filter((s) => s === 25)).toHaveLength(2);
  });

  it("2 joueurs : champion et finaliste", () => {
    expect(Object.values(tournamentScores(play(2), 300, [150, 75, 25])).sort()).toEqual([150, 300]);
  });

  it("liste plus courte que la profondeur : 0 pour les éliminés plus tôt", () => {
    const scores = tournamentScores(play(8), 300, [150]);
    expect(Object.values(scores).sort((a, b) => b - a)).toEqual([300, 150, 0, 0, 0, 0, 0, 0]);
  });

  it("noms des tours", () => {
    expect([1, 2, 3].map((r) => roundLabel(3, r - 1))).toEqual(["Quarts de finale", "Demi-finales", "Finale"]);
  });
});

// ───────────── Mini-jeu (ctx simulé) ─────────────

const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse(extra);

function setup(n: number, cfgExtra: Record<string, unknown> = {}, seed = 5) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(n), seededRng(seed));
  const item = game.items(cfg)[0]!;
  const state = game.start(item, ctx);
  game.onPlay!(state, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  const priv = (id: string) => game.privateView!(state, id, ctx) as Priv;
  const pick = (id: string, choice: unknown) => game.input(state, id, { choice }, ctx);
  /** Le gagnant de chaque duel actif est celui qui a l'id le plus petit (il joue pierre, l'autre ciseaux). */
  const playRound = () => {
    for (const m of pub().bracket[pub().round]!) {
      if (!m.active) continue;
      const [lo, hi] = [m.a!, m.b!].sort();
      pick(lo!, ROCK);
      pick(hi!, SCISSORS);
    }
  };
  return { cfg, ctx, state, pub, priv, pick, playRound };
}

describe("pfc : config", () => {
  it("valeurs par défaut et 2 variantes", () => {
    const cfg = parse();
    expect(cfg).toMatchObject({ duree: 10, rejouer_max: 3, manches_gagnantes: 1, points: { vainqueur: 300, suivants: [150, 75, 25] } });
    const items = game.items(cfg);
    expect(items.map((i) => i.winsNeeded)).toEqual([1, 2]);
    expect(game.roundSeconds(cfg, items[0]!)).toBeNull();
  });
  it("variante qui surcharge la durée", () => {
    const cfg = parse({ variantes: [{ nom: "x", duree: 4, manches_gagnantes: 3 }] });
    expect(game.items(cfg)).toEqual([{ title: "x", winsNeeded: 3, duration: 4 }]);
  });
  it("refuse des variantes vides ou des valeurs invalides", () => {
    expect(game.configSchema.safeParse({ variantes: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({ duree: 0 }).success).toBe(false);
  });
});

describe("pfc : déroulé d'une manche (6 joueurs)", () => {
  it("tirage, puis lancer avec chrono, choix cachés jusqu'à la révélation", () => {
    const t = setup(6);
    expect(t.pub().step).toBe("draw");
    expect(t.pub().roundCount).toBe(3);
    expect(t.ctx.countdownState).toBeNull();
    t.ctx.advance(TIMINGS.draw);
    expect(t.pub().step).toBe("pick");
    expect(t.ctx.countdownState!.seconds).toBe(10);
    const duel = t.pub().bracket[0]!.find((m) => m.active)!;
    t.pick(duel.a!, ROCK);
    const after = t.pub().bracket[0]!.find((m) => m.active)!;
    expect(after.picked).toEqual([true, false]);
    expect(JSON.stringify(t.pub())).not.toContain('"myPick"');
    // Le choix n'apparaît dans aucune vue publique ni dans la vue d'un autre joueur.
    expect(t.pub().bracket[0]!.every((m) => m.last === null)).toBe(true);
    expect(t.priv(duel.a!).myPick).toBe(ROCK);
    expect(t.priv(duel.b!).myPick).toBeNull();
  });

  it("entrées invalides ignorées : mauvais choix, hors duel, exempt, deuxième choix, mauvaise étape", () => {
    const t = setup(6);
    t.pick("p1", ROCK); // étape "draw"
    t.ctx.advance(TIMINGS.draw);
    const duel = t.pub().bracket[0]!.find((m) => m.active)!;
    const bye = t.pub().bracket[0]!.find((m) => m.bye)!;
    for (const bad of [3, -1, "0", null, undefined, 1.5, {}, [0]]) t.pick(duel.a!, bad);
    t.pick(bye.a!, ROCK);
    t.pick("inconnu", ROCK);
    game.input(t.state, duel.a!, null, t.ctx);
    game.input(t.state, duel.a!, "pierre", t.ctx);
    expect(t.pub().bracket[0]!.flatMap((m) => m.picked)).toEqual(t.pub().bracket[0]!.map(() => [false, false]).flat());
    t.pick(duel.a!, ROCK);
    t.pick(duel.a!, PAPER); // verrouillé
    expect(t.priv(duel.a!).myPick).toBe(ROCK);
  });

  it("présence : un duel dont un joueur est déconnecté se révèle dès que l'autre a choisi", () => {
    const t = setup(6);
    t.ctx.advance(TIMINGS.draw);
    const duels = t.pub().bracket[0]!.filter((m) => m.active);
    // Tous les duels répondent sauf le dernier, dont l'un des joueurs part.
    for (const m of duels.slice(0, -1)) {
      t.pick(m.a!, ROCK);
      t.pick(m.b!, ROCK);
    }
    const last = duels.at(-1)!;
    t.ctx.setConnected(last.b!, false);
    t.pick(last.a!, ROCK);
    expect(t.pub().step).toBe("reveal");
  });

  it("présence : la déconnexion du dernier joueur attendu déclenche la révélation", () => {
    const t = setup(6);
    t.ctx.advance(TIMINGS.draw);
    const duels = t.pub().bracket[0]!.filter((m) => m.active);
    for (const m of duels) t.pick(m.a!, ROCK);
    expect(t.pub().step).toBe("pick");
    for (const m of duels) t.ctx.setConnected(m.b!, false);
    game.onPresenceChange!(t.state, t.ctx);
    expect(t.pub().step).toBe("reveal");
  });

  it("tout le monde a choisi : révélation immédiate, puis avancée, puis tour suivant", () => {
    const t = setup(6);
    t.ctx.advance(TIMINGS.draw);
    t.playRound();
    expect(t.pub().step).toBe("reveal");
    expect(t.ctx.countdownState).toBeNull();
    const revealed = t.pub().bracket[0]!.filter((m) => m.last);
    expect(revealed).toHaveLength(2);
    expect(revealed.every((m) => m.winner === [m.a!, m.b!].sort()[0])).toBe(true);
    t.ctx.advance(TIMINGS.reveal);
    expect(t.pub().step).toBe("advance");
    expect(t.pub().bracket[0]!.every((m) => m.last === null)).toBe(true);
    t.ctx.advance(TIMINGS.advance);
    expect(t.pub().step).toBe("pick");
    expect(t.pub().round).toBe(1);
    expect(t.pub().bracket[1]!.filter((m) => m.active)).toHaveLength(2);
  });

  it("jusqu'au champion : la manche se termine toute seule, points corrects", () => {
    const t = setup(6);
    t.ctx.advance(TIMINGS.draw);
    for (let r = 0; r < 3; r++) {
      t.playRound();
      t.ctx.advance(r === 2 ? TIMINGS.revealFinal : TIMINGS.reveal);
      if (r < 2) t.ctx.advance(TIMINGS.advance);
    }
    expect(t.pub().step).toBe("done");
    expect(t.pub().champion).not.toBeNull();
    expect(t.ctx.ended).toBe(false);
    t.ctx.advance(TIMINGS.champion);
    expect(t.ctx.ended).toBe(true);
    const { results, scores } = game.finish(t.state, t.ctx);
    const res = results as Results;
    expect(res.champion).toBe(t.pub().champion);
    expect(scores[res.champion!]).toBe(300);
    expect(Object.values(scores).sort((a, b) => b - a)).toEqual([300, 150, 75, 75, 25, 25].slice(0, 6).sort((a, b) => b - a));
    expect(t.priv(res.champion!).status).toBe("champion");
  });

  it("égalité : seul le duel à égalité rejoue, avec le chrono court ; les autres attendent", () => {
    const t = setup(4);
    t.ctx.advance(TIMINGS.draw);
    const [m1, m2] = t.pub().bracket[0]!;
    t.pick(m1!.a!, ROCK);
    t.pick(m1!.b!, ROCK); // égalité
    t.pick(m2!.a!, PAPER);
    t.pick(m2!.b!, ROCK);
    expect(t.pub().step).toBe("reveal");
    expect(t.pub().bracket[0]![0]!.last!.result).toBe("tie");
    t.ctx.advance(TIMINGS.reveal);
    expect(t.pub().step).toBe("pick");
    expect(t.pub().round).toBe(0);
    expect(t.pub().throwNo).toBe(1);
    expect(t.ctx.countdownState!.seconds).toBe(6);
    const actives = t.pub().bracket[0]!.map((m) => m.active);
    expect(actives).toEqual([true, false]);
    expect(t.pub().bracket[0]![0]!.ties).toBe(1);
    // Le duel décidé n'accepte plus de choix.
    t.pick(m2!.a!, ROCK);
    expect(t.pub().bracket[0]![1]!.picked).toEqual([false, false]);
    t.pick(m1!.a!, PAPER);
    t.pick(m1!.b!, ROCK);
    t.ctx.advance(TIMINGS.reveal);
    expect(t.pub().round).toBe(0);
    t.ctx.advance(TIMINGS.advance);
    expect(t.pub().round).toBe(1);
  });

  it("égalités sans fin : après rejouer_max rejeux, le sort décide", () => {
    const t = setup(2, { rejouer_max: 2 });
    t.ctx.advance(TIMINGS.draw);
    for (let i = 0; i < 3; i++) {
      t.pick("p1", ROCK);
      t.pick("p2", ROCK);
      t.ctx.advance(TIMINGS.revealFinal);
    }
    const m = t.pub().bracket[0]![0]!;
    expect(m.winner).not.toBeNull();
    expect(m.byChance).toBe(true);
  });

  it("temps écoulé : celui qui a joué gagne ; personne n'a joué : hasard ; les exempts avancent", () => {
    const t = setup(4);
    t.ctx.advance(TIMINGS.draw);
    const [m1, m2] = t.pub().bracket[0]!;
    t.pick(m1!.a!, PAPER); // m1.b ne joue pas
    t.ctx.advance(10_000);
    expect(t.pub().step).toBe("reveal");
    expect(t.pub().bracket[0]![0]!.winner).toBe(m1!.a!);
    expect(m2!.winner).toBeNull(); // m2 : personne n'a joué
    expect(t.pub().bracket[0]![1]!.winner).not.toBeNull();
    expect(t.pub().bracket[0]![1]!.last!.random).toBe(true);
  });

  it("2 manches gagnantes : le duel continue après un premier lancer", () => {
    const t = setup(2, { manches_gagnantes: 2 });
    t.ctx.advance(TIMINGS.draw);
    t.pick("p1", PAPER);
    t.pick("p2", ROCK);
    const m = t.pub().bracket[0]![0]!;
    expect(m.wins[m.a === "p1" ? 0 : 1]).toBe(1);
    expect(m.winner).toBeNull();
    t.ctx.advance(TIMINGS.revealFinal);
    expect(t.pub().step).toBe("pick");
    expect(t.pub().throwNo).toBe(1);
    expect(t.pub().winsNeeded).toBe(2);
    t.pick("p1", PAPER);
    t.pick("p2", ROCK);
    t.ctx.advance(TIMINGS.revealFinal);
    expect(t.pub().champion).toBe("p1");
  });

  it("vue privée : adversaire, exempt, éliminé, hors tournoi", () => {
    const t = setup(6);
    t.ctx.advance(TIMINGS.draw);
    const b0 = t.pub().bracket[0]!;
    const duel = b0.find((m) => m.active)!;
    const bye = b0.find((m) => m.bye)!;
    expect(t.priv(duel.a!)).toMatchObject({ status: "duel", opponent: duel.b, side: 0 });
    expect(t.priv(duel.b!)).toMatchObject({ status: "duel", opponent: duel.a, side: 1 });
    expect(t.priv(bye.a!)).toMatchObject({ status: "through", bye: true });
    expect(t.priv("inconnu").status).toBe("none");
    t.playRound();
    const loser = [duel.a!, duel.b!].sort()[1]!;
    expect(t.priv(loser)).toMatchObject({ status: "out", outRound: 0 });
  });

  it("« Passer » en cours de tournoi : finish complète l'arbre au hasard avec des points cohérents", () => {
    const t = setup(5);
    t.ctx.advance(TIMINGS.draw + 1000);
    const { results, scores } = game.finish(t.state, t.ctx);
    expect((results as Results).champion).not.toBeNull();
    expect(Object.values(scores).sort((a, b) => b - a)[0]).toBe(300);
    expect(Object.keys(scores)).toHaveLength(5);
  });

  it("1 seul joueur : rien à jouer, la manche se termine", () => {
    const t = setup(1);
    expect(t.pub().roundCount).toBe(0);
    t.ctx.advance(2000);
    expect(t.ctx.ended).toBe(true);
    expect(game.finish(t.state, t.ctx).scores).toEqual({});
  });
});

describe("pfc : à travers le moteur", () => {
  it("une manche complète avec 3 joueurs : points cumulés et vue privée", () => {
    const cfg = parse({ duree: 5, variantes: [{ nom: "Tournoi classique" }] });
    const t = createTestEngine({ players: 3, games: [{ game, cfg }], settings: { introSeconds: 1 } });
    t.engine.setSetup({ counts: { "pierre-feuille-ciseaux": 1 } });
    startRounds(t.engine);
    t.clock.advance(1000); // fin de l'intro
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.clock.advance(TIMINGS.draw);

    const pubOf = () => t.engine.snapshot(null).round!.public as Pub;
    for (let r = 0; r < 2; r++) {
      for (const m of pubOf().bracket[r]!) {
        if (!m.active) continue;
        const [lo, hi] = [m.a!, m.b!].sort();
        t.engine.input(lo!, { choice: ROCK });
        t.engine.input(hi!, { choice: SCISSORS });
      }
      expect(pubOf().step).toBe("reveal");
      t.clock.advance(r === 1 ? TIMINGS.revealFinal : TIMINGS.reveal);
      if (r === 0) t.clock.advance(TIMINGS.advance);
    }
    t.clock.advance(TIMINGS.champion);
    const snap = t.engine.snapshot(null);
    expect(snap.phase).toBe("results");
    const res = snap.round!.results as Results;
    const champion = res.champion!;
    expect(snap.round!.deltas![champion]).toBe(300);
    expect(Object.values(snap.round!.deltas!).sort((a, b) => b - a)).toEqual([300, 150, 75]);
    const me = t.engine.snapshot(champion).me!;
    expect((me.private as Priv).status).toBe("champion");
  });
});

describe("pfc : progress", () => {
  it("null pendant le tirage, puis compte les choix des duels en cours", () => {
    const t = setup(6);
    expect(game.progress!(t.state, t.ctx)).toBeNull();
    t.ctx.advance(TIMINGS.draw);
    const duelists = t.pub().bracket[0]!.filter((m) => m.active).flatMap((m) => [m.a!, m.b!]);
    expect(game.progress!(t.state, t.ctx)).toEqual({ done: 0, expected: duelists.length });
    t.pick(duelists[0]!, ROCK);
    expect(game.progress!(t.state, t.ctx)).toEqual({ done: 1, expected: duelists.length });
    t.playRound();
    expect(game.progress!(t.state, t.ctx)).toBeNull(); // révélation
  });
});
