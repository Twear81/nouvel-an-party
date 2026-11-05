// Mini-jeu factice pour tester le moteur sans dépendre des vrais jeux.
//
// Payloads acceptés par input() :
//   { v: number }        enregistre une valeur (points = valeur à la fin)
//   { end: true }        appelle ctx.end()
//   { timer: ms }        planifie ctx.setTimeout → incrémente state.fired
//   { endWhenAlone: true } onPresenceChange termine la manche s'il reste au plus 1 joueur connecté
//   { boom: true }       lève une Error ordinaire (bug du mini-jeu)
//   { gameError: true }  lève une GameError
import { z } from "zod";
import { GameError } from "../../../src/server/engine/engine";
import type { LoadedGame } from "../../../src/server/engine/planner";
import { defineMiniGame } from "../../../src/minigames/contract";

export interface FakeState {
  item: string;
  inputs: Map<string, number>;
  fired: number;
  /** Joueurs connectés vus au dernier onPresenceChange. */
  presence: string[];
  /** Termine la manche quand il reste au plus un joueur connecté. */
  endWhenAlone?: boolean;
}

export interface FakeGameOptions {
  id?: string;
  items?: number | string[];
  /** Durée du chrono ; null = pas de chrono. */
  seconds?: number | null;
  estimate?: number;
  failStart?: (item: string) => boolean;
  failFinish?: boolean;
}

export function makeFakeGame(opts: FakeGameOptions = {}) {
  const id = opts.id ?? "fake";
  const itemList = Array.isArray(opts.items)
    ? opts.items
    : Array.from({ length: opts.items ?? 3 }, (_, i) => `${id}-${i}`);
  const calls: string[] = [];
  const states: FakeState[] = [];

  const game = defineMiniGame<any, string, FakeState>({
    id,
    configSchema: z.any(),
    name: () => `Jeu ${id}`,
    description: () => `Description ${id}`,
    items: () => itemList,
    roundSeconds: () => (opts.seconds === undefined ? 10 : opts.seconds),
    estimateSeconds: () => opts.estimate ?? 5,
    start(item) {
      calls.push("start");
      if (opts.failStart?.(item)) throw new Error("start cassé");
      const s: FakeState = { item, inputs: new Map(), fired: 0, presence: [] };
      states.push(s);
      return s;
    },
    onPlay: () => void calls.push("onPlay"),
    onPresenceChange(state, ctx) {
      calls.push("presence");
      state.presence = ctx.players.filter((p) => ctx.isConnected(p.id)).map((p) => p.id);
      if (state.endWhenAlone && state.presence.length <= 1) ctx.end();
    },
    input(state, playerId, payload, ctx) {
      const p = payload as Record<string, unknown>;
      if (p.boom) throw new Error("input cassé");
      if (p.gameError) throw new GameError("refusé");
      if (typeof p.v === "number") state.inputs.set(playerId, p.v);
      if (typeof p.timer === "number") ctx.setTimeout(p.timer, () => void state.fired++);
      if (p.end) ctx.end();
      if (p.endWhenAlone) state.endWhenAlone = true;
    },
    publicView: (s) => ({ item: s.item, n: s.inputs.size }),
    privateView: (s, pid) => ({ mine: s.inputs.get(pid) ?? null }),
    finish(s) {
      calls.push("finish");
      if (opts.failFinish) throw new Error("finish cassé");
      return { results: { item: s.item }, scores: Object.fromEntries(s.inputs) };
    },
  });

  const loaded: LoadedGame = { game, cfg: {} };
  return { game, loaded, calls, states, get lastState() { return states[states.length - 1]!; } };
}
