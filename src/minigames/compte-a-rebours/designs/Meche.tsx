// Design « Bombe à mèche » : la mèche brûle jusqu'à la bombe (arrivée = la cible). Chaos : l'étincelle avance par saccades,
// recule, s'arrête, et une fumée épaisse finit par masquer la mèche.
import type { DesignProps } from "../chaos";

const X0 = 30;
const X1 = 300;

export function Meche({ elapsedMs, cible, chaos: c, shown }: DesignProps) {
  const frac = Math.min(1, Math.max(0, shown / (cible * 1000)));
  const x = X0 + frac * (X1 - X0);
  const flick = 1 + (c.rnd(c.frame) - 0.5) * 0.5;
  const shake = c.mode === "clear" ? 0 : (c.rnd(c.frame + 5) - 0.5) * 6 * c.power;
  // Fumée : de plus en plus dense, opaque d'un coup quand le mode « hidden » tombe.
  const smoke = c.mode === "clear" ? 0 : c.mode === "hidden" ? 0.96 : 0.12 + 0.3 * c.power;
  const puffs = Array.from({ length: 9 }, (_, i) => ({
    cx: 40 + i * 32 + (c.rnd(i + 50) - 0.5) * 20,
    cy: 100 + Math.sin(elapsedMs / 500 + i * 2) * 14,
    r: 34 + c.rnd(i + 70) * 20,
  }));
  return (
    <svg viewBox="0 0 420 200" className="h-[36rem] w-[76rem] overflow-visible">
      <g transform={`translate(${shake} ${-shake / 2})`}>
        {/* mèche : restante en doré, brûlée en sombre */}
        <line x1={X0} y1="100" x2={X1} y2="100" strokeWidth="9" strokeLinecap="round" className="stroke-ink-muted/30" />
        <line x1={x} y1="100" x2={X1} y2="100" strokeWidth="9" strokeLinecap="round" className="stroke-accent" />
        {/* bombe */}
        <circle cx="352" cy="108" r="58" className="fill-bg-3 stroke-accent" strokeWidth="4" />
        <circle cx="332" cy="86" r="14" className="fill-ink/25" />
        <rect x="296" y="94" width="22" height="14" rx="4" className="fill-accent-deep" />
        {/* étincelle */}
        <g transform={`translate(${x} 100) scale(${flick})`}>
          <circle r="20" className="fill-hot/40" />
          <circle r="11" className="fill-accent-strong" />
          <circle r="5" className="fill-ink" />
        </g>
      </g>
      {puffs.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} className="fill-ink-muted" opacity={smoke * (0.6 + 0.4 * c.rnd(i + 90))} />
      ))}
    </svg>
  );
}
