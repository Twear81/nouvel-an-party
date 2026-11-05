// Vues React des mini-jeux (miroir de registry.server.ts) : id du jeu → écrans TV / téléphone.
import type { MiniGameViews } from "./views-contract";
import ceciOuCela from "./ceci-ou-cela/views";
import leBonPrix from "./le-bon-prix/views";
import quiEstLePlus from "./qui-est-le-plus/views";

export const webGames: Record<string, MiniGameViews> = {
  "qui-est-le-plus": quiEstLePlus,
  "ceci-ou-cela": ceciOuCela,
  "le-bon-prix": leBonPrix,
};
