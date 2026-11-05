// Synchronise la révélation des résultats : tous les écrans comptent depuis `round.resultsAt` (heure serveur),
// donc un téléphone qui recharge en pleine animation retombe sur le bon moment.
import { useEffect, useState } from "react";
import { webGames } from "../../minigames/registry.web";
import type { MiniGameViewProps } from "../../minigames/views-contract";
import { serverNow } from "./socket";

/** Durée (s) de l'animation de résultats du mini-jeu en cours. */
export const revealSecondsOf = (props: MiniGameViewProps) => webGames[props.round.gameId]?.revealSeconds?.(props) ?? 0;

/** true une fois l'animation de révélation terminée (immédiatement si le jeu n'en a pas). */
export function useRevealed(props: MiniGameViewProps): boolean {
  const seconds = revealSecondsOf(props);
  const startedAt = props.round.resultsAt;
  const endAt = startedAt === null ? 0 : startedAt + seconds * 1000;
  const [done, setDone] = useState(() => serverNow() >= endAt);
  useEffect(() => {
    const left = endAt - serverNow();
    setDone(left <= 0);
    if (left <= 0) return;
    const t = setTimeout(() => setDone(true), left);
    return () => clearTimeout(t);
  }, [endAt]);
  return done;
}
