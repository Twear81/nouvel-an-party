import { useEffect, useMemo, useState } from "react";
import { finalBeatAt, finalMarks, finalRevealElapsed, finalRevealedCount, finalTimelineOf, type FinalBeat, type FinalRevealInfo, type FinalTimeline } from "../../shared/final-reveal";
import { serverNow } from "./socket";

export interface FinalRevealState {
  timeline: FinalTimeline;
  /** Temps écoulé depuis le départ serveur, pauses retirées (ms). */
  elapsed: number;
  beat: FinalBeat | null;
  /** Nombre de rangs révélés, toujours à partir du dernier. */
  revealed: number;
  done: boolean;
}

const EMPTY: FinalTimeline = { beats: [], durationMs: 0, revealedAtMs: [], podiumAtMs: null };

/** État d'animation uniquement : le départ, le classement et les étoiles viennent du moteur, y compris après rechargement. */
export function useFinalReveal(reveal: FinalRevealInfo | null): FinalRevealState {
  const { startedAt, pausedMs, pausedSince } = reveal ?? {};
  const timeline = useMemo(() => (reveal ? finalTimelineOf(reveal) : EMPTY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reveal?.playerIds.join(), reveal?.ranking?.join(), JSON.stringify(reveal?.stars), reveal?.timeScale]);
  const read = (): number => (reveal ? finalRevealElapsed(reveal, serverNow()) : 0);
  const [elapsed, setElapsed] = useState(read);

  useEffect(() => {
    if (!reveal) { setElapsed(0); return; }
    const marks = finalMarks(timeline);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const now = finalRevealElapsed(reveal, serverNow());
      setElapsed(now);
      const next = marks.find((at) => at > now);
      // En pause l'horloge est figée : la reprise change `pausedSince` et relance ce calcul.
      if (next !== undefined && pausedSince == null) timer = setTimeout(tick, Math.max(1, next - now));
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, pausedMs, pausedSince, timeline]);

  return {
    timeline, elapsed, beat: reveal ? finalBeatAt(timeline, elapsed) : null,
    revealed: finalRevealedCount(timeline, elapsed),
    done: !!reveal && elapsed >= timeline.durationMs,
  };
}
