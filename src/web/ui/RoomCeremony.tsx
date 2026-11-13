// Souvenirs et bonus dans la pièce : toutes les décisions et les étapes viennent du moteur.
import { motion } from "motion/react";
import { ceremonyElapsed, ceremonyScores, ceremonyTimeline, revealedSouvenirs, type Award, type CeremonyInfo } from "../../shared/ceremony";
import type { GameSnapshot } from "../../shared/types";
import { useCeremony } from "../net/useCeremony";
import { serverNow } from "../net/socket";
import { useSfxOnChange } from "../sound/hooks";
import { AnimatedSceneLayer, CeremonyRoom, KeepsakeArt, raven, spoon } from "./CeremonyRoom";
import { PlayerAvatar } from "./PlayerAvatar";

const seatAt = (index: number, total: number) => ({ x: 14 + index % 4 * 24, y: total > 4 ? 65 + Math.floor(index / 4) * 20 : 76 });

function Roulette({ info, award, startMs, endMs }: { info: CeremonyInfo; award: Award; startMs: number; endMs: number }) {
  const last = award.roulette.length - 1;
  return <div className="ceremony-roulette" data-testid="ceremony-roulette"><AnimatedSceneLayer
    frames={[{ transform: "translateY(0)", easing: "cubic-bezier(.12,.65,.2,1)" }, { transform: `translateY(${-last * 12}cqh)` }]}
    durationMs={endMs - startMs} elapsedMs={ceremonyElapsed(info, serverNow()) - startMs} paused={info.pausedSince !== null}
  >{award.roulette.map((id, i) => <div key={`${id}-${i}`} className="ceremony-reel-item"><span>{info.categories[id]?.emoji ?? "★"}</span>{info.categories[id]?.title}</div>)}</AnimatedSceneLayer></div>;
}

export function RoomCeremony({ snapshot, info }: { snapshot: GameSnapshot; info: CeremonyInfo }) {
  const { elapsed, step } = useCeremony(info);
  const { steps } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
  const award = step.index === undefined ? undefined : info.awards[step.index];
  const scores = ceremonyScores(info, elapsed);
  const ranked = snapshot.players.filter((p) => info.playerIds.includes(p.id) && p.profile).sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0) || a.profile!.name.localeCompare(b.profile!.name));
  const souvenirs = info.souvenirs.slice(0, revealedSouvenirs(steps, elapsed));
  const focus = step.kind === "souvenir" ? info.souvenirs[step.index!] : undefined;
  const isBonus = ["roulette", "carte", "projecteur", "gagnant"].includes(step.kind);
  const key = `${step.kind}-${step.index ?? ""}`;
  const activeMs = ceremonyElapsed(info, serverNow());
  const layerTiming = { durationMs: step.endMs - step.startMs, elapsedMs: activeMs - step.startMs, paused: info.pausedSince !== null };
  const winnerSlots = award?.winners.flatMap((id) => {
    const index = ranked.findIndex((p) => p.id === id);
    return index < 0 ? [] : [seatAt(index, ranked.length)];
  }) ?? [];
  const spotlightSlots = [...ranked.map((_, index) => seatAt(index, ranked.length)), ...(winnerSlots.length ? [winnerSlots[0]!] : [])];
  const duo = step.kind === "gagnant" && award?.id === "duo-improbable" && winnerSlots.length === 2 ? winnerSlots : null;
  const duoDx = duo ? duo[1]!.x - duo[0]!.x : 0;
  const duoDy = duo ? (duo[1]!.y - duo[0]!.y) * 9 / 16 : 0;
  useSfxOnChange(key, () => step.kind === "roulette" ? "roulement" : step.kind === "carte" ? "carte.pose" : step.kind === "projecteur" ? "tension" : step.kind === "gagnant" ? "final.fanfare" : step.kind === "souvenir" ? "carte.pose" : null);
  return <div data-testid="tv-ceremony" data-step={step.kind} data-index={step.index} className="absolute inset-0">
    <CeremonyRoom souvenirs={souvenirs} paused={snapshot.paused}>
      <h1 className="ceremony-title">{step.kind === "intro" ? "Les souvenirs de la soirée" : step.kind === "provisoire" ? "Attendez… ce n'est pas fini !" : step.kind === "fin" ? "Place au classement final !" : isBonus ? "Les bonus de la soirée" : "On garde ça !"}
        {step.kind === "provisoire" && <small className="ceremony-subtitle">Le classement provisoire</small>}
      </h1>
      {focus && <AnimatedSceneLayer key={`souvenir-${step.index}`} className="ceremony-souvenir-focus" {...layerTiming}
        frames={[{ opacity: 0, transform: "translateY(4cqh) scale(.7)" }, { offset: .2, opacity: 1, transform: "translateY(0) scale(1)" }, { opacity: 1, transform: "translateY(0) scale(1)" }]}><KeepsakeArt keepsake={focus} /></AnimatedSceneLayer>}
      {isBonus && award && <>
        {step.kind === "roulette" && <AnimatedSceneLayer key={`corbeau-${step.index}`} className="ceremony-raven" {...layerTiming} frames={[
          { transform: "translate(-65cqw, 5cqh) rotate(-12deg)" },
          { offset: .38, transform: "translate(0, 0) rotate(0deg)" },
          { offset: .62, transform: "translate(0, 0) rotate(0deg)" },
          { transform: "translate(65cqw, -5cqh) rotate(10deg)" },
        ]}><img src={raven} alt="" /></AnimatedSceneLayer>}
        <AnimatedSceneLayer key={`carte-${step.index}-${step.kind === "roulette" ? "roulette" : "revelee"}`} className="ceremony-card" style={step.kind === "gagnant" && award.keepsake ? { left: "29%", width: "68%" } : undefined}
          durationMs={Math.min(450, step.endMs - step.startMs)}
          elapsedMs={activeMs - (steps.find((s) => s.kind === (step.kind === "roulette" ? "roulette" : "carte") && s.index === step.index)?.startMs ?? step.startMs)}
          paused={info.pausedSince !== null} frames={[{ opacity: 0, transform: "rotateY(-85deg)" }, { opacity: 1, transform: "rotateY(0deg)" }]}>
          <div data-testid="ceremony-award" data-award={step.kind === "roulette" ? "" : award.id}>
            {step.kind === "roulette" ? <Roulette info={info} award={award} startMs={step.startMs} endMs={step.endMs} /> : <>
              <div className="ceremony-award-emoji">{award.emoji}</div><h2>{award.title}</h2><p>{award.phrase}</p>
              {step.kind === "gagnant" && <div data-testid="ceremony-winners" className="ceremony-winners">{award.winners.map((id) => snapshot.players.find((p) => p.id === id)?.profile?.name).join(" & ")} · +{award.points}<small>{award.statLabel}</small></div>}
            </>}
          </div>
        </AnimatedSceneLayer>
        {step.kind === "gagnant" && <AnimatedSceneLayer className="ceremony-moon" {...layerTiming} frames={[{ opacity: 0, transform: "translateY(2cqh) scale(.2)" }, { offset: .2, opacity: 1, transform: "translateY(0) scale(1) rotate(-15deg)" }, { opacity: 0, transform: "translateY(-3cqh) scale(1) rotate(5deg)" }]}><span>🌙</span></AnimatedSceneLayer>}
        {step.kind === "gagnant" && award.id === "merci-travaux" && <img src={spoon} alt="" className="ceremony-spoon" />}
        {step.kind === "gagnant" && award.keepsake && <AnimatedSceneLayer className="ceremony-souvenir-focus ceremony-talent-focus" {...layerTiming} frames={[{ transform: "scale(.3)", opacity: 0 }, { offset: .2, transform: "scale(1)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }]}><KeepsakeArt keepsake={award.keepsake} /></AnimatedSceneLayer>}
        {duo && <motion.div className="ceremony-duo-link" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ left: `${duo[0]!.x}%`, top: `${duo[0]!.y}%`, width: `${Math.hypot(duoDx, duoDy)}cqw`, transform: `rotate(${Math.atan2(duoDy, duoDx)}rad)` }} />}
        {step.kind === "projecteur" && <AnimatedSceneLayer className="ceremony-spotlight" {...layerTiming} frames={spotlightSlots.map((slot) => ({ transform: `translate(${slot.x - 10}cqw, ${slot.y - 76}cqh)` }))} />}
      </>}
      {ranked.map((p, index) => {
        const winner = step.kind === "gagnant" && award?.winners.includes(p.id);
        const seat = seatAt(index, ranked.length);
        return <motion.div layout="position" key={p.id} data-testid={`ceremony-player-${p.id}`} data-winner={!!winner} className="ceremony-visitor" style={{ left: `${seat.x}%`, top: `${seat.y}%` }} transition={{ duration: .55 }}>
          <AnimatedSceneLayer className="ceremony-portrait" durationMs={600} elapsedMs={winner ? activeMs - step.startMs : 600} paused={snapshot.paused} frames={[{ transform: "translateY(0) scale(1)" }, { offset: .45, transform: "translateY(-2.4cqh) scale(1.12)" }, { transform: "translateY(0) scale(1)" }]}><PlayerAvatar profile={p.profile} size="md" badge={winner ? `+${award!.points}` : undefined} /></AnimatedSceneLayer>
          <span className="ceremony-visitor-name">{p.profile!.name}</span><span className="ceremony-visitor-score">{scores[p.id]}</span>
        </motion.div>;
      })}
    </CeremonyRoom>
  </div>;
}
