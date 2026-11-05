// Liste des mini-jeux côté serveur (l'ordre = celui de l'écran de lancement). Pour en ajouter un :
// créer son dossier puis l'ajouter ici (et dans registry.web.ts). Voir docs/creer-un-mini-jeu.md.
import type { MiniGame } from "./contract";
import ceciOuCela from "./ceci-ou-cela/game";
import commeLesAutres from "./comme-les-autres/game";
import quiEstLePlus from "./qui-est-le-plus/game";
import simon from "./simon/game";
import tierList from "./tier-list/game";

export const serverGames: MiniGame[] = [
  quiEstLePlus,
  ceciOuCela,
  tierList,
  commeLesAutres,
  simon,
];
