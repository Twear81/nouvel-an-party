import type { ComponentType } from "react";
import type { SkinId } from "../../src/shared/skins";
import type { PublicPlayer } from "../../src/shared/types";
import type { NombreJoueurs } from "./joueurs";
import type { TaillePhone } from "./panneaux";

/** Ce que la barre de contrôle donne à chaque scène. */
export interface Env {
  joueurs: PublicPlayer[];
  nombre: NombreJoueurs;
  skin: SkinId | null;
  /** Pause demandée par l'utilisateur (le snapshot passe en `paused`). */
  pause: boolean;
  /** Position (ms) à laquelle la scène (re)démarre : 0 = depuis le début, sons d'arrivée compris. */
  depart: number;
  taillePhone: TaillePhone;
  basculerPause(): void;
  /** Durée (ms) de la scène chronométrée, pour le curseur ; null = scène libre. */
  definirDuree(ms: number | null): void;
}

export interface Scene {
  id: string;
  section: "composants" | "chrono" | "ecrans" | "jeux";
  /** Regroupement dans le menu (un mini-jeu, par exemple). */
  groupe?: string;
  titre: string;
  /** Une phrase : ce qu'il faut regarder. */
  aide?: string;
  Composant: ComponentType<{ env: Env }>;
}
