import { describe, expect, it } from "bun:test";
import { FINAL_TIMING, finalBeatAt, finalMarks, finalPhaseAt, finalRevealTimeline, finalRevealedCount, finalStarCounts, finalTimelineOf } from "../../src/shared/final-reveal";
import { createTestEngine, MemoryPersistence, validProfile, startRounds } from "./helpers/engine-setup";

describe("révélation finale synchronisée", () => {
  it("part du même instant pour la TV et les téléphones et résiste aux reconnexions", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ rounds: 1, players: 8, persistence });
    expect(t.engine.snapshot(null).finalReveal).toBeNull();
    startRounds(t.engine);
    t.engine.skip();
    t.engine.skip();
    expect(t.engine.snapshot(null).finalReveal).toBeNull();
    t.engine.skip();
    expect(t.engine.snapshot(null).transition?.kind).toBe("closing");
    expect(t.engine.snapshot(null).finalReveal).toBeNull();
    t.engine.skip();
    const reveal = t.engine.snapshot(null).finalReveal!;
    expect(reveal).toMatchObject({ startedAt: t.clock.now(), playerIds: t.ids });
    expect([...reveal.ranking!].sort()).toEqual([...t.ids].sort());
    expect(reveal.stars).toBeUndefined();
    expect(persistence.data!.finalReveal).toEqual(reveal);
    expect(t.engine.snapshot(t.ids[0]!).finalReveal).toEqual(reveal);

    t.clock.advance(2200);
    t.engine.disconnect(t.ids[0]!);
    t.engine.join(t.players[0]!.token);
    expect(t.engine.snapshot(t.ids[0]!).finalReveal).toEqual(reveal);

    // Un nouveau profil en fin de partie ne repousse pas le dévoilement pour tous les autres.
    const late = t.engine.join(null);
    t.engine.setProfile(late.playerId, validProfile("Retardataire"));
    expect(t.engine.snapshot(late.playerId).finalReveal).toEqual(reveal);
    expect(t.engine.snapshot(late.playerId).finalReveal!.playerIds).not.toContain(late.playerId);

    t.engine.backToLobby();
    expect(t.engine.snapshot(null).finalReveal).toBeNull();
    expect(persistence.data!.finalReveal).toBeNull();
    startRounds(t.engine);
    expect(t.engine.snapshot(null).finalReveal).toBeNull();
  });

  it("chronologie : du dernier au premier, la durée dépend des joueurs et de leurs étoiles", () => {
    const sans = finalRevealTimeline([0, 0, 0, 0, 0, 0, 0, 0]);
    const avec = finalRevealTimeline([0, 0, 0, 0, 0, 2, 0, 0]);
    expect(avec.durationMs - sans.durationMs).toBe(2 * FINAL_TIMING.starMs);
    expect(finalRevealTimeline([0, 0, 0, 0]).durationMs).toBeLessThan(sans.durationMs);
    // Ordre : intro, 5 joueurs hors podium, podium qui monte, 3e, 2e, roulement, 1er.
    expect(sans.beats.map((b) => b.kind)).toEqual(["intro", "joueur", "joueur", "joueur", "joueur", "joueur", "podium", "joueur", "joueur", "roulement", "premier"]);
    expect(sans.beats.filter((b) => b.rank !== undefined).map((b) => b.rank)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    // Les beats se suivent sans trou, et le rang n'est révélé qu'une fois sa conversion finie.
    sans.beats.forEach((b, i) => { if (i > 0) expect(b.startMs).toBe(sans.beats[i - 1]!.endMs); });
    expect(sans.beats.at(-1)!.endMs).toBe(sans.durationMs);
    for (let rank = 0; rank < 8; rank++) {
      const beat = sans.beats.find((b) => b.rank === rank)!;
      expect(sans.revealedAtMs[rank]).toBe(beat.settleAtMs!);
      expect(sans.revealedAtMs[rank]).toBeGreaterThan(beat.countAtMs! + FINAL_TIMING.countMs - 1);
    }
    expect(sans.revealedAtMs[7]!).toBeLessThan(sans.revealedAtMs[0]!);
    expect(finalRevealedCount(sans, 0)).toBe(0);
    expect(finalRevealedCount(sans, sans.durationMs)).toBe(8);
    // Le 1er n'est jamais révélé avant la fin du roulement.
    const drum = sans.beats.find((b) => b.kind === "roulement")!;
    expect(sans.revealedAtMs[0]!).toBeGreaterThan(drum.endMs);
  });

  it("sous-étapes d'un joueur : avance, score de base, étoiles une à une, rangement", () => {
    const timeline = finalRevealTimeline([0, 3, 0]);
    const beat = timeline.beats.find((b) => b.rank === 1)!;
    expect(finalPhaseAt(beat, beat.startMs).phase).toBe("advance");
    expect(finalPhaseAt(beat, beat.countAtMs!).phase).toBe("count");
    expect(finalPhaseAt(beat, beat.starAtMs![0]!)).toEqual({ phase: "stars", starsDone: 0, starIndex: 0 });
    expect(finalPhaseAt(beat, beat.starAtMs![2]!)).toEqual({ phase: "stars", starsDone: 2, starIndex: 2 });
    expect(finalPhaseAt(beat, beat.settleAtMs!)).toEqual({ phase: "settle", starsDone: 3, starIndex: null });
    expect(finalBeatAt(timeline, 0)!.kind).toBe("intro");
    expect(finalBeatAt(timeline, timeline.durationMs + 99999)!.kind).toBe("premier");
    const marks = finalMarks(timeline);
    expect(marks).toEqual([...marks].sort((a, b) => a - b));
    expect(marks.at(-1)).toBe(timeline.durationMs);
  });

  it("timeScale raccourcit tout, joueur seul et salon vide compris", () => {
    const full = finalRevealTimeline([1, 0, 2]);
    const fast = finalRevealTimeline([1, 0, 2], 0.1);
    expect(fast.durationMs).toBeLessThan(full.durationMs / 5);
    expect(finalRevealTimeline([0]).beats.map((b) => b.kind)).toEqual(["intro", "podium", "premier"]);
    expect(finalRevealTimeline([])).toEqual({ beats: [], durationMs: 0, revealedAtMs: [], podiumAtMs: null });
  });

  it("les étoiles viennent de la cérémonie et suivent le classement du serveur", () => {
    const reveal = { startedAt: 0, playerIds: ["a", "b", "c"], ranking: ["c", "a", "b"], stars: { a: [120, 120], b: [120] }, timeScale: 0.5 };
    expect(finalStarCounts(reveal)).toEqual([0, 2, 1]);
    expect(finalTimelineOf(reveal)).toEqual(finalRevealTimeline([0, 2, 1], 0.5));
    // Ancienne sauvegarde sans classement : aucune étoile, mais la chronologie reste valide.
    expect(finalStarCounts({ playerIds: ["a", "b"] })).toEqual([0, 0]);
  });
});
