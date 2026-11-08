import { describe, expect, it } from "bun:test";
import imposteur, { cleanClue, containsOwnWord, GRACE_SECONDS, type Priv, type Pub, type Results } from "../../src/minigames/imposteur/game";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";
import { seededRng } from "./helpers/rng";

const game = imposteur;
const PAIR = ["Champagne", "Crémant"];
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ paires: [PAIR], ...extra });

function round(nPlayers = 5, cfgExtra: Record<string, unknown> = {}, rng: () => number = seededRng(3)) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers), rng);
  const state = game.start(PAIR, ctx);
  game.onPlay!(state, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  const priv = (id: string) => game.privateView!(state, id, ctx) as Priv;
  const ids = ctx.players.map((p) => p.id);
  const words = ids.map((id) => priv(id).word);
  const imposter = ids.find((id) => words.filter((w) => w === priv(id).word).length === 1) ?? ids[0]!; // le seul avec un mot unique (3 joueurs ou plus)
  const send = (id: string, payload: unknown) => game.input(state, id, payload, ctx);
  const finish = () => game.finish(state, ctx);
  /** Joue les indices du tour en cours (tout le monde, indice "i<id>") puis laisse passer le délai de grâce. */
  const clueAll = (tag = "i") => {
    for (const id of ids) send(id, { clue: `${tag}${id}` });
    ctx.advance(GRACE_SECONDS * 1000);
  };
  const toDebate = () => {
    ctx.finishCountdown(); // mot
    for (let t = 1; t <= cfg.tours_indices; t++) {
      clueAll(`t${t}`);
      ctx.finishCountdown(); // montre
    }
  };
  const toVote = () => {
    toDebate();
    ctx.finishCountdown();
  };
  return { cfg, ctx, state, pub, priv, ids, send, finish, clueAll, toDebate, toVote, imposter };
}

describe("imposteur : config", () => {
  it("valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree_mot: 6, tours_indices: 2, duree_indice: 20, duree_debat: 40, duree_vote: 20, longueur_indice_max: 24, points: { bon_vote: 100, imposteur_survit: 300 } });
  });
  it("exige des paires de deux mots", () => {
    expect(game.configSchema.safeParse({ paires: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [["seul"]] }).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [["a", "b", "c"]] }).success).toBe(false);
    expect(game.configSchema.safeParse({}).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [PAIR], tours_indices: 4 }).success).toBe(false);
  });
  it("durée estimée réaliste (2 à 3 minutes par défaut)", () => {
    const s = game.estimateSeconds(parse());
    expect(s).toBeGreaterThan(100);
    expect(s).toBeLessThan(180);
  });
});

describe("imposteur : mots et secret", () => {
  it("un seul imposteur avec l'autre mot, les autres ont le même mot", () => {
    const r = round(6);
    const words = r.ids.map((id) => r.priv(id).word);
    expect(new Set(words).size).toBe(2);
    expect([...words].sort()).toEqual(expect.arrayContaining(PAIR));
    const counts = Object.values(words.reduce<Record<string, number>>((m, w) => ((m[w] = (m[w] ?? 0) + 1), m), {})).sort();
    expect(counts).toEqual([1, 5]);
  });

  it("le mot de la majorité est tiré au hasard dans la paire", () => {
    const majorities = new Set<string>();
    for (let seed = 1; seed < 30; seed++) {
      const r = round(4, {}, seededRng(seed));
      const words = r.ids.map((id) => r.priv(id).word);
      majorities.add(words.find((w) => words.filter((x) => x === w).length > 1)!);
    }
    expect(majorities.size).toBe(2);
  });

  it("la vue privée a la même forme pour tout le monde et la vue publique ne dit rien de l'imposteur ni des mots", () => {
    const r = round(5);
    const shapes = r.ids.map((id) => Object.keys(r.priv(id)).sort().join());
    expect(new Set(shapes).size).toBe(1);
    for (const step of ["mot", "indice", "montre", "debat", "vote"] as const) {
      const json = JSON.stringify(r.pub());
      expect(json).not.toContain("Champagne");
      expect(json).not.toContain("Crémant");
      if (step === "mot") {
        r.ctx.finishCountdown();
        r.clueAll();
      } else r.ctx.finishCountdown();
      if (step === "debat") for (const id of r.ids) r.send(id, { ready: true });
    }
  });

  it("une seule paire possible avec 2 joueurs ne plante pas", () => {
    const r = round(2);
    expect(new Set(r.ids.map((id) => r.priv(id).word)).size).toBe(2);
  });
});

describe("imposteur : indices", () => {
  it("la manche commence par l'étape mot puis passe aux indices", () => {
    const r = round();
    expect(r.pub().step).toBe("mot");
    expect(r.ctx.countdownState!.seconds).toBe(6);
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("indice");
    expect(r.pub().tour).toBe(1);
    expect(r.ctx.countdownState!.seconds).toBe(20);
  });

  it("ignore les indices pendant l'étape mot", () => {
    const r = round();
    r.send("p1", { clue: "bulles" });
    r.ctx.finishCountdown();
    expect(r.pub().sentIds).toEqual([]);
  });

  it("nettoie et coupe l'indice ; les indices des autres ne fuitent pas avant la fin du tour", () => {
    expect(cleanClue("  des   bulles ", 24)).toBe("des bulles");
    expect(cleanClue("x".repeat(60), 24)).toHaveLength(24);
    expect(cleanClue(5, 24)).toBe("");
    const r = round();
    r.ctx.finishCountdown();
    r.send("p1", { clue: "secret" });
    expect(r.priv("p1").clue).toBe("secret");
    expect(r.priv("p2").clue).toBeNull();
    expect(JSON.stringify(r.pub())).not.toContain("secret");
    expect(r.pub().sentIds).toEqual(["p1"]);
  });

  it("refuse son propre mot (accents, majuscules, pluriel, article), pas celui de l'autre", () => {
    expect(containsOwnWord("CHAMPAGNE", "Champagne")).toBe(true);
    expect(containsOwnWord("le champagnes", "Champagne")).toBe(true);
    expect(containsOwnWord("du crémant rosé", "Crémant")).toBe(true);
    expect(containsOwnWord("cremant", "Crémant")).toBe(true);
    expect(containsOwnWord("champagnard", "Champagne")).toBe(false);
    expect(containsOwnWord("bulles", "Champagne")).toBe(false);
    const r = round();
    r.ctx.finishCountdown();
    const own = r.priv("p1").word;
    r.send("p1", { clue: own.toUpperCase() });
    expect(r.priv("p1").clue).toBeNull();
    expect(r.priv("p1").rejected).toBe(own.toUpperCase());
    expect(r.pub().sentIds).toEqual([]);
    r.send("p1", { clue: "bulles" });
    expect(r.priv("p1").rejected).toBeNull();
    expect(r.priv("p1").clue).toBe("bulles");
    // un indice valide déjà envoyé reste en place quand le suivant est refusé
    r.send("p1", { clue: own });
    expect(r.priv("p1").clue).toBe("bulles");
  });

  it("on peut modifier ou retirer son indice ; payloads invalides ignorés", () => {
    const r = round();
    r.ctx.finishCountdown();
    r.send("p1", { clue: "un" });
    r.send("p1", { clue: "deux" });
    expect(r.priv("p1").clue).toBe("deux");
    r.send("p1", { clue: "   " });
    expect(r.priv("p1").clue).toBeNull();
    r.send("inconnu", { clue: "x" });
    r.send("p1", null);
    r.send("p1", { clue: 12 });
    r.send("p1", { ready: true });
    r.send("p1", { target: "p2" });
    expect(r.pub().sentIds).toEqual([]);
  });

  it("tout le monde a envoyé : délai de grâce puis la TV dévoile les indices du tour", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    for (const id of r.ids) r.send(id, { clue: `i${id}` });
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
    expect(r.pub().step).toBe("indice");
    r.send("p2", { clue: "corrigé" }); // pendant la grâce
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.pub().step).toBe("montre");
    expect(r.pub().clues).toEqual({ p1: ["ip1"], p2: ["corrigé"], p3: ["ip3"] });
  });

  it("fin du chrono : les absents ont un indice vide", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    r.send("p1", { clue: "a" });
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("montre");
    expect(r.pub().clues).toEqual({ p1: ["a"], p2: [""], p3: [""] });
  });

  it("deux tours : les indices du tour 2 restent cachés jusqu'à la fin du tour, le tour 1 reste visible", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    r.clueAll("a");
    r.ctx.finishCountdown(); // montre
    expect(r.pub().step).toBe("indice");
    expect(r.pub().tour).toBe(2);
    r.send("p1", { clue: "tour2" });
    expect(r.priv("p1").clue).toBe("tour2");
    expect(r.pub().clues.p1).toEqual(["ap1"]);
    expect(JSON.stringify(r.pub())).not.toContain("tour2");
    r.ctx.finishCountdown();
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("debat");
    expect(r.pub().clues.p1).toEqual(["ap1", "tour2"]);
  });

  it("tours_indices: 1 enchaîne directement sur le débat", () => {
    const r = round(3, { tours_indices: 1 });
    r.toDebate();
    expect(r.pub().step).toBe("debat");
    expect(r.pub().clues.p1).toHaveLength(1);
  });

  it("un déconnecté ne bloque pas le tour ; il peut revenir", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    r.ctx.setConnected("p3", false);
    r.send("p1", { clue: "a" });
    r.send("p2", { clue: "b" });
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.pub().step).toBe("montre");
  });

  it("la déconnexion du dernier qui n'avait pas répondu relance la vérification (onPresenceChange)", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    r.send("p1", { clue: "a" });
    r.send("p2", { clue: "b" });
    expect(r.ctx.countdownState!.seconds).toBe(20);
    r.ctx.setConnected("p3", false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
  });

  it("l'imposteur déconnecté : la manche continue normalement", () => {
    const r = round(4);
    r.ctx.setConnected(r.imposter, false);
    game.onPresenceChange!(r.state, r.ctx);
    r.ctx.finishCountdown();
    for (const id of r.ids.filter((i) => i !== r.imposter)) r.send(id, { clue: `i${id}` });
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.pub().step).toBe("montre");
  });
});

describe("imposteur : débat", () => {
  it("passe au vote quand tous les connectés sont prêts, et on peut annuler son « prêt »", () => {
    const r = round(3);
    r.toDebate();
    expect(r.pub().step).toBe("debat");
    expect(r.ctx.countdownState!.seconds).toBe(40);
    r.send("p1", { ready: true });
    r.send("p2", { ready: true });
    r.send("p2", { ready: false });
    expect(r.pub().readyIds).toEqual(["p1"]);
    expect(r.priv("p1").ready).toBe(true);
    r.send("p2", { ready: true });
    r.send("p3", { ready: "oui" }); // invalide
    expect(r.pub().step).toBe("debat");
    r.send("p3", { ready: true });
    expect(r.pub().step).toBe("vote");
  });

  it("un absent ne bloque pas le débat", () => {
    const r = round(3);
    r.toDebate();
    r.ctx.setConnected("p3", false);
    r.send("p1", { ready: true });
    r.send("p2", { ready: true });
    expect(r.pub().step).toBe("vote");
  });

  it("fin du chrono : on vote quand même", () => {
    const r = round(3);
    r.toDebate();
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("vote");
    expect(r.ctx.countdownState!.seconds).toBe(20);
  });
});

describe("imposteur : vote et points", () => {
  it("pas de vote pour soi, pour un inconnu, ni hors de l'étape vote", () => {
    const r = round(4);
    r.toDebate();
    r.send("p1", { target: "p2" }); // pendant le débat
    r.ctx.finishCountdown();
    expect(r.priv("p1").vote).toBeNull();
    r.send("p1", { target: "p1" });
    r.send("p1", { target: "inconnu" });
    r.send("p1", { target: 4 });
    r.send("inconnu", { target: "p2" });
    expect(r.pub().votedCount).toBe(0);
    r.send("p1", { target: "p2" });
    r.send("p1", { target: "p3" }); // changement d'avis
    expect(r.priv("p1").vote).toBe("p3");
    expect(r.pub().votedCount).toBe(1);
  });

  it("imposteur démasqué : chaque bon votant gagne bon_vote", () => {
    const r = round(5);
    r.toVote();
    const imp = r.imposter;
    const others = r.ids.filter((i) => i !== imp);
    const innocent = others[0]!;
    r.send(others[0]!, { target: others[1]! });
    for (const v of others.slice(1)) r.send(v, { target: imp });
    r.send(imp, { target: innocent });
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.ctx.ended).toBe(true);
    const { results, scores } = r.finish();
    const res = results as Results;
    expect(res.unmasked).toBe(true);
    expect(res.imposterId).toBe(imp);
    expect(scores).toEqual(Object.fromEntries(others.slice(1).map((v) => [v, 100])));
  });

  it("imposteur pas démasqué : il gagne imposteur_survit, personne d'autre", () => {
    const r = round(5);
    r.toVote();
    const imp = r.imposter;
    const others = r.ids.filter((i) => i !== imp);
    for (const v of others) r.send(v, { target: others.find((o) => o !== v)! });
    r.send(imp, { target: others[0]! });
    r.ctx.finishCountdown();
    const { results, scores } = r.finish();
    expect((results as Results).unmasked).toBe(false);
    expect(scores).toEqual({ [imp]: 300 });
  });

  it("égalité en tête : l'imposteur s'en sort", () => {
    const r = round(5);
    r.toVote();
    const imp = r.imposter;
    const [a, b, c] = r.ids.filter((i) => i !== imp) as [string, string, string];
    r.send(a, { target: imp });
    r.send(b, { target: imp });
    r.send(c, { target: a });
    r.send(imp, { target: a });
    r.ctx.finishCountdown();
    const { results, scores } = r.finish();
    expect((results as Results).unmasked).toBe(false);
    expect(scores).toEqual({ [imp]: 300 });
  });

  it("personne n'a voté : l'imposteur s'en sort", () => {
    const r = round(4);
    r.toVote();
    r.ctx.finishCountdown();
    expect(r.ctx.ended).toBe(true);
    expect(r.finish().scores).toEqual({ [r.imposter]: 300 });
  });

  it("un seul vote suffit à démasquer si personne d'autre n'en a", () => {
    const r = round(4);
    r.toVote();
    const voter = r.ids.find((i) => i !== r.imposter)!;
    r.send(voter, { target: r.imposter });
    r.ctx.finishCountdown();
    expect(r.finish().scores).toEqual({ [voter]: 100 });
  });

  it("fin anticipée : tous les connectés ont voté, avec délai de grâce ; un absent ne bloque pas", () => {
    const r = round(3);
    r.toVote();
    r.ctx.setConnected("p3", false);
    r.send("p1", { target: "p2" });
    expect(r.ctx.ended).toBe(false);
    r.send("p2", { target: "p1" });
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.ctx.ended).toBe(true);
  });

  it("absent qui se déconnecte pendant le vote : la présence déclenche la fin", () => {
    const r = round(3);
    r.toVote();
    r.send("p1", { target: "p2" });
    r.send("p2", { target: "p1" });
    r.ctx.setConnected("p3", false);
    game.onPresenceChange!(r.state, r.ctx);
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.ctx.ended).toBe(true);
  });

  it("les résultats contiennent les deux mots, les votes et tous les indices", () => {
    const r = round(3);
    r.toVote();
    r.send("p1", { target: "p2" });
    r.ctx.finishCountdown();
    const res = r.finish().results as Results;
    expect([res.majorityWord, res.imposterWord].sort()).toEqual([...PAIR].sort());
    expect(res.votes).toEqual([{ voterId: "p1", targetId: "p2" }]);
    expect(res.clues.p1).toEqual(["t1p1", "t2p1"]);
    expect(res.playerIds).toEqual(["p1", "p2", "p3"]);
  });

  it("manche écourtée dès les indices : finish ne plante pas", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    r.send("p1", { clue: "a" });
    const res = r.finish().results as Results;
    expect(res.clues.p1).toEqual(["a", ""]);
  });
});

describe("imposteur : à travers le moteur", () => {
  it("une manche complète, des chronos aux points cumulés", () => {
    const cfg = parse();
    const t = createTestEngine({ games: [{ game, cfg }], players: 4, settings: { introSeconds: 1 } });
    t.engine.setSetup({ counts: { imposteur: 1 } });
    t.engine.start();
    t.clock.advance(1_000);
    const snap = () => t.engine.snapshot(null).round!;
    const pub = () => snap().public as Pub;
    expect(pub().step).toBe("mot");
    t.clock.advance(6_000);
    for (let tour = 1; tour <= 2; tour++) {
      expect(pub().step).toBe("indice");
      for (const id of t.ids) t.engine.input(id, { clue: `indice ${tour} ${id}` });
      t.clock.advance(GRACE_SECONDS * 1000);
      expect(pub().step).toBe("montre");
      t.clock.advance(4_000);
    }
    expect(pub().step).toBe("debat");
    for (const id of t.ids) t.engine.input(id, { ready: true });
    expect(pub().step).toBe("vote");
    // Chacun vote pour le suivant dans la liste : personne ne gagne plus de voix que les autres.
    t.ids.forEach((id, i) => t.engine.input(id, { target: t.ids[(i + 1) % t.ids.length] }));
    t.clock.advance(GRACE_SECONDS * 1000);
    const state = t.engine.snapshot(null);
    expect(state.phase).toBe("results");
    const results = state.round!.results as Results;
    expect(results.unmasked).toBe(false);
    expect(state.round!.deltas![results.imposterId!]).toBe(300);
    // Chaque téléphone ne reçoit que son mot.
    const words = t.ids.map((id) => (t.engine.snapshot(id).me!.private as Priv).word);
    expect(words).toContain(results.majorityWord);
  });
});
