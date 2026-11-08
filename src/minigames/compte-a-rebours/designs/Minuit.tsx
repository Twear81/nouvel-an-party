// Design « Minuit » : le décompte du Nouvel An, un gros chiffre entier qui descend dans un anneau doré qui se vide.
// Chaos : le chiffre se met à compter n'importe comment (13, 2, 9…), l'anneau tourne et clignote, puis le chiffre devient « ? ».
import type { DesignProps } from "../chaos";

const R = 100;
const CIRC = 2 * Math.PI * R;

export function Minuit({ cible, chaos: c, shown }: DesignProps) {
  const remain = cible - shown / 1000;
  const frac = Math.min(1, Math.max(0, remain / cible));
  const n = Math.max(0, Math.ceil(remain - 1e-9));
  const clear = c.mode === "clear";
  const spin = clear ? 0 : c.frame * (c.rnd(c.bucket + 1) > 0.5 ? 14 : -14);
  const ring = clear ? "stroke-accent" : c.rnd(c.frame) > 0.5 ? "stroke-hot" : "stroke-cool";
  const qmark = c.mode === "hidden" && c.bucket % 2 === 1;
  const faded = c.mode === "hidden" && !qmark;
  const jolt = clear ? 1 : 1 + (c.rnd(c.frame + 2) - 0.5) * 0.3 * c.power;
  return (
    <svg viewBox="-130 -130 260 260" className="h-[36rem] w-[36rem] overflow-visible">
      <circle r={R} strokeWidth="16" className="fill-surface stroke-surface-strong" />
      <g transform={`rotate(${-90 + spin})`}>
        <circle r={R} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${frac * CIRC} ${CIRC}`} className={`fill-none ${ring}`} />
      </g>
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={Math.sin((i * Math.PI) / 6) * 122} cy={-Math.cos((i * Math.PI) / 6) * 122} r="4" className={clear || c.rnd(c.frame + i) > 0.5 ? "fill-accent" : "fill-hot"} />
      ))}
      <text y="38" textAnchor="middle" fontSize="120" className="fill-ink font-display" style={{ transform: `scale(${jolt})`, transformOrigin: "center", opacity: faded ? 0.05 : 1 }}>
        {qmark ? "?" : n}
      </text>
    </svg>
  );
}
