// Bouton de base. Variantes : primary (or), secondary (verre), danger, ghost. Tailles pensées pour le pouce (phone) ou la TV.
import { motion, useAnimationControls, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef } from "react";
import { haptique } from "./haptique";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "good" | "bad";
type Size = "sm" | "md" | "lg" | "xl" | "hero";

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
  // Bouton géant qui remplit la place (STOP du compte à rebours) : la hauteur vient de `className` (flex-1…).
  hero: "flex items-center justify-center px-10 py-6 text-[5.5rem] leading-none",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({ variant = "primary", size = "md", block, className = "", children, onClick, ...rest }: ButtonProps) {
  // Enfoncement au toucher (ressort : il rebondit au relâchement) ; grisé -> actif : petit « pop ».
  const controls = useAnimationControls();
  const wasDisabled = useRef(rest.disabled);
  useEffect(() => {
    if (wasDisabled.current && !rest.disabled) void controls.start({ scale: [1, 1.12, 0.97, 1], transition: { duration: 0.45, ease: "easeOut" } });
    wasDisabled.current = rest.disabled;
  }, [rest.disabled, controls]);
  return (
    <motion.button
      animate={controls}
      whileTap={rest.disabled ? undefined : { scale: 0.94, y: 3, transition: { type: "spring", stiffness: 600, damping: 20 } }}
      whileHover={rest.disabled ? undefined : { scale: 1.03 }}
      transition={{ type: "spring", stiffness: 500, damping: 11 }}
      onClick={(e) => {
        haptique(12);
        onClick?.(e);
      }}
      type="button"
      data-ui="button"
      data-variant={variant}
      data-size={size}
      className={`rounded-btn font-display tracking-wide transition-opacity disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
