import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { GameError } from "../../src/server/engine/engine";
import { createTestEngine, validProfile } from "./helpers/engine-setup";

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
  t.engine.start();
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
    t.engine.start();
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
    t.engine.start();
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
    t.engine.start();
    t.clock.advance(T.intro);
    expect(t.changes.count).toBeGreaterThan(before + 1);
  });
});

describe("entrées des joueurs", () => {
  it("refusées hors phase playing", () => {
    const t = createTestEngine();
    expect(() => t.engine.input(t.ids[0]!, { v: 1 })).toThrow("Pas maintenant"); // lobby
    t.engine.start();
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
    t.engine.start();
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
    expect(t.engine.snapshot(null).phase).toBe("final");
  });

  it("ne fait rien dans le lobby ni dans le final", () => {
    const t = createTestEngine({ rounds: 1 });
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("lobby");
    t.engine.start();
    for (let i = 0; i < 3; i++) t.engine.skip();
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

  it("la pause fige aussi l'intro", () => {
    const t = createTestEngine();
    t.engine.start();
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
    t.engine.start();
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
    t.engine.start();
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
      { ...validProfile(), avatar: { kind: "photo", url: "http://evil/x.png" } },
      { ...validProfile(), frame: "" },
    ];
    for (const p of bad) expect(() => t.engine.setProfile(id, p)).toThrow(GameError);
    expect(t.engine.snapshot(null).players[0]!.profile!.name).toBe("Joueur1");
    expect(() => t.engine.setProfile("inconnu", validProfile())).toThrow("Joueur inconnu");
  });

  it("accepte un profil photo valide et retire les espaces du pseudo", () => {
    const t = createTestEngine({ players: 1 });
    t.engine.setProfile(t.ids[0]!, { ...validProfile("  Zoé  "), avatar: { kind: "photo", url: "/photos/abc.webp?v=3" } });
    const p = t.engine.snapshot(null).players[0]!.profile!;
    expect(p.name).toBe("Zoé");
    expect(p.avatar).toEqual({ kind: "photo", url: "/photos/abc.webp?v=3" });
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
    t.engine.start(); // intro
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
    t.engine.start();
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
    t.engine.start();
    t.clock.advance(T.intro + T.round);
    // une seule manche jouable : après elle on arrive au final
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "results" });
    for (const id of t.ids) t.engine.continue(id);
    expect(t.engine.snapshot(null).phase).toBe("final");
    expect(t.fake.calls.filter((c) => c === "finish")).toHaveLength(1);
  });

  it("si toutes les manches plantent au démarrage, on va au final sans planter", () => {
    const t = createTestEngine({ game: { failStart: () => true } });
    t.engine.start();
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
