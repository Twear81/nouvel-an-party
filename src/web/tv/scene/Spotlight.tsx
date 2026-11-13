// Projecteur : le faisceau peint (`projecteur.png`, remplaçant : un cône dégradé) saute de portrait en portrait en ralentissant.
// Une seule animation de transform ; pas de mélange de couches. `seats` : position (fraction de la pièce) de chaque portrait.
import { motion } from "motion/react";
import { ceremonieImage } from "../../theme/ceremonie-assets";
import { spotlightTimes } from "./spotlight";

/** Hauteur du faisceau (fraction de la hauteur de l'écran) ; son pied touche le sol sous le portrait. */
const BEAM_H = 0.95;
/** Le pied du faisceau (flaque de lumière, à 91 % de l'image) tombe aux pieds du portrait. */
const FOOT = 0.135;
/** Largeur : la flaque éclaire un portrait, pas ses voisins (l'image est resserrée, pas la hauteur). */
const BEAM_W_CQH = 0.3 * 100;

const beamBox = { height: `${BEAM_H * 100}cqh`, width: `${BEAM_W_CQH}cqh`, marginLeft: `${-BEAM_W_CQH / 2}cqh` };

const beamImage = () => {
  const src = ceremonieImage("projecteur");
  return src ? <img src={src} alt="" draggable={false} className="h-full w-full" /> : <div aria-hidden className="cer-beam-fallback" />;
};

const at = (seat: { x: number; y: number }) => ({ x: `${seat.x * 100}cqw`, y: `${(seat.y + FOOT - BEAM_H) * 100}cqh` });

/** Faisceau qui parcourt `path` (indices de `seats`) en `seconds`. Un chemin d'un seul point = faisceau posé. */
export function Spotlight({ seats, path, seconds, partner }: { seats: { x: number; y: number }[]; path: number[]; seconds: number; partner?: number }) {
  const points = path.map((i) => at(seats[i] ?? seats[0]!));
  const still = points.length <= 1;
  // Chaque saut : on reste, puis on file d'un coup au portrait suivant (« saute »), l'écart grandit.
  const times = spotlightTimes(points.length);
  const frames = { x: points.map((p) => p.x), y: points.map((p) => p.y) };
  return (
    <>
      <motion.div data-testid="spotlight" data-target={path.at(-1)} className="cer-beam-wrap absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <motion.div className="cer-beam" style={{ ...beamBox, ...(still ? { x: points[0]!.x, y: points[0]!.y } : {}) }}
          initial={still ? false : { x: points[0]!.x, y: points[0]!.y }}
          animate={still ? undefined : frames}
          transition={{ duration: seconds, times, ease: "easeInOut" }}>
          {beamImage()}
        </motion.div>
      </motion.div>
      {partner !== undefined && seats[partner] && (
        <motion.div data-testid="spotlight-partner" className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: still ? 0.15 : seconds, duration: 0.4 }}>
          <div className="cer-beam" style={{ ...beamBox, transform: `translate(${at(seats[partner]!).x}, ${at(seats[partner]!).y})` }}>{beamImage()}</div>
        </motion.div>
      )}
    </>
  );
}
