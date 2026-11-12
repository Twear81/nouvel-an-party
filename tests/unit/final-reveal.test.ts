import { describe, expect, it } from "bun:test";
import { finalRevealTimeline } from "../../src/shared/final-reveal";
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
    expect(reveal).toEqual({ startedAt: t.clock.now(), playerIds: t.ids });
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

  it("laisse finir l'entrée du gagnant avant d'autoriser l'affichage sur téléphone", () => {
    // Cadence actuelle : départ 1,8 s ; 4 autres hors podium à 1 s ; podium à 1,7 s ; entrée 0,8 s.
    const eight = finalRevealTimeline(8);
    expect(eight.steps).toEqual([1800, 2800, 3800, 4800, 5800, 7500, 9200, 10900]);
    expect(eight.durationMs).toBe(11700);
    expect(finalRevealTimeline(1)).toEqual({ steps: [1800], durationMs: 2600 });
    expect(finalRevealTimeline(0)).toEqual({ steps: [], durationMs: 0 });
  });
});
