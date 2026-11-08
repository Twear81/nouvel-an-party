// Liste des mini-jeux côté serveur (l'ordre = celui de l'écran de lancement). Pour en ajouter un :
// créer son dossier puis l'ajouter ici (et dans registry.web.ts). Voir docs/creer-un-mini-jeu.md.
import type { MiniGame } from "./contract";
import ceciOuCela from "./ceci-ou-cela/game";
import commeLesAutres from "./comme-les-autres/game";
import dessinRate from "./dessin-rate/game";
import compteARebours from "./compte-a-rebours/game";
import cultureGenante from "./culture-genante/game";
import imposteur from "./imposteur/game";
import leBonPrix from "./le-bon-prix/game";
import pierreFeuilleCiseaux from "./pierre-feuille-ciseaux/game";
import splitTheRoom from "./split-the-room/game";
import quiEstLePlus from "./qui-est-le-plus/game";
import simon from "./simon/game";
import tierList from "./tier-list/game";

export const serverGames: MiniGame[] = [
  quiEstLePlus,
  ceciOuCela,
  tierList,
  commeLesAutres,
  leBonPrix,
  splitTheRoom,
  compteARebours,
  simon,
  pierreFeuilleCiseaux,
  cultureGenante, // interlude : surgit entre les jeux
  imposteur,
  dessinRate,
];
