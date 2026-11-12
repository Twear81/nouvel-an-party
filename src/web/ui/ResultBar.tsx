// Barre de résultat animée (votes, progression…) : un rail et un remplissage qui grandit jusqu'à `value` (0 → 1).
// Les skins l'habillent via [data-ui="result-bar"], data-highlight et [data-ui="result-bar-fill"].
// Les délais et durées passés en props sont ceux de l'animation réelle : un jeu qui calcule son `revealSeconds`
// avec les mêmes constantes reste exact (invariant « pas de spoil »). Ne rien y ajouter qui rallonge l'animation.
import { motion, type Transition } from "motion/react";
import type { ReactNode } from "react";

export type ResultBarTone = "hot" | "gold" | "good";
const FILL_TONES: Record<ResultBarTone, string> = { hot: "bg-hot-gradient", gold: "bg-gold", good: "bg-good" };

interface Props {
  /** Part remplie, de 0 à 1. */
  value: number;
  /** Barre du gagnant : or et halo (prend le pas sur `tone`). */
  highlight?: boolean;
  /** Couleur du remplissage quand la barre n'est pas mise en avant. */
  tone?: ResultBarTone;
  /** Rail pilule (jauges fines) plutôt que bouton arrondi (barres de résultat). */
  pill?: boolean;
  /** Animation : délai (s) et durée (s) / courbe, ou une `transition` complète (ressort…). */
  delay?: number;
  duration?: number;
  ease?: Transition["ease"];
  transition?: Transition;
  /** Le remplissage part de zéro à l'apparition (faux : il suit `value` sans repartir de 0). */
  fromZero?: boolean;
  /** Contenu dans la barre (avatars des votants…), à gauche du remplissage. */
  children?: ReactNode;
  /** Rail : hauteur et marges (`h-20`, `w-full`…). */
  className?: string;
  /** Remplissage : largeur minimale, gaps du contenu… */
  fillClassName?: string;
  "data-testid"?: string;
}

export function ResultBar({ value, highlight = false, tone = "hot", pill = false, delay, duration, ease, transition, fromZero = true, children, className = "", fillClassName = "", ...rest }: Props) {
  const radius = pill ? "rounded-full" : "rounded-btn";
  const part = Math.max(0, Math.min(1, value));
  // Le remplissage « pousse » en glissant depuis la gauche (translateX, jamais `width`) : rien n'est redessiné.
  // Depuis zéro : il garde sa largeur finale (contenu et min-w intacts) et entre par la gauche. Sinon (jauge qui suit une
  // valeur) : il fait toute la largeur et se décale de la part manquante.
  const target = fromZero ? "0%" : `${-(1 - part) * 100}%`;
  return (
    <div data-ui="result-bar" data-highlight={highlight ? "true" : "false"} data-testid={rest["data-testid"]} className={`relative overflow-hidden ${radius} ${pill ? "bg-surface-strong" : "bg-surface"} ${className}`}>
      <motion.div
        data-ui="result-bar-fill"
        initial={fromZero ? { x: "-100%" } : false}
        animate={{ x: target }}
        style={{ width: fromZero ? `${part * 100}%` : "100%" }}
        transition={transition ?? { delay, duration, ease }}
        className={`flex h-full items-center will-change-transform ${radius} ${highlight ? "bg-gold shadow-glow" : FILL_TONES[tone]} ${fillClassName}`}
      >
        {children}
      </motion.div>
    </div>
  );
}
