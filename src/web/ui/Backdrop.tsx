// Fond de nuit : dégradé + étoiles scintillantes + halos qui dérivent (CSS pur, léger pour les téléphones).
// C'est le rendu par défaut ; chaque skin redessine son fond en CSS (docs/skins.md) : le conteneur porte
// data-ui="backdrop" et data-skin-backdrop, le décor d'origine (halos, étoiles) est marqué data-backdrop-default pour
// pouvoir le masquer, et 3 calques vides [data-ui="backdrop-layer"] sont prévus pour les ambiances animées.
import { useMemo } from "react";
import { useSkin } from "../theme/skin";

export function Backdrop({ stars = 46 }: { stars?: number }) {
  const skin = useSkin();
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
    <div aria-hidden data-ui="backdrop" data-skin-backdrop={skin ?? ""} className="pointer-events-none absolute inset-0 overflow-hidden bg-night">
      {/* Halos en dégradé radial (pas de filtre blur : trop lourd pour Safari iOS et Firefox Android) */}
      <div data-backdrop-default className="absolute -left-1/4 top-[-20%] h-[80%] w-[80%] animate-float" style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--color-hot) 28%, transparent), transparent)" }} />
      <div data-backdrop-default className="absolute -right-1/4 bottom-[-25%] h-[80%] w-[80%] animate-float" style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent) 17%, transparent), transparent)", animationDelay: "-3s" }} />
      {dots.map((d, i) => (
        <span
          key={i}
          data-backdrop-default
          className="absolute rounded-full bg-ink animate-twinkle"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: `${d.size}rem`, height: `${d.size}rem`, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s` }}
        />
      ))}
      {/* Calques vides pour les skins (ambiances animées) : invisibles tant qu'un skin ne les dessine pas. */}
      {[1, 2, 3].map((n) => (
        <div key={n} data-ui="backdrop-layer" data-layer={n} className="absolute inset-0" />
      ))}
    </div>
  );
}
