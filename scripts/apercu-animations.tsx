// Galerie des animations : les vrais écrans du jeu (TV et téléphones), des snapshots de démonstration, une horloge locale.
// Aucun serveur, aucun accès réseau. Construite par `bun run apercu:animations` (scripts/construire-apercu-animations.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SKINS, type SkinId } from "../src/shared/skins";
import { sound } from "../src/web/sound/engine";
import { SkinProvider } from "../src/web/theme/skin";
import { useSoundState } from "../src/web/ui";
import "../src/web/theme/theme.css";
import "./apercu-animations/galerie.css";
import { horloge } from "./apercu-animations/horloge";
import { creerJoueurs, type NombreJoueurs } from "./apercu-animations/joueurs";
import type { TaillePhone } from "./apercu-animations/panneaux";
import { SCENES_COMPOSANTS } from "./apercu-animations/scenes-composants";
import { SCENES_CEREMONIE } from "./apercu-animations/scenes-ceremonie";
import { SCENES_PROFIL } from "./apercu-animations/scenes-profil";
import { SCENES_TRANSITIONS, useSkinDeLaPage } from "./apercu-animations/scenes-transitions";
import { SCENES_CHRONO, SCENES_ECRANS } from "./apercu-animations/scenes-ecrans";
import { scenesDesJeux } from "./apercu-animations/scenes-jeux";
import { SCENES_VALIDATION } from "./apercu-animations/scenes-validation";
import type { Env, Scene } from "./apercu-animations/types";

// Le moteur de sons interroge le serveur de médias de l'organisateur ; ici il n'y en a pas : réponse vide, sans requête réseau.
const fetchReel = window.fetch.bind(window);
window.fetch = ((entree: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree.url;
  return url.startsWith("/medias") ? Promise.resolve(new Response(null, { status: 404 })) : fetchReel(entree, init);
}) as typeof fetch;

const SCENES: Scene[] = [...SCENES_COMPOSANTS, ...SCENES_CHRONO, ...SCENES_ECRANS, ...SCENES_PROFIL, ...SCENES_CEREMONIE, ...SCENES_VALIDATION, ...SCENES_TRANSITIONS, ...scenesDesJeux()];
const SECTIONS: { id: Scene["section"]; titre: string }[] = [
  { id: "composants", titre: "Composants" },
  { id: "chrono", titre: "Chrono" },
  { id: "ecrans", titre: "Écrans TV" },
  { id: "transitions", titre: "Transitions" },
  { id: "jeux", titre: "Mini-jeux" },
];
const NOMS_SKINS: Record<SkinId, string> = {
  dofus: "Dofus", overwatch: "Overwatch", "league-of-legends": "League of Legends", "rocket-league": "Rocket League", "mario-odyssey": "Mario Odyssey", "plague-tale": "Resonance",
};

/** Réglages dans l'adresse (#scene=…&skin=…&n=8&tel=360x640) : un lien ouvre la galerie sur une scène précise. */
function lireAdresse() {
  const p = new URLSearchParams(location.hash.slice(1));
  const skin = p.get("skin");
  return {
    scene: SCENES.some((s) => s.id === p.get("scene")) ? p.get("scene")! : SCENES[0]!.id,
    skin: (SKINS as readonly string[]).includes(skin ?? "") ? (skin as SkinId) : null,
    nombre: (p.get("n") === "8" ? 8 : 3) as NombreJoueurs,
    tel: (p.get("tel") === "360x640" ? "360x640" : "390x844") as TaillePhone,
  };
}

function BoutonSon() {
  const etat = useSoundState();
  const libelle = etat === "locked" ? "🔇 Activer le son (clic)" : etat === "on" ? "🔊 Son activé" : "🔇 Son coupé";
  return (
    <button type="button" data-testid="ga-son" data-sound={etat} onClick={() => { if (etat === "on") sound.setMuted(true); else if (etat === "muted") sound.setMuted(false); }}>
      {libelle}
    </button>
  );
}

function formater(ms: number) {
  return (ms / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function Galerie() {
  const depart = useMemo(lireAdresse, []);
  const [sceneId, setSceneId] = useState(depart.scene);
  const [skin, setSkin] = useState<SkinId | null>(depart.skin);
  const [nombre, setNombre] = useState<NombreJoueurs>(depart.nombre);
  const [taillePhone, setTaillePhone] = useState<TaillePhone>(depart.tel);
  const [lecture, setLecture] = useState(true);
  const [pauseUtilisateur, setPauseUtilisateur] = useState(false);
  const [run, setRun] = useState(0);
  const [positionDepart, setPositionDepart] = useState(0);
  const [duree, setDuree] = useState<number | null>(null);
  const [ecoule, setEcoule] = useState(0);
  const skinPage = useSkinDeLaPage(sceneId, skin);

  const scene = SCENES.find((s) => s.id === sceneId)!;
  const joueurs = useMemo(() => creerJoueurs(nombre), [nombre]);

  const demarrer = useCallback((position: number, enMarche: boolean) => {
    horloge.placer(position);
    if (enMarche) horloge.lire();
    else horloge.figer();
    setPositionDepart(position);
    setEcoule(position);
    setLecture(enMarche);
    setPauseUtilisateur(false);
    setRun((r) => r + 1);
  }, []);

  // Changer de scène ou de nombre de joueurs repart du début, en lecture (dans le même rendu : pas de double montage).
  const choisirScene = useCallback((id: string) => {
    setSceneId(id);
    setDuree(null);
    demarrer(0, true);
  }, [demarrer]);
  const choisirNombre = useCallback((n: NombreJoueurs) => {
    setNombre(n);
    setDuree(null);
    demarrer(0, true);
  }, [demarrer]);

  useEffect(() => {
    history.replaceState(null, "", `#scene=${sceneId}${skin ? `&skin=${skin}` : ""}&n=${nombre}&tel=${taillePhone}`);
  }, [sceneId, skin, nombre, taillePhone]);

  // Les liens de revue et les boutons précédent/suivant fonctionnent sans recharger le fichier autonome.
  useEffect(() => {
    const suivreAdresse = () => {
      const adresse = lireAdresse();
      setSceneId(adresse.scene);
      setSkin(adresse.skin);
      setNombre(adresse.nombre);
      setTaillePhone(adresse.tel);
      setDuree(null);
      demarrer(0, true);
    };
    window.addEventListener("hashchange", suivreAdresse);
    return () => window.removeEventListener("hashchange", suivreAdresse);
  }, [demarrer]);

  const fini = duree !== null && ecoule >= duree;
  useEffect(() => {
    const id = setInterval(() => {
      const t = horloge.ecoule();
      setEcoule(t);
      if (duree !== null && t >= duree && horloge.enMarche()) {
        horloge.placer(duree);
        horloge.figer();
        setLecture(false);
      }
    }, 100);
    return () => clearInterval(id);
  }, [duree]);

  const basculer = useCallback(() => {
    if (horloge.enMarche()) {
      horloge.figer();
      setLecture(false);
      setPauseUtilisateur(true);
    } else {
      horloge.lire();
      setLecture(true);
      setPauseUtilisateur(false);
    }
  }, []);
  const basculerRef = useRef(basculer);
  basculerRef.current = basculer;
  const basculerStable = useCallback(() => basculerRef.current(), []);

  const env: Env = {
    joueurs, nombre, skin, pause: pauseUtilisateur, depart: positionDepart, taillePhone,
    basculerPause: basculerStable,
    definirDuree: setDuree,
  };

  const statut = fini ? "complete" : lecture ? "playing" : "paused";
  return (
    <SkinProvider skin={skinPage}>
      <div className="ga" data-testid="animation-gallery" data-scene={sceneId} data-status={statut} data-section={scene.section}>
        <nav className="ga-menu" aria-label="Scènes">
          <div className="ga-titre">Galerie des animations</div>
          {SECTIONS.map((section) => {
            const scenes = SCENES.filter((s) => s.section === section.id);
            const groupes = [...new Set(scenes.map((s) => s.groupe ?? ""))];
            return (
              <div key={section.id} className="ga-section">
                <div className="ga-section-titre">{section.titre}</div>
                {groupes.map((groupe) => {
                  const liste = scenes.filter((s) => (s.groupe ?? "") === groupe);
                  const ouvert = !groupe || liste.some((s) => s.id === sceneId);
                  return (
                    <div key={groupe} className="ga-groupe">
                      {groupe && (
                        <button type="button" className="ga-groupe-titre" aria-expanded={ouvert} data-testid={`ga-groupe-${liste[0]!.id.split("/")[1]}`} onClick={() => choisirScene(liste[0]!.id)}>
                          {groupe}
                        </button>
                      )}
                      {ouvert && liste.map((s) => (
                        <button key={s.id} type="button" className="ga-scene" aria-pressed={s.id === sceneId} data-testid={`ga-scene-${s.id}`} onClick={() => choisirScene(s.id)}>
                          {s.titre}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <header className="ga-barre">
          <div className="ga-barre-ligne">
            <div className="ga-legende">
              <b data-testid="ga-titre-scene">{scene.groupe ? `${scene.groupe} · ` : ""}{scene.titre}</b>
              {scene.aide && <span>{scene.aide}</span>}
            </div>
            <div className="ga-groupe-boutons">
              <button type="button" data-testid="ga-lecture" onClick={basculer} disabled={fini}>{lecture ? "⏸ Pause" : "▶ Lecture"}</button>
              <button type="button" data-testid="ga-rejouer" onClick={() => demarrer(0, true)}>↻ Rejouer</button>
              <BoutonSon />
            </div>
          </div>
          <div className="ga-barre-ligne">
            <label className="ga-champ">Habillage
              <select data-testid="ga-skin" value={skin ?? ""} onChange={(e) => setSkin((e.target.value || null) as SkinId | null)}>
                <option value="">Thème de base</option>
                {SKINS.map((s) => <option key={s} value={s}>{NOMS_SKINS[s]}</option>)}
              </select>
            </label>
            <div className="ga-groupe-boutons" role="group" aria-label="Joueurs">
              {([3, 8] as const).map((n) => (
                <button key={n} type="button" aria-pressed={nombre === n} data-testid={`ga-joueurs-${n}`} onClick={() => choisirNombre(n)}>{n === 3 ? "3 joueurs" : "8 joueurs (16 car.)"}</button>
              ))}
            </div>
            <div className="ga-groupe-boutons" role="group" aria-label="Téléphone">
              {(["390x844", "360x640"] as const).map((t) => (
                <button key={t} type="button" aria-pressed={taillePhone === t} data-testid={`ga-tel-${t}`} onClick={() => setTaillePhone(t)}>{t.replace("x", "×")}</button>
              ))}
            </div>
            {duree !== null && (
              <label className="ga-curseur">
                <input type="range" min={0} max={duree} step={50} value={Math.min(Math.round(ecoule), duree)} data-testid="ga-curseur"
                  onChange={(e) => demarrer(Number(e.currentTarget.value), lecture && !fini)} aria-label="Position dans l'animation" />
                <output>{formater(Math.min(ecoule, duree))} / {formater(duree)} s</output>
              </label>
            )}
          </div>
        </header>

        <main className={`ga-scene-zone ${lecture ? "" : "ga-fige"}`} data-testid="ga-zone">
          <scene.Composant key={`${scene.id}|${run}|${nombre}`} env={env} />
        </main>
      </div>
    </SkinProvider>
  );
}

document.documentElement.dataset.app = "tv";
horloge.placer(0);
horloge.lire();
createRoot(document.getElementById("galerie")!).render(<Galerie />);
