// Cadence commune de la révélation finale : la TV et les téléphones suivent le même départ serveur.
export const FINAL_ENTRY_MS = 800;

export interface FinalRevealInfo {
  startedAt: number;
  /** Participants au début de la cérémonie : une arrivée tardive ne modifie pas le podium ni son attente. */
  playerIds: string[];
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
