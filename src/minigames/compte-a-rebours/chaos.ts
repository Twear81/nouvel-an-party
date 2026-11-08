// Le chaos des compteurs de la TV : net pendant `visible` secondes, puis de plus en plus fou.
// Tout est une fonction pure du temps écoulé et de la graine tirée par le serveur : même instant = même image,
// donc un rechargement de la TV rejoue exactement le même compteur (aucun hasard réel côté React).

/** Hash 32 bits → [0, 1) : un « hasard » reproductible à partir d'un entier. */
export function hash(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export type Mode = "clear" | "tremble" | "scramble" | "run" | "freeze" | "hidden" | "jump";

export interface Chaos {
  mode: Mode;
  /** 0 = net, 1 = chaos maximal (monte pendant ~4 s après la fin de la lisibilité). */
  power: number;
  /** Numéro de « mode » en cours (change toutes les 180 à 330 ms). */
  bucket: number;
  /** Millisecondes écoulées dans le mode en cours. */
  into: number;
  /** Numéro d'image (une toutes les 55 ms). */
  frame: number;
  /** Hasard reproductible, propre à cette manche. */
  rnd: (k: number) => number;
}

/** Juste après la fin de la lisibilité, la vraie valeur tremble : signe que ça déraille. */
const TREMBLE_MS = 450;

export function chaosAt(elapsedMs: number, visibleMs: number, seed: number): Chaos {
  const rnd = (k: number) => hash(k * 131 + seed);
  const frame = Math.floor(elapsedMs / 55);
  if (elapsedMs < visibleMs) return { mode: "clear", power: 0, bucket: 0, into: 0, frame, rnd };
  const since = elapsedMs - visibleMs;
  const power = Math.min(1, 0.4 + since / 4000);
  if (since < TREMBLE_MS) return { mode: "tremble", power, bucket: 0, into: since, frame, rnd };
  const slot = 330 - 150 * power;
  const bucket = Math.floor(elapsedMs / slot);
  const r = rnd(bucket * 13 + 7);
  const mode: Mode = r < 0.28 ? "scramble" : r < 0.5 ? "run" : r < 0.62 ? "freeze" : r < 0.78 ? "hidden" : "jump";
  return { mode, power, bucket, into: elapsedMs - bucket * slot, frame, rnd };
}

/**
 * Valeur (ms) que le compteur AFFICHE : la vraie tant que c'est net (ou qu'elle tremble), puis n'importe quoi,
 * parfois à l'envers. Jamais la vraie valeur après le tremblement.
 */
export function shownMs(elapsedMs: number, c: Chaos, cibleS: number): number {
  const maxFake = Math.max(cibleS * 1000 * 1.5, 5000);
  const fake = (k: number) => c.rnd(k) * maxFake;
  switch (c.mode) {
    case "clear":
    case "tremble":
      return elapsedMs;
    case "scramble":
    case "hidden":
      return fake(c.frame * 3 + c.bucket);
    case "run":
      return Math.max(0, fake(c.bucket + 2) + c.into * (c.rnd(c.bucket + 3) * 4.5 - 1.5));
    case "freeze":
      return fake(c.bucket + 5);
    case "jump":
      return fake(c.bucket + 11);
  }
}

/** Ce que reçoit chaque design : tout ce qu'il faut pour dessiner UNE image. */
export interface DesignProps {
  elapsedMs: number;
  cible: number;
  chaos: Chaos;
  /** Valeur affichée (ms), voir shownMs. */
  shown: number;
}
