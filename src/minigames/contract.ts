// Contrat qu'un mini-jeu doit respecter côté serveur.
// Le moteur (src/server/engine) gère chrono, phases, points cumulés, reconnexions :
// un mini-jeu ne s'occupe que de SA manche.
import type { z } from "zod";
import type { PlayerId, PublicPlayer } from "../shared/types";

/** Outils fournis par le moteur à un mini-jeu pendant une manche. */
export interface RoundContext<Cfg> {
  cfg: Cfg;
  /** Joueurs participant à la manche (profil validé au début de la manche). */
  players: PublicPlayer[];
  /** Aléatoire déterministe en test. Toujours l'utiliser à la place de Math.random. */
  rng: () => number;
  /** Heure du serveur (ms). */
  now: () => number;
  /** Timer annulé automatiquement en fin de manche et figé pendant une pause. */
  setTimeout: (ms: number, fn: () => void) => void;
  /** À appeler après une modification de l'état faite hors d'un input (ex : dans un timer). */
  update: () => void;
  /** Termine la manche tout de suite (ex : tout le monde a répondu). */
  end: () => void;
  /**
   * Lance (ou remplace) le chrono affiché sur la TV et les téléphones, pour les jeux en plusieurs étapes
   * (écrire puis voter, tour par tour…). À appeler pendant le jeu : onPlay, input ou un timer.
   * À la fin : `onEnd` est appelé, ou la manche se termine si `onEnd` est absent.
   * Pause et "+10 s" du maître du jeu s'appliquent à ce chrono.
   */
  countdown: (seconds: number, onEnd?: () => void) => void;
  /** Masque le chrono (ex : pendant une animation sur la TV). */
  clearCountdown: () => void;
}

export interface RoundOutcome {
  /** Données affichées sur l'écran des résultats (propres au mini-jeu). */
  results: unknown;
  /** Points gagnés pendant la manche. Les joueurs absents gagnent 0. */
  scores: Record<PlayerId, number>;
}

/**
 * Cfg   = contenu validé du fichier config/minijeux/<id>.yaml
 * Item  = un élément tirable au hasard (une question…) → une manche
 * State = état interne de la manche (jamais envoyé tel quel aux écrans)
 */
export interface MiniGame<Cfg = any, Item = any, State = any> {
  id: string; // = nom du dossier et du fichier yaml
  /** Schéma du fichier yaml. Les erreurs sont affichées clairement au démarrage. */
  configSchema: z.ZodType<Cfg>;
  name: (cfg: Cfg) => string;
  description: (cfg: Cfg) => string;
  /** Liste des manches possibles. Le moteur en tire au hasard. */
  items: (cfg: Cfg) => Item[];
  /** Durée du chrono en secondes. null = pas de chrono automatique : le jeu gère ses étapes avec ctx.countdown / ctx.end. */
  roundSeconds: (cfg: Cfg, item: Item) => number | null;
  /** Estimation (s) du jeu + lecture des résultats. Le moteur y ajoute l'intro. */
  estimateSeconds: (cfg: Cfg) => number;

  /** Début de manche (pendant l'intro). */
  start: (item: Item, ctx: RoundContext<Cfg>) => State;
  /** Optionnel : appelé quand le chrono démarre (fin de l'intro). */
  onPlay?: (state: State, ctx: RoundContext<Cfg>) => void;
  /** Réponse d'un joueur. `payload` vient du réseau : à valider ! */
  input: (state: State, playerId: PlayerId, payload: unknown, ctx: RoundContext<Cfg>) => void;
  /** Ce que voient la TV et tous les téléphones. Ne rien y mettre de secret. */
  publicView: (state: State, ctx: RoundContext<Cfg>) => unknown;
  /**
   * Optionnel : vue publique réservée à la TV (remplace publicView pour la TV uniquement).
   * Pour ce que les téléphones ne doivent pas recevoir, même caché (ex : la suite de couleurs de Simon).
   */
  tvView?: (state: State, ctx: RoundContext<Cfg>) => unknown;
  /** Ce que voit un seul téléphone (ex : "tu as voté pour X"). */
  privateView?: (state: State, playerId: PlayerId, ctx: RoundContext<Cfg>) => unknown;
  /** Fin de manche : calcule résultats et points. */
  finish: (state: State, ctx: RoundContext<Cfg>) => RoundOutcome;
}

/** Aide au typage : `export default defineMiniGame({...})`. */
export function defineMiniGame<Cfg, Item, State>(game: MiniGame<Cfg, Item, State>): MiniGame<Cfg, Item, State> {
  return game;
}
