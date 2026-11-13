// Barre TV « qui a répondu » : un avatar par participant, grisé tant qu'il n'a pas répondu, ✓ une fois fait (jamais la réponse).
// `AnsweredCount` affiche le compteur « n / total » qui l'accompagne. Les variantes de jeu passent par les props.
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { PublicPlayer } from "../../shared/types";
import { CheckIcon } from "./Icons";
import { PlayerAvatar } from "./PlayerAvatar";
import { useChanged } from "./Pop";

/** Compteur « 3 / 8 » (data-testid `${testId}`, `tv-answered-count` par défaut). */
export function AnsweredCount({ done, total, testId = "tv-answered-count", className = "font-num text-5xl text-ink-muted", accentClass = "text-accent" }: { done: number; total: number; testId?: string; className?: string; accentClass?: string }) {
  return (
    <div data-testid={testId} data-ui="answered-count" className={className}>
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

/**
 * Une case du roster : arrivée en cascade, saut + éclat (anneau qui s'élargit) quand le joueur vient de répondre.
 * L'éclat ne se joue qu'au changement d'état vu par cet écran, pas au rechargement.
 */
function RosterItem({ done, index, width, gap, children }: { done: boolean; index: number; width: string; gap: string; children: ReactNode }) {
  const justDone = useChanged(done);
  return (
    <motion.div
      data-ui="roster-item"
      data-done={done ? "true" : "false"}
      data-answered={done ? "true" : "false"}
      initial={{ opacity: 0, y: 24, scale: 0.8 }}
      animate={{ opacity: 1, scale: done ? [0.92, 1.18, 1] : 0.92, y: done ? [0, -26, -8] : 0 }}
      transition={{ opacity: { delay: index * 0.05, duration: 0.3 }, scale: { delay: justDone ? 0 : index * 0.05, duration: 0.5, ease: "easeOut" }, y: { delay: justDone ? 0 : index * 0.05, duration: 0.5, ease: "easeOut" } }}
      className={`relative flex ${width} flex-col items-center ${gap}`}
    >
      {justDone && (
        <motion.span
          aria-hidden
          data-ui="roster-burst"
          initial={{ opacity: 0.9, scale: 0.5 }}
          animate={{ opacity: 0, scale: 1.7 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="pointer-events-none absolute left-1/2 top-[3rem] h-[7rem] w-[7rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.5rem] border-accent"
        />
      )}
      {children}
    </motion.div>
  );
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
    <div data-testid={testId} data-ui="roster" className={className ?? `flex flex-wrap items-start justify-center gap-x-2 ${rows}`}>
      {players.map((p, index) => {
        const done = isDone(p.id);
        const nameColor = nameClassName
          ? nameClassName(p, done)
          : serious
            ? done ? "text-serious-ink" : "text-serious-muted"
            : done ? "text-ink" : "text-ink-muted";
        return (
          <RosterItem key={p.id} done={done} index={index} width={width} gap={gap}>
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
          </RosterItem>
        );
      })}
    </div>
  );
}
