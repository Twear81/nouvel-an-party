// Le compteur de la TV : net pendant `visible` secondes, puis de plus en plus chaotique.
// Fonction pure du temps écoulé (aucun hasard réel : même instant = même image), sans jamais afficher la vraie valeur ensuite.
import { fmtCounter } from "./rank";

export type ChaosKind = "clear" | "glitch" | "scramble" | "run" | "freeze" | "hidden" | "question" | "jump";
export type Tone = "ink" | "hot" | "cool" | "accent";

export interface CounterFrame {
  kind: ChaosKind;
  text: string;
  opacity: number;
  /** Décalage en `em`, rotation / inclinaison en degrés, échelle. */
  x: number;
  y: number;
  rot: number;
  skew: number;
  scale: number;
  /** Écart (em) de l'effet de dédoublement rose / bleu. */
  split: number;
  tone: Tone;
}

export interface CounterVariant {
  cible: number;
  visible: number;
  decompte: boolean;
}

/** Hash 32 bits → [0, 1) : un "hasard" reproductible à partir d'un entier. */
export function hash(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const TONES: Tone[] = ["ink", "hot", "cool", "accent"];

export const realValueMs = (elapsedMs: number, v: CounterVariant) => (v.decompte ? v.cible * 1000 - elapsedMs : elapsedMs);

export function counterFrame(elapsedMs: number, v: CounterVariant): CounterFrame {
  const clear = (text: string): CounterFrame => ({ kind: "clear", text, opacity: 1, x: 0, y: 0, rot: 0, skew: 0, scale: 1, split: 0, tone: "accent" });
  const vis = v.visible * 1000;
  if (elapsedMs < vis) return clear(fmtCounter(Math.max(0, realValueMs(elapsedMs, v))));

  const since = elapsedMs - vis;
  const power = Math.min(1, 0.4 + since / 4000); // le chaos s'intensifie
  const f = Math.floor(elapsedMs / 55); // une "image" toutes les 55 ms
  const jitter = (k: number) => hash(f * 7 + k) - 0.5;
  const maxFake = Math.max(v.cible * 1000 * 1.5, 5000);
  const fake = (k: number) => hash(k) * maxFake;

  const base: CounterFrame = {
    kind: "scramble",
    text: "",
    opacity: 1,
    x: jitter(1) * 0.5 * power,
    y: jitter(2) * 0.25 * power,
    rot: jitter(3) * 8 * power,
    skew: jitter(4) * 16 * power,
    scale: 1 + jitter(5) * 0.18 * power,
    split: 0.03 + 0.07 * power * hash(f * 3 + 9),
    tone: "ink",
  };

  // Les 450 premières ms : la vraie valeur tremble, signe que ça déraille.
  if (since < 450) return { ...base, kind: "glitch", text: fmtCounter(Math.max(0, realValueMs(elapsedMs, v))), tone: "hot", split: 0.1 };

  const slot = 330 - 150 * power; // durée d'un "mode"
  const bucket = Math.floor(elapsedMs / slot);
  const into = elapsedMs - bucket * slot;
  const r = hash(bucket * 13 + 7);
  const tone = TONES[Math.floor(hash(bucket + 21) * TONES.length)]!;

  if (r < 0.28) return { ...base, kind: "scramble", text: fmtCounter(fake(f * 3 + bucket)), tone };
  if (r < 0.5) {
    // Un compteur qui part dans une direction inattendue, parfois à l'envers.
    const rate = hash(bucket + 3) * 4.5 - 1.5;
    return { ...base, kind: "run", text: fmtCounter(Math.max(0, fake(bucket + 2) + into * rate)), tone };
  }
  if (r < 0.62) return { ...base, kind: "freeze", text: fmtCounter(fake(bucket + 5)), tone, x: 0, y: 0, rot: 0, skew: 0, split: 0.02 };
  if (r < 0.76) return { ...base, kind: "hidden", text: fmtCounter(fake(f)), opacity: 0.03 + 0.05 * hash(f), tone };
  if (r < 0.88) return { ...base, kind: "question", text: "??,??", tone };
  return { ...base, kind: "jump", text: fmtCounter(fake(bucket + 11)), tone, x: (hash(bucket + 4) - 0.5) * 0.6, y: (hash(bucket + 6) - 0.5) * 0.4, rot: (hash(bucket + 8) - 0.5) * 24, scale: 0.6 + hash(bucket + 12) * 0.6 };
}
