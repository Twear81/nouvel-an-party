// Types partagés entre le serveur et les écrans (TV + téléphones).
// Toute donnée qui transite par le réseau est décrite ici.

export type PlayerId = string;

export type Avatar =
  | { kind: "preset"; id: string } // id d'un avatar de src/web/theme/profile-options.ts
  | { kind: "photo"; url: string }; // photo prise avec le téléphone, servie par /photos/...

export interface Profile {
  name: string;
  avatar: Avatar;
  frame: string; // id d'un cadre (profile-options.ts)
  color: string; // couleur hex, ex "#ff3366"
}

export interface PublicPlayer {
  id: PlayerId;
  profile: Profile | null; // null tant que le joueur n'a pas validé son profil
  score: number;
  connected: boolean;
}

/**
 * Déroulé d'une partie :
 * lobby → (intro → playing → results) × N manches → final
 */
export type Phase = "lobby" | "intro" | "playing" | "results" | "final";

/** Un mini-jeu tel que présenté sur l'écran de configuration de la partie. */
export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  available: number; // nombre max de manches (ex : nombre de questions dans le fichier)
  secondsPerRound: number; // estimation d'une manche complète (intro + jeu + résultats)
}

/** Nombre de manches choisi pour chaque mini-jeu (id → nombre). */
export interface Setup {
  counts: Record<string, number>;
}

export interface RoundInfo {
  index: number; // 0-based
  total: number;
  gameId: string;
  gameName: string;
  /** Joueurs qui participent à cette manche (les retardataires jouent à la suivante). */
  participants: PlayerId[];
  /** Timestamp (horloge serveur) de fin du chrono. null = pas de chrono ou en pause. */
  deadline: number | null;
  /** Temps restant figé pendant une pause (ms). */
  pausedRemainingMs: number | null;
  /** Durée totale du chrono en cours (ms), pour dessiner la barre. Un mini-jeu peut enchaîner plusieurs chronos. */
  timerTotalMs: number | null;
  /** État public du mini-jeu (question, nb de réponses…), propre à chaque mini-jeu. */
  public: unknown;
  /** Résultats du mini-jeu, présents uniquement en phase "results". */
  results: unknown;
  /** Points gagnés pendant cette manche, présents en phase "results". */
  deltas: Record<PlayerId, number> | null;
}

/** Ce que chaque écran reçoit à chaque changement (événement "state"). */
export interface GameSnapshot {
  title: string;
  phase: Phase;
  paused: boolean;
  players: PublicPlayer[];
  round: RoundInfo | null;
  /** Joueurs ayant cliqué sur "Continuer" pendant les résultats. */
  continued: PlayerId[];
  catalog: CatalogEntry[];
  setup: Setup;
  /** Une partie interrompue (crash, fermeture) peut être reprise. */
  resumable: { roundIndex: number; total: number } | null;
  joinUrl: string;
  /** Uniquement pour un téléphone : son identité et sa vue privée du mini-jeu. */
  me: { id: PlayerId; private: unknown; /** false si arrivé après le début de la manche */ inRound: boolean } | null;
}
