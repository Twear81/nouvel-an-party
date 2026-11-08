// Le compteur géant de la TV : choisit le design tiré par le serveur et le redessine à chaque image d'écran.
// Calé sur l'heure serveur (pas sur le moment où la page a reçu les données) et déterministe (graine du serveur).
import { useEffect, useState, type ComponentType } from "react";
import { serverNow } from "../../web/net/socket";
import { chaosAt, shownMs, type DesignProps } from "./chaos";
import { Coupe } from "./designs/Coupe";
import { Digital } from "./designs/Digital";
import { Horloge } from "./designs/Horloge";
import { Meche } from "./designs/Meche";
import { Minuit } from "./designs/Minuit";
import type { DesignId, Pub } from "./game";

export const DESIGNS: Record<DesignId, ComponentType<DesignProps>> = {
  digital: Digital,
  horloge: Horloge,
  meche: Meche,
  coupe: Coupe,
  minuit: Minuit,
};

/** Rafraîchit à chaque image d'écran tant que `on` est vrai. */
export function useFrame(on: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function loop() {
      setN((n) => n + 1);
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

export function Counter({ pub }: { pub: Pub }) {
  const running = pub.phase === "running" && pub.startedAt !== null;
  useFrame(running);
  if (!running) return null;
  const elapsedMs = Math.max(0, serverNow() - pub.startedAt!);
  const chaos = chaosAt(elapsedMs, pub.visible * 1000, pub.seed);
  const shown = shownMs(elapsedMs, chaos, pub.cible);
  const Design = DESIGNS[pub.design];
  return (
    <div data-testid="tv-counter" data-design={pub.design} data-mode={chaos.mode === "clear" ? "clear" : "chaos"} className="flex items-center justify-center">
      <Design elapsedMs={elapsedMs} cible={pub.cible} chaos={chaos} shown={shown} />
    </div>
  );
}
