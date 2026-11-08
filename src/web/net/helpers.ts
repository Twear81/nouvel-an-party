import type { GameSnapshot, PlayerId, PublicPlayer, RoundInfo } from "../../shared/types";
import type { MiniGameViewProps } from "../../minigames/views-contract";

/** Joueurs avec un profil validé (ceux qui jouent vraiment). */
export const playersWithProfile = (s: GameSnapshot) => s.players.filter((p) => p.profile);

export const makePlayerById = (players: PublicPlayer[]) => (id: PlayerId) => players.find((p) => p.id === id);

/** Joueurs dont on attend le "Continuer" (connectés avec profil, comme le moteur). */
export const waitingPlayers = (s: GameSnapshot) => s.players.filter((p) => p.profile && p.connected);

/** Props communes des vues de mini-jeu (TV et téléphone) : seuls `priv` et `sendInput` diffèrent. */
export function gameViewProps(
  snapshot: GameSnapshot,
  round: RoundInfo,
  priv: unknown,
  sendInput: MiniGameViewProps["sendInput"],
): MiniGameViewProps {
  return {
    snapshot,
    round,
    pub: round.public,
    priv,
    results: round.results,
    players: snapshot.players,
    playerById: makePlayerById(snapshot.players),
    sendInput,
  };
}
