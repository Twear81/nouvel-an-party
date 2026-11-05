// Garde l'écran allumé : Wake Lock natif si dispo, sinon nosleep.js. Doit démarrer sur un geste de l'utilisateur.
import { useEffect } from "react";
import NoSleep from "nosleep.js";

export function useWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let noSleep: NoSleep | null = null;
    let active = false;

    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          sentinel = await navigator.wakeLock.request("screen");
          return;
        }
      } catch {
        /* refusé (économie d'énergie…) : on tente le repli */
      }
      try {
        noSleep ??= new NoSleep();
        await noSleep.enable();
      } catch {
        /* pas grave */
      }
    };
    const onGesture = () => {
      if (active) return;
      active = true;
      void acquire();
      for (const e of ["pointerdown", "touchstart", "keydown"]) window.removeEventListener(e, onGesture);
    };
    const onVisible = () => {
      if (active && document.visibilityState === "visible") void acquire();
    };

    for (const e of ["pointerdown", "touchstart", "keydown"]) window.addEventListener(e, onGesture, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      for (const e of ["pointerdown", "touchstart", "keydown"]) window.removeEventListener(e, onGesture);
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
      noSleep?.disable();
    };
  }, []);
}
