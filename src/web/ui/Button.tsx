// Bouton de base. Variantes : primary (or), secondary (verre), danger, ghost. Tailles pensées pour le pouce (phone) ou la TV.
import { motion, type HTMLMotionProps } from "motion/react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "good" | "bad";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gold text-accent-ink shadow-btn",
  secondary: "glass text-ink",
  danger: "bg-bad text-bg",
  ghost: "bg-transparent text-ink-muted",
  good: "bg-good text-bg shadow-[0_0.35rem_0_var(--color-good-deep)]",
  bad: "bg-bad text-bg shadow-[0_0.35rem_0_var(--color-bad-deep)]",
};
const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-base",
  md: "px-6 py-3 text-lg",
  lg: "px-8 py-4 text-2xl",
  xl: "px-10 py-6 text-4xl",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({ variant = "primary", size = "md", block, className = "", children, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95, y: 3 }}
      whileHover={rest.disabled ? undefined : { scale: 1.03 }}
      type="button"
      className={`rounded-btn font-display tracking-wide transition-opacity disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
