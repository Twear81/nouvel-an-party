// Résolution pure d'un nom logique vers le son à jouer : surcharge de l'organisateur (skin, puis générale),
// puis catalogue du skin, puis catalogue par défaut. Aucune dépendance au navigateur : testable sous Bun.
import { SONS, SONS_PAR_SKIN, type NomSon, type SonDef } from "../theme/sons/catalogue";
import { urlDuFichier } from "../theme/sons/urls";

export interface SonResolu {
  /** Adresse du fichier à charger. */
  url: string;
  volume: number;
  /** Variation de hauteur aléatoire (± centièmes de ton). */
  variation: number;
}

export const OVERRIDE_BASE = "/medias/sons/";
const EXTENSIONS = ["mp3", "ogg", "wav"];

/** Premier fichier de la liste nommé `<prefixe><nom>.(mp3|ogg|wav)` (ordre mp3, ogg, wav). */
export function findOverride(fichiers: readonly string[], nom: string, prefixe = ""): string | null {
  for (const ext of EXTENSIONS) {
    const wanted = `${prefixe}${nom}.${ext}`.toLowerCase();
    const found = fichiers.find((f) => f.toLowerCase() === wanted);
    if (found) return found;
  }
  return null;
}

type UrlOf = (fichier: string) => string | null;

export function resolveSound(
  nom: string,
  skin: string | null,
  fichiers: readonly string[],
  urlOf: UrlOf = urlDuFichier,
  catalogue: Record<string, SonDef> = SONS,
  parSkin: Partial<Record<string, Partial<Record<string, SonDef>>>> = SONS_PAR_SKIN,
): SonResolu | null {
  if (!Object.hasOwn(catalogue, nom)) return null;
  const skinDef = skin ? parSkin[skin]?.[nom] : undefined;
  const def: SonDef = skinDef ?? catalogue[nom]!;
  const variation = def.variation ?? 0;

  const override = (skin ? findOverride(fichiers, nom, `${skin}/`) : null) ?? findOverride(fichiers, nom);
  if (override) return { url: OVERRIDE_BASE + override.split("/").map(encodeURIComponent).join("/"), volume: def.volume, variation };

  const url = def.fichier ? urlOf(def.fichier) : null; // `""` : rien de livré, seulement le fichier de l'organisateur
  return url ? { url, volume: def.volume, variation } : null;
}

/** Tous les sons qui peuvent servir : pour le préchargement. */
export function allSounds(skin: string | null, fichiers: readonly string[]): Map<NomSon, SonResolu> {
  const out = new Map<NomSon, SonResolu>();
  for (const nom of Object.keys(SONS) as NomSon[]) {
    const r = resolveSound(nom, skin, fichiers);
    if (r) out.set(nom, r);
  }
  return out;
}
