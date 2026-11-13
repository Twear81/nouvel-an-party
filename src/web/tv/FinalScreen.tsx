// Classement final, dans la pièce de nuit. Scores cachés jusqu'à leur conversion : du dernier au 4e, chaque portrait s'avance,
// son score de base défile, ses étoiles s'envolent une à une vers le score (« ★ +120 »), puis il va se ranger sur le tableau
// d'honneur. Le podium monte devant la cheminée : 3e puis 2e (même conversion), long roulement, puis le 1er apparaît dans
// l'écran de la télévision dessinée, couronné, le jukebox s'illumine, le feu d'artifice éclate derrière les fenêtres.
// Toute la cadence vient de `finalRevealTimeline` (src/shared/final-reveal.ts), la même que celle du serveur.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FINAL_TIMING, finalPhaseAt, type FinalBeat } from "../../shared/final-reveal";
import { rankOf } from "../../shared/ranking";
import type { GameSnapshot, Profile } from "../../shared/types";
import { useFinalReveal } from "../net/useFinalReveal";
import { playersWithProfile } from "../net/helpers";
import { ANCHORS } from "../theme/ceremonie-assets";
import { PlacedSouvenir } from "./scene/Souvenirs";
import { CountUp, fireConfetti, Fireworks, HonorBoard, PlayerAvatar, Podium, PodiumSlot, RoomSet, Star, useSfxTimeline, type HonorRow } from "../ui";

interface Ranked { id: string; profile: Profile; score: number; stars: number[]; base: number }

export function FinalScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const reveal = snapshot.finalReveal;
  const { timeline, elapsed, beat, done } = useFinalReveal(reveal);
  const k = reveal?.timeScale ?? 1;

  const ranked = useMemo<Ranked[]>(() => {
    const present = playersWithProfile(snapshot).filter((p) => reveal?.playerIds.includes(p.id));
    const order = reveal?.ranking;
    const sorted = order
      ? order.flatMap((id) => present.filter((p) => p.id === id))
      : [...present].sort((a, b) => b.score - a.score || a.profile!.name.localeCompare(b.profile!.name));
    return sorted.map((p) => {
      const stars = reveal?.stars?.[p.id] ?? [];
      return { id: p.id, profile: p.profile!, score: p.score, stars, base: p.score - stars.reduce((a, b) => a + b, 0) };
    });
  }, [snapshot.players, reveal]);
  const total = ranked.length;
  const rankLabel = (i: number) => rankOf(ranked, i);
  const revealedAt = (i: number) => timeline.revealedAtMs[i] ?? Infinity;
  const isRevealed = (i: number) => elapsed >= revealedAt(i);

  const podiumUp = timeline.podiumAtMs !== null && elapsed >= timeline.podiumAtMs;
  const drumroll = beat?.kind === "roulement";
  const first = timeline.beats.find((b) => b.kind === "premier");
  const celebrating = !!first && elapsed >= first.settleAtMs!;
  const activeBeat = beat && (beat.kind === "joueur" || beat.kind === "premier") ? beat : null;
  const active = activeBeat ? ranked[activeBeat.rank!] : undefined;

  // Sons : la fanfare joue à la révélation du 1er (plus à l'arrivée sur l'écran) ; une étoile = un tintement à l'arrivée.
  const base = reveal ? reveal.startedAt + (reveal.pausedMs ?? 0) : null;
  const sfx = useMemo(() => {
    const list: { à: number; son: "ceremonie.etoile" | "carte.pose" | "final.tambour" | "final.fanfare" | "applaudissements" | "ceremonie.tic"; options?: { rate?: number; volume?: number } }[] = [];
    for (const b of timeline.beats) {
      if (b.kind === "roulement") list.push({ à: b.startMs / 1000, son: "final.tambour" }, { à: (b.startMs + 2300 * k) / 1000, son: "final.tambour" });
      if (b.kind === "joueur" || b.kind === "premier") {
        b.starAtMs?.forEach((s, j) => list.push({ à: (s + FINAL_TIMING.starMs * k * 0.72) / 1000, son: "ceremonie.etoile", options: { rate: 1 + j * 0.12 } }));
        if (b.kind === "joueur") list.push({ à: b.settleAtMs! / 1000, son: "carte.pose" });
        else list.push({ à: b.settleAtMs! / 1000, son: "final.fanfare" }, { à: (b.settleAtMs! + 500 * k) / 1000, son: "applaudissements" });
      }
    }
    return list;
  }, [timeline, k]);
  useSfxTimeline(total > 0 ? base : null, sfx);

  // Confettis maison à la révélation du 1er (une seule fois, jamais au rechargement d'un classement terminé).
  const fired = useRef(false);
  useEffect(() => {
    if (!celebrating || fired.current) return;
    fired.current = true;
    if (elapsed - first!.settleAtMs! < 1500) { fireConfetti("big", true); setTimeout(() => fireConfetti("big", true), 900 * Math.max(k, 0.1)); }
  }, [celebrating]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows: HonorRow[] = ranked.map((p, i) => ({ id: p.id, rank: rankLabel(i), profile: p.profile, score: p.score, filled: isRevealed(i) }));
  const tv = ANCHORS.tv;
  const winner = ranked[0];
  const w = ANCHORS.windows;

  return (
    <div className="relative min-h-0 flex-1">
      <RoomSet data-testid="tv-final" data-stage={done ? "done" : "reveal"} jukeboxLit={celebrating} dim={drumroll ? 0.4 : celebrating ? 0 : 0.12}
        overlay={
          <>
            <AnimatePresence mode="wait">
              {beat?.kind === "intro" && total > 0 && <Title key="intro">Le classement final</Title>}
              {celebrating && <Title key="done" testId="final-title" big>Bonne année !</Title>}
            </AnimatePresence>
            {total === 0 && <p className="cer-title absolute inset-x-0 top-[40%] text-center font-display text-6xl text-ink-muted">Personne n'a joué…</p>}
            {total > 0 && (
              <HonorBoard rows={rows} avatarLayoutId={(id) => (ranked.findIndex((r) => r.id === id) >= 3 ? `av-${id}` : undefined)} />
            )}
            <AnimatePresence>
              {active && activeBeat && activeBeat.kind === "joueur" && elapsed < (activeBeat.settleAtMs ?? 0) && (
                <ConversionCard key={active.id} player={active} beat={activeBeat} elapsed={elapsed} k={k} rank={rankLabel(activeBeat.rank!)}
                  shared={activeBeat.rank! >= 3} />
              )}
              {active && activeBeat && activeBeat.kind === "premier" && elapsed < (activeBeat.settleAtMs ?? 0) && (
                <ConversionCard key={active.id} player={active} beat={activeBeat} elapsed={elapsed} k={k} rank={rankLabel(0)} shared={false} />
              )}
            </AnimatePresence>
          </>
        }>
        {/* Feu d'artifice : uniquement dans le verre des deux fenêtres (boîtes rectangulaires, rien ne déborde sur le mur) */}
        {celebrating && w.map((r, i) => (
          <div key={i} data-testid={`window-fireworks-${i}`} className="cer-window" style={{ left: `${r.left * 100}%`, top: `${r.top * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}>
            <Fireworks fit={i === 0 ? { count: 3, sparks: 14, reach: 4.2, unit: 0.55, seed: 11 } : { count: 5, sparks: 18, reach: 8, unit: 0.8, seed: 29 }} />
          </div>
        ))}

        {/* Écran de la télévision dessinée : « ? » pendant le roulement, puis le 1er, couronné, en grand */}
        {(drumroll || celebrating) && winner && (
          <div className="cer-tv-screen" data-testid="tv-screen" style={{ left: `${tv.left * 100}%`, top: `${tv.top * 100}%`, width: `${tv.width * 100}%`, height: `${tv.height * 100}%` }}>
            {drumroll ? (
              <motion.span animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }} transition={{ duration: Math.max(0.2, 1.1 * k), repeat: Infinity }}
                className="font-display text-ink" style={{ fontSize: "7rem", lineHeight: 1 }}>?</motion.span>
            ) : (
              <motion.div data-testid="podium-1" initial={{ scale: 0.2, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 140, damping: 11 }}
                className="relative flex flex-col items-center">
                <PlayerAvatar profile={winner.profile} size="lg" crowned crownDelay={0.35 * Math.max(k, 0.05)} />
                <div className="absolute top-full mt-3 flex flex-col items-center gap-1">
                  <span className="cer-chip !max-w-[22rem] !text-3xl">{winner.profile.name}</span>
                  <span className="cer-chip font-num !text-3xl !text-accent-strong">{winner.score}</span>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {podiumUp && (
          <div className="cer-anchored" style={{ left: `${ANCHORS.podium.bottom.x * 100}%`, top: `${ANCHORS.podium.bottom.y * 100}%`, width: `${ANCHORS.podium.width * 100}%`, transform: "translate(-50%, -100%)" }}>
            <Podium riseSeconds={Math.max(0.2, 2.2 * k)} lit={celebrating}>
              {([["second", 1], ["third", 2]] as const).map(([place, i]) => {
                const p = ranked[i];
                if (!p || !isRevealed(i)) return null;
                return (
                  <PodiumSlot key={place} place={place}>
                    <div data-testid={`podium-${i + 1}`} data-rank={rankLabel(i)} className="flex flex-col items-center gap-1">
                      <motion.div layoutId={`av-${p.id}`} initial={false}><PlayerAvatar profile={p.profile} size="lg" /></motion.div>
                      <span className="cer-chip">{p.profile.name}</span>
                      <span className="cer-chip font-num !text-accent-strong">{p.score}</span>
                    </div>
                  </PodiumSlot>
                );
              })}
            </Podium>
          </div>
        )}

        {/* Les souvenirs restent dans le décor, devant le podium (la table basse est plus près de nous) */}
        {(reveal?.souvenirs ?? []).map((s, i) => <PlacedSouvenir key={`${s.kind}-${i}`} keepsake={s} />)}
      </RoomSet>
    </div>
  );
}

function Title({ children, big, testId }: { children: React.ReactNode; big?: boolean; testId?: string }) {
  return (
    <motion.h1 data-testid={testId} initial={{ opacity: 0, y: -50, scale: big ? 0.4 : 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30 }}
      transition={{ type: "spring", stiffness: 160, damping: 11 }}
      className={`cer-title absolute left-[34%] right-[3%] top-[3%] text-center font-display text-accent-strong ${big ? "text-8xl" : "text-7xl"}`}>
      {children}
    </motion.h1>
  );
}

/** Un joueur s'avance au centre : score de base qui défile, puis ses étoiles s'envolent une à une vers le score. */
function ConversionCard({ player, beat, elapsed, k, rank, shared }: { player: Ranked; beat: FinalBeat; elapsed: number; k: number; rank: number; shared: boolean }) {
  const { phase, starsDone, starIndex } = finalPhaseAt(beat, elapsed);
  const consumed = phase === "stars" ? (starIndex ?? 0) + 1 : starsDone;
  // Le score gagne la valeur de l'étoile quand elle ARRIVE (pas quand elle part).
  const landed = useLanded(starsDone, starIndex, k);
  const shown = player.base + player.stars.slice(0, landed).reduce((a, b) => a + b, 0);
  const counting = phase !== "advance";
  // Podium monté (3 premiers) : la carte se tient au-dessus des marches pour ne pas couvrir ceux déjà installés.
  const high = (beat.rank ?? 0) < 3;
  return (
    <motion.div data-testid="final-card" data-player={player.id} data-phase={phase} data-rank={rank}
      initial={{ opacity: 0, x: "-18rem", scale: 0.6 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.85, transition: { duration: Math.max(0.05, 0.25 * k) } }}
      transition={{ type: "spring", stiffness: 110, damping: 15 }}
      className={`absolute left-[40%] ${high ? "top-[2%]" : "top-[28%]"} flex w-[30rem] flex-col items-center gap-2`}>
      {/* Étoiles gagnées à la cérémonie : elles partent une à une */}
      <div className="flex h-[5rem] items-center justify-center gap-1" data-testid="final-card-stars" data-remaining={player.stars.length - consumed}>
        {player.stars.slice(consumed).map((_, j) => <Star key={j} size={4.4} />)}
      </div>
      <div className="relative">
        <motion.div layoutId={shared ? `av-${player.id}` : undefined}><PlayerAvatar profile={player.profile} size="xl" /></motion.div>
        {/* Étoile en vol : part du portrait, rejoint le score en rétrécissant */}
        {phase === "stars" && starIndex !== null && (
          <motion.div key={starIndex} aria-hidden className="absolute left-1/2 top-0 z-10 flex items-center gap-2 whitespace-nowrap"
            initial={{ opacity: 0, scale: 0.3, x: "-50%", y: "-6rem" }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.5, 1.1, 0.4], y: ["-6rem", "-2rem", "14rem", "22rem"] }}
            transition={{ duration: Math.max(0.05, FINAL_TIMING.starMs * k / 1000), times: [0, 0.2, 0.72, 1], ease: "easeInOut" }}>
            <Star size={5} />
            <span className="cer-title font-num text-6xl text-accent-strong">★ +{player.stars[starIndex]}</span>
          </motion.div>
        )}
      </div>
      <span className="cer-title max-w-full truncate font-display text-4xl text-ink">{player.profile.name}</span>
      <div data-testid="final-card-score" className="cer-title font-num text-8xl text-accent-strong">
        {counting ? <CountUp value={shown} duration={Math.max(0.05, (phase === "count" ? FINAL_TIMING.countMs : FINAL_TIMING.starMs * 0.35) * k / 1000)} /> : "?"}
      </div>
    </motion.div>
  );
}

/** Nombre d'étoiles déjà arrivées au score : la dernière lancée arrive aux trois quarts de son vol. */
function useLanded(starsDone: number, starIndex: number | null, k: number): number {
  const [landedIndex, setLanded] = useState(-1);
  useEffect(() => {
    if (starIndex === null) return;
    const t = setTimeout(() => setLanded(starIndex), FINAL_TIMING.starMs * k * 0.72);
    return () => clearTimeout(t);
  }, [starIndex, k]);
  // Les étoiles des phases passées (rechargement, « Passer ») sont déjà arrivées ; sinon on attend la fin du vol.
  if (starIndex === null) return starsDone;
  return Math.max(starsDone, landedIndex >= starIndex ? starIndex + 1 : starIndex);
}
