// Vues React des mini-jeux (miroir de registry.server.ts) : id du jeu → écrans TV / téléphone.
import type { MiniGameViews } from "./views-contract";
import ceciOuCela from "./ceci-ou-cela/views";
import commeLesAutres from "./comme-les-autres/views";
import dessinRate from "./dessin-rate/views";
import compteARebours from "./compte-a-rebours/views";
import leBonPrix from "./le-bon-prix/views";
import pierreFeuilleCiseaux from "./pierre-feuille-ciseaux/views";
import quiADit from "./qui-a-dit/views";
import quiEstLePlus from "./qui-est-le-plus/views";
import simon from "./simon/views";
import tierList from "./tier-list/views";

export const webGames: Record<string, MiniGameViews> = {
  "qui-est-le-plus": quiEstLePlus,
  "ceci-ou-cela": ceciOuCela,
  "tier-list": tierList,
  "comme-les-autres": commeLesAutres,
  "le-bon-prix": leBonPrix,
  "qui-a-dit": quiADit,
  "compte-a-rebours": compteARebours,
  "simon": simon,
  "pierre-feuille-ciseaux": pierreFeuilleCiseaux,
  "dessin-rate": dessinRate,
};
