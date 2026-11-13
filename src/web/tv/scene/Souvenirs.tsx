// Les trois souvenirs de la partie, posés dans le décor : le dessin le plus voté encadré au mur, l'objet du Bon Prix sous sa
// cloche sur la table basse, « La Une du 1er janvier » à plat sur la table. Chacun s'installe avec un geste physique
// (`active`), puis RESTE dans la pièce (`active` faux : posé tel quel, sans rejouer l'animation).
import { motion } from "motion/react";
import type { Keepsake } from "../../../shared/ceremony";
import { cleanStrokes, GRID } from "../../../minigames/dessin-rate/shared";
import { StrokesSvg } from "../../../minigames/dessin-rate/drawing";
import { ANCHORS, CEREMONIE_ASPECT, ceremonieImage } from "../../theme/ceremonie-assets";
import { Anchored } from "../../ui/RoomSet";
import { journalHeadline } from "./headline";

type Dessin = Extract<Keepsake, { kind: "dessin" }>;
type Objet = Extract<Keepsake, { kind: "objet" }>;
type PostIt = Extract<Keepsake, { kind: "post-it" }>;

/** Zone du dessin dans le cadre (fraction du cadre) : l'ouverture du passe-partout. */
const FRAME_ART = { left: 0.205, top: 0.307, width: 0.587, height: 0.446 };

export function FrameSouvenir({ keepsake, active, seconds = 1 }: { keepsake: Dessin; active: boolean; seconds?: number }) {
  const strokes = cleanStrokes(keepsake.strokes) ?? [];
  const image = ceremonieImage("cadre-dore");
  const { center, width } = ANCHORS.frame;
  return (
    <Anchored at={center} width={width} anchor="center" data-testid="souvenir-dessin">
      <motion.div className="cer-frame" style={{ aspectRatio: String(CEREMONIE_ASPECT["cadre-dore"]) }}
        initial={active ? { scale: 2.2, y: "-25%", rotate: 14, opacity: 0 } : false}
        animate={{ scale: 1, y: 0, rotate: [14, -7, 4, -2, 0], opacity: 1 }}
        transition={{ scale: { type: "spring", stiffness: 160, damping: 11 }, y: { type: "spring", stiffness: 160, damping: 11 },
          opacity: { duration: 0.2 * seconds }, rotate: { duration: 1.6 * seconds, ease: "easeOut", times: [0, 0.25, 0.5, 0.75, 1] } }}>
        <div className="cer-frame-art" style={{ left: `${FRAME_ART.left * 100}%`, top: `${FRAME_ART.top * 100}%`, width: `${FRAME_ART.width * 100}%`, height: `${FRAME_ART.height * 100}%` }}>
          <svg viewBox={`0 0 ${GRID} ${GRID}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden><StrokesSvg strokes={strokes} /></svg>
        </div>
        {image ? <img src={image} alt="" draggable={false} className="absolute inset-0 h-full w-full" /> : <div aria-hidden className="cer-frame-fallback" />}
      </motion.div>
    </Anchored>
  );
}

export function BellSouvenir({ keepsake, active, seconds = 1 }: { keepsake: Objet; active: boolean; seconds?: number }) {
  const image = ceremonieImage("cloche");
  const { bottom, width } = ANCHORS.bell;
  return (
    <Anchored at={bottom} width={width} data-testid="souvenir-objet">
      <motion.div className="cer-bell" style={{ aspectRatio: String(CEREMONIE_ASPECT.cloche) }}
        initial={active ? { y: "-90%", opacity: 0, scaleY: 1.1, scaleX: 0.92 } : false}
        animate={{ y: 0, opacity: 1, scaleY: [1.1, 0.88, 1.05, 0.98, 1], scaleX: [0.92, 1.08, 0.97, 1.01, 1] }}
        transition={{ y: { type: "spring", stiffness: 220, damping: 12 }, opacity: { duration: 0.15 * seconds }, scaleX: { duration: 0.9 * seconds, times: [0, 0.3, 0.55, 0.8, 1] }, scaleY: { duration: 0.9 * seconds, times: [0, 0.3, 0.55, 0.8, 1] } }}>
        {!image && <div aria-hidden className="cer-bell-fallback"><div className="cer-bell-base" /><div className="cer-bell-dome" /></div>}
        <div className="cer-bell-object">
          <span style={{ fontSize: "30cqw", lineHeight: 1 }}>{keepsake.emoji}</span>
          <span className="max-w-[48%] truncate font-bold" style={{ fontSize: "7cqw" }}>{keepsake.label}</span>
        </div>
        {image && <img src={image} alt="" draggable={false} className="absolute inset-0 h-full w-full" />}
        <span className="cer-bell-plaque" data-painted={!!image} data-testid="bell-price" style={{ fontSize: "4.8cqw" }}>{keepsake.detail}</span>
      </motion.div>
    </Anchored>
  );
}

/** Largeur du journal à son plus grand (fraction de l'écran) : 88 % de la hauteur de l'écran. */
const PAPER_BIG = 0.88 * (9 / 16) * CEREMONIE_ASPECT.journal * 1.0;

export function Journal({ keepsake }: { keepsake: PostIt }) {
  const image = ceremonieImage("journal");
  const h = journalHeadline(keepsake);
  return (
    <div className="cer-paper" data-testid="journal-paper" data-painted={!!image}>
      {image ? <img src={image} alt="" draggable={false} className="absolute inset-0 h-full w-full" /> : <div aria-hidden className="cer-paper-fallback" />}
      {/* Textes écrits par le code, posés sur les zones vides du journal peint (fractions de journal.png). */}
      <div className="cer-paper-mast" style={{ left: "17.5%", top: "6.9%", width: "65%", height: "9.6%" }}>La Une du 1er janvier</div>
      <div className="cer-paper-headline" style={{ left: "8%", top: "20.8%", width: "84%", height: "21.4%" }}>
        <span>{h.title}</span>
        {h.sub && <span className="cer-paper-choice">{h.sub}</span>}
      </div>
      <div className="cer-paper-photo" style={{ left: "7.8%", top: "42.8%", width: "84%", height: "31.4%" }}>
        <span style={{ fontSize: "17cqw", lineHeight: 1 }}>🤔</span>
        <span className="cer-paper-caption">{h.caption}</span>
      </div>
    </div>
  );
}

/**
 * Le journal arrive en tournoyant, plein écran, puis se pose à plat sur la table. Un seul élément dans le repère de la pièce :
 * dessiné en grand (net) et rétréci par `scale`, jamais agrandi. `phase` : 0 = tournoie et se lit, 1 = posé à plat.
 */
export function JournalSouvenir({ keepsake, active, phase, seconds }: { keepsake: PostIt; active: boolean; phase: 0 | 1; seconds: { spin: number; settle: number } }) {
  const { center, width, tilt } = ANCHORS.journal;
  const rest = width / PAPER_BIG;
  const toCenter = { x: `${(0.5 - center.x) * 100}cqw`, y: `${(0.5 - center.y) * 100}cqh` };
  const resting = { x: "0cqw", y: "0cqh", scale: rest, rotate: tilt, rotateX: 58, opacity: 1 };
  const reading = { ...toCenter, scale: 1, rotate: -3, rotateX: 0, opacity: 1 };
  return (
    <Anchored at={center} width={PAPER_BIG} anchor="center" data-testid="souvenir-journal">
      <motion.div data-phase={phase} style={{ transformPerspective: 2400, willChange: "transform" }}
        initial={active ? { ...toCenter, scale: 0.04, rotate: 900, rotateX: 0, opacity: 0 } : resting}
        animate={phase === 0 ? reading : resting}
        transition={phase === 0
          ? { duration: seconds.spin, ease: [0.16, 0.9, 0.3, 1], opacity: { duration: seconds.spin * 0.3 } }
          : { duration: seconds.settle, ease: [0.45, 0, 0.2, 1] }}>
        <Journal keepsake={keepsake} />
      </motion.div>
    </Anchored>
  );
}

/** Point que la caméra regarde pour chaque souvenir. */
export const SOUVENIR_FOCUS = {
  dessin: { x: ANCHORS.frame.center.x, y: ANCHORS.frame.center.y + 0.02, scale: 2.5 },
  objet: { x: ANCHORS.bell.bottom.x, y: ANCHORS.bell.bottom.y - 0.05, scale: 2.7 },
  "post-it": { x: ANCHORS.journal.center.x - 0.03, y: ANCHORS.journal.center.y - 0.02, scale: 2.7 },
} as const;

/** Un souvenir déjà installé (classement final) : posé tel quel dans le décor, sans geste. */
export function PlacedSouvenir({ keepsake }: { keepsake: Keepsake }) {
  if (keepsake.kind === "dessin") return <FrameSouvenir keepsake={keepsake} active={false} />;
  if (keepsake.kind === "objet") return <BellSouvenir keepsake={keepsake} active={false} />;
  return <JournalSouvenir keepsake={keepsake} active={false} phase={1} seconds={{ spin: 0.01, settle: 0.01 }} />;
}
