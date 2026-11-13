// Carte de choix cliquable (téléphone : réponse, vote, camp…). Un seul composant pour tous les jeux : les skins
// l'habillent via [data-ui="choice"], ses états (data-selected, data-state) et ses parties (choice-key, choice-label,
// choice-check). Le contenu (texte, avatar + pseudo…) est libre ; la mise en page (hauteur, flex-1) vient de `className`.
import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { haptique } from "./haptique";
import { SelectedBadge } from "./SelectedBadge";

export type ChoiceState = "idle" | "correct" | "wrong" | "faded";
/**
 * Couleur de fond. `glass` (défaut) : verre, cadre accent quand il est choisi. `cool` / `hot` / `good` / `bad` : plein,
 * anneau quand il est choisi (camps face à face, oui / non). `plain` : aucun fond, le contenu ou `className` le fournit.
 */
export type ChoiceTone = "glass" | "cool" | "hot" | "good" | "bad" | "plain" | "flat";

// Classes écrites en toutes lettres pour que Tailwind les repère.
const TONES: Record<ChoiceTone, { idle: string; selected: string }> = {
  glass: { idle: "glass border-2 border-transparent", selected: "border-2 border-accent bg-accent/25 shadow-glow" },
  cool: { idle: "bg-cool text-bg shadow-card", selected: "bg-cool text-bg shadow-card ring-[0.4rem] ring-ink" },
  hot: { idle: "bg-hot text-bg shadow-card", selected: "bg-hot text-bg shadow-card ring-[0.4rem] ring-ink" },
  good: { idle: "bg-good text-bg shadow-[0_0.35rem_0_var(--color-good-deep)]", selected: "bg-good text-bg shadow-[0_0.35rem_0_var(--color-good-deep)] ring-[0.4rem] ring-ink" },
  bad: { idle: "bg-bad text-bg shadow-[0_0.35rem_0_var(--color-bad-deep)]", selected: "bg-bad text-bg shadow-[0_0.35rem_0_var(--color-bad-deep)] ring-[0.4rem] ring-ink" },
  plain: { idle: "shadow-card", selected: "shadow-card ring-[0.35rem] ring-ink" },
  // Sans relief ni anneau (petits boutons serrés, ex. notes d'une tier list) : `className` fournit couleurs et bordure.
  flat: { idle: "", selected: "shadow-glow" },
};

export interface ChoiceProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  /** Choix enregistré : ✓ intégré, mise en avant. */
  selected?: boolean;
  /** Reflet de la correction (TV) ; `faded` : les autres choix une fois le sien fait. */
  state?: ChoiceState;
  /** Lettre ou numéro affiché en pastille avant le contenu (A, B…). */
  keyLabel?: string;
  tone?: ChoiceTone;
  /** Rayon : `card` (grande carte, défaut) ou `btn` (petit bouton). */
  radius?: "card" | "btn";
  /** Pastille ✓ sur le choix enregistré (défaut) ; faux pour les petits boutons où la sélection se voit déjà. */
  showCheck?: boolean;
  /** Pastille ✓ : taille, couleur (voir SelectedBadge) et position (`absolute right-3 top-3` par défaut). */
  checkSize?: "sm" | "md" | "lg";
  checkTone?: "ink" | "accent" | "good";
  checkClassName?: string;
  children?: ReactNode;
}

export function Choice({
  selected = false,
  state = "idle",
  keyLabel,
  tone = "glass",
  radius = "card",
  showCheck = true,
  checkSize = "lg",
  checkTone = "ink",
  checkClassName = "absolute right-3 top-3",
  className = "",
  children,
  onClick,
  ...rest
}: ChoiceProps) {
  const faded = state === "faded";
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      whileTap={rest.disabled ? undefined : { scale: 0.96 }}
      initial={false}
      // Choisi : pop (dépasse puis se pose) ; les autres s'atténuent.
      animate={{ scale: selected ? [1, 1.08, 1.02] : 1, opacity: faded ? 0.45 : 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onClick={(e) => {
        haptique(15);
        onClick?.(e);
      }}
      {...rest}
      data-ui="choice"
      data-tone={tone}
      data-selected={selected ? "true" : "false"}
      data-state={state}
      className={`relative flex items-center justify-center ${radius === "btn" ? "rounded-btn" : "rounded-card"} ${TONES[tone][selected ? "selected" : "idle"]} ${className}`}
    >
      {keyLabel != null && (
        <span data-ui="choice-key" className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-btn border-2 border-current font-display text-xl">
          {keyLabel}
        </span>
      )}
      {/* `contents` : le contenu garde la mise en page du bouton ; un skin peut tout de même y poser police et couleur. */}
      <span data-ui="choice-label" className="contents">
        {children}
      </span>
      {selected && showCheck && <SelectedBadge ui="choice-check" tone={checkTone} size={checkSize} className={checkClassName} />}
    </motion.button>
  );
}
