// Révélation de la TV : les joueurs tombent sur un axe « trop tôt / trop tard » autour de la cible,
// du plus éloigné au plus proche ; le dernier à tomber (le plus proche) gagne. Le classement se remplit en même temps.
import { motion } from "motion/react";
import { useEffect } from "react";
import { fireConfetti, Panel, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps } from "../views-contract";
import type { Priv, Pub, Results } from "./game";
import { AXIS_W_REM, LABEL_W_REM, LANE_REM, layoutLanes, STEM_OFFSET_REM } from "./layout";
import { fmtCible, fmtSigned, QUALITY_TEXT, quality } from "./rank";

type Props = MiniGameViewProps<Pub, Priv, Results>;
type Entry = Results["ranking"][number];

// Rythme de la révélation (s). revealSeconds est calculé avec ces mêmes constantes.
const START_S = 1.0;
const STEP_S = 1.0;
/** Pause de suspense avant le dernier (le gagnant). */
const WINNER_EXTRA_S = 1.4;
/** Temps pour savourer le gagnant avant la fin. */
const SAVOR_S = 2.2;
const WINNER_FX_DELAY_S = 0.5;
/** Hauteur sous l'axe : graduations puis TROP TÔT / TROP TARD, sans se recouvrir. */
const AXIS_BOTTOM_REM = 7.5;

/** Les joueurs, du plus éloigné de la cible au plus proche : l'ordre d'arrivée sur l'axe. */
const landingOrder = (ranking: Entry[]) => [...ranking].sort((a, b) => b.rank - a.rank || Math.abs(b.signedMs) - Math.abs(a.signedMs));
/** Instant (s) où le k-ième sur n tombe. */
const landAt = (k: number, n: number) => START_S + k * STEP_S + (k === n - 1 ? WINNER_EXTRA_S : 0);

/** Durée totale (s) de l'animation des résultats. */
export const revealSeconds = (results: Results) => {
  const n = results.ranking.length;
  if (n === 0) return 1.5;
  return landAt(n - 1, n) + WINNER_FX_DELAY_S + SAVOR_S;
};

/** Demi-largeur de l'axe (ms) : assez grande pour contenir tout le monde. */
const axisRange = (ranking: Entry[]) => Math.max(1500, Math.ceil((Math.max(...ranking.map((e) => Math.abs(e.signedMs))) * 1.15) / 500) * 500);


/** Pas des graduations : au plus ~8 intervalles, lisibles à 4 m. */
const tickStep = (range: number) => [500, 1000, 2000, 5000].find((s) => (2 * range) / s <= 8) ?? 5000;

export const TvResults = ({ results, playerById }: Props) => {
  useEffect(() => {
    if (!results?.ranking.length) return;
    const n = results.ranking.length;
    const id = setTimeout(() => fireConfetti("big"), (landAt(n - 1, n) + WINNER_FX_DELAY_S) * 1000);
    return () => clearTimeout(id);
  }, [results]);
  if (!results) return null;
  const order = landingOrder(results.ranking);
  const n = order.length;
  const range = n > 0 ? axisRange(results.ranking) : 1500;
  /** Position (rem depuis la gauche de l'axe) : la cible au centre. */
  const x = (signedMs: number) => AXIS_W_REM / 2 + (signedMs / range) * (AXIS_W_REM / 2) * 0.96;
  const placed = new Map(layoutLanes(results.ranking.map((e) => ({ id: e.playerId, px: x(e.signedMs) }))).map((l) => [l.id, l]));
  const laneCount = Math.max(1, ...[...placed.values()].map((l) => l.lane + 1));
  const step = tickStep(range);
  const ticks: number[] = [];
  for (let t = -Math.floor(range / step) * step; t <= range; t += step) ticks.push(t);
  const byRank = [...results.ranking].sort((a, b) => a.rank - b.rank || Math.abs(a.signedMs) - Math.abs(b.signedMs));
  const at = (id: string) => landAt(order.findIndex((e) => e.playerId === id), n);

  return (
    <div data-testid="cabr-results" className="flex min-h-0 flex-1 gap-8">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4">
        <div className="rounded-chip bg-surface-strong px-10 py-2 font-display text-4xl">
          Objectif <span className="text-accent">{fmtCible(results.cible)} s</span>
        </div>
        {n === 0 ? (
          <p className="font-display text-5xl text-ink-muted">Personne n'a arrêté le compteur…</p>
        ) : (
          <div data-testid="cabr-axis" className="relative" style={{ width: `${AXIS_W_REM}rem`, height: `${AXIS_BOTTOM_REM + laneCount * LANE_REM + 3}rem` }}>
            {/* l'axe, ses graduations et la cible */}
            <div className="absolute inset-x-0 h-[0.4rem] rounded-chip bg-line" style={{ bottom: `${AXIS_BOTTOM_REM}rem` }} />
            {ticks.map((t) => (
              <div key={t} className="absolute flex -translate-x-1/2 flex-col items-center whitespace-nowrap" style={{ left: `${x(t)}rem`, bottom: `${AXIS_BOTTOM_REM - 3.2}rem` }}>
                <span className={`h-5 w-[0.2rem] ${t === 0 ? "bg-accent" : "bg-ink-muted"}`} />
                <span className={`font-display text-2xl ${t === 0 ? "text-accent" : "text-ink-muted"}`}>{t === 0 ? "PILE" : `${t > 0 ? "+" : "−"}${Math.abs(t) / 1000} s`.replace(".", ",")}</span>
              </div>
            ))}
            <span className="absolute left-0 font-display text-3xl text-cool" style={{ bottom: "0.2rem" }}>◀ TROP TÔT</span>
            <span className="absolute right-0 font-display text-3xl text-hot" style={{ bottom: "0.2rem" }}>TROP TARD ▶</span>
            {order.map((e) => {
              const p = playerById(e.playerId);
              const pl = placed.get(e.playerId)!;
              const winner = e.rank === 1;
              const color = p?.profile?.color ?? "var(--color-ink-muted)";
              const stemH = 1.4 + pl.lane * LANE_REM;
              return (
                <motion.div
                  key={e.playerId}
                  data-testid={`cabr-drop-${e.playerId}`}
                  data-lane={pl.lane}
                  initial={{ opacity: 0, y: -640 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: at(e.playerId), type: "spring", stiffness: 110, damping: 13 }}
                  className="absolute h-px w-px"
                  style={{ left: `${pl.px}rem`, bottom: `${AXIS_BOTTOM_REM}rem`, zIndex: 10 + laneCount - pl.lane }}
                >
                  {/* La couleur du joueur relie sa pastille sur l'axe à son étiquette, même quand la tige passe derrière une autre étiquette.
                      Les étages bas passent devant les tiges des étages hauts, et les étiquettes restent opaques : aucune tige ne raye un pseudo. */}
                  <span className="absolute bottom-0 left-[-0.15rem] w-[0.3rem]" style={{ height: `${stemH}rem`, background: color }} />
                  <span className={`absolute -bottom-[0.6rem] left-[-0.6rem] h-[1.2rem] w-[1.2rem] rounded-full ${winner ? "shadow-glow" : ""}`} style={{ background: color }} />
                  <motion.div
                    animate={winner ? { scale: [1, 1.08, 1.04] } : { filter: ["brightness(1)", "brightness(1)", "brightness(0.8)"] }}
                    transition={{ delay: landAt(n - 1, n) + WINNER_FX_DELAY_S, duration: 0.6 }}
                    className={`absolute flex items-center gap-2 rounded-btn border-[0.2rem] bg-bg px-2 py-1 ${winner ? "shadow-glow" : ""}`}
                    style={{ borderColor: color, bottom: `${stemH}rem`, width: `${LABEL_W_REM}rem`, [pl.right ? "left" : "right"]: `-${STEM_OFFSET_REM}rem`, transformOrigin: pl.right ? "left bottom" : "right bottom" }}
                  >
                    <PlayerAvatar profile={p?.profile ?? null} size="xs" className={winner ? "drop-shadow-[0_0_1rem_var(--color-accent)]" : ""} />
                    <span className="min-w-0 flex-1 truncate text-2xl font-bold">{p?.profile?.name}</span>
                    <span className={`shrink-0 font-num text-3xl ${QUALITY_TEXT[quality(e.signedMs)]}`}>{fmtSigned(e.signedMs)}</span>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Panel className="flex w-[30rem] shrink-0 flex-col justify-center gap-2 p-4">
        {byRank.map((e) => (
          <motion.div
            key={e.playerId}
            data-testid={`cabr-rank-${e.playerId}`}
            data-rank={e.rank}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: at(e.playerId) + 0.5 }}
            className={`flex h-[4.6rem] items-center gap-3 rounded-btn px-3 ${e.rank === 1 ? "border-[0.2rem] border-accent bg-accent/15 shadow-glow" : "bg-surface"}`}
          >
            <span className={`w-9 text-center font-num text-3xl ${e.rank === 1 ? "text-accent" : "text-ink-muted"}`}>{e.rank}</span>
            <PlayerAvatar profile={playerById(e.playerId)?.profile ?? null} size="sm" />
            <span className="min-w-0 flex-1 truncate text-2xl font-bold">{playerById(e.playerId)?.profile?.name}</span>
            <span className={`font-num text-3xl ${QUALITY_TEXT[quality(e.signedMs)]}`}>{fmtSigned(e.signedMs)}</span>
          </motion.div>
        ))}
        {results.missed.map((m) => (
          <div key={m.playerId} data-testid={`cabr-missed-${m.playerId}`} className="flex h-[4.6rem] items-center gap-3 rounded-btn bg-surface px-3 opacity-70">
            <span className="w-9 text-center font-display text-3xl text-bad">✕</span>
            <PlayerAvatar profile={playerById(m.playerId)?.profile ?? null} size="sm" dimmed />
            <span className="min-w-0 flex-1 truncate text-2xl font-bold text-ink-muted">{playerById(m.playerId)?.profile?.name}</span>
            <span className="text-xl text-ink-muted">pas stoppé</span>
          </div>
        ))}
      </Panel>
    </div>
  );
};
