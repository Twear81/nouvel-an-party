// Le moteur couvre les bascules avec la scène de pièce : aucun second rideau côté écran.
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { isSkinId, type SkinId } from "../../shared/skins";

/** Exporté pour la galerie des animations (un skin par vignette, sans toucher au skin de la page). */
export const SkinContext = createContext<SkinId | null>(null);
export const useSkin = (): SkinId | null => useContext(SkinContext);

/** Outil de dev/captures : ?skin=<id> force le skin local ; ?skin= oublie ce choix. */
const FORCE_KEY = "skin-force";
function forcedSkin(): SkinId | null {
  try {
    const param = new URLSearchParams(window.location.search).get("skin");
    if (param !== null) {
      if (isSkinId(param)) localStorage.setItem(FORCE_KEY, param);
      else localStorage.removeItem(FORCE_KEY);
    }
    const value = localStorage.getItem(FORCE_KEY);
    return isSkinId(value) ? value : null;
  } catch { return null; }
}

export function SkinProvider({ skin: fromServer, children }: { skin: SkinId | null | undefined; children: ReactNode }) {
  const [forced] = useState(forcedSkin);
  const skin = forced ?? fromServer ?? null;
  useLayoutEffect(() => {
    if (skin) document.documentElement.dataset.skin = skin;
    else delete document.documentElement.dataset.skin;
  }, [skin]);
  return <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>;
}
