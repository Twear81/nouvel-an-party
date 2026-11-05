// Liste des mini-jeux côté serveur. Pour en ajouter un : créer son dossier puis l'ajouter ici
// (et dans registry.web.ts). Voir docs/creer-un-mini-jeu.md.
import type { MiniGame } from "./contract";
import ceciOuCela from "./ceci-ou-cela/game";
import leBonPrix from "./le-bon-prix/game";
import quiEstLePlus from "./qui-est-le-plus/game";

export const serverGames: MiniGame[] = [quiEstLePlus, ceciOuCela, leBonPrix];
