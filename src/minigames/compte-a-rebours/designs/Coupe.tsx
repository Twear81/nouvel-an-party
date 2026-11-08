// Design « Coupe de champagne » : la coupe se remplit, pleine pile à la cible. Chaos : le niveau saute, déborde en mousse,
// se vide d'un coup, et un nuage de bulles finit par cacher la coupe.
import type { DesignProps } from "../chaos";

const TOP = 20;
const BOTTOM = 205;
const CUP = "M38 20 L162 20 L128 188 Q100 214 72 188 Z";

export function Coupe({ elapsedMs, cible, chaos: c, shown }: DesignProps) {
  const frac = Math.max(0, shown / (cible * 1000));
  const level = Math.min(1, frac);
  const y = BOTTOM - level * (BOTTOM - TOP);
  const overflow = frac > 1.02;
  const hidden = c.mode === "hidden";
  const bubbles = Array.from({ length: 12 }, (_, i) => {
    const speed = 0.02 + c.rnd(i + 3) * 0.03;
    const t = (elapsedMs * speed + c.rnd(i) * 200) % 200;
    return { cx: 70 + c.rnd(i + 9) * 60, cy: BOTTOM - t, r: 2 + c.rnd(i + 20) * 4 };
  });
  return (
    <svg viewBox="0 0 200 300" className="h-[38rem] w-[25.3rem] overflow-visible">
      <defs>
        <clipPath id="cabr-cup">
          <path d={CUP} />
        </clipPath>
      </defs>
      <g clipPath="url(#cabr-cup)">
        <rect x="0" y={y} width="200" height="260" className="fill-accent" />
        <rect x="0" y={y} width="200" height="8" className="fill-accent-strong" />
        {bubbles.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} className="fill-ink/60" />
        ))}
      </g>
      <path d={CUP} strokeWidth="5" className="fill-ink/10 stroke-ink" strokeLinejoin="round" />
      <rect x="96" y="208" width="8" height="62" className="fill-ink" />
      <rect x="62" y="268" width="76" height="9" rx="4" className="fill-ink" />
      {/* repère de la rive : « c'est plein ici » */}
      <line x1="30" y1={TOP} x2="170" y2={TOP} strokeWidth="2" strokeDasharray="6 6" className="stroke-hot" />
      {overflow && (
        <g>
          <circle cx="50" cy="14" r="16" className="fill-ink" />
          <circle cx="86" cy="4" r="20" className="fill-ink" />
          <circle cx="124" cy="10" r="18" className="fill-ink" />
          <circle cx="152" cy="18" r="13" className="fill-ink" />
          <rect x="42" y="14" width="10" height="70" rx="5" className="fill-ink/80" />
          <rect x="146" y="18" width="10" height="46" rx="5" className="fill-ink/80" />
        </g>
      )}
      {(hidden || c.power > 0.7) && (
        <g opacity={hidden ? 1 : 0.35}>
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={30 + c.rnd(i + 120) * 140} cy={30 + c.rnd(i + 140) * 200} r={18 + c.rnd(i + 160) * 22} className="fill-bg-3 stroke-ink" strokeWidth="2" />
          ))}
        </g>
      )}
    </svg>
  );
}
