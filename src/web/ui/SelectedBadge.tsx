// Pastille ronde ✓ qui apparaît (ressort) sur le choix enregistré. À positionner avec `className` (absolute right-3 top-3…).
import { motion } from "motion/react";
import { CheckIcon } from "./Icons";

const TONES = {
  ink: "bg-ink text-bg",
  accent: "bg-accent text-accent-ink",
  good: "bg-good text-bg",
  serious: "bg-serious-good text-serious-bg",
} as const;
const SIZES = { sm: "h-6 w-6 text-sm", md: "h-8 w-8 text-lg", lg: "h-9 w-9 text-xl" } as const;

interface Props {
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  /** Position (ex : `absolute right-3 top-3`). */
  className?: string;
}

export function SelectedBadge({ tone = "ink", size = "lg", className = "" }: Props) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`flex items-center justify-center rounded-full ${SIZES[size]} ${TONES[tone]} ${className}`}
    >
      <CheckIcon />
    </motion.span>
  );
}
