import { describe, expect, it } from "bun:test";
import imposteur, { GRACE_SECONDS, type Priv, type Pub, type Results } from "../../src/minigames/imposteur/game";
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
  const presence = (id: string, on: boolean) => {
    ctx.setConnected(id, on);
    game.onPresenceChange!(state, ctx);
  };
  /** Chaque orateur touche « J'ai dit mon indice » jusqu'à la fin du tour. */
  const speakAll = () => {
    for (let guard = 0; guard < 20 && pub().step === "parole"; guard++) send(pub().currentId!, { done: true });
  };
  const toSpeech = () => ctx.finishCountdown(); // mot → parole
  const toDecision = () => {
    toSpeech();
    speakAll();
  };
  const toVote = () => {
    toDecision();
    ctx.finishCountdown(); // personne n'a choisi → on vote
  };
  return { cfg, ctx, state, pub, priv, ids, send, finish, presence, speakAll, toSpeech, toDecision, toVote, imposter };
}

describe("imposteur : config", () => {
  it("valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree_mot: 6, duree_parole: 15, tours_max: 2, duree_decision: 15, duree_vote: 20, points: { bon_vote: 100, imposteur_survit: 300 } });
  });
  it("exige des paires de deux mots et 1 ou 2 tours", () => {
    expect(game.configSchema.safeParse({ paires: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [["seul"]] }).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [["a", "b", "c"]] }).success).toBe(false);
    expect(game.configSchema.safeParse({}).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [PAIR], tours_max: 3 }).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [PAIR], tours_max: 0 }).success).toBe(false);
    expect(game.configSchema.safeParse({ paires: [PAIR], tours_max: 1 }).success).toBe(true);
  });
  it("durée estimée réaliste (2 à 4 minutes par défaut)", () => {
    const s = game.estimateSeconds(parse());
    expect(s).toBeGreaterThan(120);
    expect(s).toBeLessThan(240);
    expect(game.estimateSeconds(parse({ tours_max: 1 }))).toBeLessThan(s);
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

  it("à chaque étape : même forme de vue privée pour tous ; aucune fuite de l'imposteur ni des mots dans la vue publique", () => {
    const r = round(5);
    const check = () => {
      expect(new Set(r.ids.map((id) => Object.keys(r.priv(id)).sort().join())).size).toBe(1);
      const json = JSON.stringify(r.pub());
      expect(json).not.toContain("Champagne");
      expect(json).not.toContain("Crémant");
      expect(json).not.toContain("imposter");
      // La vue privée de l'imposteur ne dit rien de plus que les autres, hormis son mot.
      const strip = (id: string) => ({ ...r.priv(id), word: "" });
      expect(strip(r.imposter)).toEqual(strip(r.ids.find((i) => i !== r.imposter)!));
    };
    check(); // mot
    r.toSpeech();
    check(); // parole
    r.speakAll();
    check(); // décision
    for (const id of r.ids) r.send(id, { choice: "vote" });
    r.ctx.advance(GRACE_SECONDS * 1000);
    check(); // vote
  });

  it("une seule paire possible avec 2 joueurs ne plante pas", () => {
    const r = round(2);
    expect(new Set(r.ids.map((id) => r.priv(id).word)).size).toBe(2);
  });
});

describe("imposteur : parole", () => {
  it("la manche commence par l'étape mot puis passe à la parole, avec un chrono par orateur", () => {
    const r = round();
    expect(r.pub().step).toBe("mot");
    expect(r.ctx.countdownState!.seconds).toBe(6);
    r.toSpeech();
    expect(r.pub().step).toBe("parole");
    expect(r.pub().tour).toBe(1);
    expect(r.ctx.countdownState!.seconds).toBe(15);
    expect([...r.pub().order].sort()).toEqual([...r.ids].sort());
    expect(r.pub().currentId).toBe(r.pub().order[0]!);
    expect(r.pub().spokenIds).toEqual([]);
  });

  it("l'ordre est mélangé (rng) et l'imposteur n'est jamais premier au tour 1", () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed < 80; seed++) {
      const r = round(5, {}, seededRng(seed));
      r.toSpeech();
      expect(r.pub().order[0]).not.toBe(r.imposter);
      expect(r.pub().order).toHaveLength(5);
      expect(new Set(r.pub().order).size).toBe(5);
      firsts.add(r.pub().order[0]!);
    }
    expect(firsts.size).toBeGreaterThan(2);
    // Il parle bien un jour : il est ailleurs dans l'ordre.
    const r = round(5);
    r.toSpeech();
    expect(r.pub().order).toContain(r.imposter);
  });

  it("l'ordre change au tour 2 (nouveau tirage)", () => {
    const orders = new Set<string>();
    for (let seed = 1; seed < 20; seed++) {
      const r = round(5, {}, seededRng(seed));
      r.toDecision();
      for (const id of r.ids) r.send(id, { choice: "tour" });
      r.ctx.advance(GRACE_SECONDS * 1000);
      expect(r.pub().step).toBe("parole");
      expect(r.pub().tour).toBe(2);
      orders.add(r.pub().order.join());
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("seul l'orateur courant peut passer la main ; payloads invalides ignorés", () => {
    const r = round(4);
    r.toSpeech();
    const cur = r.pub().currentId!;
    const other = r.ids.find((i) => i !== cur)!;
    r.send(other, { done: true });
    r.send("inconnu", { done: true });
    r.send(cur, null);
    r.send(cur, { done: "oui" });
    r.send(cur, { done: false });
    r.send(cur, { clue: "bulles" });
    r.send(cur, { choice: "vote" });
    r.send(cur, { target: other });
    expect(r.pub().currentId).toBe(cur);
    expect(r.pub().spokenIds).toEqual([]);
    r.send(cur, { done: true });
    expect(r.pub().spokenIds).toEqual([cur]);
    expect(r.pub().currentId).toBe(r.pub().order[1]!);
    expect(r.ctx.countdownState!.seconds).toBe(15); // chrono relancé pour le suivant
    r.send(cur, { done: true }); // il a déjà parlé
    expect(r.pub().currentId).toBe(r.pub().order[1]!);
  });

  it("le chrono écoulé passe au suivant, sans le cocher", () => {
    const r = round(3);
    r.toSpeech();
    const [a, b] = r.pub().order as [string, string];
    r.ctx.finishCountdown();
    expect(r.pub().currentId).toBe(b);
    expect(r.pub().spokenIds).toEqual([]);
    expect(a).not.toBe(b);
  });

  it("ignore tout pendant l'étape mot", () => {
    const r = round();
    r.send("p1", { done: true });
    r.send("p1", { choice: "tour" });
    r.send("p1", { target: "p2" });
    r.toSpeech();
    expect(r.pub().spokenIds).toEqual([]);
    expect(r.pub().wantTour).toBe(0);
  });

  it("un déconnecté est sauté ; s'il se déconnecte pendant son tour, on passe au suivant", () => {
    const r = round(4);
    r.toSpeech();
    const [a, b, c, d] = r.pub().order as [string, string, string, string];
    r.presence(b, false); // b s'en va avant son tour
    r.send(a, { done: true });
    expect(r.pub().currentId).toBe(c);
    r.presence(c, false); // c s'en va pendant son tour
    expect(r.pub().currentId).toBe(d);
    expect(r.pub().spokenIds).toEqual([a]);
    // b revient mais son tour est passé pour ce tour
    r.presence(b, true);
    expect(r.pub().currentId).toBe(d);
    r.send(d, { done: true });
    expect(r.pub().step).toBe("decision");
  });

  it("l'imposteur déconnecté : la manche continue normalement", () => {
    const r = round(4);
    r.presence(r.imposter, false);
    r.toSpeech();
    expect(r.pub().order).toContain(r.imposter);
    r.speakAll();
    expect(r.pub().step).toBe("decision");
  });

  it("tout le monde déconnecté : le tour se termine sans bloquer", () => {
    const r = round(3);
    r.toSpeech();
    for (const id of r.ids) r.ctx.setConnected(id, false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.pub().step).toBe("decision");
  });

  it("tout le monde a parlé : on passe à la décision", () => {
    const r = round(3);
    r.toDecision();
    expect(r.pub().step).toBe("decision");
    expect(r.ctx.countdownState!.seconds).toBe(15);
    expect(r.pub().currentId).toBeNull();
  });
});

describe("imposteur : décision", () => {
  it("compteurs anonymes, choix modifiable, payloads invalides ignorés", () => {
    const r = round(4);
    r.toDecision();
    r.send("p1", { choice: "tour" });
    r.send("p2", { choice: "vote" });
    r.send("p2", { choice: "tour" }); // change d'avis
    r.send("p3", { choice: "autre" });
    r.send("p3", { choice: 3 });
    r.send("p3", null);
    r.send("inconnu", { choice: "tour" });
    r.send("p3", { done: true });
    expect(r.pub().wantTour).toBe(2);
    expect(r.pub().wantVote).toBe(0);
    expect(r.priv("p1").choice).toBe("tour");
    expect(r.priv("p3").choice).toBeNull();
    expect(JSON.stringify(r.pub())).not.toContain("p1\":\"tour");
  });

  it("majorité stricte pour « encore un tour » → tour 2 ; fin anticipée avec délai de grâce", () => {
    const r = round(5);
    r.toDecision();
    for (const id of ["p1", "p2", "p3"]) r.send(id, { choice: "tour" });
    r.send("p4", { choice: "vote" });
    expect(r.pub().step).toBe("decision");
    r.send("p5", { choice: "vote" });
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.pub().step).toBe("parole");
    expect(r.pub().tour).toBe(2);
    expect(r.pub().spokenIds).toEqual([]);
    expect(r.ctx.countdownState!.seconds).toBe(15);
    expect(r.priv("p1").choice).toBeNull();
  });

  it("changer d'avis pendant le délai de grâce compte", () => {
    const r = round(3);
    r.toDecision();
    r.send("p1", { choice: "tour" });
    r.send("p2", { choice: "tour" });
    r.send("p3", { choice: "tour" });
    r.send("p1", { choice: "vote" });
    r.send("p2", { choice: "vote" });
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.pub().step).toBe("vote");
  });

  it("égalité → on vote", () => {
    const r = round(4);
    r.toDecision();
    r.send("p1", { choice: "tour" });
    r.send("p2", { choice: "tour" });
    r.send("p3", { choice: "vote" });
    r.send("p4", { choice: "vote" });
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.pub().step).toBe("vote");
    expect(r.ctx.countdownState!.seconds).toBe(20);
  });

  it("personne n'a choisi : fin du chrono → on vote", () => {
    const r = round(4);
    r.toDecision();
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("vote");
  });

  it("fin du chrono avec une majorité parmi ceux qui ont répondu (les silencieux ne comptent pas)", () => {
    const r = round(5);
    r.toDecision();
    r.send("p1", { choice: "tour" });
    r.send("p2", { choice: "tour" });
    r.send("p3", { choice: "vote" });
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("parole");
    expect(r.pub().tour).toBe(2);
  });

  it("un absent ne bloque pas ; sa déconnexion déclenche la fin (onPresenceChange)", () => {
    const r = round(3);
    r.toDecision();
    r.send("p1", { choice: "tour" });
    r.send("p2", { choice: "tour" });
    expect(r.ctx.countdownState!.seconds).toBe(15);
    r.presence("p3", false);
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.pub().tour).toBe(2);
    expect(r.pub().step).toBe("parole");
  });

  it("après le tour 2 : vote directement, pas de nouvelle décision", () => {
    const r = round(3);
    r.toDecision();
    for (const id of r.ids) r.send(id, { choice: "tour" });
    r.ctx.advance(GRACE_SECONDS * 1000);
    r.speakAll();
    expect(r.pub().step).toBe("vote");
    expect(r.pub().tour).toBe(2);
  });

  it("tours_max 1 : vote direct après le tour de parole, jamais de décision", () => {
    const r = round(3, { tours_max: 1 });
    r.toSpeech();
    r.speakAll();
    expect(r.pub().step).toBe("vote");
    expect(r.pub().tours).toBe(1);
    expect(r.ctx.countdownState!.seconds).toBe(20);
  });
});

describe("imposteur : vote et points", () => {
  it("pas de vote pour soi, pour un inconnu, ni hors de l'étape vote", () => {
    const r = round(4);
    r.toDecision();
    r.send("p1", { target: "p2" }); // pendant la décision
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("vote");
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
    r.presence("p3", false);
    r.ctx.advance(GRACE_SECONDS * 1000);
    expect(r.ctx.ended).toBe(true);
  });

  it("les résultats contiennent les deux mots et les votes (plus d'indices écrits)", () => {
    const r = round(3);
    r.toVote();
    r.send("p1", { target: "p2" });
    r.ctx.finishCountdown();
    const res = r.finish().results as Results;
    expect([res.majorityWord, res.imposterWord].sort()).toEqual([...PAIR].sort());
    expect(res.votes).toEqual([{ voterId: "p1", targetId: "p2" }]);
    expect(res.playerIds).toEqual(["p1", "p2", "p3"]);
    expect("clues" in res).toBe(false);
  });

  it("manche écourtée pendant la parole : finish ne plante pas", () => {
    const r = round(3);
    r.toSpeech();
    const res = r.finish().results as Results;
    expect(res.votes).toEqual([]);
  });
});

describe("imposteur : à travers le moteur", () => {
  it("une manche complète avec un 2e tour, des chronos aux points cumulés", () => {
    const cfg = parse();
    const t = createTestEngine({ games: [{ game, cfg }], players: 4, settings: { introSeconds: 1 } });
    t.engine.setSetup({ counts: { imposteur: 1 } });
    t.engine.start();
    t.clock.advance(1_000);
    const snap = () => t.engine.snapshot(null).round!;
    const pub = () => snap().public as Pub;
    expect(pub().step).toBe("mot");
    t.clock.advance(6_000);
    const speakTour = (tour: number) => {
      expect(pub().step).toBe("parole");
      expect(pub().tour).toBe(tour);
      for (let i = 0; i < t.ids.length; i++) t.engine.input(pub().currentId!, { done: true });
    };
    speakTour(1);
    expect(pub().step).toBe("decision");
    for (const id of t.ids) t.engine.input(id, { choice: "tour" });
    t.clock.advance(GRACE_SECONDS * 1000);
    speakTour(2);
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
