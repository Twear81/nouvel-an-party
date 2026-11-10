// Galerie de conception : les vrais composants du jeu, avec une horloge locale et aucun serveur.
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { GameSnapshot } from "../src/shared/types";
import { TRANSITION_TIMING, transitionElapsed, type TransitionInfo } from "../src/shared/transitions";
import type { SkinId } from "../src/shared/skins";
import { serverNow } from "../src/web/net/socket";
import { SkinProvider } from "../src/web/theme/skin";
import { RoomTransition } from "../src/web/ui/RoomTransition";
import { Panel } from "../src/web/ui/Panel";
import { Button } from "../src/web/ui/Button";
import "../src/web/theme/theme.css";
import "../docs/maquettes/transitions.css";

const UNIVERS: { id: SkinId; nom: string; description: string }[] = [
  { id: "dofus", nom: "Dofus", description: "Une grille se dessine sur le tapis, un œuf magique vert apparaît sur la table et lance des étincelles." },
  { id: "overwatch", nom: "Overwatch", description: "La TV projette un hologramme : cible orange, hexagones et balayage du salon." },
  { id: "league-of-legends", nom: "League of Legends", description: "Un portail hextech bleu et doré s’ouvre, avec anneaux et runes autour de la table." },
  { id: "rocket-league", nom: "Rocket League", description: "Une Octane bleue arrive en boost, saute et frappe le gros ballon de Rocket League qui file dans la TV : explosion de but bleue et orange, puis la caméra plonge dans l’écran." },
  { id: "mario-odyssey", nom: "Mario Odyssey", description: "Une casquette rouge à yeux file en arc vers la TV, accompagnée de pièces dorées." },
  { id: "plague-tale", nom: "Resonance", description: "La Macula se ramifie depuis la cheminée et la TV, avec des pulsations ambrées dans la pièce." },
];
const DUREE = TRANSITION_TIMING.skin.durationMs;

function sceneLocale(skin: SkinId, elapsed = 0, paused = true): TransitionInfo {
  const now = serverNow();
  return { kind: "skin", fromSkin: null, toSkin: skin, startedAt: now - elapsed,
    durationMs: DUREE, pausedMs: 0, pausedSince: paused ? now : null, playerIds: [] };
}

function Galerie() {
  const [choix, setChoix] = useState(0);
  const [scene, setScene] = useState(() => sceneLocale(UNIVERS[0]!.id));
  const [elapsed, setElapsed] = useState(0);
  const [lecture, setLecture] = useState(false);
  const sceneCourante = useRef(scene);
  sceneCourante.current = scene;
  const univers = UNIVERS[choix]!;
  const termine = elapsed >= DUREE;
  const skin = elapsed >= TRANSITION_TIMING.skin.swapAtMs ? scene.toSkin : scene.fromSkin;
  const snapshot = useMemo<GameSnapshot>(() => ({
    title: "Galerie des transitions", phase: "transition", paused: scene.pausedSince !== null,
    finalReveal: null, transition: scene, players: [], round: null, continued: [], catalog: [],
    setup: { counts: {} }, resumable: null, joinUrl: "", skin, me: null,
  }), [scene, skin]);

  useEffect(() => {
    if (!lecture) return;
    let frame: number;
    const tick = () => {
      const position = transitionElapsed(sceneCourante.current, serverNow());
      setElapsed(position);
      if (position >= DUREE) setLecture(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lecture, scene]);

  function ouvrir(index: number, position = 0, lancer = true) {
    setChoix(index);
    setElapsed(position);
    setScene(sceneLocale(UNIVERS[index]!.id, position, !lancer));
    setLecture(lancer && position < DUREE);
  }
  function basculerPause() {
    const position = transitionElapsed(sceneCourante.current, serverNow());
    ouvrir(choix, position, !lecture);
  }

  return (
    <SkinProvider skin={skin}>
      <main className="galerie" data-testid="transition-gallery" data-active-skin={univers.id}
        data-status={termine ? "complete" : lecture ? "playing" : "paused"}>
        <header className="galerie-entete">
          <div>
            <h1 className="galerie-titre">Les six transitions de la pièce</h1>
            <p className="galerie-statut">Propositions à valider · Sans son</p>
          </div>
          <div className="galerie-lecture">
            <button type="button" data-testid="gallery-play" onClick={() => ouvrir(choix)}>{elapsed > 0 ? "Rejouer" : "Lire"}</button>
            <button type="button" data-testid="gallery-pause" onClick={basculerPause} disabled={termine || elapsed === 0 && !lecture}>
              {lecture ? "Pause" : "Reprendre"}
            </button>
          </div>
        </header>
        <nav className="galerie-univers" aria-label="Univers à regarder">
          {UNIVERS.map((item, index) => <button type="button" key={item.id} aria-pressed={choix === index}
            data-testid={`gallery-skin-${item.id}`} onClick={() => ouvrir(index)}>{item.nom}</button>)}
        </nav>
        <div className="galerie-cadre">
          <div className="galerie-scene" data-testid="gallery-stage">
            {termine ? (
              <div className="galerie-destination" data-testid="gallery-destination">
                <Panel className="galerie-panneau" title="Univers suivant">
                  <p className="galerie-nom-destination font-display">{univers.nom}</p>
                  <Button size="lg" data-testid="gallery-replay" onClick={() => ouvrir(choix)}>Rejouer</Button>
                </Panel>
              </div>
            ) : <RoomTransition snapshot={snapshot} />}
          </div>
        </div>
        <footer className="galerie-pied">
          <div className="galerie-legende"><strong>{univers.nom}</strong><span>{univers.description}</span></div>
          <label className="galerie-progression">
            <span>Progression</span>
            <input type="range" min="0" max={DUREE} step="10" value={Math.round(elapsed)}
              data-testid="gallery-progress" aria-label="Progression de la transition"
              onChange={(event) => ouvrir(choix, Number(event.currentTarget.value), false)} />
            <output>{(elapsed / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / {DUREE / 1000} s</output>
          </label>
        </footer>
      </main>
    </SkinProvider>
  );
}

document.documentElement.dataset.app = "tv";
createRoot(document.getElementById("galerie")!).render(<Galerie />);
