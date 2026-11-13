// La pièce de nuit de la cérémonie et du classement final : décor, caméra (zoom/déplacement), voile et calques.
// Tout ce qui est posé dans le décor (`children`) vit dans le repère de l'illustration (1672 × 941) : il suit la caméra.
// `overlay` reste à l'écran. Seuls `transform` et `opacity` bougent ; la caméra est une seule animation de transform.
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ANCHORS, ceremonieImage } from "../theme/ceremonie-assets";
import roomReference from "../theme/assets/piece-reference.png";

export interface Camera {
  /** Point regardé, en fraction de l'illustration (0-1). */
  x: number;
  y: number;
  /** 1 = pièce entière. */
  scale: number;
}
export const WIDE: Camera = { x: 0.5, y: 0.5, scale: 1 };

/** Transformation qui amène le point (x, y) au centre de l'écran avec un zoom `scale` (origine en haut à gauche). */
export function cameraTransform({ x, y, scale }: Camera) {
  return { x: `${(0.5 - scale * x) * 100}%`, y: `${(0.5 - scale * y) * 100}%`, scale };
}

interface RoomSetProps {
  camera?: Camera;
  /** Durée du mouvement de caméra (s). */
  cameraSeconds?: number;
  /** Voile sombre supplémentaire, 0-1 (roulette des bonus). */
  dim?: number;
  /** Lumière du jukebox (classement final). */
  jukeboxLit?: boolean;
  children?: ReactNode;
  overlay?: ReactNode;
  "data-testid"?: string;
  "data-step"?: string;
  "data-index"?: number;
  "data-stage"?: string;
}

export function RoomSet({ camera = WIDE, cameraSeconds = 1.2, dim = 0, jukeboxLit = false, children, overlay, ...rest }: RoomSetProps) {
  const night = ceremonieImage("piece-nuit");
  return (
    <div data-ui="room-set" data-night={night ? "painted" : "veil"} data-testid={rest["data-testid"]} data-step={rest["data-step"]} data-index={rest["data-index"]} data-stage={rest["data-stage"]}
      className="room-scene cer-room">
      <motion.div data-testid="room-camera" className="cer-camera" initial={false}
        animate={cameraTransform(camera)} transition={{ duration: cameraSeconds, ease: [0.45, 0, 0.2, 1] }}>
        <img src={night ?? roomReference} alt="" draggable={false} className="room-image" />
        {!night && <div aria-hidden className="cer-night-veil" />}
        <div aria-hidden data-testid="jukebox-halo" data-lit={jukeboxLit} className="cer-jukebox-halo"
          style={{ left: `${ANCHORS.jukebox.center.x * 100}%`, top: `${ANCHORS.jukebox.center.y * 100}%`, width: `${ANCHORS.jukebox.radius * 200}%`,
            aspectRatio: "1", opacity: jukeboxLit ? 1 : 0 }} />
        {/* Le voile est sous les objets et portraits du décor : ce qui est éclairé reste éclairé. */}
        <motion.div aria-hidden data-testid="room-dim" className="cer-dim" initial={false} animate={{ opacity: dim }} transition={{ duration: 0.7 }} />
        {children}
      </motion.div>
      {overlay}
    </div>
  );
}

/** Place un objet du décor par son bas (`bottom`) ou son centre (`center`), largeur en fraction de l'illustration. */
export function Anchored({ at, width, anchor = "bottom", className = "", children, ...rest }: {
  at: { x: number; y: number };
  width: number;
  anchor?: "bottom" | "center";
  className?: string;
  children?: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div data-testid={rest["data-testid"]} className={`cer-anchored ${className}`}
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, width: `${width * 100}%`, transform: `translate(-50%, ${anchor === "bottom" ? "-100%" : "-50%"})` }}>
      {children}
    </div>
  );
}

