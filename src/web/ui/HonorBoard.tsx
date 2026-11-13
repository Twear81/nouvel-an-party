// Tableau d'honneur du classement final : un panneau de velours (image peinte ou remplaçant) où les joueurs se rangent
// un à un, du dernier au premier. Les places pas encore révélées restent vides (rang visible, ni nom ni score).
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { Profile } from "../../shared/types";
import { CEREMONIE_ASPECT, ceremonieImage, HONOR_BOARD } from "../theme/ceremonie-assets";
import { PlayerAvatar } from "./PlayerAvatar";

export interface HonorRow {
  id: string;
  rank: number;
  profile: Profile;
  score: number;
  /** false tant que le joueur n'est pas arrivé sur le tableau. */
  filled: boolean;
}

export function HonorBoard({ rows, avatarLayoutId, children }: {
  rows: HonorRow[];
  /** Les avatars des lignes remplies portent cet identifiant de transition partagée, ou rien. */
  avatarLayoutId?: (id: string) => string | undefined;
  children?: ReactNode;
}) {
  const image = ceremonieImage("tableau-honneur");
  const { side, marginPct, topPct, heightPct, inner } = HONOR_BOARD;
  const slots = Math.max(rows.length, 4);
  return (
    <motion.div data-testid="honor-board" data-side={side} className="cer-board"
      initial={{ opacity: 0, x: side === "left" ? "-12%" : "12%" }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 90, damping: 16 }}
      style={{ top: `${topPct}%`, height: `${heightPct}%`, aspectRatio: String(CEREMONIE_ASPECT["tableau-honneur"]), [side]: `${marginPct}%` }}>
      {image ? <img src={image} alt="" draggable={false} className="absolute inset-0 h-full w-full" /> : <div aria-hidden className="cer-board-fallback" />}
      <div className="cer-board-rows" style={{ left: `${inner.left * 100}%`, right: `${inner.right * 100}%`, top: `${inner.top * 100}%`, bottom: `${inner.bottom * 100}%` }}>
        {rows.map((r, position) => (
          <div key={r.id} data-testid={r.filled ? `rank-${position + 1}` : `rank-slot-${position + 1}`} data-filled={r.filled} data-rank={r.rank} data-ui={r.filled ? "score-row" : undefined}
            data-highlight="false" className="cer-board-row" style={{ flexBasis: `${100 / slots}%`, flexGrow: 0 }}>
            <span className="cer-board-rank">{r.rank}</span>
            {r.filled ? (
              <>
                <motion.div layoutId={avatarLayoutId?.(r.id)} className="shrink-0"><PlayerAvatar profile={r.profile} size="sm" /></motion.div>
                <span className="cer-board-name">{r.profile.name}</span>
                <span className="cer-board-score">{r.score}</span>
              </>
            ) : <span className="cer-board-name text-ink-muted">?</span>}
          </div>
        ))}
      </div>
      {children}
    </motion.div>
  );
}
