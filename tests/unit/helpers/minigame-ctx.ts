// Faux contexte de manche pour tester un mini-jeu sans moteur.
// Le temps est simulé : `ctx.advance(ms)` déclenche les timers (setTimeout) et la fin du chrono (countdown).
import type { RoundContext } from "../../../src/minigames/contract";
import type { PublicPlayer } from "../../../src/shared/types";

export function makePlayers(n: number): PublicPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    profile: { name: `Joueur${i + 1}`, avatar: { kind: "preset", id: "x" }, frame: "none", color: "#ff0000" },
    score: 0,
    connected: true,
  }));
}

export type TestCtx<Cfg> = RoundContext<Cfg> & {
  ended: boolean;
  /** Joueurs connectés (tous au départ) : modifier avec setConnected, puis appeler game.onPresenceChange. */
  connected: Set<string>;
  setConnected: (id: string, on: boolean) => void;
  /** Chrono visible en cours : secondes demandées et heure de fin, null si aucun. */
  countdownState: { seconds: number; endsAt: number } | null;
  /** Avance le temps simulé et déclenche les timers dus, dans l'ordre. */
  advance: (ms: number) => void;
  /** Saute directement à la fin du chrono en cours. */
  finishCountdown: () => void;
};

export function makeCtx<Cfg>(cfg: Cfg, players: PublicPlayer[], rng: () => number = () => 0.5): TestCtx<Cfg> {
  let now = 0;
  let seq = 0;
  let timers: { at: number; seq: number; fn: () => void; countdown?: boolean }[] = [];

  const ctx: TestCtx<Cfg> = {
    cfg,
    players,
    isConnected: (id) => ctx.connected.has(id),
    connected: new Set(players.map((p) => p.id)),
    setConnected: (id, on) => {
      if (on) ctx.connected.add(id);
      else ctx.connected.delete(id);
    },
    rng,
    now: () => now,
    setTimeout: (ms, fn) => {
      timers.push({ at: now + ms, seq: seq++, fn });
    },
    update: () => {},
    end: () => {
      ctx.ended = true;
    },
    countdown: (seconds, onEnd) => {
      timers = timers.filter((t) => !t.countdown);
      ctx.countdownState = { seconds, endsAt: now + seconds * 1000 };
      timers.push({
        at: now + seconds * 1000,
        seq: seq++,
        countdown: true,
        fn: () => {
          ctx.countdownState = null;
          if (onEnd) onEnd();
          else ctx.ended = true;
        },
      });
    },
    clearCountdown: () => {
      timers = timers.filter((t) => !t.countdown);
      ctx.countdownState = null;
    },
    ended: false,
    countdownState: null,
    advance: (ms) => {
      const target = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at || a.seq - b.seq)[0];
        if (!due || ctx.ended) break;
        timers = timers.filter((t) => t !== due);
        now = due.at;
        due.fn();
      }
      now = target;
    },
    finishCountdown: () => {
      if (ctx.countdownState) ctx.advance(Math.max(0, ctx.countdownState.endsAt - now));
    },
  };
  return ctx;
}
