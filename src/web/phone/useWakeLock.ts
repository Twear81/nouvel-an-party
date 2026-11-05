// Garde l'écran allumé : Wake Lock natif si dispo (Chrome, Firefox récent, Safari 16.4+), sinon nosleep.js (vidéo muette en boucle).
// iOS n'accepte de lancer une vidéo que dans le gestionnaire d'un vrai geste (click / touchend / keydown, pas touchstart) :
// on arme donc ces écouteurs et on appelle nosleep.enable() de façon synchrone dedans.
import { useEffect } from "react";
import NoSleep from "nosleep.js";

const GESTURES = ["click", "touchend", "keydown"] as const;

export function useWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let noSleep: NoSleep | null = null;
    let held = false;

    const viaNoSleep = () => {
      try {
        noSleep ??= new NoSleep();
        noSleep.enable().then(() => (held = true), () => {});
      } catch {
        /* pas grave : l'écran se mettra en veille normalement */
      }
    };

    const acquire = () => {
      if (!("wakeLock" in navigator)) return viaNoSleep();
      navigator.wakeLock.request("screen").then(
        (s) => {
          void sentinel?.release().catch(() => {});
          sentinel = s;
          held = true;
        },
        viaNoSleep, // refusé (économie d'énergie, iframe…) : on tente le repli
      );
    };

    const onGesture = () => {
      if (!held) acquire();
    };
    // Le verrou natif saute quand la page passe en arrière-plan : on le reprend au retour.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !held) return;
      if (sentinel?.released !== false) acquire();
    };

    for (const e of GESTURES) window.addEventListener(e, onGesture, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      for (const e of GESTURES) window.removeEventListener(e, onGesture);
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
      noSleep?.disable();
    };
  }, []);
}
