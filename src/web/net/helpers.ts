import type { GameSnapshot, PlayerId, PublicPlayer } from "../../shared/types";

/** Joueurs avec un profil validé (ceux qui jouent vraiment). */
export const playersWithProfile = (s: GameSnapshot) => s.players.filter((p) => p.profile);

export const makePlayerById = (players: PublicPlayer[]) => (id: PlayerId) => players.find((p) => p.id === id);

/** Joueurs dont on attend le "Continuer" (connectés avec profil, comme le moteur). */
export const waitingPlayers = (s: GameSnapshot) => s.players.filter((p) => p.profile && p.connected);
