// Fond de nuit : dégradé + étoiles scintillantes + halos qui dérivent (CSS pur, léger pour les téléphones).
import { useMemo } from "react";

export function Backdrop({ stars = 46 }: { stars?: number }) {
  const dots = useMemo(
    () =>
      Array.from({ length: stars }, (_, i) => ({
        left: (i * 37.7 + (i % 7) * 11) % 100,
        top: (i * 53.3 + (i % 5) * 17) % 100,
        size: 0.15 + ((i * 13) % 10) / 22,
        delay: ((i * 7) % 40) / 10,
        duration: 3 + ((i * 3) % 5),
      })),
    [stars],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-night">
      {/* Halos en dégradé radial (pas de filtre blur : trop lourd pour Safari iOS et Firefox Android) */}
      <div className="absolute -left-1/4 top-[-20%] h-[80%] w-[80%] animate-float" style={{ background: "radial-gradient(closest-side, rgb(255 79 154 / 0.28), transparent)" }} />
      <div className="absolute -right-1/4 bottom-[-25%] h-[80%] w-[80%] animate-float" style={{ background: "radial-gradient(closest-side, rgb(246 205 114 / 0.17), transparent)", animationDelay: "-3s" }} />
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-ink animate-twinkle"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: `${d.size}rem`, height: `${d.size}rem`, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s` }}
        />
      ))}
    </div>
  );
}
