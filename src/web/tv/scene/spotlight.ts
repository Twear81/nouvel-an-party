// Parcours du projecteur : des sauts de portrait en portrait qui ralentissent et s'arrêtent sur le gagnant.
// Pur et déterministe (la TV ne tire rien : même graine, même parcours, y compris après un rechargement).

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Indices de portraits visités ; le dernier est `target`. Jamais deux fois de suite le même (sauf un seul joueur). */
export function spotlightPath(seed: string, count: number, target: number, hops = 11): number[] {
  if (count <= 1) return [0];
  const rand = mulberry(hash(seed));
  const path: number[] = [];
  let last = -1;
  for (let i = 0; i < hops - 1; i++) {
    let next = Math.floor(rand() * count);
    if (next === last) next = (next + 1) % count;
    path.push(next);
    last = next;
  }
  if (last === target) path[path.length - 1] = (target + 1 + Math.floor(rand() * (count - 1))) % count;
  path.push(target);
  return path;
}

/** Fraction (0-1) du temps où le projecteur arrive sur chaque portrait : l'écart grandit à chaque saut. */
export function spotlightTimes(hops: number): number[] {
  if (hops <= 1) return [0];
  const gaps = Array.from({ length: hops - 1 }, (_, i) => 1 + i * 0.55);
  const total = gaps.reduce((a, b) => a + b, 0);
  let at = 0;
  return [0, ...gaps.map((g) => (at += g / total))];
}
