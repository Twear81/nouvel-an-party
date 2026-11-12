// Jauge bilatérale (deux camps qui poussent l'un vers l'autre : OUI / NON…). `left` et `right` sont des parts de 0 à 1 ;
// le camp de gauche est « good », celui de droite « bad ». Les skins l'habillent via [data-ui="duel-gauge"] et ses
// parties duel-gauge-left, duel-gauge-right, duel-gauge-mid (repère central).
interface Props {
  left: number;
  right: number;
  /** Rail : hauteur et marges (`h-20 w-full`…). */
  className?: string;
  "data-testid"?: string;
}

// Les deux camps font toute la largeur et glissent (translateX) : pas de `width` animée.
const missing = (v: number) => (1 - Math.max(0, Math.min(1, v))) * 100;

export function DuelGauge({ left, right, className = "", ...rest }: Props) {
  return (
    <div data-ui="duel-gauge" data-testid={rest["data-testid"]} className={`relative overflow-hidden rounded-chip bg-surface-strong ${className}`}>
      <div data-ui="duel-gauge-left" className="absolute inset-y-0 left-0 w-full bg-good transition-transform duration-300 ease-out will-change-transform" style={{ transform: `translateX(${-missing(left)}%)` }} />
      <div data-ui="duel-gauge-right" className="absolute inset-y-0 right-0 w-full bg-bad transition-transform duration-300 ease-out will-change-transform" style={{ transform: `translateX(${missing(right)}%)` }} />
      <div data-ui="duel-gauge-mid" className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 bg-ink" />
    </div>
  );
}
