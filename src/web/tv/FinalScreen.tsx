// Dernier portrait révélé au même instant sur tous les écrans, dans la pièce passée en mode nuit.
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { FINAL_ENTRY_MS, finalRevealElapsed, finalRevealTimeline } from "../../shared/final-reveal";
import { rankOf } from "../../shared/ranking";
import type { GameSnapshot } from "../../shared/types";
import { serverNow } from "../net/socket";
import { useFinalReveal } from "../net/useFinalReveal";
import { playersWithProfile } from "../net/helpers";
import { useSfxOnChange, useSfxTimeline } from "../sound/hooks";
import { fireConfetti, PlayerAvatar } from "../ui";
import { AnimatedSceneLayer, CeremonyRoom, raven, spoon } from "../ui/CeremonyRoom";

const SEATS = [{ x: 81, y: 38 }, { x: 55, y: 25 }, { x: 81, y: 75 }, { x: 13, y: 80 }, { x: 13, y: 57 }];

export function FinalScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const sorted = useMemo(() => playersWithProfile(snapshot).filter((p) => snapshot.finalReveal?.playerIds.includes(p.id))
    .sort((a, b) => b.score - a.score || a.profile!.name.localeCompare(b.profile!.name)), [snapshot.players, snapshot.finalReveal]);
  const { step, done } = useFinalReveal(snapshot.finalReveal);
  const total = sorted.length;
  const activeMs = snapshot.finalReveal ? finalRevealElapsed(snapshot.finalReveal, serverNow()) : 0;
  const shown = (index: number) => index >= total - step;
  const timeline = finalRevealTimeline(total);
  const winnerAt = timeline.steps[total - 1];
  // Les sons suivent le même départ serveur et ne rejouent pas au rechargement tardif.
  useSfxTimeline(snapshot.finalReveal ? snapshot.finalReveal.startedAt + (snapshot.finalReveal.pausedMs ?? 0) : null, winnerAt === undefined ? [] : [
    { à: Math.max(0, winnerAt - 1700) / 1000, son: "roulement" },
    { à: winnerAt / 1000, son: "applaudissements" },
  ]);
  useSfxOnChange(done, (_before, after) => after ? "final.fanfare" : null);
  useEffect(() => {
    if (done && total > 0) fireConfetti("big");
  }, [done, total]);
  const podium = sorted.slice(0, 3);
  const podiumOrder = [1, 0, 2].filter((i) => i < podium.length);
  const winner = sorted[0];
  return <div data-testid="tv-final" data-stage={done ? "done" : "reveal"} className="absolute inset-0">
    <CeremonyRoom night celebrate={done && total > 0} souvenirs={snapshot.finalReveal?.souvenirs ?? []} paused={snapshot.paused}>
      <h1 className="ceremony-title">{done ? "Bonne année !" : "Le classement final…"}</h1>
      {!done && step === 0 && <AnimatedSceneLayer className="ceremony-raven" durationMs={1800} elapsedMs={activeMs} paused={snapshot.paused} frames={[{ transform: "translateX(-60cqw)" }, { transform: "translateX(60cqw)" }]}><img src={raven} alt="" /></AnimatedSceneLayer>}
      {total === 0 && <div className="ceremony-card">Personne n'a joué…</div>}
      <div className="ceremony-podium" data-ui="podium">{podiumOrder.map((index) => {
        const p = podium[index]!;
        return <div key={p.id} data-testid={`podium-${index + 1}`} data-place={index + 1} className="ceremony-podium-place">
          <div className="ceremony-podium-player">{shown(index) && <AnimatedSceneLayer durationMs={FINAL_ENTRY_MS} elapsedMs={activeMs - timeline.steps[total - index - 1]!} paused={snapshot.paused} frames={[{ opacity: 0, transform: "translateY(8cqh) scale(.4)" }, { offset: .7, opacity: 1, transform: "translateY(-1cqh) scale(1.03)" }, { opacity: 1, transform: "translateY(0) scale(1)" }]}>
            <div className="ceremony-portrait"><PlayerAvatar profile={p.profile} size={index === 0 ? "xl" : "lg"} crowned={index === 0} /></div>
            <span className="ceremony-podium-name">{p.profile!.name}</span>
            {done && <span className="ceremony-visitor-score">{p.score}</span>}
          </AnimatedSceneLayer>}</div>
          <div className="ceremony-podium-block">{shown(index) ? rankOf(sorted, index) : "?"}</div>
        </div>;
      })}</div>
      {sorted.slice(3).map((p, k) => {
        const index = k + 3;
        if (!shown(index)) return null;
        const seat = index === total - 1 ? { x: 13, y: 57 } : SEATS[k]!;
        return <div key={p.id} data-testid={`rank-${index + 1}`} data-ui="score-row" data-rank={rankOf(sorted, index)} data-highlight="false" className="ceremony-final-spectator" style={{ left: `${seat.x}%`, top: `${seat.y}%` }}><AnimatedSceneLayer durationMs={FINAL_ENTRY_MS} elapsedMs={activeMs - timeline.steps[total - index - 1]!} paused={snapshot.paused} frames={[{ opacity: 0, transform: `translate(${48 - seat.x - 8.5}cqw, ${76 - seat.y}cqh) scale(.8)` }, { opacity: 1, transform: "translate(0, 0) scale(1)" }]}>
          <div className="ceremony-portrait"><PlayerAvatar profile={p.profile} size="md" /></div><span className="ceremony-visitor-name">{rankOf(sorted, index)} · {p.profile!.name}</span>
          {index === total - 1 && <img src={spoon} alt="" className="ceremony-spoon" />}
        </AnimatedSceneLayer></div>;
      })}
      {done && winner && <div className="ceremony-tv-winner" data-testid="final-tv-winner"><PlayerAvatar profile={winner.profile} size="md" crowned crownDelay={0} /></div>}
      {done && <motion.div className="ceremony-final-board" data-testid="final-ranking-board" initial={{ opacity: 0, x: -70 }} animate={{ opacity: 1, x: 0 }}>
        {sorted.map((p, index) => <div className="ceremony-final-row" key={p.id}><span>{rankOf(sorted, index)}</span><strong>{p.profile!.name}</strong><span>{p.score}</span></div>)}
      </motion.div>}
    </CeremonyRoom>
  </div>;
}
