// Contrat qu'un mini-jeu doit respecter côté écrans (React).
import type { ComponentType } from "react";
import type { GameSnapshot, PlayerId, PublicPlayer, RoundInfo } from "../shared/types";

export interface MiniGameViewProps<Pub = any, Priv = any, Res = any> {
  snapshot: GameSnapshot;
  round: RoundInfo;
  /** round.public typé */
  pub: Pub;
  /** Vue privée du joueur (téléphone uniquement, null sur la TV). */
  priv: Priv | null;
  /** round.results typé (phase "results" uniquement). */
  results: Res | null;
  players: PublicPlayer[];
  playerById: (id: PlayerId) => PublicPlayer | undefined;
  /** Téléphone uniquement : envoie une réponse au mini-jeu. */
  sendInput: (payload: unknown) => Promise<void>;
}

export interface MiniGameViews {
  /** TV pendant l'intro et le jeu. */
  Tv: ComponentType<MiniGameViewProps>;
  /** Téléphone pendant le jeu. */
  Phone: ComponentType<MiniGameViewProps>;
  /** TV pendant les résultats. */
  TvResults: ComponentType<MiniGameViewProps>;
  /** Téléphone pendant les résultats (au-dessus du bouton Continuer). Optionnel. */
  PhoneResults?: ComponentType<MiniGameViewProps>;
  /**
   * Durée (s) de l'animation de révélation de `TvResults`, comptée depuis `round.resultsAt`. Défaut : 0.
   * Pendant ce temps la TV cache les « +N » et les téléphones affichent « regarde la TV » :
   * le classement n'est pas dévoilé avant l'animation. À calculer avec les constantes réelles de `TvResults`.
   */
  revealSeconds?: (props: MiniGameViewProps) => number;
}
