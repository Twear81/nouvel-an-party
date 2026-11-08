// Skin courant (docs/skins.md) : le serveur l'envoie dans `GameSnapshot.skin`, ce fournisseur le pose sur
// `<html data-skin>` (les fichiers de src/web/theme/skins/ s'y accrochent) et le donne aux composants à variante de
// structure (`useSkin()` : chrono, fond). Un changement de skin joue le rideau `SkinTransition` : le skin bascule
// quand l'écran est entièrement couvert.
import { motion } from "motion/react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { SkinId } from "../../shared/skins";

const SkinContext = createContext<SkinId | null>(null);

/** Skin affiché en ce moment (null tant que le serveur n'en a pas annoncé : rendu par défaut du thème). */
export const useSkin = (): SkinId | null => useContext(SkinContext);

/** Un volet couvre l'écran puis le découvre en `VOLET_S` ; les 6 volets se décalent de `VOLET_STAGGER_S` (total ~0,77 s). */
const VOLET_S = 0.62;
const VOLETS = 6;
const VOLET_STAGGER_S = 0.03;
const TOTAL_S = VOLET_S + (VOLETS - 1) * VOLET_STAGGER_S;
/** Instant où tous les volets couvrent l'écran : le skin bascule là. */
const SWAP_S = (VOLETS - 1) * VOLET_STAGGER_S + VOLET_S * 0.5;
const prefersReducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Rideau neutre : 6 volets qui balaient l'écran de gauche à droite puis se retirent par la droite.
 * Pas de texte. Monté par `SkinProvider` le temps du rideau.
 */
export function SkinTransition() {
  return (
    <div data-ui="skin-transition" aria-hidden className="pointer-events-none fixed inset-0 z-[100] grid grid-rows-6 overflow-hidden">
      {Array.from({ length: VOLETS }, (_, i) => (
        <motion.i
          key={i}
          className="block bg-curtain"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: [0, 1, 1, 0], originX: [0, 0, 1, 1] }}
          transition={{ duration: VOLET_S, delay: i * VOLET_STAGGER_S, times: [0, 0.45, 0.55, 1], ease: [0.7, 0, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/** `skin` : celui du snapshot (undefined tant que la connexion n'est pas établie). */
export function SkinProvider({ skin, children }: { skin: SkinId | undefined; children: ReactNode }) {
  // Skin réellement affiché : suit `skin` immédiatement la première fois (pas de rideau), puis au milieu du rideau.
  const [shown, setShown] = useState<SkinId | null>(skin ?? null);
  const [curtain, setCurtain] = useState(0); // incrémenté à chaque rideau (clé de remontage)
  const [running, setRunning] = useState(false);
  const target = useRef(skin ?? null);
  target.current = skin ?? null;

  useEffect(() => {
    if (!skin || skin === shown) {
      setRunning(false);
      return;
    }
    if (shown === null || prefersReducedMotion()) {
      setShown(skin);
      return;
    }
    setCurtain((n) => n + 1);
    setRunning(true);
    const swap = setTimeout(() => setShown(target.current), SWAP_S * 1000);
    const end = setTimeout(() => setRunning(false), TOTAL_S * 1000 + 60);
    return () => {
      clearTimeout(swap);
      clearTimeout(end);
    };
    // `shown` volontairement hors dépendances : le rideau en cours ne doit pas être relancé par sa propre bascule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skin]);

  useLayoutEffect(() => {
    if (shown) document.documentElement.dataset.skin = shown;
    else delete document.documentElement.dataset.skin;
  }, [shown]);

  return (
    <SkinContext.Provider value={shown}>
      {children}
      {running && <SkinTransition key={curtain} />}
    </SkinContext.Provider>
  );
}
