// Chronologie des scènes de la pièce, partagée par le moteur et les écrans.
import type { SkinId } from "./skins";

export type TransitionKind = "opening" | "skin" | "closing";
// Changement d'univers : la caméra dézoome (0 → zoomOutEndMs), la scène joue (jusqu'à plungeStartMs),
// puis replonge dans la TV (plungeStartMs → plungeEndMs). Le skin bascule pendant que la scène couvre l'écran.
export const SKIN_TIMING = {
  durationMs: 6000, swapAtMs: 3000,
  zoomOutEndMs: 1000, plungeStartMs: 4600, plungeEndMs: 5900,
  /** Fin du fondu de la pièce transformée (le calque est ensuite pleinement visible). */
  roomSkinFadeEndMs: 1800,
} as const;

export const TRANSITION_TIMING = {
  opening: { durationMs: 9000, swapAtMs: 8400 },
  skin: { durationMs: SKIN_TIMING.durationMs, swapAtMs: SKIN_TIMING.swapAtMs },
  closing: { durationMs: 2400, swapAtMs: 1200 },
} as const;

export const OPENING_TIMING = {
  arrivalAtMs: 900, staggerMs: 120, travelMs: 850, seatedAtMs: 2800,
  leaveAtMs: 5900, fadeAtMs: 6300, zoomEndAtMs: 8400,
} as const;

export interface TransitionInfo {
  kind: TransitionKind;
  fromSkin: SkinId | null;
  toSkin: SkinId | null;
  startedAt: number;
  durationMs: number;
  pausedMs: number;
  pausedSince: number | null;
  playerIds: string[];
}

export function transitionElapsed(scene: TransitionInfo, now: number): number {
  return Math.max(0, Math.min(scene.durationMs, (scene.pausedSince ?? now) - scene.pausedMs - scene.startedAt));
}
