import { describe, expect, it } from "bun:test";
import { GameEngine, GameError } from "../../src/server/engine/engine";
import { assignRoundSkins, type LoadedGame, type PlannedRound } from "../../src/server/engine/planner";
import { SKINS } from "../../src/shared/skins";
import { TRANSITION_TIMING, transitionElapsed } from "../../src/shared/transitions";
import { createTestEngine, MemoryPersistence, startRounds, validProfile } from "./helpers/engine-setup";
import { FakeClock } from "./helpers/fake-clock";
import { makeFakeGame } from "./helpers/fake-game";
import { seededRng } from "./helpers/rng";

function restart(persistence: MemoryPersistence, games: LoadedGame[], at: number) {
  const clock = new FakeClock(at);
  const engine = new GameEngine({
    games, settings: { title: "Test", targetMinutes: 1, order: "melange", introSeconds: 4 },
    joinUrl: "http://test", clock, persistence, rng: seededRng(999),
  });
  return { engine, clock };
}

function partyWithSurprise(normalCount: number, surprises = 3, closesChapter = true, every = 2) {
  const normal = makeFakeGame({ id: "normal", items: normalCount });
  const surprise = makeFakeGame({ id: "surprise", items: surprises, interlude: every, changeSkinAfter: closesChapter });
  const persistence = new MemoryPersistence();
  const t = createTestEngine({ games: [normal.loaded, surprise.loaded], persistence });
  t.engine.setSetup({ counts: { normal: normalCount, surprise: 1 } });
  return { ...t, normal, surprise, persistence };
}

/** Joue une manche factice jusqu'aux résultats, sans avancer la transition suivante. */
function finishRound(t: ReturnType<typeof createTestEngine>) {
  if (t.engine.snapshot(null).phase === "intro") t.engine.skip();
  expect(t.engine.snapshot(null).phase).toBe("playing");
  t.engine.input(t.ids[0]!, { v: 3 });
  t.engine.skip();
  expect(t.engine.snapshot(null).phase).toBe("results");
}

describe("scènes de la pièce pilotées par le moteur", () => {
  it("l'ouverture part du thème de base et n'exécute ni start ni chrono de jeu sous la scène", () => {
    const t = createTestEngine({ players: 8 });
    expect(t.engine.snapshot(null).skin).toBeNull();
    t.engine.start();
    const s = t.engine.snapshot(null);
    expect(s).toMatchObject({ phase: "transition", skin: null, round: null, transition: { kind: "opening", fromSkin: null, playerIds: t.ids } });
    expect(s.transition!.durationMs).toBe(TRANSITION_TIMING.opening.durationMs);
    expect(t.fake.calls).toEqual([]);
    expect(() => t.engine.input(t.ids[0]!, { v: 99 })).toThrow(GameError);
    for (const id of t.ids) t.engine.continue(id);
    expect(t.engine.snapshot(null).round).toBeNull();
    t.clock.advance(TRANSITION_TIMING.opening.swapAtMs - 1);
    expect(t.engine.snapshot(null).skin).toBeNull();
    t.clock.advance(1);
    expect(t.engine.snapshot(null).skin).toBe(s.transition!.toSkin);
    expect(t.fake.calls).toEqual([]);
    t.clock.advance(TRANSITION_TIMING.opening.durationMs - TRANSITION_TIMING.opening.swapAtMs);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "intro", transition: null, round: { index: 0, deadline: null } });
    expect(t.fake.calls).toEqual(["start"]);
    t.clock.advance(4000);
    expect(t.fake.calls).toEqual(["start", "onPlay"]);
  });

  it("pause, reconnexion et arrivées gardent la progression et les portraits de la scène", () => {
    const t = createTestEngine();
    t.engine.start();
    t.clock.advance(2100);
    t.engine.pause();
    const scene = t.engine.snapshot(null).transition!;
    expect(transitionElapsed(scene, t.clock.now())).toBe(2100);
    t.engine.disconnect(t.ids[0]!);
    t.engine.join(t.players[0]!.token);
    const late = t.engine.join(null);
    t.engine.setProfile(late.playerId, validProfile("Retardataire"));
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "transition", paused: true, round: null });
    expect(transitionElapsed(t.engine.snapshot(null).transition!, t.clock.now())).toBe(2100);
    expect(t.engine.snapshot(null).transition!.playerIds).toEqual(scene.playerIds);
    t.engine.resume();
    t.clock.advance(TRANSITION_TIMING.opening.durationMs - 2100 - 1);
    expect(t.engine.snapshot(null).phase).toBe("transition");
    t.clock.advance(1);
    expect(t.engine.snapshot(null).phase).toBe("intro");
    expect(t.engine.snapshot(null).round!.participants).toContain(late.playerId);
  });

  it("Passer sous pause annule les timers de scène sans finir prématurément la manche lancée", () => {
    const t = createTestEngine({ game: { seconds: 100 } });
    t.engine.start();
    t.engine.pause();
    t.engine.skip();
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "intro", paused: false, transition: null });
    t.clock.advance(4000);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.clock.advance(TRANSITION_TIMING.opening.durationMs * 2);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    expect(t.fake.calls.filter((call) => call === "onPlay")).toHaveLength(1);
    expect(t.fake.calls).not.toContain("finish");
  });

  it("retour lobby annule toute scène et toute ancienne échéance", () => {
    const t = createTestEngine();
    t.engine.start();
    t.clock.advance(1500);
    t.engine.backToLobby();
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "lobby", skin: null, transition: null, round: null, paused: false });
    expect(t.clock.pendingCount).toBe(0);
    expect(t.fake.calls).toEqual([]);
  });

  it("la reprise d'une scène non pausée retrouve le temps écoulé, sans lancer deux fois le jeu", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    t.clock.advance(2500);
    const b = restart(persistence, [t.fake.loaded], t.clock.now() + 500);
    expect(b.engine.snapshot(null).resumable).not.toBeNull();
    b.engine.resumeSave();
    expect(b.engine.snapshot(null)).toMatchObject({ phase: "transition", round: null, paused: false });
    expect(transitionElapsed(b.engine.snapshot(null).transition!, b.clock.now())).toBe(3000);
    b.clock.advance(TRANSITION_TIMING.opening.durationMs - 3000);
    expect(b.engine.snapshot(null).phase).toBe("intro");
    expect(t.fake.calls).toEqual(["start"]);
  });

  it("une pause sauvegardée reste figée après un arrêt prolongé du serveur", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    t.clock.advance(2600);
    t.engine.pause();
    const b = restart(persistence, [t.fake.loaded], t.clock.now() + 120_000);
    b.engine.resumeSave();
    expect(b.engine.snapshot(null)).toMatchObject({ phase: "transition", paused: true, round: null });
    b.clock.advance(60_000);
    expect(transitionElapsed(b.engine.snapshot(null).transition!, b.clock.now())).toBe(2600);
    b.engine.resume();
    b.clock.advance(TRANSITION_TIMING.opening.durationMs - 2600);
    expect(b.engine.snapshot(null)).toMatchObject({ phase: "intro", paused: false });
  });

  it("la reprise après une scène déjà écoulée atteint directement sa destination", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    const b = restart(persistence, [t.fake.loaded], t.clock.now() + 120_000);
    b.engine.resumeSave();
    expect(b.engine.snapshot(null)).toMatchObject({ phase: "intro", transition: null, round: { index: 0 } });
    expect(t.fake.calls).toEqual(["start"]);
  });

  it("la dernière manche sort vers la pièce avant le podium, sans rejouer les points à la reprise", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ rounds: 1, persistence });
    startRounds(t.engine);
    finishRound(t);
    t.engine.skip();
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "transition", round: null, finalReveal: null, transition: { kind: "closing", toSkin: null } });
    t.clock.advance(300);
    t.engine.pause();
    const b = restart(persistence, [t.fake.loaded], t.clock.now() + 10_000);
    b.engine.resumeSave();
    expect(b.engine.snapshot(null).players[0]!.score).toBe(3);
    expect(b.engine.snapshot(null).transition?.kind).toBe("closing");
    b.engine.skip();
    expect(b.engine.snapshot(null)).toMatchObject({ phase: "final", skin: null, transition: null });
    expect(b.engine.snapshot(null).players[0]!.score).toBe(3);
    expect(t.fake.calls.filter((call) => call === "finish")).toHaveLength(1);
    expect(b.clock.pendingCount).toBe(0);
  });
});

describe("frontières d'univers", () => {
  it("garde le skin jusqu'aux résultats de la surprise, puis bascule avant toute nouvelle manche", () => {
    const t = partyWithSurprise(4);
    startRounds(t.engine);
    let boundaries = 0;
    let played = 0;
    for (let guard = 0; guard < 20 && t.engine.snapshot(null).phase !== "final"; guard++) {
      finishRound(t);
      played++;
      const result = t.engine.snapshot(null);
      const score = result.players[0]!.score;
      if (result.round!.interlude && result.round!.index < result.round!.total - 1) {
        const starts = t.normal.calls.filter((call) => call === "start").length + t.surprise.calls.filter((call) => call === "start").length;
        for (const id of t.ids) t.engine.continue(id);
        const transition = t.engine.snapshot(null).transition!;
        expect(transition).toMatchObject({ kind: "skin", fromSkin: result.skin });
        expect(transition.toSkin).not.toBe(result.skin);
        expect(t.engine.snapshot(null)).toMatchObject({ round: null, skin: result.skin });
        t.clock.advance(TRANSITION_TIMING.skin.swapAtMs - 1);
        expect(t.engine.snapshot(null).skin).toBe(result.skin);
        t.clock.advance(1);
        expect(t.engine.snapshot(null).skin).toBe(transition.toSkin);
        expect(t.normal.calls.filter((call) => call === "start").length + t.surprise.calls.filter((call) => call === "start").length).toBe(starts);
        expect(t.engine.snapshot(null).players[0]!.score).toBe(score);
        t.clock.advance(TRANSITION_TIMING.skin.durationMs - TRANSITION_TIMING.skin.swapAtMs);
        boundaries++;
      } else {
        t.engine.skip();
      }
      if (t.engine.snapshot(null).transition?.kind === "closing") t.engine.skip();
    }
    expect(played).toBe(6);
    expect(boundaries).toBeGreaterThanOrEqual(1);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "final", skin: null });
    expect(t.engine.snapshot(null).players[0]!.score).toBe(18);
  });

  it("un autre interlude sans marqueur n'impose aucun changement de skin", () => {
    const t = partyWithSurprise(4, 2, false);
    startRounds(t.engine);
    const skin = t.engine.snapshot(null).skin;
    for (let n = 0; n < 6; n++) {
      finishRound(t);
      expect(t.engine.snapshot(null).skin).toBe(skin);
      t.engine.skip();
      if (t.engine.snapshot(null).phase === "transition") expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
    }
  });

  it("une surprise en dernière manche mène directement à la sortie, sans univers vide", () => {
    const t = partyWithSurprise(1, 1, true, 1);
    startRounds(t.engine);
    finishRound(t);
    const skin = t.engine.snapshot(null).skin;
    t.engine.skip();
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "playing", skin, round: { interlude: true } });
    finishRound(t);
    t.engine.skip();
    expect(t.engine.snapshot(null).transition).toMatchObject({ kind: "closing", fromSkin: skin, toSkin: null });
  });

  it("l'épuisement des surprises laisse le dernier univers actif", () => {
    const t = partyWithSurprise(6, 1);
    startRounds(t.engine);
    const seen = new Set();
    let changes = 0;
    for (let n = 0; n < 7; n++) {
      seen.add(t.engine.snapshot(null).skin);
      finishRound(t);
      t.engine.skip();
      if (t.engine.snapshot(null).transition?.kind === "skin") { changes++; t.engine.skip(); }
    }
    expect(changes).toBe(1);
    expect(seen.size).toBe(2);
    expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
  });

  it("plusieurs cycles mélangent les six univers sans répéter immédiatement le précédent", () => {
    const plan: PlannedRound[] = Array.from({ length: 14 }, (_, item) => ({ gameId: "x", item, changeSkinAfter: true }));
    const result = assignRoundSkins(plan, [...SKINS], seededRng(123));
    const skins = result.map((round) => round.skin);
    expect(skins.slice(0, 6)).toEqual([...SKINS]);
    expect([...skins.slice(6, 12)].sort()).toEqual([...SKINS].sort());
    for (let i = 1; i < skins.length; i++) expect(skins[i]).not.toBe(skins[i - 1]);
    expect(assignRoundSkins(plan, [...SKINS], seededRng(123))).toEqual(result);
  });
});
