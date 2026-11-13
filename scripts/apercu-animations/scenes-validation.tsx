// Aperçus de revue : les composants livrés, avec des commandes de démonstration en dehors des écrans du jeu.
import { useEffect, useState } from "react";
import type { GameSnapshot, Profile } from "../../src/shared/types";
import { ProfileEditor } from "../../src/web/phone/ProfileEditor";
import { FRAMES } from "../../src/web/theme/profile-options";
import { Button, fireConfetti, FrameSummon, PausedOverlay, PauseZoom, PlayerAvatar, SplitTime } from "../../src/web/ui";
import { horloge, T0 } from "./horloge";
import { snapshotDeBase } from "./instantane";
import { actionsFactices, Disposition, PhonePane, TvPane } from "./panneaux";
import type { Env, Scene } from "./types";

const MINUIT_MS = 15_000;

function SceneMinuit({ env }: { env: Env }) {
  const [continuee, setContinuee] = useState(false);
  const celebre = horloge.ecoule() >= MINUIT_MS;
  const { definirDuree } = env;
  useEffect(() => definirDuree(45_000), [definirDuree]);
  const snapshot: GameSnapshot = {
    ...snapshotDeBase("lobby", { joueurs: env.joueurs, skin: null, paused: false }),
    midnight: continuee ? null : { targetAt: T0 + MINUIT_MS, phase: celebre ? "celebrate" : "countdown", year: 2027 },
  };
  const actions = actionsFactices({ resume: async () => setContinuee(true) });
  const joueur = env.joueurs[0]!;
  return (
    <>
      <Disposition
        tv={(echelle) => <TvPane snapshot={snapshot} actions={actions} echelle={echelle} />}
        telephones={[
          <PhonePane key="minuit" snapshot={snapshot} joueurId={joueur.id} actions={actions} taille="360x640" etiquette="Téléphone 360 × 640 — même compte à rebours" />,
        ]}
      />
      <div className="ga-actions">
        <button type="button" data-testid="ga-minuit-continuer" disabled={!celebre || continuee} onClick={() => setContinuee(true)}>
          {continuee ? "Partie reprise" : "Continuer la démonstration"}
        </button>
        <span className="ga-note">15 secondes jusqu’au 1er janvier 2027. Le bouton Continuer de la TV reprend aussi la partie. Rejouer relance le compte à rebours.</span>
      </div>
    </>
  );
}

function SceneCadres({ env }: { env: Env }) {
  const [profil, setProfil] = useState<Profile>(env.joueurs[0]!.profile!);
  const [editeur, setEditeur] = useState(false);
  const { definirDuree } = env;
  useEffect(() => definirDuree(null), [definirDuree]);
  const joueurs = env.joueurs.map((joueur, i) => i === 0 ? { ...joueur, profile: profil } : joueur);
  const snapshot = snapshotDeBase("lobby", { joueurs, skin: env.skin, paused: false });
  const actions = actionsFactices({ setProfile: async (nouveau) => setProfil(nouveau) });
  return (
    <>
      <Disposition
        tv={(echelle) => (
          <TvPane echelle={echelle}>
            <div data-testid="ga-planche-cadres" className="flex min-h-0 flex-1 flex-col justify-center gap-12 px-24 py-16">
              <h1 className="text-center font-display text-6xl text-gold-gradient">Les dix cadres</h1>
              <div className="grid grid-cols-5 gap-x-10 gap-y-12">
                {FRAMES.map((cadre) => (
                  <Button key={cadre.id} variant={profil.frame === cadre.id ? "primary" : "secondary"} data-testid={`ga-cadre-${cadre.id}`} aria-pressed={profil.frame === cadre.id}
                    className="flex min-w-0 flex-col items-center gap-5 !py-8" onClick={() => { setProfil((p) => ({ ...p, frame: cadre.id })); setEditeur(false); }}>
                    <PlayerAvatar profile={{ ...profil, frame: cadre.id }} size="lg" />
                    <span className="text-center text-2xl">{cadre.label}</span>
                    <span data-ui="rarity-tag" data-rarity={cadre.rarity} className="summon-tag">{cadre.rarity}</span>
                  </Button>
                ))}
              </div>
            </div>
          </TvPane>
        )}
        telephones={[
          <PhonePane key="cadres" snapshot={snapshot} joueurId={joueurs[0]!.id} actions={actions} taille={env.taillePhone} etiquette={editeur ? "Éditeur de profil réel — défilement tactile" : "Invocation réelle — tirages libres"}>
            {editeur ? (
              <ProfileEditor key="editeur" initial={profil} actions={actions} onDone={() => setEditeur(false)} onCancel={() => setEditeur(false)} />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <FrameSummon profile={profil} onFrame={(frame) => setProfil((p) => ({ ...p, frame }))} />
              </div>
            )}
          </PhonePane>,
        ]}
      />
      <div className="ga-actions">
        <button type="button" data-testid="ga-cadres-editeur" aria-pressed={editeur} onClick={() => setEditeur((e) => !e)}>{editeur ? "Voir l’invocation seule" : "Ouvrir l’éditeur complet"}</button>
        <span className="ga-note">Les cadres de la planche sont sélectionnables. Sur le téléphone : Invoquer / Relancer utilise le vrai tirage. Le sélecteur Habillage applique le thème de base ou chacun des six skins.</span>
      </div>
    </>
  );
}

function SceneClinsDoeil({ env }: { env: Env }) {
  const [pause, setPause] = useState(false);
  const [essai, setEssai] = useState(0);
  const { definirDuree } = env;
  useEffect(() => definirDuree(null), [definirDuree]);
  return (
    <>
      <Disposition tv={(echelle) => (
        <TvPane echelle={echelle}>
          <PauseZoom paused={pause}>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-16 px-24">
              <h1 className="font-display text-6xl text-gold-gradient">Temps intermédiaires</h1>
              <div key={essai} data-testid="ga-split-times" className="grid w-full grid-cols-3 gap-12 text-center">
                {[
                  { ms: 980, titre: "Meilleur temps", bestMs: 980 },
                  { ms: 560, titre: "En avance", bestMs: 980 },
                  { ms: 1400, titre: "En retard", bestMs: 980 },
                ].map((temps, i) => (
                  <div key={temps.titre} className="flex flex-col items-center gap-10">
                    <PlayerAvatar profile={env.joueurs[i]!.profile} size="xl" />
                    <span className="font-display text-4xl text-ink">{temps.titre}</span>
                    <SplitTime ms={temps.ms} bestMs={temps.bestMs} delay={i * 0.15} className="text-8xl" data-testid={`ga-split-${i}`} />
                  </div>
                ))}
              </div>
            </div>
          </PauseZoom>
          <PausedOverlay show={pause} big />
        </TvPane>
      )} />
      <div className="ga-actions">
        <button type="button" data-testid="ga-cliffhanger" aria-pressed={pause} onClick={() => setPause((p) => !p)}>{pause ? "Reprendre" : "Pause : À suivre…"}</button>
        <button type="button" data-testid="ga-splits-rejouer" onClick={() => setEssai((n) => n + 1)}>Rejouer les temps</button>
        <button type="button" data-testid="ga-confettis-small" onClick={() => fireConfetti("small")}>Confettis — petit tir</button>
        <button type="button" data-testid="ga-confettis-big" onClick={() => fireConfetti("big")}>Confettis — grand tir</button>
        <a data-testid="ga-lien-boules" href={`#scene=ecrans/lobby&n=8&tel=360x640${env.skin ? `&skin=${env.skin}` : ""}`}>Boules de cristal et Shenron →</a>
        <span className="ga-note">Composants réels : pause avec zoom en trois à-coups, écarts bleus / rouges et confettis personnalisés de 32 px. Pour Shenron, faire arriver les invités jusqu’à sept dans le lobby ; le huitième ajoute sa boule bonus.</span>
      </div>
    </>
  );
}

export const SCENES_VALIDATION: Scene[] = [
  { id: "ecrans/minuit", section: "ecrans", titre: "Minuit → 2027", aide: "TV et téléphone réels : 15 s, derniers chiffres, feux d’artifice et reprise.", Composant: SceneMinuit },
  { id: "ecrans/cadres", section: "ecrans", titre: "Cadres et invocation", aide: "Les dix cadres, le vrai tirage et l’éditeur de profil mobile.", Composant: SceneCadres },
  { id: "ecrans/clins-doeil", section: "ecrans", titre: "Clins d’œil", aide: "Pause cliffhanger, temps intermédiaires, confettis et lien vers Shenron.", Composant: SceneClinsDoeil },
];
