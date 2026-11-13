import { useEffect, useState } from "react";
import { ceremonyElapsed, ceremonyTimeline, ceremonyStepAt, type CeremonyInfo } from "../../shared/ceremony";
import { serverNow } from "./socket";

/** Synchronisation d'affichage uniquement ; aucun choix de bonus ne se fait sur l'écran. */
export function useCeremony(info: CeremonyInfo) {
  const read = () => {
    const elapsed = ceremonyElapsed(info, serverNow());
    const { steps } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
    return { elapsed, step: ceremonyStepAt(steps, elapsed) };
  };
  const [state, setState] = useState(read);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const next = read();
      setState(next);
      const { steps } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
      const boundary = steps.find((s) => s.endMs > next.elapsed)?.endMs;
      if (boundary !== undefined && info.pausedSince === null) timer = setTimeout(tick, Math.max(1, boundary - next.elapsed));
    };
    tick();
    return () => clearTimeout(timer);
  }, [info]);
  return state;
}
