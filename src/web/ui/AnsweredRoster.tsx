// Barre TV « qui a répondu » : un avatar par participant, grisé tant qu'il n'a pas répondu, ✓ une fois fait (jamais la réponse).
// `AnsweredCount` affiche le compteur « n / total » qui l'accompagne. Les variantes de jeu passent par les props.
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { PublicPlayer } from "../../shared/types";
import { CheckIcon } from "./Icons";
import { PlayerAvatar } from "./PlayerAvatar";

/** Compteur « 3 / 8 » (data-testid `${testId}`, `tv-answered-count` par défaut). */
export function AnsweredCount({ done, total, testId = "tv-answered-count", className = "font-display text-5xl text-ink-muted", accentClass = "text-accent" }: { done: number; total: number; testId?: string; className?: string; accentClass?: string }) {
  return (
    <div data-testid={testId} className={className}>
      <span className={accentClass}>{done}</span> / {total}
    </div>
  );
}

interface Props {
  /** Participants (avec profil). */
  players: PublicPlayer[];
  isDone: (id: string) => boolean;
  testId?: string;
  /** "large" : plein écran (2 tailles selon le nombre de joueurs) ; "compact" : un cran en dessous ; "small" : avatars moyens fixes. */
  size?: "large" | "compact" | "small";
  /** "serious" : décor sombre de Culture gênante. */
  tone?: "default" | "serious";
  /** Pastille de l'avatar (✓ par défaut quand c'est fait). */
  badge?: (p: PublicPlayer, done: boolean) => ReactNode;
  /** Classes de l'avatar (halo…). */
  avatarClassName?: (p: PublicPlayer, done: boolean) => string;
  /** Classes de couleur du pseudo (remplacent celles par défaut). */
  nameClassName?: (p: PublicPlayer, done: boolean) => string;
  /** Avatar grisé (par défaut : tant que ce n'est pas fait). */
  dimmed?: (p: PublicPlayer, done: boolean) => boolean;
  /** Dessiné par-dessus l'avatar (onde…). */
  overlay?: (p: PublicPlayer, done: boolean) => ReactNode;
  /** Sous le pseudo (barre de progression…). */
  below?: (p: PublicPlayer, done: boolean) => ReactNode;
  className?: string;
}

export function AnsweredRoster({ players, isDone, testId = "tv-answered", size = "large", tone = "default", badge, avatarClassName, nameClassName, dimmed, overlay, below, className }: Props) {
  const crowd = players.length > 5;
  const serious = tone === "serious";
  const avatarSize = size === "small" ? "md" : crowd ? "md" : "lg";
  const nameSize = serious ? "text-lg" : size === "large" ? (crowd ? "text-xl" : "text-2xl") : size === "compact" ? (crowd ? "text-lg" : "text-xl") : "text-xl";
  const width = size === "small" ? "w-[9.5rem]" : "w-[11rem]";
  const gap = size === "large" ? "gap-1" : "gap-0.5";
  const rows = size === "large" ? "gap-y-3" : "gap-y-2";
  return (
    <div data-testid={testId} className={className ?? `flex flex-wrap items-start justify-center gap-x-2 ${rows}`}>
      {players.map((p) => {
        const done = isDone(p.id);
        const nameColor = nameClassName
          ? nameClassName(p, done)
          : serious
            ? done ? "text-serious-ink" : "text-serious-muted"
            : done ? "text-ink" : "text-ink-muted";
        return (
          <motion.div
            key={p.id}
            data-answered={done ? "true" : "false"}
            animate={{ scale: done ? 1 : 0.92, y: done ? -8 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className={`flex ${width} flex-col items-center ${gap}`}
          >
            <div className="relative">
              {overlay?.(p, done)}
              <PlayerAvatar
                profile={p.profile}
                size={avatarSize}
                dimmed={dimmed ? dimmed(p, done) : !done}
                badge={badge ? badge(p, done) : done ? <CheckIcon /> : undefined}
                className={avatarClassName?.(p, done)}
              />
            </div>
            <span className={`w-full truncate text-center ${serious ? "" : "font-bold"} ${nameSize} ${nameColor}`}>{p.profile!.name}</span>
            {below?.(p, done)}
          </motion.div>
        );
      })}
    </div>
  );
}
