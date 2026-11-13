// Sections « Chrono » et « Écrans TV » : lobby, final, et le chrono des 10 dernières secondes sous chaque skin.
import { useEffect, useMemo, useState } from "react";
import { SOUVENIRS_DEMO } from "./scenes-ceremonie";
import { FINAL_ENTRY_MS, finalRevealTimeline } from "../../src/shared/final-reveal";
import type { SkinId } from "../../src/shared/skins";
import type { GameSnapshot, RoundInfo } from "../../src/shared/types";
import { play } from "../../src/web/sound/engine";
import { diffSnapshots } from "../../src/web/sound/events";
import { Countdown } from "../../src/web/ui";
import { DEMOS, monterEtape } from "./demos";
import { T0 } from "./horloge";
import { instantaneJeu, snapshotDeBase } from "./instantane";
import { actionsFactices, Disposition, PhonePane, TvPane, Vignette } from "./panneaux";
import { sceneEtape } from "./scenes-jeux";
import type { Env, Scene } from "./types";

function SceneLobby({ env }: { env: Env }) {
  const [nb, setNb] = useState(Math.min(2, env.joueurs.length));
  const joueurs = useMemo(() => env.joueurs.slice(0, nb).map((p) => ({ ...p, score: 0 })), [env.joueurs, nb]);
  const snapshot = useMemo(() => snapshotDeBase("lobby", { joueurs, skin: env.skin, paused: env.pause }), [joueurs, env.skin, env.pause]);
  const { definirDuree } = env;
  useEffect(() => definirDuree(null), [definirDuree]);
  return (
    <>
      <Disposition
        tv={(echelle) => <TvPane snapshot={snapshot} echelle={echelle} />}
        telephones={joueurs[0] ? [
          <PhonePane key="t" snapshot={{ ...snapshot, me: { id: joueurs[0].id, private: null, inRound: true } }} joueurId={joueurs[0].id} actions={actionsFactices()} taille={env.taillePhone} etiquette={`Téléphone de ${joueurs[0].profile!.name}`} />,
        ] : []}
      />
      <div className="ga-actions">
        <button type="button" data-testid="ga-arrive" disabled={nb >= env.joueurs.length} onClick={() => setNb((n) => n + 1)}>Faire arriver un joueur</button>
        <button type="button" data-testid="ga-part" disabled={nb <= 0} onClick={() => setNb((n) => n - 1)}>Faire partir le dernier</button>
      </div>
    </>
  );
}

const SCORES_FINAUX = [1450, 1280, 1190, 860, 740, 520, 410, 230];

function SceneFinal({ env }: { env: Env }) {
  const joueurs = useMemo(() => env.joueurs.map((p, i) => ({ ...p, score: SCORES_FINAUX[i]! })), [env.joueurs]);
  const duree = finalRevealTimeline(joueurs.length).durationMs + FINAL_ENTRY_MS + 3000;
  const snapshot = useMemo<GameSnapshot>(() => ({
    ...snapshotDeBase("final", { joueurs, skin: env.skin, paused: env.pause }),
    finalReveal: { startedAt: T0, playerIds: joueurs.map((p) => p.id), souvenirs: SOUVENIRS_DEMO },
  }), [joueurs, env.skin, env.pause]);
  const { definirDuree, depart } = env;
  useEffect(() => definirDuree(duree), [duree, definirDuree]);
  useEffect(() => {
    if (depart !== 0) return;
    for (const appel of diffSnapshots({ ...snapshot, phase: "results" }, snapshot)) play(appel.nom, appel.options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dernier = joueurs[joueurs.length - 1]!;
  const eux = [joueurs[0]!, dernier].filter((p, i, l) => l.indexOf(p) === i);
  return (
    <Disposition
      tv={(echelle) => <TvPane snapshot={snapshot} actions={actionsFactices({ pause: async () => env.basculerPause(), resume: async () => env.basculerPause() })} echelle={echelle} />}
      telephones={eux.map((p) => <PhonePane key={p.id} snapshot={{ ...snapshot, me: { id: p.id, private: null, inRound: true } }} joueurId={p.id} actions={actionsFactices()} taille={env.taillePhone} etiquette={`Téléphone de ${p.profile!.name}`} />)}
    />
  );
}

// ── Chrono : les 10 dernières secondes, une vignette par variante

const VIGNETTES: { skin: SkinId | null; titre: string }[] = [
  { skin: null, titre: "bar : thème de base et téléphones" },
  { skin: "dofus", titre: "heart : Dofus" },
  { skin: "overwatch", titre: "hex : Overwatch" },
  { skin: "league-of-legends", titre: "ring : League of Legends et Resonance" },
  { skin: "rocket-league", titre: "scoreboard : Rocket League" },
  { skin: "mario-odyssey", titre: "coin : Mario Odyssey" },
];
export const DUREE_CHRONO_MS = 10_000;

function SceneChrono({ env }: { env: Env }) {
  const quiEst = DEMOS.find((d) => d.id === "qui-est-le-plus")!;
  const index = quiEst.etapes.findIndex((e) => e.id === "quelques");
  const instant = useMemo(() => {
    const session = monterEtape(quiEst, index, env.joueurs);
    return instantaneJeu(session, quiEst.etapes[index]!, { joueurs: env.joueurs, skin: env.skin, paused: env.pause, continues: [] });
  }, [quiEst, index, env.joueurs, env.skin, env.pause]);
  const tv = useMemo<GameSnapshot>(() => ({ ...instant.tv, round: { ...instant.tv.round!, deadline: T0 + DUREE_CHRONO_MS, timerTotalMs: DUREE_CHRONO_MS } }), [instant]);
  const round = tv.round as RoundInfo;
  const { definirDuree } = env;
  useEffect(() => definirDuree(DUREE_CHRONO_MS + 800), [definirDuree]);
  const actionsTv = actionsFactices({ pause: async () => env.basculerPause(), resume: async () => env.basculerPause() });
  const nb = env.joueurs.length;
  return (
    <>
      <Disposition tv={(echelle) => <TvPane snapshot={tv} actions={actionsTv} echelle={echelle} />} />
      <div className="ga-vignettes" data-testid="ga-vignettes">
        {VIGNETTES.map((v) => (
          <Vignette key={v.titre} skin={v.skin} titre={v.titre}>
            <div className="zone-boite">
              <Countdown round={round} size="tv" answeredCount={Math.ceil(nb / 2)} waitingCount={Math.floor(nb / 2)} />
            </div>
          </Vignette>
        ))}
      </div>
    </>
  );
}

const ECRAN = (id: string, titre: string, aide: string, Composant: Scene["Composant"]): Scene => ({ id: `ecrans/${id}`, section: "ecrans", titre, aide, Composant });

export const SCENES_ECRANS: Scene[] = [
  ECRAN("lobby", "Lobby", "Les joueurs arrivent et repartent (boutons ci-dessous).", SceneLobby),
  sceneEtape("ecrans/annonce", "ecrans", "Annonce de la manche", "Le nom du jeu claque, la règle apparaît.", "qui-est-le-plus", "intro"),
  sceneEtape("ecrans/jeu", "ecrans", "Manche en cours", "Le chrono, le cadre du jeu, les joueurs qui répondent.", "qui-est-le-plus", "quelques"),
  sceneEtape("ecrans/resultats", "ecrans", "Résultats", "La révélation, puis la bande des points, les « +N » et la couronne.", "qui-est-le-plus", "resultats"),
  ECRAN("final", "Classement final", "Du dernier au premier, podium, couronne, confettis.", SceneFinal),
];

export const SCENES_CHRONO: Scene[] = [
  { id: "chrono/dix-secondes", section: "chrono", titre: "Les 10 dernières secondes", aide: "Le chiffre ne doit jamais sortir de l'encadré rouge (la boîte du chrono) ; tics à 5, buzzer à 0.", Composant: SceneChrono },
];
