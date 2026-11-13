// Catalogue des sons de la TV : nom logique -> fichier par défaut + volume. Remplaçable : voir config/medias/sons/LISEZMOI.txt
// (l'organisateur dépose un fichier du même nom pour remplacer un son sans recompiler).
// Les fichiers sont dans ce dossier ; leur adresse est résolue par `urls.ts`. Licences : LICENCES.md.
import type { SkinId } from "../../../shared/skins";
import ambiances from "./ambiances.json";

export interface SonDef {
  /** Fichier embarqué de ce dossier. */
  fichier: string;
  /** Volume de base 0–1 (multiplié par le réglage `volume_sons` et par l'option `volume`). */
  volume: number;
  /** Variation de hauteur aléatoire (± centièmes de ton) pour qu'un son fréquent ne lasse pas. Défaut 0. */
  variation?: number;
}

/** Mixage sobre : sons fréquents faibles, jingles plus forts. */
export const SONS = {
  // Lobby : la musique ne démarre qu’après un geste, et sort en fondu (engine.ts).
  "lobby.musique": { fichier: "lobby.ogg", volume: 0.32 },
  "joueur.rejoint": { fichier: "rejoint.ogg", volume: 0.5, variation: 20 },
  "joueur.quitte": { fichier: "quitte.ogg", volume: 0.4, variation: 20 },
  // Lobby, clin d'œil Dragon Ball : une boule s'allume par joueur prêt ; Shenron apparaît à la septième
  "lobby.boule": { fichier: "boule-allumee.wav", volume: 0.5, variation: 12 },
  "lobby.shenron": { fichier: "boum.ogg", volume: 0.7 },
  "partie.lancement": { fichier: "lancement.ogg", volume: 0.6 },
  // Déroulé d'une manche
  "manche.intro": { fichier: "intro.ogg", volume: 0.6 },
  "reponse.recue": { fichier: "pop.ogg", volume: 0.35, variation: 15 },
  "reponse.toutes": { fichier: "complet.ogg", volume: 0.5 },
  "chrono.tic": { fichier: "tic.ogg", volume: 0.45 },
  "chrono.fin": { fichier: "gong.ogg", volume: 0.7 },
  // Minuit : un tic par seconde sur les 10 dernières (réutilise tic.ogg), fanfare à zéro (réutilise fanfare.ogg).
  "minuit.tic": { fichier: "tic.ogg", volume: 0.6 },
  "minuit.fete": { fichier: "fanfare.ogg", volume: 0.9 },
  "temps.ajoute": { fichier: "temps-ajoute.ogg", volume: 0.45 },
  // Pause « cliffhanger de K-drama » : accord de piano dramatique (synthétisé ; déposer pause.mp3 pour un vrai piano)
  "pause": { fichier: "pause-piano.wav", volume: 0.55 },
  "reprise": { fichier: "reprise.ogg", volume: 0.4 },
  "resultats.arrivee": { fichier: "resultats.ogg", volume: 0.6 },
  "points.gagnes": { fichier: "points.ogg", volume: 0.5, variation: 15 },
  // Fin de partie et scènes
  "final.fanfare": { fichier: "fanfare.ogg", volume: 0.8 },
  // Cérémonie des bonus et classement final : réutilisent des sons existants (voir docs/mise-en-scene.md, sons manquants)
  "ceremonie.souvenir": { fichier: "jeton.ogg", volume: 0.6 },
  "ceremonie.enveloppe": { fichier: "whoosh-entree.ogg", volume: 0.5 },
  "ceremonie.tic": { fichier: "tic.ogg", volume: 0.42, variation: 8 },
  "ceremonie.flash": { fichier: "boum.ogg", volume: 0.6 },
  "ceremonie.etoile": { fichier: "points.ogg", volume: 0.6, variation: 10 },
  "ceremonie.gagnant": { fichier: "bravo.ogg", volume: 0.7 },
  "final.tambour": { fichier: "roulement.ogg", volume: 0.7 },
  "final.compteur": { fichier: "tic.ogg", volume: 0.3 },
  "transition.entree": { fichier: "whoosh-entree.ogg", volume: 0.4 },
  "transition.sortie": { fichier: "whoosh-sortie.ogg", volume: 0.4 },
  "applaudissements": { fichier: "applaudissements.ogg", volume: 0.6 },
  "tension": { fichier: "tension.ogg", volume: 0.45 },
  "echec.trombone": { fichier: "trombone.ogg", volume: 0.55 },
  // Pour les mini-jeux
  "ui.clic": { fichier: "clic.ogg", volume: 0.4, variation: 25 },
  "bonne.reponse": { fichier: "bravo.ogg", volume: 0.6 },
  "mauvaise.reponse": { fichier: "rate.ogg", volume: 0.5, variation: 15 },
  "roulement": { fichier: "roulement.ogg", volume: 0.68 },
  // — Mini-jeux : pierre-feuille-ciseaux, simon, qui-est-le-plus, le-bon-prix, compte-a-rebours, culture-genante
  "pfc.choc": { fichier: "pfc-choc.ogg", volume: 0.65, variation: 25 },
  "pfc.egalite": { fichier: "pfc-egalite.ogg", volume: 0.45 },
  "simon.note": { fichier: "simon-note.ogg", volume: 0.5 },
  "simon.rate": { fichier: "simon-rate.ogg", volume: 0.5 },
  "carte.pose": { fichier: "carte.ogg", volume: 0.5, variation: 15 },
  "jeton.pose": { fichier: "jeton.ogg", volume: 0.45, variation: 15 },
  "boum": { fichier: "boum.ogg", volume: 0.55, variation: 30 },
} as const satisfies Record<string, SonDef>;

export type NomSon = keyof typeof SONS;
export const NOMS_SONS = Object.keys(SONS) as NomSon[];
export const isNomSon = (v: string): v is NomSon => Object.prototype.hasOwnProperty.call(SONS, v);

/**
 * Remplacements propres à un habillage (docs/skins.md), ex :
 *   "rocket-league": { "chrono.fin": { fichier: "rl-but.ogg", volume: 0.8 } }
 * Les ambiances originales sont décrites dans ambiances.json ; les surcharges de l’organisateur restent prioritaires.
 */
export const SONS_PAR_SKIN: Partial<Record<SkinId, Partial<Record<NomSon, SonDef>>>> = Object.fromEntries(
  ambiances.map(({ skin, fichier, volume }) => [skin, { "lobby.musique": { fichier, volume } }]),
);
