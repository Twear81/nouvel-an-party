// Design « Horloge » : un cadran de 12 graduations (1 graduation = 1 seconde) et sa trotteuse.
// Chaos : l'aiguille s'affole (tours à toute vitesse, marche arrière, sursauts), des aiguilles fantômes apparaissent, puis elle disparaît.
import type { DesignProps } from "../chaos";

const rad = (deg: number) => (deg * Math.PI) / 180;

function Hand({ deg, className, width = 3, len = 74 }: { deg: number; className: string; width?: number; len?: number }) {
  return (
    <g transform={`rotate(${deg})`}>
      <line x1="0" y1="14" x2="0" y2={-len} strokeWidth={width} strokeLinecap="round" className={className} />
    </g>
  );
}

export function Horloge({ chaos: c, shown }: DesignProps) {
  const deg = (shown / 12000) * 360;
  const hidden = c.mode === "hidden";
  const ghosts = c.power > 0.6 && c.mode !== "freeze" ? [c.rnd(c.bucket + 31) * 140 + 40, -(c.rnd(c.bucket + 32) * 140 + 40)] : [];
  const shake = c.mode === "clear" ? 0 : (c.rnd(c.frame) - 0.5) * 3 * c.power;
  return (
    <svg viewBox="-100 -100 200 200" className="h-[36rem] w-[36rem] overflow-visible" style={{ transform: `rotate(${shake}deg)` }}>
      <circle r="94" strokeWidth="5" className="fill-surface stroke-accent" />
      <circle r="88" strokeWidth="1" className="fill-none stroke-line" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = rad(i * 30);
        return (
          <g key={i}>
            <line x1={Math.sin(a) * 78} y1={-Math.cos(a) * 78} x2={Math.sin(a) * 88} y2={-Math.cos(a) * 88} strokeWidth="3" className="stroke-ink" />
            <text x={Math.sin(a) * 64} y={-Math.cos(a) * 64 + 6} textAnchor="middle" fontSize="16" className="fill-ink font-display">
              {i === 0 ? 12 : i}
            </text>
          </g>
        );
      })}
      {ghosts.map((g, i) => (
        <g key={i} opacity={0.35}>
          <Hand deg={deg + g} className={i ? "stroke-cool" : "stroke-hot"} width={2} />
        </g>
      ))}
      <g opacity={hidden ? 0.04 : 1}>
        <Hand deg={deg} className={c.mode === "clear" ? "stroke-accent" : "stroke-hot"} width={4} />
      </g>
      <circle r="7" className="fill-accent" />
    </svg>
  );
}
