// Cadence commune de la révélation finale : la TV et les téléphones suivent le même départ serveur.
import type { Keepsake } from "./ceremony";
export const FINAL_ENTRY_MS = 800;

export interface FinalRevealInfo {
  startedAt: number;
  pausedMs?: number;
  pausedSince?: number | null;
  /** Participants au début de la cérémonie : une arrivée tardive ne modifie pas le podium ni son attente. */
  playerIds: string[];
  /** Souvenirs déjà révélés, conservés dans le décor pendant le classement final. */
  souvenirs?: Keepsake[];
}

export function finalRevealTimeline(playerCount: number): { steps: number[]; durationMs: number } {
  const steps: number[] = [];
  let elapsed = 0;
  for (let step = 0; step < playerCount; step++) {
    const nextIndex = playerCount - step - 1;
    elapsed += step === 0 ? 1800 : nextIndex >= 3 ? 1000 : 1700;
    steps.push(elapsed);
  }
  return { steps, durationMs: steps.length > 0 ? elapsed + FINAL_ENTRY_MS : 0 };
}

/** Même horloge active pour le moteur, la TV et les téléphones. */
export function finalRevealElapsed(reveal: FinalRevealInfo, now: number): number {
  return Math.max(0, (reveal.pausedSince ?? now) - (reveal.pausedMs ?? 0) - reveal.startedAt);
}
