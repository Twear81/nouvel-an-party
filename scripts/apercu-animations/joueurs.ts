// Invités de démonstration : à 8, des pseudos de 16 caractères pour vérifier que rien ne déborde.
import type { PublicPlayer } from "../../src/shared/types";

const AVATARS = ["renard", "dragon", "licorne", "chat", "robot", "panda", "hibou", "grenouille"];
const COULEURS = ["#ff3366", "#33aaff", "#ffcc33", "#44cc88", "#aa66ff", "#ff8844", "#33cccc", "#ee5588"];
const NOMS_3 = ["Anne-Sophie", "Julien", "Marion"];
const NOMS_8 = ["Anne-SophieDuPont", "SeizeCaracteres!", "JulienLeGrandNom", "MarionLaPlusFor", "ThomasLeMagnifi", "CamilleEtCompagn", "NicolasLeDernier", "LéaLaRetardatair"].map((n) => n.slice(0, 16));
export const SCORES_DE_DEPART = [450, 380, 320, 300, 250, 200, 120, 80];

export type NombreJoueurs = 3 | 8;

export function creerJoueurs(nombre: NombreJoueurs, avecScores = true): PublicPlayer[] {
  const noms = nombre === 8 ? NOMS_8 : NOMS_3;
  return noms.map((name, i) => ({
    id: `p${i + 1}`,
    profile: { name, avatar: { kind: "preset" as const, id: AVATARS[i]! }, frame: "none", color: COULEURS[i]! },
    score: avecScores ? SCORES_DE_DEPART[i]! : 0,
    connected: true,
  }));
}
