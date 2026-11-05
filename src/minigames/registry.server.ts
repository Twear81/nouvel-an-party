// Liste des mini-jeux côté serveur. Pour en ajouter un : créer son dossier puis l'ajouter ici
// (et dans registry.web.ts). Voir docs/creer-un-mini-jeu.md.
import type { MiniGame } from "./contract";
import ouiNon from "./oui-non/game";
import quiEstLePlus from "./qui-est-le-plus/game";

export const serverGames: MiniGame[] = [quiEstLePlus, ouiNon];
