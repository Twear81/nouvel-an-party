// Catalogue des sons de la TV : nom logique -> fichier par défaut + volume. Remplaçable : voir config/medias/sons/LISEZMOI.txt
// (l'organisateur dépose un fichier du même nom pour remplacer un son sans recompiler).
// Les fichiers sont dans ce dossier ; leur adresse est résolue par `urls.ts`. Licences : LICENCES.md.
import type { SkinId } from "../../../shared/skins";

export interface SonDef {
  /** Fichier de ce dossier ; absent = son synthétisé (voir `synth`). */
  fichier?: string;
  /** Son fabriqué par `src/web/sound/synth.ts` quand aucun fichier ne convient. */
  synth?: "roulement";
  /** Volume de base 0–1 (multiplié par le réglage `volume_sons` et par l'option `volume`). */
  volume: number;
  /** Variation de hauteur aléatoire (± centièmes de ton) pour qu'un son fréquent ne lasse pas. Défaut 0. */
  variation?: number;
}

/** Mixage sobre : sons fréquents faibles, jingles plus forts. */
export const SONS = {
  // Lobby
  "joueur.rejoint": { fichier: "rejoint.ogg", volume: 0.5, variation: 50 },
  "joueur.quitte": { fichier: "quitte.ogg", volume: 0.4, variation: 50 },
  "partie.lancement": { fichier: "lancement.ogg", volume: 0.6 },
  // Déroulé d'une manche
  "manche.intro": { fichier: "intro.ogg", volume: 0.6 },
  "reponse.recue": { fichier: "pop.ogg", volume: 0.35, variation: 40 },
  "reponse.toutes": { fichier: "complet.ogg", volume: 0.5 },
  "chrono.tic": { fichier: "tic.ogg", volume: 0.45 },
  "chrono.fin": { fichier: "gong.ogg", volume: 0.7 },
  "temps.ajoute": { fichier: "temps-ajoute.ogg", volume: 0.45 },
  "pause": { fichier: "pause.ogg", volume: 0.4 },
  "reprise": { fichier: "reprise.ogg", volume: 0.4 },
  "resultats.arrivee": { fichier: "resultats.ogg", volume: 0.6 },
  "points.gagnes": { fichier: "points.ogg", volume: 0.5, variation: 40 },
  // Fin de partie et scènes
  "final.fanfare": { fichier: "fanfare.ogg", volume: 0.75 },
  "transition.entree": { fichier: "whoosh-entree.ogg", volume: 0.4 },
  "transition.sortie": { fichier: "whoosh-sortie.ogg", volume: 0.4 },
  // Pour les mini-jeux
  "ui.clic": { fichier: "clic.ogg", volume: 0.4, variation: 60 },
  "bonne.reponse": { fichier: "bravo.ogg", volume: 0.5, variation: 40 },
  "mauvaise.reponse": { fichier: "rate.ogg", volume: 0.5, variation: 40 },
  "roulement": { synth: "roulement", volume: 0.5 },
} as const satisfies Record<string, SonDef>;

export type NomSon = keyof typeof SONS;
export const NOMS_SONS = Object.keys(SONS) as NomSon[];
export const isNomSon = (v: string): v is NomSon => Object.prototype.hasOwnProperty.call(SONS, v);

/**
 * Remplacements propres à un habillage (docs/skins.md), ex :
 *   "rocket-league": { "chrono.fin": { fichier: "rl-but.ogg", volume: 0.8 } }
 * (le fichier est à déposer dans ce dossier). Vide pour l'instant : les sons des skins viendront plus tard,
 * l'organisateur peut déjà les remplacer via config/medias/sons/<skin>/.
 */
export const SONS_PAR_SKIN: Partial<Record<SkinId, Partial<Record<NomSon, SonDef>>>> = {};
