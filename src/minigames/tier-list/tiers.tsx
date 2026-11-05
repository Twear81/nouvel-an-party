// Briques visuelles communes à la tier list (couleurs d'étages : tokens --color-tier-N de theme.css).
import { motion } from "motion/react";
import type { ReactNode } from "react";

// Classes écrites en entier pour que Tailwind les repère. L'étage 0 (le plus haut) prend la couleur 1.
export const TIER_BG = ["bg-tier-1", "bg-tier-2", "bg-tier-3", "bg-tier-4", "bg-tier-5", "bg-tier-6"];
export const TIER_TEXT = ["text-tier-1", "text-tier-2", "text-tier-3", "text-tier-4", "text-tier-5", "text-tier-6"];
export const TIER_BORDER = ["border-tier-1", "border-tier-2", "border-tier-3", "border-tier-4", "border-tier-5", "border-tier-6"];

/** Pastille colorée d'un étage (lettre sur fond de l'étage). */
export function TierBadge({ index, label, className = "" }: { index: number; label: string; className?: string }) {
  return (
    <span className={`flex items-center justify-center font-display text-accent-ink ${TIER_BG[index]} ${className}`}>{label}</span>
  );
}

/**
 * Le tableau façon tier list : une rangée par étage (pastille colorée à gauche, cases à droite).
 * `pulse(i)` change quand la rangée reçoit quelqu'un : la pastille rebondit.
 */
export function TierBoard({
  tiers,
  testId,
  pulse = () => 0,
  children,
}: {
  tiers: string[];
  testId: string;
  pulse?: (index: number) => number;
  children: (index: number) => ReactNode;
}) {
  const n = tiers.length;
  return (
    <div data-testid={testId} className="flex min-h-0 flex-1 flex-col gap-2">
      {tiers.map((label, i) => (
        <div key={label} data-testid={`tier-row-${i}`} className="glass flex max-h-44 min-h-0 flex-1 rounded-btn">
          <div className={`flex w-[9rem] shrink-0 items-center justify-center rounded-l-btn ${TIER_BG[i]}`}>
            <motion.span
              key={pulse(i)}
              initial={pulse(i) > 0 ? { scale: 1.45, rotate: -8 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className={`font-display text-accent-ink ${n > 4 ? "text-6xl" : "text-7xl"}`}
            >
              {label}
            </motion.span>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap content-center items-center gap-x-3 gap-y-1 px-5">{children(i)}</div>
        </div>
      ))}
    </div>
  );
}
