// Types partagés entre le serveur et les écrans (TV + téléphones).
// Toute donnée qui transite par le réseau est décrite ici.

import type { SkinId } from "./skins";
import type { FinalRevealInfo } from "./final-reveal";
import type { TransitionInfo } from "./transitions";

export type PlayerId = string;

export type Avatar = { kind: "preset"; id: string }; // id d'un avatar de src/web/theme/profile-options.ts

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
 * lobby → transition d'ouverture → (intro → playing → results) × N manches → transition de sortie → final.
 * Une frontière d'univers insère aussi une transition après ses résultats.
 */
export type Phase = "lobby" | "transition" | "intro" | "playing" | "results" | "final";

/** Un mini-jeu tel que présenté sur l'écran de configuration de la partie. */
export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  available: number; // nombre max de manches (ex : nombre de questions dans le fichier)
  secondsPerRound: number; // estimation d'une manche complète (intro + jeu + résultats)
  /**
   * Présent seulement pour un jeu « interlude » : il surgit environ une fois toutes les N manches normales
   * (valeur = N). Il n'a pas de compteur de manches mais un interrupteur (counts = 1 ou 0).
   */
  interlude?: number;
}

/** Nombre de manches choisi pour chaque mini-jeu (id → nombre). Un jeu interlude : 1 = activé, 0 = désactivé. */
export interface Setup {
  counts: Record<string, number>;
}

export interface RoundInfo {
  /** Position dans le plan (0-based), interludes compris. Sert de clé technique, pas à l'affichage. */
  index: number;
  /** Longueur du plan, interludes compris. */
  total: number;
  /** Numéro de la manche à AFFICHER (1-based) : les interludes ne comptent pas, sinon on spoilerait leur arrivée. */
  number: number;
  /** Nombre de manches normales du plan, à afficher en « Manche number / normalTotal ». */
  normalTotal: number;
  /** Manche surprise : pas d'annonce, TV plein écran sans cadre, mise en scène gérée par le jeu. */
  interlude: boolean;
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
  /** Compteur commun « qui a répondu » de l'étape en cours (nombres seulement). null = hors réponse ou jeu sans compteur. */
  progress: { done: number; expected: number } | null;
  /** État public du mini-jeu (question, nb de réponses…), propre à chaque mini-jeu. */
  public: unknown;
  /** Résultats du mini-jeu, présents uniquement en phase "results". */
  results: unknown;
  /** Points gagnés pendant cette manche, présents en phase "results". */
  deltas: Record<PlayerId, number> | null;
  /** Heure serveur (ms) à laquelle la phase "results" a commencé ; null avant. Sert à synchroniser les révélations. */
  resultsAt: number | null;
  /** Durée cumulée (ms) des pauses déjà terminées de la manche. Sert à figer un compteur affiché (voir `activeNow`). */
  pausedMs: number;
  /** Heure serveur du début de la pause en cours ; null si pas en pause. */
  pausedSince: number | null;
}

/** Ce que chaque écran reçoit à chaque changement (événement "state"). */
export interface GameSnapshot {
  title: string;
  phase: Phase;
  paused: boolean;
  /** Départ serveur de la révélation finale ; null pendant les manches et au lobby. */
  finalReveal: FinalRevealInfo | null;
  /** Scène synchronisée de la pièce ; aucune manche n'est démarrée pendant cette phase. */
  transition: TransitionInfo | null;
  players: PublicPlayer[];
  round: RoundInfo | null;
  /** Joueurs ayant cliqué sur "Continuer" pendant les résultats. */
  continued: PlayerId[];
  catalog: CatalogEntry[];
  setup: Setup;
  /** Une partie interrompue (crash, fermeture) peut être reprise. */
  /** Numérotation affichée (interludes non comptés) : « manche roundIndex + 1 / total ». */
  resumable: { roundIndex: number; total: number } | null;
  joinUrl: string;
  /** Habillage visuel courant (docs/skins.md) : identique pour la TV et tous les téléphones. */
  skin: SkinId | null;
  /** Uniquement pour un téléphone : son identité et sa vue privée du mini-jeu. */
  me: { id: PlayerId; private: unknown; /** false si arrivé après le début de la manche */ inRound: boolean } | null;
}
