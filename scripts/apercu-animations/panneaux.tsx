// Cadres de la galerie : la TV en 1920×1080 mise à l'échelle, les téléphones, et les vignettes isolées dans une iframe.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GameSnapshot, PlayerId } from "../../src/shared/types";
import type { SkinId } from "../../src/shared/skins";
import { SkinContext } from "../../src/web/theme/skin";
import { PhoneScreen } from "../../src/web/phone/PhoneApp";
import { TvScreens } from "../../src/web/tv/TvApp";
import type { GameActions } from "../../src/web/net/useGame";
import { PausedOverlay, PhoneStage, TvStage } from "../../src/web/ui";

/** Largeur disponible (px) d'un élément, mise à jour quand la fenêtre change. */
export function useLargeur<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [largeur, setLargeur] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mesurer = () => setLargeur(el.clientWidth);
    mesurer();
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, largeur];
}

export function actionsFactices(extra: Partial<GameActions> = {}): GameActions {
  const ok = async () => {};
  return { setup: ok, start: ok, resumeSave: ok, skip: ok, pause: ok, resume: ok, addTime: ok, kick: ok, lobby: ok, setProfile: ok, input: ok, continue: ok, ...extra };
}

/** La TV : soit l'aiguillage réel des écrans (`TvScreens`) pour un snapshot, soit un contenu libre posé sur le décor de la TV. */
export function TvPane({ snapshot, actions, echelle, children }: { snapshot?: GameSnapshot; actions?: GameActions; echelle: number; children?: ReactNode }) {
  return (
    <div className="ga-tv" data-testid="ga-tv" style={{ width: 1920 * echelle, height: 1080 * echelle }}>
      <div className="ga-tv-box" style={{ transform: `scale(${echelle})` }}>
        {snapshot ? <TvScreens game={{ snapshot, connected: true, host: true, actions: actions ?? actionsFactices() }} /> : <TvStage>{children}</TvStage>}
      </div>
    </div>
  );
}

export type TaillePhone = "390x844" | "360x640";
const DIMENSIONS: Record<TaillePhone, [number, number]> = { "390x844": [390, 844], "360x640": [360, 640] };
export const echellePhone = 0.55;

/** Un téléphone : `PhoneScreen` réel dans son cadre portrait. */
export function PhonePane({ snapshot, joueurId, actions, taille, etiquette, echelle = echellePhone }: {
  snapshot: GameSnapshot;
  joueurId: PlayerId;
  actions: GameActions;
  taille: TaillePhone;
  etiquette: string;
  echelle?: number;
}) {
  const [l, h] = DIMENSIONS[taille];
  const moi = snapshot.players.find((p) => p.id === joueurId);
  return (
    <figure className="ga-phone-figure" data-testid={`ga-phone-${joueurId}`}>
      <div className="ga-phone" style={{ width: l * echelle, height: h * echelle }}>
        <div className="ga-phone-box" style={{ width: l, height: h, transform: `scale(${echelle})` }}>
          {moi && (
            <PhoneStage phase={snapshot.phase}>
              <PhoneScreen snapshot={snapshot} me={moi} actions={actions} onEdit={() => {}} />
              <PausedOverlay show={snapshot.paused} />
            </PhoneStage>
          )}
        </div>
      </div>
      <figcaption>{etiquette}</figcaption>
    </figure>
  );
}

/** TV à gauche, un ou deux téléphones à droite, le tout à la largeur de la zone de scène. */
export function Disposition({ tv, telephones }: { tv: (echelle: number) => ReactNode; telephones?: ReactNode[] }) {
  const [ref, largeur] = useLargeur<HTMLDivElement>();
  const nb = telephones?.length ?? 0;
  const colonne = nb > 0 ? 390 * echellePhone + 24 : 0;
  const echelle = Math.max(0.2, Math.min(1, (largeur - colonne - (nb > 0 ? 20 : 0)) / 1920));
  return (
    <div ref={ref} className="ga-disposition">
      {largeur > 0 && (
        <>
          <div className="ga-disposition-tv">{tv(echelle)}</div>
          {nb > 0 && <div className="ga-disposition-tels">{telephones}</div>}
        </>
      )}
    </div>
  );
}

const DOC_VIGNETTE = "<!doctype html><html data-app=\"tv\"><head><meta charset=\"utf-8\"></head><body></body></html>";

/**
 * Isole un composant dans une iframe pour lui donner son propre skin : les habillages s'écrivent en `html[data-skin=…]`,
 * deux skins ne peuvent donc pas cohabiter dans la même page. La feuille de style de la galerie est copiée dans l'iframe.
 */
export function Vignette({ skin, titre, children, largeur = 600, hauteur = 190 }: { skin: SkinId | null; titre: string; children: ReactNode; largeur?: number; hauteur?: number }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [racine, setRacine] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = iframe.current;
    if (!el) return;
    const monter = () => {
      const doc = el.contentDocument;
      if (!doc?.body || doc.body.dataset.pret) return;
      doc.body.dataset.pret = "1";
      document.head.querySelectorAll("style").forEach((style) => doc.head.appendChild(style.cloneNode(true)));
      if (skin) doc.documentElement.dataset.skin = skin;
      doc.documentElement.style.fontSize = "16px";
      const reglage = doc.createElement("style");
      reglage.textContent = "html,body{margin:0;height:100%;overflow:hidden} body{display:grid;place-items:center;background:var(--gradient-bg,var(--color-bg))} .zone-boite{outline:2px dashed #ff3b3b;outline-offset:0;display:inline-block}";
      doc.head.appendChild(reglage);
      const conteneur = doc.createElement("div");
      doc.body.appendChild(conteneur);
      setRacine(conteneur);
    };
    el.addEventListener("load", monter);
    monter();
    return () => el.removeEventListener("load", monter);
  }, [skin]);

  return (
    <figure className="ga-vignette" data-testid={`ga-vignette-${skin ?? "base"}`}>
      <iframe ref={iframe} srcDoc={DOC_VIGNETTE} title={titre} width={largeur} height={hauteur} />
      <figcaption>{titre}</figcaption>
      {racine && createPortal(<SkinContext.Provider value={skin}>{children}</SkinContext.Provider>, racine)}
    </figure>
  );
}
