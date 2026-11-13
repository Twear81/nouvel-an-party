// Séquence de sons déclenchée par un changement du snapshot (ex. étape « reveal » d'un duel) et calée sur les mêmes
// constantes que l'animation. Jamais au montage : une TV qui recharge en pleine étape ne rejoue rien.
import { useEffect, useRef } from "react";
import { serverNow } from "../net/socket";
import { play, type PlayOptions } from "../sound/engine";
import type { NomSon } from "../theme/sons/catalogue";

export interface SonDecale {
  /** Délai (ms) après le déclenchement. */
  at: number;
  son: NomSon;
  options?: PlayOptions;
}

/**
 * Quand `declencheur` change (et n'est pas `null`/`false`), joue chaque son de `liste` à son délai.
 * Annulé si le déclencheur change encore ou au démontage. La pause coupe les sons (le moteur n'en joue pas en pause).
 */
export function useSfxSequence(declencheur: unknown, liste: readonly SonDecale[]) {
  const previous = useRef(declencheur);
  const latest = useRef(liste);
  latest.current = liste;
  useEffect(() => {
    const before = previous.current;
    previous.current = declencheur;
    if (Object.is(before, declencheur) || declencheur === null || declencheur === false || declencheur === undefined) return;
    const timers = latest.current.map((s) => setTimeout(() => play(s.son, s.options), s.at));
    return () => timers.forEach(clearTimeout);
  }, [declencheur]);
}

/**
 * Exécute `action` (ex. `fireConfetti`) à `depuisMs + secondes` (heure serveur, ex. `round.resultsAt`), calée sur les mêmes
 * constantes que l'animation. Rien si l'instant est déjà passé de plus de 500 ms au montage (rechargement) ou si `depuisMs` est null.
 */
export function useAtServerTime(depuisMs: number | null, secondes: number, action: () => void) {
  const latest = useRef(action);
  latest.current = action;
  useEffect(() => {
    if (depuisMs === null) return;
    const delay = depuisMs + secondes * 1000 - serverNow();
    if (delay < -500) return;
    const t = setTimeout(() => latest.current(), Math.max(0, delay));
    return () => clearTimeout(t);
  }, [depuisMs, secondes]);
}
