// Section « Transitions » : les scènes de la pièce sur la vraie TV (RoomTransition), avec leurs sons.
// Ouverture (lobby → premier univers), changement d'univers (de « Depuis » vers l'habillage choisi), sortie vers la cérémonie.
// Comme le serveur, le skin de la page bascule à `swapAtMs` : `useSkinDeLaPage` le calcule sur l'horloge de la galerie.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SKINS, type SkinId } from "../../src/shared/skins";
import { TRANSITION_TIMING, type TransitionInfo, type TransitionKind } from "../../src/shared/transitions";
import type { GameSnapshot } from "../../src/shared/types";
import { play } from "../../src/web/sound/engine";
import { diffSnapshots } from "../../src/web/sound/events";
import { horloge, T0 } from "./horloge";
import { snapshotDeBase } from "./instantane";
import { actionsFactices, Disposition, PhonePane, TvPane } from "./panneaux";
import type { Env, Scene } from "./types";

const NOMS: Record<SkinId, string> = {
  dofus: "Dofus", overwatch: "Overwatch", "league-of-legends": "League of Legends", "rocket-league": "Rocket League", "mario-odyssey": "Mario Odyssey", "plague-tale": "Resonance",
};

// Univers de départ du changement d'univers, choisi dans la scène et lu par l'App (skin de la page avant la bascule).
let origine: SkinId | null = null;
const abonnes = new Set<() => void>();
const choisirOrigine = (s: SkinId | null) => { origine = s; abonnes.forEach((f) => f()); };
const useOrigine = () => useSyncExternalStore((f) => (abonnes.add(f), () => abonnes.delete(f)), () => origine);

/** Écrans toujours en thème de base, quel que soit l'habillage choisi : lobby, cérémonie, classement final, minuit. */
const THEME_DE_BASE = new Set(["ecrans/lobby", "ecrans/profil", "ecrans/ceremonie", "ecrans/final", "ecrans/minuit"]);
const KIND: Record<string, TransitionKind> = { "transitions/ouverture": "opening", "transitions/univers": "skin", "transitions/sortie": "closing" };

/** Univers avant et après la scène, selon l'habillage choisi dans la barre du haut. */
function extremites(kind: TransitionKind, skin: SkinId | null, depuis: SkinId | null): { from: SkinId | null; to: SkinId | null } {
  if (kind === "opening") return { from: null, to: skin };
  if (kind === "closing") return { from: skin, to: null };
  return { from: depuis, to: skin };
}

/** Temps écoulé de la galerie, rafraîchi pendant la lecture (bascule de skin au bon instant, même au curseur). */
function useEcoule(actif: boolean): number {
  const [ms, setMs] = useState(() => horloge.ecoule());
  useEffect(() => {
    if (!actif) return;
    let id = 0;
    const tick = () => { setMs(horloge.ecoule()); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [actif]);
  return ms;
}

/** Skin à appliquer à toute la page : celui de la barre du haut, sauf pendant une transition (bascule à `swapAtMs`). */
export function useSkinDeLaPage(sceneId: string, skin: SkinId | null): SkinId | null {
  const kind = KIND[sceneId];
  const depuis = useOrigine();
  const ms = useEcoule(kind !== undefined);
  // Début et fin de partie toujours en thème de base (docs/skins.md) ; minuit aussi.
  if (THEME_DE_BASE.has(sceneId)) return null;
  if (!kind) return skin;
  const { from, to } = extremites(kind, skin, depuis);
  return ms >= TRANSITION_TIMING[kind].swapAtMs ? to : from;
}

function SceneTransition({ env, kind }: { env: Env; kind: TransitionKind }) {
  const depuis = useOrigine();
  const { from, to } = extremites(kind, env.skin, depuis);
  const duree = TRANSITION_TIMING[kind].durationMs;
  const ms = useEcoule(true);
  const skinCourant = ms >= TRANSITION_TIMING[kind].swapAtMs ? to : from;
  const transition = useMemo<TransitionInfo>(() => ({
    kind, fromSkin: from, toSkin: to, startedAt: T0, durationMs: duree, pausedMs: 0, pausedSince: null,
    playerIds: env.joueurs.map((p) => p.id), spotlightPlayerId: env.joueurs[1]?.id ?? env.joueurs[0]?.id ?? null,
  }), [kind, from, to, duree, env.joueurs]);
  const snapshot = useMemo<GameSnapshot>(() => ({
    ...snapshotDeBase("transition", { joueurs: env.joueurs, skin: skinCourant, paused: env.pause }), transition,
  }), [env.joueurs, skinCourant, env.pause, transition]);
  const { definirDuree, depart } = env;
  useEffect(() => definirDuree(duree + 800), [duree, definirDuree]);
  // Sons d'arrivée de la scène, comme au vrai changement de phase (seulement en partant du début).
  useEffect(() => {
    if (depart !== 0) return;
    const avant: GameSnapshot = { ...snapshot, phase: kind === "opening" ? "lobby" : kind === "closing" ? "results" : "results", transition: null };
    for (const appel of diffSnapshots(avant, snapshot)) play(appel.nom, appel.options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const joueur = env.joueurs[0]!;
  return (
    <>
      <Disposition
        tv={(echelle) => <TvPane snapshot={snapshot} echelle={echelle} />}
        telephones={[<PhonePane key="t" snapshot={{ ...snapshot, me: { id: joueur.id, private: null, inRound: true } }} joueurId={joueur.id} actions={actionsFactices()} taille={env.taillePhone} etiquette={`Téléphone de ${joueur.profile!.name}`} />]}
      />
      {kind === "skin" && (
        <div className="ga-actions">
          <label>Depuis{" "}
            <select data-testid="ga-transition-depuis" value={depuis ?? ""} onChange={(e) => choisirOrigine((e.currentTarget.value || null) as SkinId | null)}>
              <option value="">Thème de base</option>
              {SKINS.map((s) => <option key={s} value={s}>{NOMS[s]}</option>)}
            </select>
          </label>
          <span>→ vers l'habillage choisi en haut : {env.skin ? NOMS[env.skin] : "thème de base"}</span>
        </div>
      )}
    </>
  );
}

export const SCENES_TRANSITIONS: Scene[] = [
  { id: "transitions/ouverture", section: "transitions", titre: "Ouverture de la pièce", aide: "Du lobby à la pièce, les invités s'installent, puis plongée dans la TV vers l'habillage choisi.", Composant: ({ env }) => <SceneTransition env={env} kind="opening" /> },
  { id: "transitions/univers", section: "transitions", titre: "Changement d'univers", aide: "La scène propre à l'habillage choisi en haut ; « Depuis » règle l'univers de départ.", Composant: ({ env }) => <SceneTransition env={env} kind="skin" /> },
  { id: "transitions/sortie", section: "transitions", titre: "Sortie vers la cérémonie", aide: "Après la dernière manche : sortie de la TV et retour dans la pièce.", Composant: ({ env }) => <SceneTransition env={env} kind="closing" /> },
];
