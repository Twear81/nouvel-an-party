// La pièce validée : portraits et caméra suivent uniquement la chronologie reçue du serveur.
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import type { GameSnapshot } from "../../shared/types";
import { OPENING_TIMING, SKIN_TIMING, transitionElapsed, type TransitionInfo } from "../../shared/transitions";
import { serverNow } from "../net/socket";
import roomReference from "../theme/assets/piece-reference.png";
import { PlayerAvatar } from "./PlayerAvatar";
import { OverwatchScene, animateOverwatch } from "./signatures/Overwatch";
import { DofusTimeline, animateDofusTimeline } from "./signatures/Dofus";
import { RoomSignature, animateRoomSignature, legacyTime, signatureEnvelope } from "./RoomSignature";

// Pièces transformées optionnelles (piece-<skin>.png) : un skin sans image n'a simplement pas de calque.
// Vite remplace l'appel à la compilation ; sous Bun (tests unitaires) il n'existe pas : aucune image.
function loadRoomSkins(): Record<string, string> {
  try { return import.meta.glob<string>("../theme/assets/piece-*.png", { eager: true, import: "default" }); } catch { return {}; }
}
const roomSkins = loadRoomSkins();
const roomSkinImage = (skin: string | null) => (skin ? roomSkins[`../theme/assets/piece-${skin}.png`] : undefined);

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
  return elapsed < SKIN_TIMING.zoomOutEndMs ? "room" : elapsed < SKIN_TIMING.plungeStartMs ? "change" : "zoom";
}

export function RoomTransition({ snapshot }: { snapshot: GameSnapshot }) {
  const scene = snapshot.transition;
  const root = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const signature = useRef<HTMLDivElement>(null);
  const roomSkin = useRef<HTMLImageElement>(null);
  const tvLight = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const potg = useRef<HTMLDivElement>(null);
  const timeline = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const currentScene = useRef(scene);
  currentScene.current = scene;
  const players = useMemo(() => scene?.playerIds.flatMap((id, index) => {
    const profile = snapshot.players.find((p) => p.id === id)?.profile;
    return profile ? [{ id, index, profile }] : [];
  }) ?? [], [scene?.playerIds, snapshot.players]);
  const participantKey = players.map((p) => p.id).join("|");
  // Overwatch : la vedette du carton « Action de la partie » est choisie par le serveur (`spotlightPlayerId`).
  const featured = scene?.spotlightPlayerId ? players.find((p) => p.id === scene.spotlightPlayerId) ?? null : null;

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
    const zoom = `translate(${50 - scale * (tv.left + tv.width / 2) * 100}%, ${50 - scale * (tv.top + tv.height / 2) * 100}%) scale(${scale})`;

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
        { at: 0, opacity: 0 }, { at: 8250, opacity: 0 },
        { at: OPENING_TIMING.zoomEndAtMs, opacity: 1 }, { at: scene.durationMs, opacity: 1 },
      ]);
    } else if (scene.kind === "skin") {
      animate(camera.current, [
        { at: 0, transform: zoom, easing: "cubic-bezier(.16, 1, .3, 1)" },
        { at: SKIN_TIMING.zoomOutEndMs, transform: identity },
        { at: SKIN_TIMING.plungeStartMs, transform: identity, easing: "cubic-bezier(.6, 0, .15, 1)" },
        { at: SKIN_TIMING.plungeEndMs, transform: zoom }, { at: scene.durationMs, transform: zoom },
      ]);
      animate(roomSkin.current, [
        { at: 0, opacity: 0 }, { at: SKIN_TIMING.zoomOutEndMs, opacity: 0 },
        { at: SKIN_TIMING.roomSkinFadeEndMs, opacity: 1 }, { at: scene.durationMs, opacity: 1 },
      ]);
      animate(light.current, [
        { at: 0, opacity: 0 }, { at: legacyTime(1000), opacity: 0 }, { at: legacyTime(1700), opacity: .32 },
        { at: legacyTime(3000), opacity: .32 }, { at: scene.durationMs, opacity: 0 },
      ]);
      if (scene.toSkin === "overwatch") { if (potg.current) animateOverwatch(potg.current, animate); }
      else {
        animate(signature.current, signatureEnvelope(scene.toSkin));
        animateRoomSignature(signature.current, scene.toSkin, false, animate);
        if (scene.toSkin === "dofus" && timeline.current) animateDofusTimeline(timeline.current, animate);
      }
      animate(cover.current, [
        { at: 0, opacity: 1 }, { at: 650, opacity: 0 },
        { at: SKIN_TIMING.plungeEndMs - 150, opacity: 0 }, { at: scene.durationMs, opacity: 1 },
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
        const from = transform(((x < ROOM.table.x ? -.12 : 1.12) - x) * 100, ((index % 2 === 0 ? -.12 : 1.12) - y) * 100, .65, x < ROOM.table.x ? -12 : 12);
        const bounce = transform(x < ROOM.table.x ? .5 : -.5, -.35, 1.05, 2);
        animate(element, [
          { at: 0, opacity: 0, transform: from },
          { at: start, opacity: 0, transform: from, easing: "cubic-bezier(.16, 1, .3, 1)" },
          { at: start + OPENING_TIMING.travelMs * .72, opacity: 1, transform: bounce, easing: "ease-out" },
          { at: start + OPENING_TIMING.travelMs, opacity: 1, transform: still },
          { at: OPENING_TIMING.leaveAtMs, opacity: 1, transform: still },
          { at: OPENING_TIMING.fadeAtMs, opacity: 0, transform: transform(0, -.7, .96) },
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
  }, [scene?.kind, scene?.toSkin, scene?.startedAt, scene?.durationMs, participantKey]);

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
  }, [scene?.kind, scene?.startedAt, scene?.pausedMs, scene?.pausedSince, participantKey]);

  if (!scene) return null;
  const tv = ROOM.tv;
  const skinImage = scene.kind === "skin" ? roomSkinImage(scene.toSkin) : undefined;
  return (
    <div ref={root} data-testid="tv-transition" data-ui="room-scene" data-kind={scene.kind}
      data-room-skin={scene.toSkin ?? "base"} data-stage={sceneStage(scene, transitionElapsed(scene, serverNow()))}
      data-elapsed-ms={Math.round(transitionElapsed(scene, serverNow()))}
      data-player-count={scene.playerIds.length} className="room-scene"
      style={{ "--room-tv-left": `${tv.left * 100}%`, "--room-tv-top": `${tv.top * 100}%`, "--room-tv-width": `${tv.width * 100}%`, "--room-tv-height": `${tv.height * 100}%` } as CSSProperties}>
      <div ref={camera} className="room-camera" data-testid="transition-camera">
        <img src={roomReference} alt="" draggable={false} data-testid="transition-room" className="room-image"
          onLoad={(event) => { event.currentTarget.dataset.image = "ready"; }} />
        {scene.kind === "skin" && skinImage && <img ref={roomSkin} src={skinImage} alt="" draggable={false} aria-hidden
          data-testid="transition-room-skin" className="room-image room-image-skin" />}
        <div ref={light} className="room-light" aria-hidden />
        {scene.kind === "skin" && <div ref={signature} className="room-signature" aria-hidden><RoomSignature skin={scene.toSkin} players={players} /></div>}
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
      {scene.kind === "skin" && scene.toSkin === "overwatch" && (
        <div ref={potg} className="room-overlay"><OverwatchScene profile={featured?.profile ?? null} playerId={featured?.id ?? null} /></div>
      )}
      {scene.kind === "skin" && scene.toSkin === "dofus" && (
        <div className="room-overlay" aria-hidden><div ref={timeline} className="sig-df-timeline-host"><DofusTimeline players={players} /></div></div>
      )}
      <div ref={cover} className="room-cover" aria-hidden />
    </div>
  );
}
