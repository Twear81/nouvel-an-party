import { useEffect, useState } from "react";
import { finalRevealElapsed, finalRevealTimeline, type FinalRevealInfo } from "../../shared/final-reveal";
import { serverNow } from "./socket";

/** État d'animation uniquement : le départ et les participants viennent du moteur, y compris après rechargement. */
export function useFinalReveal(reveal: FinalRevealInfo | null) {
  const startedAt = reveal?.startedAt;
  const playerCount = reveal?.playerIds.length ?? 0;
  const read = () => {
    if (startedAt === undefined) return { step: 0, done: false };
    const timeline = finalRevealTimeline(playerCount);
    const elapsed = finalRevealElapsed(reveal!, serverNow());
    return { step: timeline.steps.filter((at) => elapsed >= at).length, done: elapsed >= timeline.durationMs };
  };
  const [state, setState] = useState(read);

  useEffect(() => {
    if (startedAt === undefined) {
      setState({ step: 0, done: false });
      return;
    }
    const timeline = finalRevealTimeline(playerCount);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const elapsed = finalRevealElapsed(reveal!, serverNow());
      setState({ step: timeline.steps.filter((at) => elapsed >= at).length, done: elapsed >= timeline.durationMs });
      const next = [...timeline.steps, timeline.durationMs].find((at) => at > elapsed);
      if (next !== undefined && reveal?.pausedSince == null) timer = setTimeout(tick, next - elapsed);
    };
    tick();
    return () => clearTimeout(timer);
  }, [startedAt, playerCount, reveal?.pausedMs, reveal?.pausedSince]);

  return state;
}
