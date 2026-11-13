// Feu d'artifice décoratif : des gerbes d'étincelles (petits disques) qui jaillissent du même point, retombent et
// s'éteignent, en boucle, décalées les unes des autres. Uniquement `transform` / `opacity` (keyframes CSS
// `firework-spark` de theme.css), aucun filtre ni SVG animé : quelques dizaines de <span> suffisent.
// Les couleurs viennent des jetons du thème ; les positions sont fixes (pseudo-hasard déterministe, pas de rejeu différent).
import { useMemo } from "react";

const COLORS = ["bg-accent", "bg-accent-strong", "bg-hot", "bg-cool", "bg-ink", "bg-good"] as const;
const PERIOD = 4.2; // secondes entre deux gerbes d'un même point

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spark { dx: number; dy: number; size: number; color: string }
interface Burst { x: number; y: number; delay: number; sparks: Spark[] }

/** Gerbes réparties dans le tiers haut de l'écran ; `reach` = rayon d'une gerbe en rem. */
export function buildBursts(count: number, sparks: number, reach: number, seed = 2027): Burst[] {
  const rand = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const power = reach * (0.7 + rand() * 0.5);
    const palette = [COLORS[i % COLORS.length]!, COLORS[(i + 2) % COLORS.length]!];
    return {
      x: 10 + ((i + 0.5) / count) * 80 + (rand() - 0.5) * 6,
      y: 18 + rand() * 32,
      delay: (i * PERIOD) / count,
      sparks: Array.from({ length: sparks }, (_, k) => {
        const angle = (k / sparks) * Math.PI * 2 + rand() * 0.2;
        const r = power * (0.75 + rand() * 0.25);
        return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r, size: 0.9 + rand() * 0.7, color: palette[k % 2]! };
      }),
    };
  });
}

/**
 * `fit` : feu d'artifice ramené à une boîte plus petite que l'écran (ex. une fenêtre de la pièce) : `count` gerbes de `sparks`
 * étincelles, de rayon `reach` rem, étincelles de taille `unit`. Le parent coupe ce qui dépasse (`overflow: hidden`).
 */
export function Fireworks({ size = "tv", fit }: { size?: "tv" | "phone"; fit?: { count: number; sparks: number; reach: number; unit: number; seed?: number } }) {
  const bursts = useMemo(() => (fit ? buildBursts(fit.count, fit.sparks, fit.reach, fit.seed) : size === "tv" ? buildBursts(7, 22, 20) : buildBursts(5, 14, 8)), [size, fit?.count, fit?.sparks, fit?.reach, fit?.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const unit = fit ? fit.unit : size === "tv" ? 1 : 0.6; // taille d'une étincelle
  return (
    <div data-testid="fireworks" data-ui="fireworks" data-clip="voulu" aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bursts.map((b, i) => (
        <div key={i} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {b.sparks.map((s, k) => (
            <span
              key={k}
              className={`absolute rounded-full ${s.color}`}
              style={{
                width: `${s.size * unit}rem`,
                height: `${s.size * unit}rem`,
                marginLeft: `${-s.size * unit / 2}rem`,
                marginTop: `${-s.size * unit / 2}rem`,
                opacity: 0,
                ["--dx" as string]: `${s.dx}rem`,
                ["--dy" as string]: `${s.dy}rem`,
                animation: `firework-spark ${PERIOD}s ease-out ${b.delay}s infinite backwards`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
