// Chronologie des scènes de la pièce, partagée par le moteur et les écrans.
import type { SkinId } from "./skins";

export type TransitionKind = "opening" | "skin" | "closing";
export const TRANSITION_TIMING = {
  opening: { durationMs: 9000, swapAtMs: 8400 },
  skin: { durationMs: 4000, swapAtMs: 2000 },
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
