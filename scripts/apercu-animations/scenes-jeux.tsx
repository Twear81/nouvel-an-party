// Scènes issues des démos de mini-jeux : les vrais écrans (intro, jeu, résultats) sur une vraie manche simulée.
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { play } from "../../src/web/sound/engine";
import { diffSnapshots } from "../../src/web/sound/events";
import type { Phase } from "../../src/shared/types";
import { DEMOS, monterEtape, type Demo, type Etape } from "./demos";
import { instantaneJeu } from "./instantane";
import { actionsFactices, Disposition, PhonePane, TvPane } from "./panneaux";
import type { Env, Scene } from "./types";

/** Marge laissée à l'écran de résultats une fois la révélation terminée (s). */
const MARGE_RESULTATS_S = 4;

const PHASE_PRECEDENTE: Partial<Record<Etape["phase"], Phase>> = { intro: "results", results: "playing" };

function SceneJeu({ env, demo, indexEtape }: { env: Env; demo: Demo; indexEtape: number }) {
  const etape = demo.etapes[indexEtape]!;
  const [version, setVersion] = useState(0);
  const [continues, setContinues] = useState<string[]>([]);
  const session = useMemo(() => monterEtape(demo, indexEtape, env.joueurs), [demo, indexEtape, env.joueurs]);
  const prochain = useRef(etape.repondus ?? 0);

  const instant = useMemo(
    () => instantaneJeu(session, etape, { joueurs: env.joueurs, skin: env.skin, paused: env.pause, continues }),
    // `version` : une réponse donnée par un téléphone ou par le bouton change l'état de la manche.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, etape, env.joueurs, env.skin, env.pause, continues, version],
  );

  const dureeMs = etape.phase === "results" ? (instant.revealSeconds + MARGE_RESULTATS_S) * 1000 : null;
  const { definirDuree, depart } = env;
  useEffect(() => definirDuree(dureeMs), [dureeMs, definirDuree]);

  // Les sons d'arrivée de l'écran (annonce, résultats) : le moteur ne joue que les CHANGEMENTS d'état, pas le montage.
  useEffect(() => {
    const avant = PHASE_PRECEDENTE[etape.phase];
    if (depart !== 0 || !avant) return;
    for (const appel of diffSnapshots({ ...instant.tv, phase: avant }, instant.tv)) play(appel.nom, appel.options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indices = [...new Set((etape.telephones?.(session) ?? [0, 1]).filter((i) => i >= 0 && i < env.joueurs.length))].slice(0, 2);
  const actionsTv = actionsFactices({ pause: async () => env.basculerPause(), resume: async () => env.basculerPause() });
  const nom = (i: number) => env.joueurs[i]!.profile!.name;

  const peutRepondre = !!demo.repondre && etape.phase === "playing" && etape.repondus !== undefined && prochain.current < env.joueurs.length;
  const prochainContinue = env.joueurs.find((p) => !continues.includes(p.id));

  return (
    <>
      <Disposition
        tv={(echelle) => <TvPane snapshot={instant.tv} actions={actionsTv} echelle={echelle} />}
        telephones={indices.map((i) => {
          const id = env.joueurs[i]!.id;
          const actions = actionsFactices({
            input: async (payload) => {
              session.input(i, payload);
              setVersion((v) => v + 1);
            },
            continue: async () => setContinues((c) => (c.includes(id) ? c : [...c, id])),
          });
          return <PhonePane key={id} snapshot={instant.telephone(id)} joueurId={id} actions={actions} taille={env.taillePhone} etiquette={`Téléphone de ${nom(i)}`} />;
        })}
      />
      <div className="ga-actions">
        {demo.repondre && etape.phase === "playing" && etape.repondus !== undefined && (
          <button type="button" data-testid="ga-repondre" disabled={!peutRepondre} onClick={() => {
            demo.repondre!(session, prochain.current++);
            setVersion((v) => v + 1);
          }}>
            Faire répondre le suivant
          </button>
        )}
        {etape.phase === "results" && (
          <button type="button" data-testid="ga-continuer" disabled={!prochainContinue} onClick={() => prochainContinue && setContinues((c) => [...c, prochainContinue.id])}>
            Faire cliquer « Continuer » au suivant
          </button>
        )}
      </div>
    </>
  );
}

/** Une scène par étape de chaque démo. */
export function scenesDesJeux(): Scene[] {
  return DEMOS.flatMap((demo) =>
    demo.etapes.map((etape, indexEtape): Scene => {
      const Composant: ComponentType<{ env: Env }> = ({ env }) => <SceneJeu env={env} demo={demo} indexEtape={indexEtape} />;
      return { id: `jeu/${demo.id}/${etape.id}`, section: "jeux", groupe: demo.titre, titre: etape.titre, aide: etape.alternatif ? "Variante : autre issue de la même manche." : undefined, Composant };
    }),
  );
}

/** Scène d'une étape de démo, réutilisée dans la section « Écrans TV ». */
export function sceneEtape(id: string, section: Scene["section"], titre: string, aide: string, demoId: string, etapeId: string): Scene {
  const demo = DEMOS.find((d) => d.id === demoId)!;
  const indexEtape = demo.etapes.findIndex((e) => e.id === etapeId);
  if (indexEtape < 0) throw new Error(`Étape inconnue : ${demoId}/${etapeId}`);
  return { id, section, titre, aide, Composant: ({ env }) => <SceneJeu env={env} demo={demo} indexEtape={indexEtape} /> };
}
