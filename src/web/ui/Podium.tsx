// Podium du classement final : l'image peinte monte devant la cheminée (remplaçant : trois blocs). Les portraits du 3e et du
// 2e se posent sur leurs blocs ; le bloc du milieu, le plus haut, porte le « 1 » : le 1er apparaît dans l'écran de la télévision.
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { ceremonieImage, PODIUM_SLOTS } from "../theme/ceremonie-assets";

export function Podium({ riseSeconds, onFirstBlock, children, lit }: {
  riseSeconds: number;
  /** Le 1er est révélé : son bloc brille. */
  lit: boolean;
  onFirstBlock?: ReactNode;
  /** Portraits des places (`PodiumSlot`). */
  children?: ReactNode;
}) {
  const image = ceremonieImage("podium");
  return (
    <motion.div data-testid="podium" className="cer-podium" initial={{ y: "45%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", duration: riseSeconds, bounce: 0.18 }}>
      {image ? <img src={image} alt="" draggable={false} className="cer-podium-img" /> : (
        <div aria-hidden className="cer-podium-fallback">
          <div className="cer-podium-block" style={{ left: `${(PODIUM_SLOTS.second.x - 0.155) * 100}%`, top: `${PODIUM_SLOTS.second.feet * 100}%` }}></div>
          <div className="cer-podium-block" data-lit={lit} style={{ left: `${(PODIUM_SLOTS.first.x - 0.155) * 100}%`, top: `${PODIUM_SLOTS.first.feet * 100}%`, ...(lit ? { boxShadow: "0 0 2.4rem var(--color-accent)" } : {}) }}></div>
          <div className="cer-podium-block" style={{ left: `${(PODIUM_SLOTS.third.x - 0.155) * 100}%`, top: `${PODIUM_SLOTS.third.feet * 100}%` }}></div>
        </div>
      )}
      {/* Les chiffres sont écrits par le code (les faces des blocs peints sont vides). */}
      {(["second", "first", "third"] as const).map((place, i) => (
        <span key={place} data-testid={`podium-block-${place === "first" ? 1 : place === "second" ? 2 : 3}`} data-lit={place === "first" ? lit : undefined}
          className="cer-podium-number" style={{ left: `${PODIUM_SLOTS[place].x * 100}%`, top: `${PODIUM_SLOTS[place].number * 100}%` }}>{[2, 1, 3][i]}</span>
      ))}
      {onFirstBlock}
      {children}
    </motion.div>
  );
}

export function PodiumSlot({ place, children }: { place: "second" | "first" | "third"; children: ReactNode }) {
  const slot = PODIUM_SLOTS[place];
  return <div className="cer-podium-slot" style={{ left: `${slot.x * 100}%`, top: `${slot.feet * 100}%` }}>{children}</div>;
}
