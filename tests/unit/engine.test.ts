import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { SKINS } from "../../src/shared/skins";
import { activeNow } from "../../src/shared/clock";
import { GameEngine, GameError } from "../../src/server/engine/engine";
import { createTestEngine, MemoryPersistence, validProfile, startRounds } from "./helpers/engine-setup";
import { FakeClock } from "./helpers/fake-clock";
import { makeFakeGame } from "./helpers/fake-game";
import { seededRng } from "./helpers/rng";

// Les erreurs de mini-jeu sont loguées par le moteur : on les fait taire pour garder une sortie lisible.
let errSpy: ReturnType<typeof spyOn>;
beforeEach(() => {
  errSpy = spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

const T = { intro: 4000, round: 10_000 };

/** Lance la partie et avance jusqu'à la phase de jeu de la première manche. */
function startPlaying(o: Parameters<typeof createTestEngine>[0] = {}) {
  const t = createTestEngine(o);
  startRounds(t.engine);
  t.clock.advance(T.intro);
  return t;
}

describe("démarrage", () => {
  it("refuse sans joueur prêt (profil manquant)", () => {
    const t = createTestEngine({ players: 0 });
    expect(() => t.engine.start()).toThrow(GameError);
    t.engine.join(null); // connecté mais sans profil
    expect(() => t.engine.start()).toThrow("Aucun joueur prêt");
  });

  it("refuse avec 0 manche", () => {
    const t = createTestEngine();
    t.engine.setSetup({ counts: { fake: 0 } });
    expect(() => t.engine.start()).toThrow("au moins une manche");
    expect(t.engine.snapshot(null).phase).toBe("lobby");
  });

  it("refuse hors du lobby, setSetup aussi", () => {
    const t = createTestEngine();
    startRounds(t.engine);
    expect(() => t.engine.start()).toThrow("déjà commencé");
    expect(() => t.engine.setSetup({ counts: { fake: 1 } })).toThrow(GameError);
  });

  it("setSetup borne les valeurs au contenu disponible", () => {
    const t = createTestEngine({ game: { items: 3 } });
    t.engine.setSetup({ counts: { fake: 50, inconnu: 2 } });
    expect(t.engine.snapshot(null).setup.counts).toEqual({ fake: 3 });
  });
});

describe("déroulé d'une manche", () => {
  it("lobby → intro → playing → results aux bons moments", () => {
    const t = createTestEngine();
    const snap = () => t.engine.snapshot(null);
    expect(snap().phase).toBe("lobby");
    startRounds(t.engine);
    expect(snap().phase).toBe("intro");
    expect(snap().round).toMatchObject({ index: 0, total: 2, gameId: "fake", deadline: null });

    t.clock.advance(T.intro - 1);
    expect(snap().phase).toBe("intro");
    t.clock.advance(1);
    expect(snap().phase).toBe("playing");
    expect(snap().round!.deadline).toBe(t.clock.now() + T.round);
    expect(t.fake.calls).toContain("onPlay");

    t.clock.advance(T.round - 1);
    expect(snap().phase).toBe("playing");
    t.clock.advance(1);
    expect(snap().phase).toBe("results");
    expect(t.fake.calls.filter((c) => c === "finish")).toHaveLength(1);
  });

  it("un mini-jeu sans chrono n'a pas de deadline et ne finit que par ctx.end", () => {
    const t = startPlaying({ game: { seconds: null } });
    expect(t.engine.snapshot(null).round!.deadline).toBeNull();
    t.clock.advance(3_600_000);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.engine.input(t.ids[0]!, { end: true });
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("fin anticipée quand le mini-jeu appelle ctx.end, sans double fin au chrono", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { v: 1, end: true });
    expect(t.engine.snapshot(null).phase).toBe("results");
    t.clock.advance(T.round * 2);
    expect(t.fake.calls.filter((c) => c === "finish")).toHaveLength(1);
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("l'état public et privé du mini-jeu passe dans le snapshot", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { v: 7 });
    expect(t.engine.snapshot(null).round!.public).toMatchObject({ n: 1 });
    expect(t.engine.snapshot(t.ids[0]!).me).toEqual({ id: t.ids[0]!, private: { mine: 7 }, inRound: true });
    expect(t.engine.snapshot(t.ids[1]!).me!.private).toEqual({ mine: null });
  });

  it("me n'existe que pour un joueur (la TV n'a pas de vue privée)", () => {
    const t = startPlaying();
    expect(t.engine.snapshot(null).me).toBeNull();
    expect(t.engine.snapshot(t.ids[0]!).me!.id).toBe(t.ids[0]!);
  });

  it("notifie onChange à chaque transition", () => {
    const t = createTestEngine();
    const before = t.changes.count;
    startRounds(t.engine);
    t.clock.advance(T.intro);
    expect(t.changes.count).toBeGreaterThan(before + 1);
  });
});

describe("entrées des joueurs", () => {
  it("refusées hors phase playing", () => {
    const t = createTestEngine();
    expect(() => t.engine.input(t.ids[0]!, { v: 1 })).toThrow("Pas maintenant"); // lobby
    startRounds(t.engine);
    expect(() => t.engine.input(t.ids[0]!, { v: 1 })).toThrow("Pas maintenant"); // intro
    t.clock.advance(T.intro + T.round);
    expect(() => t.engine.input(t.ids[0]!, { v: 1 })).toThrow("Pas maintenant"); // results
  });

  it("refusées pendant la pause", () => {
    const t = startPlaying();
    t.engine.pause();
    expect(() => t.engine.input(t.ids[0]!, { v: 1 })).toThrow("Pas maintenant");
    t.engine.resume();
    expect(() => t.engine.input(t.ids[0]!, { v: 1 })).not.toThrow();
  });

  it("refusées pour un joueur arrivé en cours de manche", () => {
    const t = startPlaying();
    const late = t.engine.join(null);
    t.engine.setProfile(late.playerId, validProfile("Retardataire"));
    expect(() => t.engine.input(late.playerId, { v: 1 })).toThrow("prochaine manche");
    expect(t.fake.lastState.inputs.size).toBe(0);
  });

  it("une GameError du mini-jeu est remontée, une autre erreur est avalée", () => {
    const t = startPlaying();
    expect(() => t.engine.input(t.ids[0]!, { gameError: true })).toThrow("refusé");
    expect(() => t.engine.input(t.ids[0]!, { boom: true })).not.toThrow();
    expect(t.engine.snapshot(null).phase).toBe("playing");
  });
});

describe("compteur commun des réponses (progress)", () => {
  it("null hors de la phase de jeu, puis suit les réponses", () => {
    const t = createTestEngine();
    const prog = () => t.engine.snapshot(null).round?.progress;
    expect(t.engine.snapshot(null).round).toBeNull();
    startRounds(t.engine);
    expect(prog()).toBeNull(); // intro
    t.clock.advance(T.intro);
    expect(prog()).toEqual({ done: 0, expected: 3 });
    t.engine.input(t.ids[0]!, { v: 1 });
    expect(prog()).toEqual({ done: 1, expected: 3 });
    t.engine.input(t.ids[1]!, { v: 2 });
    expect(t.engine.snapshot(t.ids[0]!).round?.progress).toEqual({ done: 2, expected: 3 });
    t.clock.advance(T.round);
    expect(prog()).toBeNull(); // résultats
  });

  it("un joueur déconnecté reste compté parmi les attendus", () => {
    const t = startPlaying();
    t.engine.disconnect(t.ids[2]!);
    expect(t.engine.snapshot(null).round?.progress).toEqual({ done: 0, expected: 3 });
  });

  it("null si le jeu n'implémente pas progress", () => {
    const t = startPlaying({ game: { noProgress: true } });
    expect(t.engine.snapshot(null).round?.progress).toBeNull();
  });

  it("une exception de progress ne casse pas le snapshot", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { badProgress: true });
    const snap = t.engine.snapshot(null);
    expect(snap.round?.progress).toBeNull();
    expect(snap.phase).toBe("playing");
    expect(snap.round?.public).toBeTruthy();
  });
});

describe("bouton Continuer", () => {
  function toResults() {
    const t = startPlaying();
    t.clock.advance(T.round);
    expect(t.engine.snapshot(null).phase).toBe("results");
    return t;
  }

  it("n'avance que quand tous les joueurs connectés ont continué", () => {
    const t = toResults();
    const [a, b, c] = t.ids as [string, string, string];
    t.engine.continue(a);
    t.engine.continue(b);
    expect(t.engine.snapshot(null).phase).toBe("results");
    expect(t.engine.snapshot(null).continued.sort()).toEqual([a, b].sort());
    t.engine.continue(c);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "intro", continued: [] });
    expect(t.engine.snapshot(null).round!.index).toBe(1);
  });

  it("ignoré hors de la phase results", () => {
    const t = startPlaying();
    t.engine.continue(t.ids[0]!);
    expect(t.engine.snapshot(null).continued).toEqual([]);
  });

  it("un joueur déconnecté ne bloque pas", () => {
    const t = toResults();
    t.engine.disconnect(t.ids[2]!);
    t.engine.continue(t.ids[0]!);
    t.engine.continue(t.ids[1]!);
    expect(t.engine.snapshot(null).phase).toBe("intro");
  });

  it("une déconnexion pendant les résultats peut déclencher l'avance", () => {
    const t = toResults();
    t.engine.continue(t.ids[0]!);
    t.engine.continue(t.ids[1]!);
    expect(t.engine.snapshot(null).phase).toBe("results");
    t.engine.disconnect(t.ids[2]!);
    expect(t.engine.snapshot(null).phase).toBe("intro");
  });

  it("deux onglets : fermer un seul ne déconnecte pas le joueur", () => {
    const t = toResults();
    const second = t.engine.join(t.players[2]!.token);
    expect(second.playerId).toBe(t.ids[2]!);
    t.engine.disconnect(t.ids[2]!);
    t.engine.continue(t.ids[0]!);
    t.engine.continue(t.ids[1]!);
    expect(t.engine.snapshot(null).phase).toBe("results");
    t.engine.continue(t.ids[2]!);
    expect(t.engine.snapshot(null).phase).toBe("intro");
  });

  it("si tout le monde est déconnecté on n'avance pas tout seul", () => {
    const t = toResults();
    for (const id of t.ids) t.engine.disconnect(id);
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("un joueur sans profil ne bloque pas", () => {
    const t = toResults();
    t.engine.join(null);
    for (const id of t.ids) t.engine.continue(id);
    expect(t.engine.snapshot(null).phase).toBe("intro");
  });
});

describe("Passer (skip)", () => {
  it("saute l'intro, sans laisser le chrono d'intro se déclencher plus tard", () => {
    const t = createTestEngine();
    startRounds(t.engine);
    t.clock.advance(1000);
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.clock.advance(3000); // l'ancien timer d'intro serait tombé ici
    expect(t.engine.snapshot(null).phase).toBe("playing");
    expect(t.fake.calls.filter((c) => c === "onPlay")).toHaveLength(1);
  });

  it("termine le chrono en cours", () => {
    const t = startPlaying();
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("results");
    t.clock.advance(T.round * 3);
    expect(t.fake.calls.filter((c) => c === "finish")).toHaveLength(1);
  });

  it("passe les résultats à la manche suivante, puis au final", () => {
    const t = startPlaying();
    t.engine.skip();
    t.engine.skip();
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "intro", round: { index: 1 } });
    t.engine.skip();
    t.engine.skip();
    t.engine.skip();
    expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("final");
  });

  it("ne fait rien dans le lobby ni dans le final", () => {
    const t = createTestEngine({ rounds: 1 });
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("lobby");
    startRounds(t.engine);
    for (let i = 0; i < 3; i++) t.engine.skip();
    expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("final");
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("final");
  });
});

describe("pause, reprise et temps ajouté", () => {
  it("la pause fige le chrono principal et le snapshot donne le temps restant", () => {
    const t = startPlaying();
    t.clock.advance(3000);
    t.engine.pause();
    const s = t.engine.snapshot(null);
    expect(s.paused).toBe(true);
    expect(s.round).toMatchObject({ deadline: null, pausedRemainingMs: 7000 });
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    expect(t.engine.snapshot(null).round!.pausedRemainingMs).toBe(7000);

    t.engine.resume();
    const r = t.engine.snapshot(null);
    expect(r.paused).toBe(false);
    expect(r.round).toMatchObject({ deadline: t.clock.now() + 7000, pausedRemainingMs: null });
    t.clock.advance(6999);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.clock.advance(1);
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("l'horloge active (activeNow) s'arrête pendant la pause et ne saute pas à la reprise", () => {
    const t = startPlaying();
    t.clock.advance(2000);
    t.engine.pause();
    const at = t.clock.now();
    const frozen = activeNow(t.engine.snapshot(null).round!, at);
    t.clock.advance(5000);
    expect(activeNow(t.engine.snapshot(null).round!, t.clock.now())).toBe(frozen);
    t.engine.resume();
    expect(t.engine.snapshot(null).round).toMatchObject({ pausedMs: 5000, pausedSince: null });
    expect(activeNow(t.engine.snapshot(null).round!, t.clock.now())).toBe(frozen);
    t.clock.advance(1000);
    expect(activeNow(t.engine.snapshot(null).round!, t.clock.now())).toBe(frozen + 1000);
  });

  it("la pause fige aussi l'intro", () => {
    const t = createTestEngine();
    startRounds(t.engine);
    t.clock.advance(1000);
    t.engine.pause();
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null).phase).toBe("intro");
    t.engine.resume();
    t.clock.advance(2999);
    expect(t.engine.snapshot(null).phase).toBe("intro");
    t.clock.advance(1);
    expect(t.engine.snapshot(null).phase).toBe("playing");
  });

  it("la pause fige les timers du mini-jeu (ctx.setTimeout)", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { timer: 5000 });
    t.clock.advance(2000);
    t.engine.pause();
    t.clock.advance(60_000);
    expect(t.fake.lastState.fired).toBe(0);
    t.engine.resume();
    t.clock.advance(2999);
    expect(t.fake.lastState.fired).toBe(0);
    t.clock.advance(1);
    expect(t.fake.lastState.fired).toBe(1);
  });

  it("un timer de mini-jeu en attente est annulé à la fin de la manche", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { timer: 60_000 });
    t.clock.advance(T.round);
    t.clock.advance(120_000);
    expect(t.fake.lastState.fired).toBe(0);
  });

  it("pause/resume sans manche ou doublés sont sans effet", () => {
    const t = createTestEngine();
    t.engine.pause();
    expect(t.engine.snapshot(null).paused).toBe(false);
    startRounds(t.engine);
    t.engine.resume();
    expect(t.engine.snapshot(null).paused).toBe(false);
  });

  it("addTime prolonge et raccourcit la deadline", () => {
    const t = startPlaying();
    const d0 = t.engine.snapshot(null).round!.deadline!;
    t.engine.addTime(5);
    expect(t.engine.snapshot(null).round!.deadline).toBe(d0 + 5000);
    t.clock.advance(T.round);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.clock.advance(5000);
    expect(t.engine.snapshot(null).phase).toBe("results");

    const u = startPlaying();
    u.engine.addTime(-4);
    u.clock.advance(6000);
    expect(u.engine.snapshot(null).phase).toBe("results");
  });

  it("addTime est borné à ±600 s", () => {
    const t = startPlaying();
    const d0 = t.engine.snapshot(null).round!.deadline!;
    t.engine.addTime(100_000);
    expect(t.engine.snapshot(null).round!.deadline).toBe(d0 + 600_000);
  });

  it("addTime en pause modifie le temps restant", () => {
    const t = startPlaying();
    t.engine.pause();
    t.engine.addTime(10);
    expect(t.engine.snapshot(null).round!.pausedRemainingMs).toBe(20_000);
  });

  it("addTime est ignoré hors de la phase playing", () => {
    const t = createTestEngine();
    startRounds(t.engine);
    t.engine.addTime(30);
    t.clock.advance(T.intro);
    expect(t.engine.snapshot(null).round!.deadline).toBe(t.clock.now() + T.round);
  });
});

describe("joueurs", () => {
  it("la reconnexion avec le même jeton garde id, score et profil", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { v: 30 });
    t.clock.advance(T.round);
    t.engine.disconnect(t.ids[0]!);
    expect(t.engine.snapshot(null).players.find((p) => p.id === t.ids[0])!.connected).toBe(false);

    const back = t.engine.join(t.players[0]!.token);
    expect(back).toEqual(t.players[0]!);
    const p = t.engine.snapshot(null).players.find((x) => x.id === back.playerId)!;
    expect(p).toMatchObject({ connected: true, score: 30 });
    expect(p.profile!.name).toBe("Joueur1");
    expect(t.engine.snapshot(null).players).toHaveLength(3);
  });

  it("un jeton invalide ou inconnu crée un nouveau joueur", () => {
    const t = createTestEngine({ players: 1 });
    const j = t.engine.join("jeton-bidon");
    expect(j.playerId).not.toBe(t.ids[0]!);
    expect(j.token).not.toBe("jeton-bidon");
    expect(t.engine.snapshot(null).players).toHaveLength(2);
    expect(t.engine.snapshot(null).players[1]!.profile).toBeNull();
  });

  it("valide les profils", () => {
    const t = createTestEngine({ players: 1 });
    const id = t.ids[0]!;
    const bad: unknown[] = [
      null,
      { ...validProfile(), name: "   " },
      { ...validProfile(), name: "x".repeat(17) },
      { ...validProfile(), color: "rouge" },
      { ...validProfile(), avatar: { kind: "photo", url: "/photos/ancien.webp" } },
      { ...validProfile(), frame: "" },
    ];
    for (const p of bad) expect(() => t.engine.setProfile(id, p)).toThrow(GameError);
    expect(t.engine.snapshot(null).players[0]!.profile!.name).toBe("Joueur1");
    expect(() => t.engine.setProfile("inconnu", validProfile())).toThrow("Joueur inconnu");
  });

  it("accepte un avatar prédéfini et retire les espaces du pseudo", () => {
    const t = createTestEngine({ players: 1 });
    t.engine.setProfile(t.ids[0]!, { ...validProfile("  Zoé  "), avatar: { kind: "preset", id: "renard" } });
    const p = t.engine.snapshot(null).players[0]!.profile!;
    expect(p.name).toBe("Zoé");
    expect(p.avatar).toEqual({ kind: "preset", id: "renard" });
  });

  it("kick retire le joueur et débloque les résultats", () => {
    const t = startPlaying();
    t.clock.advance(T.round);
    t.engine.continue(t.ids[0]!);
    t.engine.continue(t.ids[1]!);
    t.engine.kick(t.ids[2]!);
    expect(t.engine.hasPlayer(t.ids[2]!)).toBe(false);
    expect(t.engine.snapshot(null).players).toHaveLength(2);
    expect(t.engine.snapshot(null).phase).toBe("intro");
    // son ancien jeton ne redonne pas le même joueur
    expect(t.engine.join(t.players[2]!.token).playerId).not.toBe(t.ids[2]!);
  });
});

describe("resultsAt", () => {
  it("vaut null hors des résultats puis l'heure serveur de fin de manche", () => {
    const t = startPlaying();
    expect(t.engine.snapshot(null).round!.resultsAt).toBeNull();
    t.clock.advance(T.round);
    const at = t.clock.now();
    expect(t.engine.snapshot(null).round!.resultsAt).toBe(at);
    t.clock.advance(5000);
    expect(t.engine.snapshot(t.ids[0]!).round!.resultsAt).toBe(at);
    t.engine.skip(); // manche suivante
    expect(t.engine.snapshot(null).round!.resultsAt).toBeNull();
  });

  it("une fin anticipée (ctx.end) l'horodate aussi", () => {
    const t = startPlaying();
    t.clock.advance(1234);
    t.engine.input(t.ids[0]!, { end: true });
    expect(t.engine.snapshot(null).round!.resultsAt).toBe(t.clock.now());
  });
});

describe("présence en direct", () => {
  it("ctx.isConnected suit les connexions et onPresenceChange est appelé pendant le jeu", () => {
    const t = startPlaying();
    const [a, b, c] = t.ids as [string, string, string];
    t.engine.input(a, { endWhenAlone: true });
    t.engine.disconnect(b);
    expect(t.fake.lastState.presence).toEqual([a, c]);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.engine.disconnect(c);
    expect(t.fake.lastState.presence).toEqual([a]);
    expect(t.engine.snapshot(null).phase).toBe("results"); // ctx.end() dans le hook
  });

  it("une reconnexion est signalée une seule fois (2e onglet ignoré)", () => {
    const t = startPlaying();
    const [a] = t.ids as [string];
    const token = t.players[0]!.token;
    t.engine.disconnect(a);
    const n = t.fake.calls.filter((c) => c === "presence").length;
    t.engine.join(token);
    expect(t.fake.calls.filter((c) => c === "presence")).toHaveLength(n + 1);
    t.engine.join(token); // 2e onglet : déjà connecté
    expect(t.fake.calls.filter((c) => c === "presence")).toHaveLength(n + 1);
    expect(t.fake.lastState.presence).toContain(a);
  });

  it("pas d'appel en intro, ni pour un non-participant, et rattrapage à la reprise après pause", () => {
    const t = createTestEngine();
    startRounds(t.engine); // intro
    t.engine.disconnect(t.ids[0]!);
    expect(t.fake.calls).not.toContain("presence");
    t.clock.advance(T.intro);
    const late = t.engine.join(null); // arrivé en cours de manche : pas participant
    t.engine.setProfile(late.playerId, validProfile("Retard"));
    t.engine.disconnect(late.playerId);
    expect(t.fake.calls).not.toContain("presence");

    t.engine.pause();
    t.engine.disconnect(t.ids[1]!);
    expect(t.fake.calls).not.toContain("presence");
    t.engine.resume();
    expect(t.fake.calls).toContain("presence");
    expect(t.fake.lastState.presence).toEqual([t.ids[2]!]);
  });
});

describe("scores et snapshot", () => {
  it("les points s'accumulent et les deltas ne sont visibles qu'en results", () => {
    const t = startPlaying();
    const [a, b] = t.ids as [string, string];
    t.engine.input(a, { v: 10 });
    t.engine.input(b, { v: 5 });
    let s = t.engine.snapshot(null);
    expect(s.round).toMatchObject({ results: null, deltas: null });

    t.clock.advance(T.round);
    s = t.engine.snapshot(null);
    expect(s.round!.deltas).toEqual({ [a]: 10, [b]: 5 });
    expect(s.round!.results).toEqual({ item: expect.any(String) });
    expect(s.players.find((p) => p.id === a)!.score).toBe(10);

    t.engine.skip(); // → manche 2
    expect(t.engine.snapshot(null).round).toMatchObject({ results: null, deltas: null });
    t.engine.skip(); // → playing
    t.engine.input(a, { v: 7 });
    t.engine.skip();
    s = t.engine.snapshot(null);
    expect(s.round!.deltas).toEqual({ [a]: 7 });
    expect(s.players.find((p) => p.id === a)!.score).toBe(17);
    expect(s.players.find((p) => p.id === b)!.score).toBe(5);
  });

  it("ignore les points d'un joueur inconnu ou non numériques", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { v: Infinity });
    t.engine.skip();
    expect(t.engine.snapshot(null).players[0]!.score).toBe(0);
    expect(t.engine.snapshot(null).round!.deltas).toEqual({});
  });

  it("après la dernière manche : phase final sans manche en cours", () => {
    const t = startPlaying({ rounds: 1 });
    t.clock.advance(T.round);
    for (const id of t.ids) t.engine.continue(id);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "transition", round: null, transition: { kind: "closing" } });
    t.engine.skip();
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("final");
    expect(s.round).toBeNull();
    expect(t.clock.pendingCount).toBe(0);
  });

  it("backToLobby remet les scores à zéro et garde les joueurs", () => {
    const t = startPlaying();
    t.engine.input(t.ids[0]!, { v: 50 });
    t.engine.skip();
    t.engine.backToLobby();
    const s = t.engine.snapshot(null);
    expect(s).toMatchObject({ phase: "lobby", round: null, paused: false, continued: [] });
    expect(s.players).toHaveLength(3);
    expect(s.players.every((p) => p.score === 0 && p.profile)).toBe(true);
    expect(t.clock.pendingCount).toBe(0);
    // on peut relancer une partie
    startRounds(t.engine);
    expect(t.engine.snapshot(null).phase).toBe("intro");
  });

  it("le catalogue et le joinUrl sont exposés", () => {
    const t = createTestEngine();
    const s = t.engine.snapshot(null);
    expect(s.joinUrl).toBe("http://test");
    expect(s.title).toBe("Test");
    expect(s.catalog[0]).toMatchObject({ id: "fake", available: 5, secondsPerRound: 9 });
  });
});

describe("robustesse face aux bugs d'un mini-jeu", () => {
  it("start() qui lève : la manche est sautée", () => {
    const t = createTestEngine({ rounds: 2, game: { items: ["ok", "bad"], failStart: (i) => i === "bad" } });
    startRounds(t.engine);
    t.clock.advance(T.intro + T.round);
    // une seule manche jouable : après elle on arrive au final
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "results" });
    for (const id of t.ids) t.engine.continue(id);
    expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("final");
    expect(t.fake.calls.filter((c) => c === "finish")).toHaveLength(1);
  });

  it("si toutes les manches plantent au démarrage, on va au final sans planter", () => {
    const t = createTestEngine({ game: { failStart: () => true } });
    startRounds(t.engine);
    expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("final");
  });

  it("finish() qui lève : résultats null, pas de points, la partie continue", () => {
    const t = startPlaying({ game: { failFinish: true } });
    t.engine.input(t.ids[0]!, { v: 10 });
    t.clock.advance(T.round);
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round).toMatchObject({ results: null, deltas: {} });
    expect(s.players.every((p) => p.score === 0)).toBe(true);
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("intro");
  });

  it("input() qui lève une Error ne fait pas tomber la manche", () => {
    const t = startPlaying();
    expect(() => t.engine.input(t.ids[0]!, { boom: true })).not.toThrow();
    t.engine.input(t.ids[1]!, { v: 3 });
    t.clock.advance(T.round);
    expect(t.engine.snapshot(null).round!.deltas).toEqual({ [t.ids[1]!]: 3 });
  });
});

describe("manches interlude (jeu surprise)", () => {
  /** Jeu normal « a » + interlude « s » (une fois toutes les 2 manches normales). */
  function withInterlude(counts: Record<string, number>, o: Parameters<typeof createTestEngine>[0] = {}) {
    const a = makeFakeGame({ id: "a", items: 6 });
    const s = makeFakeGame({ id: "s", items: 4, interlude: 2 });
    const t = createTestEngine({ ...o, games: [a.loaded, s.loaded] });
    t.engine.setSetup({ counts });
    return { ...t, a, s };
  }

  it("saute l'écran d'annonce : directement en playing, onPlay appelé, chrono lancé", () => {
    const t = withInterlude({ a: 0, s: 1 });
    startRounds(t.engine);
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("playing");
    expect(s.round).toMatchObject({ gameId: "s", interlude: true });
    expect(s.round!.deadline).toBe(t.clock.now() + T.round);
    expect(t.s.calls).toEqual(["start", "onPlay"]);
  });

  it("une manche normale garde son annonce", () => {
    const t = withInterlude({ a: 1, s: 1 });
    startRounds(t.engine);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "intro", round: { interlude: false } });
  });

  it("l'interlude s'intercale dans le plan et ne compte pas dans « Manche x / y »", () => {
    const t = withInterlude({ a: 4, s: 1 });
    startRounds(t.engine);
    const seen: { game: string; number: number; normalTotal: number; total: number; interlude: boolean }[] = [];
    for (let guard = 0; guard < 20; guard++) {
      const s = t.engine.snapshot(null);
      if (s.phase === "final") break;
      if (s.phase === "transition") t.engine.skip();
      else if (s.phase === "intro") t.clock.advance(T.intro);
      else if (s.phase === "playing") t.clock.advance(T.round);
      else {
        seen.push({ game: s.round!.gameId, number: s.round!.number, normalTotal: s.round!.normalTotal, total: s.round!.total, interlude: s.round!.interlude });
        t.engine.skip();
      }
    }
    expect(seen).toHaveLength(6); // 4 manches normales + 2 interludes
    expect(seen.filter((r) => r.interlude)).toHaveLength(2);
    expect(seen.every((r) => r.normalTotal === 4 && r.total === 6)).toBe(true);
    expect(seen.filter((r) => !r.interlude).map((r) => r.number)).toEqual([1, 2, 3, 4]);
    expect(seen[0]!.interlude).toBe(false);
  });

  it("pause, +10 s et « Passer » restent disponibles pendant un interlude", () => {
    const t = withInterlude({ a: 0, s: 1 });
    startRounds(t.engine);
    t.engine.pause();
    expect(t.engine.snapshot(null).paused).toBe(true);
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.engine.resume();
    t.engine.addTime(10);
    expect(t.engine.snapshot(null).round!.timerTotalMs).toBe(T.round + 10_000);
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("les résultats d'un interlude marquent des points normalement", () => {
    const t = withInterlude({ a: 0, s: 1 });
    startRounds(t.engine);
    t.engine.input(t.ids[0]!, { v: 25 });
    t.clock.advance(T.round);
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [t.ids[0]!]: 25 });
    expect(s.players.find((p) => p.id === t.ids[0])!.score).toBe(25);
  });

  it("la sauvegarde contient les interludes ; la reprise rejoue l'interlude interrompu sans annonce", () => {
    const persistence = new MemoryPersistence();
    const t = withInterlude({ a: 2, s: 1 }, { persistence });
    startRounds(t.engine);
    for (let guard = 0; guard < 10 && !t.engine.snapshot(null).round!.interlude; guard++) {
      const phase = t.engine.snapshot(null).phase;
      if (phase === "intro") t.clock.advance(T.intro);
      else if (phase === "playing") t.clock.advance(T.round);
      else t.engine.skip();
    }
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "playing", round: { interlude: true } });
    expect(persistence.data!.phase).toBe("playing");
    expect(persistence.data!.plan.filter((r) => r.interlude)).toHaveLength(1);
    const savedIndex = persistence.data!.roundIndex;

    // Redémarrage du serveur
    const a = makeFakeGame({ id: "a", items: 6 });
    const s = makeFakeGame({ id: "s", items: 4, interlude: 2 });
    const clock = new FakeClock();
    const engine = new GameEngine({
      games: [a.loaded, s.loaded],
      settings: { title: "Test", targetMinutes: 1, order: "melange", introSeconds: 4 },
      joinUrl: "http://test",
      clock,
      rng: seededRng(1),
      persistence,
    });
    // « Manche 1/2 » : l'interlude n'est pas compté dans la proposition de reprise.
    expect(engine.snapshot(null).resumable).toMatchObject({ total: 2 });
    engine.resumeSave();
    const after = engine.snapshot(null);
    expect(after).toMatchObject({ phase: "playing", round: { index: savedIndex, interlude: true } });
    expect(s.calls).toEqual(["start", "onPlay"]);
  });
});

describe("skins", () => {
  const restart = (t: ReturnType<typeof createTestEngine>, persistence: MemoryPersistence, seed: number) =>
    new GameEngine({
      games: [t.fake.loaded],
      settings: { title: "Test", targetMinutes: 1, order: "melange", introSeconds: 4 },
      joinUrl: "http://test",
      clock: new FakeClock(),
      rng: seededRng(seed),
      persistence,
    });

  it("le lobby reste dans le thème de base ; sans frontière le premier skin reste sur toutes les manches", () => {
    const t = createTestEngine({ rounds: 8, game: { items: 8 } });
    expect(t.engine.snapshot(null).skin).toBeNull();
    startRounds(t.engine);
    const skin = t.engine.snapshot(null).skin;
    expect(SKINS).toContain(skin!);
    for (let i = 0; i < 8; i++) {
      expect(t.engine.snapshot(null).skin).toBe(skin);
      t.clock.advance(4000);
      expect(t.engine.snapshot(null).skin).toBe(skin);
      t.clock.advance(10_000);
      expect(t.engine.snapshot(null)).toMatchObject({ phase: "results", skin });
      t.engine.skip();
    }
    expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
    t.engine.skip();
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "final", skin: null });
  });

  it("le premier ordre est tiré au hasard, sauvegardé et retiré au retour au lobby", () => {
    const orderOf = (seed: number) => {
      const persistence = new MemoryPersistence();
      const t = createTestEngine({ seed, persistence });
      startRounds(t.engine);
      return persistence.data!.skinOrder!;
    };
    expect(orderOf(1)).toEqual(orderOf(1));
    expect(new Set([1, 2, 3, 4, 5, 6].map((seed) => orderOf(seed).join())).size).toBeGreaterThan(1);
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    const firsts = Array.from({ length: 6 }, () => {
      t.engine.backToLobby();
      expect(t.engine.snapshot(null).skin).toBeNull();
      startRounds(t.engine);
      return t.engine.snapshot(null).skin;
    });
    expect(new Set(firsts).size).toBeGreaterThan(1);
  });

  it("le plan enrichi de skins est conservé à la reprise, même avec un autre rng", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ rounds: 3, persistence });
    startRounds(t.engine);
    t.clock.advance(14_000);
    t.engine.skip();
    const saved = structuredClone(persistence.data!);
    const expected = t.engine.snapshot(null).skin;
    const engine = restart(t, persistence, 999);
    engine.resumeSave();
    expect(engine.snapshot(null).skin).toBe(expected);
    expect(persistence.data!.plan).toEqual(saved.plan);
    expect(persistence.data!.skinOrder).toEqual(saved.skinOrder);
  });

  it("une ancienne sauvegarde sans ordre ou avec ordre invalide reste reprenable", () => {
    for (const bad of [undefined, ["dofus", "zelda"]]) {
      const persistence = new MemoryPersistence();
      const t = createTestEngine({ persistence });
      startRounds(t.engine);
      (persistence.data as { skinOrder?: unknown }).skinOrder = bad;
      for (const round of persistence.data!.plan) delete round.skin;
      const engine = restart(t, persistence, 5);
      engine.resumeSave();
      expect(engine.snapshot(null).phase).toBe("intro");
      expect(SKINS).toContain(engine.snapshot(null).skin!);
    }
  });

  it("retire GunZ d'un ancien ordre tout en conservant les six skins restants", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    startRounds(t.engine);
    const expected = [...persistence.data!.skinOrder!];
    (persistence.data as { skinOrder?: unknown }).skinOrder = [expected[0], "gunz", ...expected.slice(1)];
    const engine = restart(t, persistence, 999);
    engine.resumeSave();
    expect(persistence.data!.skinOrder).toEqual(expected);
    expect(engine.snapshot(null).skin).toBe(expected[0]!);
  });
});

// ───────────────────────────── Minuit ─────────────────────────────
describe("minuit : compte à rebours et pause automatique", () => {
  const at = (h: number, m: number, s = 0, day = 31, month = 11) => new Date(month === 11 ? 2026 : 2027, month, day, h, m, s).getTime();
  const S = 1000;
  const cfg = { time: "00:00", countdownSeconds: 60, autoResumeSeconds: 120 };
  const midnightEngine = (start: number, o: Parameters<typeof createTestEngine>[0] = {}, midnight: Partial<typeof cfg> = {}) =>
    createTestEngine({ ...o, clock: o.clock ?? new FakeClock(start), settings: { midnight: { ...cfg, ...midnight }, ...o.settings } });
  const snap = (t: { engine: GameEngine }) => t.engine.snapshot(null);

  it("se déclenche à heure - durée, dans le lobby aussi, puis célèbre et s'efface (reprise auto)", () => {
    const t = midnightEngine(at(23, 58));
    expect(snap(t).midnight).toBeNull();
    t.clock.advance(59 * S);
    expect(snap(t).midnight).toBeNull();
    t.clock.advance(1 * S);
    expect(snap(t).midnight).toEqual({ targetAt: at(0, 0, 0, 1, 0), phase: "countdown", year: 2027 });
    expect(snap(t).paused).toBe(false); // rien à mettre en pause au lobby
    t.clock.advance(60 * S - 1);
    expect(snap(t).midnight?.phase).toBe("countdown");
    t.clock.advance(1);
    expect(snap(t).midnight?.phase).toBe("celebrate");
    t.clock.advance(120 * S - 1);
    expect(snap(t).midnight?.phase).toBe("celebrate");
    t.clock.advance(1);
    expect(snap(t).midnight).toBeNull();
  });

  it("ne se déclenche qu'une fois par nuit", () => {
    const t = midnightEngine(at(23, 58));
    t.clock.advance(5 * 60 * S);
    expect(snap(t).midnight).toBeNull();
    t.clock.advance(60 * 60 * S);
    expect(snap(t).midnight).toBeNull();
    t.clock.advance((22 * 3600 + 56 * 60) * S); // la nuit suivante, 23:59:00 : de nouveau possible
    expect(snap(t).midnight).not.toBeNull();
  });

  it("un serveur lancé après minuit ne déclenche rien ; lancé dans la fenêtre il affiche le temps restant", () => {
    const late = midnightEngine(at(0, 0, 10, 1, 0));
    expect(snap(late).midnight).toBeNull();
    late.clock.advance(3600 * S);
    expect(snap(late).midnight).toBeNull();
    const inside = midnightEngine(at(23, 59, 40));
    expect(snap(inside).midnight).toMatchObject({ phase: "countdown", targetAt: at(0, 0, 0, 1, 0) });
  });

  it("désactivé sans réglage : aucun minuteur, aucun état", () => {
    const t = createTestEngine({ clock: new FakeClock(at(23, 59, 30)) });
    expect(snap(t).midnight).toBeNull();
    expect(t.clock.pendingCount).toBe(0);
  });

  it("met la manche en pause (chrono figé), la reprise automatique relance avec le temps restant", () => {
    const t = midnightEngine(at(23, 58, 55));
    startRounds(t.engine);
    t.clock.advance(T.intro); // 23:58:59, jeu lancé, fin du chrono à 23:59:09
    t.clock.advance(1 * S);
    expect(snap(t)).toMatchObject({ phase: "playing", paused: true, skin: null });
    expect(snap(t).round).toMatchObject({ deadline: null, pausedRemainingMs: 9000 });
    t.clock.advance(60 * S + 60 * S);
    expect(snap(t)).toMatchObject({ phase: "playing", paused: true });
    expect(snap(t).round!.pausedRemainingMs).toBe(9000);
    expect(() => t.engine.input(t.ids[0]!, {})).toThrow(GameError);
    t.clock.advance(60 * S); // 120 s après minuit
    expect(snap(t)).toMatchObject({ phase: "playing", paused: false, midnight: null });
    expect(snap(t).round!.deadline).toBe(t.clock.now() + 9000);
    t.clock.advance(9000);
    expect(snap(t).phase).toBe("results");
  });

  it("met aussi en pause une scène de transition et la relance au bon endroit", () => {
    const t = midnightEngine(at(23, 58, 58));
    t.engine.start(); // scène d'ouverture de 9 s
    t.clock.advance(2 * S);
    expect(snap(t)).toMatchObject({ phase: "transition", paused: true });
    t.clock.advance(179 * S);
    expect(snap(t)).toMatchObject({ phase: "transition", paused: true });
    t.clock.advance(1 * S); // reprise auto : il reste 7 s de scène
    expect(snap(t)).toMatchObject({ phase: "transition", paused: false, midnight: null });
    t.clock.advance(6999);
    expect(snap(t).phase).toBe("transition");
    t.clock.advance(1);
    expect(snap(t).phase).toBe("intro");
  });

  it("pendant minuit : Passer, +10 s et les réponses sont ignorés, Reprendre n'agit pas avant la célébration", () => {
    const t = midnightEngine(at(23, 58, 55));
    startRounds(t.engine);
    t.clock.advance(5 * S);
    t.engine.skip();
    t.engine.addTime(10);
    t.engine.resume();
    expect(snap(t)).toMatchObject({ phase: "playing", paused: true, midnight: { phase: "countdown" } });
    expect(snap(t).round!.pausedRemainingMs).toBe(9000);
  });

  it("l'hôte relance la partie en cliquant Reprendre pendant la célébration", () => {
    const t = midnightEngine(at(23, 58, 55));
    startRounds(t.engine);
    t.clock.advance(65 * S);
    expect(snap(t).midnight?.phase).toBe("celebrate");
    t.engine.resume();
    expect(snap(t)).toMatchObject({ phase: "playing", paused: false, midnight: null });
    expect(snap(t).round!.deadline).toBe(t.clock.now() + 9000);
    t.clock.advance(10 * 60 * S);
    expect(snap(t).phase).not.toBe("lobby");
  });

  it("reprise_auto = 0 : seul l'hôte relance", () => {
    const t = midnightEngine(at(23, 59, 30), {}, { autoResumeSeconds: 0 });
    t.clock.advance(3600 * S);
    expect(snap(t).midnight?.phase).toBe("celebrate");
    t.engine.resume();
    expect(snap(t).midnight).toBeNull();
  });

  it("pause de l'hôte posée avant minuit : la reprise auto la respecte, le bouton Reprendre la lève", () => {
    const t = midnightEngine(at(23, 58, 55));
    startRounds(t.engine);
    t.clock.advance(T.intro);
    t.engine.pause();
    t.clock.advance(181 * S);
    expect(snap(t)).toMatchObject({ phase: "playing", paused: true, midnight: null });
    const u = midnightEngine(at(23, 58, 55));
    startRounds(u.engine);
    u.clock.advance(T.intro);
    u.engine.pause();
    u.clock.advance(65 * S);
    u.engine.resume();
    expect(snap(u)).toMatchObject({ paused: false, midnight: null });
  });

  it("une manche en résultats n'avance pas pendant minuit, même si tout le monde clique Continuer", () => {
    const t = midnightEngine(at(23, 58, 40));
    startRounds(t.engine);
    t.clock.advance(T.intro + T.round); // résultats à 23:58:54
    expect(snap(t).phase).toBe("results");
    t.clock.advance(6 * S);
    expect(snap(t)).toMatchObject({ phase: "results", midnight: { phase: "countdown" }, paused: true });
    for (const id of t.ids) t.engine.continue(id);
    expect(snap(t).phase).toBe("results");
    t.clock.advance(180 * S);
    expect(snap(t)).toMatchObject({ phase: "intro", midnight: null }); // tous avaient cliqué : on avance à la fin de minuit
  });

  it("écran final : la révélation reprend où elle en était", () => {
    const t = midnightEngine(at(23, 40));
    startRounds(t.engine);
    for (let i = 0; i < 20 && snap(t).phase !== "final"; i++) t.engine.skip();
    expect(snap(t).phase).toBe("final");
    const startedAt = snap(t).finalReveal!.startedAt;
    t.clock.advance(19 * 60 * S); // 23:59:00
    expect(snap(t).midnight?.phase).toBe("countdown");
    t.clock.advance(180 * S);
    expect(snap(t).midnight).toBeNull();
    expect(snap(t).finalReveal!.startedAt).toBe(startedAt + 180 * S);
  });

  it("sauvegarde : une célébration en cours est retrouvée après un crash, pas une ancienne", () => {
    const persistence = new MemoryPersistence();
    const a = midnightEngine(at(23, 58, 55), { persistence });
    startRounds(a.engine);
    a.clock.advance(70 * S);
    expect(persistence.data?.midnight).toEqual({ targetAt: at(0, 0, 0, 1, 0) });
    a.clock.advance(20 * S); // redémarrage 20 s plus tard, même horloge
    const b = midnightEngine(0, { persistence, clock: a.clock });
    expect(snap(b)).toMatchObject({ phase: "lobby", midnight: { phase: "celebrate" } });
    expect(snap(b).resumable).not.toBeNull();
    b.engine.resumeSave(); // la partie reprise reste figée sous l'écran de minuit
    expect(snap(b)).toMatchObject({ paused: true, midnight: { phase: "celebrate" } });
    b.engine.resume();
    expect(snap(b)).toMatchObject({ paused: false, midnight: null });
    // trop tard : la célébration n'est pas ressuscitée
    const old = new MemoryPersistence();
    old.data = { ...persistence.data!, midnight: { targetAt: at(0, 0, 0, 1, 0) } };
    const c = midnightEngine(at(0, 10, 0, 1, 0), { persistence: old });
    expect(snap(c).midnight).toBeNull();
  });

  it("un compte à rebours au lobby n'écrase pas la partie interrompue qui attend sa reprise", () => {
    const persistence = new MemoryPersistence();
    const a = createTestEngine({ persistence });
    startRounds(a.engine);
    a.clock.advance(T.intro);
    const saved = structuredClone(persistence.data);
    const writes: unknown[] = [];
    const b = midnightEngine(at(23, 59, 30), { players: 0, persistence: { load: () => saved, save: (d) => void writes.push(d) } });
    expect(snap(b).midnight).toMatchObject({ phase: "countdown" });
    expect(snap(b).resumable).not.toBeNull();
    expect(writes).toHaveLength(0);
  });

  it("l'hôte peut revenir au lobby pendant minuit sans rien casser", () => {
    const t = midnightEngine(at(23, 58, 55));
    startRounds(t.engine);
    t.clock.advance(65 * S);
    t.engine.backToLobby();
    expect(snap(t)).toMatchObject({ phase: "lobby", paused: false, midnight: { phase: "celebrate" } });
    t.engine.resume();
    expect(snap(t).midnight).toBeNull();
  });
});
