// Avatar d'un joueur : avatar prédéfini + couleur + cadre. Taille en rem, donc proportionnelle sur la TV.
import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import type { Profile } from "../../shared/types";
import { avatarById, frameById } from "../theme/profile-options";
import { AvatarFrame } from "./AvatarFrame";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export const AVATAR_REM: Record<AvatarSize, number> = { xs: 2, sm: 3.25, md: 5, lg: 8, xl: 11, "2xl": 15 };

interface Props {
  profile: Profile | null;
  size?: AvatarSize;
  dimmed?: boolean;
  /** Pastille en bas à droite (✓, +100…). */
  badge?: ReactNode;
  className?: string;
  crowned?: boolean;
  crownDelay?: number;
}

export function PlayerAvatar({ profile, size = "md", dimmed, badge, crowned = false, crownDelay = 0.5, className = "" }: Props) {
  const px = AVATAR_REM[size];
  const style = {
    width: `${px}rem`,
    height: `${px}rem`,
    fontSize: `${px / 10}rem`, // 1em = 1/10 de l'avatar : les cadres s'y calent
    "--p": profile?.color ?? "var(--color-ink-muted)",
  } as CSSProperties;

  return (
    <div data-ui="avatar" data-frame={frameById(profile?.frame ?? "none").id} data-dimmed={dimmed ? "true" : "false"} className={`relative shrink-0 transition-[filter,opacity] ${dimmed ? "opacity-45 grayscale" : ""} ${className}`} style={style}>
      <div
        data-ui="avatar-face"
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ background: "radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--p) 55%, var(--color-ink)), var(--p))" }}
      >
        {!profile ? (
          <span className="font-display text-[5em] text-bg/60">?</span>
        ) : (
          <span className="select-none text-[5.4em] leading-none">{avatarById(profile.avatar.id).emoji}</span>
        )}
      </div>
      <AvatarFrame className={frameById(profile?.frame ?? "none").className} />
      {crowned && <motion.span aria-hidden data-ui="crown" className="avatar-crown"
        initial={{ y: -90, opacity: 0, rotate: -35, scale: 0.5 }} animate={{ y: 0, opacity: 1, rotate: -16, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 11, delay: crownDelay }}>👑</motion.span>}
      {badge != null && (
        <div data-ui="avatar-badge" className="absolute -bottom-[0.2em] -right-[0.2em] flex min-h-[2.8em] min-w-[2.8em] items-center justify-center rounded-full border-[0.15em] border-bg bg-gold px-[0.5em] text-[1.6em] font-bold leading-none text-accent-ink">
          {badge}
        </div>
      )}
    </div>
  );
}
