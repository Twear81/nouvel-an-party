// Temps intermédiaire façon Trackmania : l'écart au meilleur temps, en bleu s'il est meilleur ou égal (en avance), en rouge
// s'il est en retard, qui « claque » à l'apparition. Couleurs : --color-split-ahead / --color-split-behind (theme.css).
// Le meilleur temps affiche son temps ; ceux qui le suivent affichent leur écart « +0,42 ».
import { motion } from "motion/react";

/** 420 → "0,42" (virgule française, 2 décimales). */
const fmt = (ms: number) => (Math.max(0, ms) / 1000).toFixed(2).replace(".", ",");

export interface SplitTimeProps {
  /** Temps du joueur, en ms (plus petit = meilleur). */
  ms: number;
  /** Meilleur temps de la manche, en ms : la référence de l'écart. */
  bestMs: number;
  /** Délai avant le « flash » d'apparition, en secondes. */
  delay?: number;
  className?: string;
  "data-testid"?: string;
}

export function SplitTime({ ms, bestMs, delay = 0, className = "", ...rest }: SplitTimeProps) {
  const gap = ms - bestMs;
  const ahead = gap <= 0;
  // Le meilleur affiche son propre temps ; plus rapide que la référence (en avance) : « −écart » ; sinon « +écart ».
  const text = gap === 0 ? fmt(ms) : ahead ? `−${fmt(-gap)}` : `+${fmt(gap)}`;
  return (
    <motion.span
      data-testid={rest["data-testid"]}
      data-ui="split-time"
      data-split={ahead ? "ahead" : "behind"}
      data-gap-ms={gap}
      initial={{ opacity: 0, scale: 1.7 }}
      animate={{ opacity: [0, 1, 0.45, 1], scale: [1.7, 1, 1.12, 1] }}
      transition={{ delay, duration: 0.5, times: [0, 0.3, 0.55, 1], ease: "easeOut" }}
      className={`inline-block font-num tabular-nums ${ahead ? "text-split-ahead" : "text-split-behind"} ${className}`}
    >
      {text}
    </motion.span>
  );
}
