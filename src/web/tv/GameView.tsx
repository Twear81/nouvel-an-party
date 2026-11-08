// Affiche la vue d'un mini-jeu (Tv / TvResults) pour la manche en cours.
import type { GameSnapshot, RoundInfo } from "../../shared/types";
import type { MiniGameViewProps } from "../../minigames/views-contract";
import { webGames } from "../../minigames/registry.web";
import { gameViewProps } from "../net/helpers";

export const tvViewProps = (snapshot: GameSnapshot, round: RoundInfo): MiniGameViewProps =>
  gameViewProps(snapshot, round, null, async () => {});

export function TvGameView({ snapshot, round, kind }: { snapshot: GameSnapshot; round: RoundInfo; kind: "Tv" | "TvResults" }) {
  const views = webGames[round.gameId];
  if (!views) return <div className="flex flex-1 items-center justify-center text-4xl text-ink-muted">Mini-jeu « {round.gameName} »</div>;
  const View = views[kind];
  return <View {...tvViewProps(snapshot, round)} />;
}
