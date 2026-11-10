// La pièce validée : portraits et caméra suivent uniquement la chronologie reçue du serveur.
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import type { GameSnapshot } from "../../shared/types";
import { OPENING_TIMING, transitionElapsed, type TransitionInfo } from "../../shared/transitions";
import { serverNow } from "../net/socket";
import roomReference from "../theme/assets/piece-reference.png";
import { PlayerAvatar } from "./PlayerAvatar";
import { RoomSignature, animateRoomSignature } from "./RoomSignature";

export { roomReference };

// Coordonnées de l'illustration canonique, identiques à la maquette approuvée.
const ROOM = {
  tv: { left: 627 / 1672, top: 322 / 941, width: 244 / 1672, height: 129 / 941 },
  table: { x: .48, y: .79, radiusX: .24, radiusY: .104 },
} as const;
type Frame = Keyframe & { at: number };
const identity = "translate(0%, 0%) scale(1)";

function sceneStage(scene: TransitionInfo, elapsed: number) {
  if (elapsed >= scene.durationMs) return "end";
  if (scene.kind === "opening") {
    if (elapsed >= OPENING_TIMING.fadeAtMs) return "zoom";
    if (elapsed >= OPENING_TIMING.seatedAtMs) return "table";
    if (elapsed >= OPENING_TIMING.arrivalAtMs) return "arrival";
    return "room";
  }
  if (scene.kind === "closing") return elapsed < 1500 ? "zoom" : "table";
  return elapsed < 1000 ? "room" : elapsed < 2600 ? "change" : "zoom";
}

export function RoomTransition({ snapshot }: { snapshot: GameSnapshot }) {
  const scene = snapshot.transition;
  const reduced = !!useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const signature = useRef<HTMLDivElement>(null);
  const tvLight = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const currentScene = useRef(scene);
  currentScene.current = scene;
  const players = useMemo(() => scene?.playerIds.flatMap((id, index) => {
    const profile = snapshot.players.find((p) => p.id === id)?.profile;
    return profile ? [{ id, index, profile }] : [];
  }) ?? [], [scene?.playerIds, snapshot.players]);
  const participantKey = players.map((p) => p.id).join("|");

  useLayoutEffect(() => {
    if (!scene || !root.current || !camera.current) return;
    const list: Animation[] = [];
    const animate = (element: Element | null, frames: Frame[]) => {
      if (!element) return;
      const animation = element.animate(frames.map(({ at, ...frame }) => ({ ...frame, offset: at / scene.durationMs })), {
        duration: scene.durationMs, fill: "both",
      });
      animation.pause();
      animation.currentTime = transitionElapsed(scene, serverNow());
      list.push(animation);
    };
    const tv = ROOM.tv;
    const scale = Math.max(1 / tv.width, 1 / tv.height);
    const zoom = reduced ? identity : `translate(${50 - scale * (tv.left + tv.width / 2) * 100}%, ${50 - scale * (tv.top + tv.height / 2) * 100}%) scale(${scale})`;

    if (scene.kind === "opening") {
      animate(camera.current, [
        { at: 0, transform: identity },
        { at: OPENING_TIMING.fadeAtMs, transform: identity, easing: "cubic-bezier(.6, 0, .15, 1)" },
        { at: OPENING_TIMING.zoomEndAtMs, transform: zoom },
        { at: scene.durationMs, transform: zoom },
      ]);
      animate(tvLight.current, [
        { at: 0, opacity: 0 }, { at: OPENING_TIMING.leaveAtMs - 600, opacity: 0 },
        { at: OPENING_TIMING.fadeAtMs, opacity: .7 }, { at: OPENING_TIMING.zoomEndAtMs, opacity: 1 },
        { at: scene.durationMs, opacity: 1 },
      ]);
      animate(cover.current, [
        { at: 0, opacity: 0 }, { at: reduced ? OPENING_TIMING.fadeAtMs : 8250, opacity: 0 },
        { at: OPENING_TIMING.zoomEndAtMs, opacity: 1 }, { at: scene.durationMs, opacity: 1 },
      ]);
    } else if (scene.kind === "skin") {
      animate(camera.current, [
        { at: 0, transform: zoom, easing: "cubic-bezier(.16, 1, .3, 1)" },
        { at: 1000, transform: identity },
        { at: 2600, transform: identity, easing: "cubic-bezier(.6, 0, .15, 1)" },
        { at: 3900, transform: zoom }, { at: scene.durationMs, transform: zoom },
      ]);
      animate(light.current, [
        { at: 0, opacity: 0 }, { at: 1000, opacity: 0 }, { at: 1700, opacity: .32 },
        { at: 3000, opacity: .32 }, { at: scene.durationMs, opacity: 0 },
      ]);
      animate(signature.current, [
        { at: 0, opacity: 0 }, { at: 850, opacity: 0 }, { at: 1200, opacity: 1 },
        { at: 2900, opacity: 1 }, { at: 3500, opacity: 0 }, { at: scene.durationMs, opacity: 0 },
      ]);
      animateRoomSignature(signature.current, scene.toSkin, reduced, animate);
      animate(cover.current, [
        { at: 0, opacity: 1 }, { at: 650, opacity: 0 },
        { at: 3750, opacity: 0 }, { at: scene.durationMs, opacity: 1 },
      ]);
    } else {
      animate(camera.current, [
        { at: 0, transform: zoom, easing: "cubic-bezier(.16, 1, .3, 1)" },
        { at: 1500, transform: identity }, { at: scene.durationMs, transform: identity },
      ]);
      animate(cover.current, [{ at: 0, opacity: 1 }, { at: 650, opacity: 0 }, { at: scene.durationMs, opacity: 0 }]);
    }

    root.current.querySelectorAll<HTMLElement>(".room-visitor").forEach((element) => {
      const index = Number(element.dataset.index);
      const angle = -Math.PI / 2 + index * 2 * Math.PI / scene.playerIds.length;
      const x = ROOM.table.x + Math.cos(angle) * ROOM.table.radiusX;
      const y = ROOM.table.y + Math.sin(angle) * ROOM.table.radiusY;
      const transform = (dx = 0, dy = 0, size = 1, rotate = 0) => `translate(${dx}cqw, ${dy}cqh) scale(${size}) rotate(${rotate}deg)`;
      const still = transform();
      if (scene.kind === "opening") {
        const start = OPENING_TIMING.arrivalAtMs + index * OPENING_TIMING.staggerMs;
        const from = reduced ? still : transform(((x < ROOM.table.x ? -.12 : 1.12) - x) * 100, ((index % 2 === 0 ? -.12 : 1.12) - y) * 100, .65, x < ROOM.table.x ? -12 : 12);
        const bounce = reduced ? still : transform(x < ROOM.table.x ? .5 : -.5, -.35, 1.05, 2);
        animate(element, [
          { at: 0, opacity: 0, transform: from },
          { at: start, opacity: 0, transform: from, easing: "cubic-bezier(.16, 1, .3, 1)" },
          { at: start + OPENING_TIMING.travelMs * .72, opacity: 1, transform: bounce, easing: "ease-out" },
          { at: start + OPENING_TIMING.travelMs, opacity: 1, transform: still },
          { at: OPENING_TIMING.leaveAtMs, opacity: 1, transform: still },
          { at: OPENING_TIMING.fadeAtMs, opacity: 0, transform: reduced ? still : transform(0, -.7, .96) },
          { at: scene.durationMs, opacity: 0, transform: still },
        ]);
      } else if (scene.kind === "closing") {
        animate(element, [
          { at: 0, opacity: 0, transform: still }, { at: 1450, opacity: 0, transform: still },
          { at: 1950, opacity: 1, transform: still }, { at: scene.durationMs, opacity: 1, transform: still },
        ]);
      }
    });
    animations.current = list;
    return () => {
      list.forEach((animation) => animation.cancel());
      animations.current = [];
    };
  }, [scene?.kind, scene?.startedAt, scene?.durationMs, participantKey, reduced]);

  useLayoutEffect(() => {
    if (!scene || !root.current) return;
    let frame: number | null = null;
    const tick = () => {
      const info = currentScene.current;
      if (!info || !root.current) return;
      const elapsed = transitionElapsed(info, serverNow());
      animations.current.forEach((animation) => { animation.currentTime = elapsed; });
      root.current.dataset.elapsedMs = String(Math.round(elapsed));
      root.current.dataset.stage = sceneStage(info, elapsed);
      if (info.pausedSince === null && elapsed < info.durationMs) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [scene?.kind, scene?.startedAt, scene?.pausedMs, scene?.pausedSince, participantKey, reduced]);

  if (!scene) return null;
  const tv = ROOM.tv;
  return (
    <div ref={root} data-testid="tv-transition" data-ui="room-scene" data-kind={scene.kind}
      data-room-skin={scene.toSkin ?? "base"} data-stage={sceneStage(scene, transitionElapsed(scene, serverNow()))}
      data-elapsed-ms={Math.round(transitionElapsed(scene, serverNow()))} data-reduced-motion={String(reduced)}
      data-player-count={scene.playerIds.length} className="room-scene"
      style={{ "--room-tv-left": `${tv.left * 100}%`, "--room-tv-top": `${tv.top * 100}%`, "--room-tv-width": `${tv.width * 100}%`, "--room-tv-height": `${tv.height * 100}%` } as CSSProperties}>
      <div ref={camera} className="room-camera" data-testid="transition-camera">
        <img src={roomReference} alt="" draggable={false} data-testid="transition-room" className="room-image"
          onLoad={(event) => { event.currentTarget.dataset.image = "ready"; }} />
        <div ref={light} className="room-light" aria-hidden />
        {scene.kind === "skin" && <div ref={signature} className="room-signature" aria-hidden><RoomSignature skin={scene.toSkin} /></div>}
        <div ref={tvLight} className="room-tv-light" aria-hidden />
        {scene.kind !== "skin" && players.map(({ id, index, profile }) => {
          const angle = -Math.PI / 2 + index * 2 * Math.PI / scene.playerIds.length;
          const label = Math.sin(angle) < -.35 ? "top" : Math.sin(angle) > .35 ? "bottom" : Math.cos(angle) < 0 ? "left" : "right";
          return (
            <div key={id} data-testid={`transition-player-${id}`} data-label={label} className="room-person"
              style={{ left: `${(ROOM.table.x + Math.cos(angle) * ROOM.table.radiusX) * 100}%`, top: `${(ROOM.table.y + Math.sin(angle) * ROOM.table.radiusY) * 100}%` }}>
              <div className="room-visitor" data-index={index}>
                <div className="room-portrait"><PlayerAvatar profile={profile} size="lg" /></div>
                <span className="room-name" data-testid={`transition-name-${id}`}>{profile.name}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={cover} className="room-cover" aria-hidden />
    </div>
  );
}
