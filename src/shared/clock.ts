// Horloge « active » d'une manche : comme l'heure serveur, mais figée pendant les pauses de l'hôte.
// Côté serveur : `ctx.activeNow()`. Côté écran : `activeNow(round, serverNow())`.
import type { RoundInfo } from "./types";

export const activeNow = (round: Pick<RoundInfo, "pausedMs" | "pausedSince">, serverNowMs: number): number =>
  (round.pausedSince ?? serverNowMs) - round.pausedMs;
