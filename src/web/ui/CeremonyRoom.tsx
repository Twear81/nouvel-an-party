// Décor commun de la cérémonie et du podium ; seuls les calques séparés bougent.
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { Keepsake } from "../../shared/ceremony";
import { cleanStrokes, WIDTHS } from "../../minigames/dessin-rate/shared";
import roomReference from "../theme/assets/piece-reference.png";
import raven from "../theme/assets/ceremonie/corbeau.svg";
import spoon from "../theme/assets/ceremonie/cuillere.svg";
import { Fireworks } from "./Fireworks";

export { raven, spoon };

/** Un calque natif suit l'horloge active, puis le compositeur le fait tourner seul. */
export function AnimatedSceneLayer({ frames, durationMs, elapsedMs, paused, className, style, children }: {
  frames: Keyframe[]; durationMs: number; elapsedMs: number; paused: boolean;
  className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const framesKey = JSON.stringify(frames);
  useLayoutEffect(() => {
    if (!element.current) return;
    const current = element.current.animate(JSON.parse(framesKey), { duration: Math.max(1, durationMs), fill: "both", easing: "ease-in-out" });
    current.pause();
    animation.current = current;
    return () => { current.cancel(); animation.current = null; };
  }, [framesKey, durationMs]);
  useLayoutEffect(() => {
    const current = animation.current;
    if (!current) return;
    const expected = Math.max(0, Math.min(durationMs, elapsedMs));
    // Une galerie peut rendre souvent ; laisser le compositeur jouer tant que l'horloge ne dérive pas.
    if (paused || Math.abs(Number(current.currentTime ?? 0) - expected) > 50) current.currentTime = expected;
    if (paused || elapsedMs >= durationMs) current.pause(); else current.play();
  }, [framesKey, durationMs, elapsedMs, paused]);
  return <div ref={element} className={className} style={style}>{children}</div>;
}

/** Le dessin est peint une fois : pas de grand SVG redessiné pendant les déplacements. */
export function KeepsakeArt({ keepsake }: { keepsake: Keepsake }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (keepsake.kind !== "dessin" || !canvas.current) return;
    const strokes = cleanStrokes(keepsake.strokes);
    const ctx = canvas.current.getContext("2d");
    if (!ctx || !strokes) return;
    const styles = getComputedStyle(canvas.current);
    ctx.clearRect(0, 0, 1000, 1000);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const s of strokes) {
      ctx.strokeStyle = ctx.fillStyle = styles.getPropertyValue(`--color-pen-${s.c}`).trim();
      ctx.lineWidth = WIDTHS[s.w]!;
      ctx.beginPath(); ctx.moveTo(s.p[0]!, s.p[1]!);
      if (s.p.length === 2) { ctx.arc(s.p[0]!, s.p[1]!, WIDTHS[s.w]! / 2, 0, Math.PI * 2); ctx.fill(); }
      else { for (let i = 2; i < s.p.length; i += 2) ctx.lineTo(s.p[i]!, s.p[i + 1]!); ctx.stroke(); }
    }
  }, [keepsake]);
  if (keepsake.kind === "dessin") return <div className="ceremony-drawing"><canvas ref={canvas} width={1000} height={1000} /><span>{keepsake.label}</span></div>;
  if (keepsake.kind === "objet") return <div className="ceremony-object"><span>{keepsake.emoji}</span><strong>{keepsake.label}</strong><small>{keepsake.detail}</small></div>;
  return <div className="ceremony-postit"><strong>{keepsake.text}</strong><small>{keepsake.detail}</small></div>;
}

export function CeremonyRoom({ night = false, celebrate = false, souvenirs = [], paused = false, children }: {
  night?: boolean; celebrate?: boolean; souvenirs?: Keepsake[]; paused?: boolean; children: ReactNode;
}) {
  return <div className="ceremony-room" data-ui="ceremony-room" data-night={night} data-celebrate={celebrate} data-paused={paused}>
    <img className="ceremony-background" src={roomReference} alt="" draggable={false} />
    {night && <div className="ceremony-night" aria-hidden />}
    {celebrate && <>
      <div className="ceremony-window ceremony-window-left"><Fireworks size="phone" /></div>
      <div className="ceremony-window ceremony-window-right"><Fireworks size="phone" /></div>
      <div className="ceremony-jukebox" aria-hidden />
    </>}
    {souvenirs.map((keepsake, i) => <div key={`${keepsake.kind}-${i}`} data-testid={`room-keepsake-${keepsake.kind}`} className={`ceremony-keepsake ceremony-keepsake-${keepsake.kind}`}><KeepsakeArt keepsake={keepsake} /></div>)}
    {children}
  </div>;
}
