// Faux contexte de manche pour tester un mini-jeu sans moteur.
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

export function makeCtx<Cfg>(cfg: Cfg, players: PublicPlayer[], rng: () => number = () => 0.5) {
  const ctx: RoundContext<Cfg> & { ended: boolean } = {
    cfg,
    players,
    rng,
    now: () => 0,
    setTimeout: () => {},
    update: () => {},
    end: () => {
      ctx.ended = true;
    },
    ended: false,
  };
  return ctx;
}
