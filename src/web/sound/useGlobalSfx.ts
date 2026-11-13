// Sons globaux de la TV, branchés une seule fois dans TvApp : lobby, manches, chrono, pause, résultats, final, scènes.
// Seuls les CHANGEMENTS d'état font du bruit (voir events.ts) : une TV qui recharge reste silencieuse.
import { useEffect, useRef } from "react";
import type { GameSnapshot } from "../../shared/types";
import { gameViewProps } from "../net/helpers";
import { serverNow } from "../net/socket";
import { revealSecondsOf } from "../net/useReveal";
import { useSkin } from "../theme/skin";
import { play, sound } from "./engine";
import { ambianceActive, CHRONO_INITIAL, chronoStep, diffSnapshots, MIDNIGHT_SFX_INITIAL, midnightStep, pointsSoundAt, type ChronoState, type MidnightSfxState } from "./events";
import { useSfxAt } from "./hooks";

export function useGlobalSfx(snapshot: GameSnapshot | null) {
  const skin = useSkin();
  const ambiance = ambianceActive(snapshot);
  // Réglages du moteur : déclarés avant le calcul des sons pour qu'ils soient à jour (pause, skin).
  useEffect(() => sound.start(), []);
  useEffect(() => sound.setPaused(!!snapshot?.paused), [snapshot?.paused]);
  useEffect(() => sound.setSkin(skin), [skin]);
  useEffect(() => { sound.setAmbiance(ambiance); return () => sound.setAmbiance(false); }, [ambiance]);
  // Raccourci : M coupe / remet le son (bonus silencieux, comme Espace et N dans HostBar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && (e.target as HTMLElement | null)?.tagName !== "INPUT") sound.toggleMuted();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Changements d'état entre deux snapshots.
  const previous = useRef<GameSnapshot | null>(null);
  useEffect(() => {
    if (!snapshot) return;
    const calls = diffSnapshots(previous.current, snapshot);
    previous.current = snapshot;
    for (const call of calls) play(call.nom, call.options);
  }, [snapshot]);

  // Chrono : un tic par seconde sur les 5 dernières, un buzzer à zéro (pause et +10 s se lisent dans `round`).
  const round = snapshot?.phase === "playing" ? snapshot.round : null;
  const latestRound = useRef(round);
  latestRound.current = round;
  const playing = round !== null;
  const roundIndex = round?.index;
  useEffect(() => {
    if (!playing) return;
    let state: ChronoState = CHRONO_INITIAL;
    const tick = () => {
      const r = latestRound.current;
      let remaining: number | null = null;
      if (r) remaining = r.pausedRemainingMs ?? (r.deadline !== null ? Math.max(0, r.deadline - serverNow()) : null);
      const step = chronoStep(state, remaining);
      state = step.state;
      if (step.call) play(step.call.nom, step.call.options);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [playing, roundIndex]);

  // Minuit : un tic par seconde sur les 10 dernières, la fête à zéro (calés sur la même heure serveur que l'affichage).
  const midnightTarget = snapshot?.midnight?.targetAt ?? null;
  useEffect(() => {
    if (midnightTarget === null) return;
    let state: MidnightSfxState = MIDNIGHT_SFX_INITIAL;
    const tick = () => {
      const step = midnightStep(state, midnightTarget - serverNow());
      state = step.state;
      if (step.call) {
        play(step.call.nom, step.call.options);
        if (step.call.nom === "minuit.fete") setTimeout(() => play("applaudissements", { volume: 0.6, ignorePause: true }), 400);
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [midnightTarget]);

  // Fin de la révélation des résultats : « points gagnés », calé sur la même durée que l'animation.
  const results = snapshot?.phase === "results" ? snapshot.round : null;
  const revealSeconds = snapshot && results ? revealSecondsOf(gameViewProps(snapshot, results, null, async () => {})) : 0;
  const pointsAt = results ? pointsSoundAt(results.resultsAt, revealSeconds, results.deltas) : null;
  useSfxAt(pointsAt, "points.gagnes");
  useSfxAt(pointsAt === null ? null : pointsAt + 100, "applaudissements", { volume: 0.45 });
}
