// Horloge « active » d'une manche : comme l'heure serveur, mais figée pendant les pauses de l'hôte.
// Côté serveur : `ctx.activeNow()`. Côté écran : `activeNow(round, serverNow())`.
import type { RoundInfo } from "./types";

/**
 * Instant d'un toucher (même repère que `performance.now()`) : `event.timeStamp` donne le moment réel du contact, même si
 * le téléphone, occupé, ne traite l'événement que plus tard. Repli sur `now` si le navigateur fournit un autre repère.
 */
export const eventTime = (timeStamp: number, now: number): number => (timeStamp > 0 && timeStamp <= now ? timeStamp : now);

export const activeNow = (round: Pick<RoundInfo, "pausedMs" | "pausedSince">, serverNowMs: number): number =>
  (round.pausedSince ?? serverNowMs) - round.pausedMs;
