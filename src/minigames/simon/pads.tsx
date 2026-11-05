// Les 4 pastilles de Simon : couleurs (jetons --color-simon-* de theme.css) + une forme propre à chacune,
// pour qu'on les distingue aussi sans les couleurs. Classes écrites en toutes lettres pour que Tailwind les repère.
import type { SVGProps } from "react";

export interface PadStyle {
  /** Couleur au repos. */
  idle: string;
  /** Couleur allumée. */
  lit: string;
  /** Halo quand la pastille est allumée. */
  glow: string;
  /** Épaisseur 3D du bouton (téléphone). */
  deep: string;
  /** Arrondi du coin extérieur sur la TV : les 4 pastilles forment un disque. */
  corner: string;
  /** Pastille de petite taille (rappel de couleur dans une pastille d'info). */
  dot: string;
}

export const PADS: readonly PadStyle[] = [
  { idle: "bg-simon-green", lit: "bg-simon-green-lit", glow: "shadow-[0_0_7rem_var(--color-simon-green-lit)]", deep: "shadow-[0_0.5rem_0_var(--color-simon-green-deep)]", corner: "rounded-tl-[16rem]", dot: "bg-simon-green" },
  { idle: "bg-simon-red", lit: "bg-simon-red-lit", glow: "shadow-[0_0_7rem_var(--color-simon-red-lit)]", deep: "shadow-[0_0.5rem_0_var(--color-simon-red-deep)]", corner: "rounded-tr-[16rem]", dot: "bg-simon-red" },
  { idle: "bg-simon-yellow", lit: "bg-simon-yellow-lit", glow: "shadow-[0_0_7rem_var(--color-simon-yellow-lit)]", deep: "shadow-[0_0.5rem_0_var(--color-simon-yellow-deep)]", corner: "rounded-bl-[16rem]", dot: "bg-simon-yellow" },
  { idle: "bg-simon-blue", lit: "bg-simon-blue-lit", glow: "shadow-[0_0_7rem_var(--color-simon-blue-lit)]", deep: "shadow-[0_0.5rem_0_var(--color-simon-blue-deep)]", corner: "rounded-br-[16rem]", dot: "bg-simon-blue" },
];

/** Forme de chaque pastille : triangle, rond, carré, losange. */
export function PadShape({ pad, ...props }: { pad: number } & SVGProps<SVGSVGElement>) {
  const d = ["M12 3.5 22 20.5H2Z", "", "M4.5 4.5h15v15h-15Z", "M12 1.5 22.5 12 12 22.5 1.5 12Z"][pad]!;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...props}>
      {pad === 1 ? <circle cx="12" cy="12" r="10" /> : <path d={d} strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  );
}
