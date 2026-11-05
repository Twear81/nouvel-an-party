// Contrat Socket.IO : noms des événements et formes des messages.
import type { GameSnapshot, PlayerId, Profile, Setup } from "./types";

export interface ServerToClient {
  state: (snapshot: GameSnapshot) => void;
  /** Le joueur a été retiré par le maître du jeu : le téléphone oublie son jeton. */
  kicked: () => void;
}

export type Ack<T = {}> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServer {
  /** Synchronisation d'horloge : le client envoie son heure, le serveur répond la sienne. */
  "time:sync": (clientTime: number, ack: (serverTime: number) => void) => void;

  // --- Écran TV / maître du jeu (autorisé uniquement depuis le PC, voir server/socket.ts)
  "tv:hello": (ack: Ack<{ host: boolean }>) => void;
  "host:setup": (setup: Setup, ack?: Ack) => void;
  "host:start": (ack?: Ack) => void;
  "host:resumeSave": (ack?: Ack) => void;
  /** Passe à l'étape suivante (fin du chrono, résultats suivants…). */
  "host:skip": (ack?: Ack) => void;
  "host:pause": (ack?: Ack) => void;
  "host:resume": (ack?: Ack) => void;
  "host:addTime": (seconds: number, ack?: Ack) => void;
  "host:kick": (playerId: PlayerId, ack?: Ack) => void;
  /** Retour au lobby (les joueurs et profils sont conservés, les scores remis à 0). */
  "host:lobby": (ack?: Ack) => void;

  // --- Téléphone
  /** Rejoint la partie. Avec un jeton existant, on récupère son joueur (reconnexion). */
  "player:join": (token: string | null, ack: Ack<{ playerId: PlayerId; token: string }>) => void;
  "player:profile": (profile: Profile, ack?: Ack) => void;
  /** Photo de profil (image webp/jpeg déjà redimensionnée côté téléphone). */
  "player:photo": (data: ArrayBuffer, ack: Ack<{ url: string }>) => void;
  /** Réponse au mini-jeu en cours. La forme dépend du mini-jeu. */
  "player:input": (payload: unknown, ack?: Ack) => void;
  "player:continue": (ack?: Ack) => void;
}
