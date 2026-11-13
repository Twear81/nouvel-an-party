// Étoile bonus de la cérémonie : image peinte (`etoile.png`), sinon l'emoji ⭐. Taille en rem.
import { ceremonieImage } from "../theme/ceremonie-assets";

export function Star({ size = 4, className = "", ...rest }: { size?: number; className?: string; "data-testid"?: string }) {
  const src = ceremonieImage("etoile");
  const box = { width: `${size}rem`, height: `${size}rem` };
  if (src) return <img data-testid={rest["data-testid"]} data-ui="star" src={src} alt="" draggable={false} className={`cer-star ${className}`} style={box} />;
  return <span data-testid={rest["data-testid"]} data-ui="star" aria-hidden className={`cer-star cer-star-fallback ${className}`} style={{ ...box, fontSize: `${size * 0.9}rem` }}>⭐</span>;
}
