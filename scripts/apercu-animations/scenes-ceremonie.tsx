// Section « Écrans TV » : la cérémonie de fin (souvenirs, roulette des bonus, projecteur, étoiles), sur les vrais écrans.
// Pas de serveur : le téléphone reçoit ici ce que le moteur lui enverrait, c'est-à-dire seulement les bonus déjà révélés.
import { useEffect, useMemo, useState } from "react";
import { ceremonyElapsed, ceremonyTimeline, revealedAwards, type Award, type CeremonyInfo, type Keepsake } from "../../src/shared/ceremony";
import type { GameSnapshot, PublicPlayer } from "../../src/shared/types";
import { horloge, T0 } from "./horloge";
import { snapshotDeBase } from "./instantane";
import { actionsFactices, Disposition, PhonePane, TvPane } from "./panneaux";
import type { Env, Scene } from "./types";

/** Un dessin simple (triangle, trait, carré) au format des traits de Dessin raté. */
const TRAITS = [
  { c: 1, w: 1, p: [500, 150, 850, 800, 150, 800, 500, 150] },
  { c: 2, w: 1, p: [300, 400, 330, 420, 700, 420, 730, 400] },
  { c: 3, w: 1, p: [420, 560, 580, 560, 580, 700, 420, 700, 420, 560] },
];

const CATEGORIES = {
  "talent-incompris": { title: "Le talent incompris", emoji: "🎨" },
  "duo-improbable": { title: "Duo improbable", emoji: "🧲" },
  "merci-travaux": { title: "Merci pour les travaux", emoji: "🏗️" },
  escargot: { title: "L'escargot", emoji: "🐌" },
  "roi-manches": { title: "Roi des manches", emoji: "👑" },
  "craquage-dos": { title: "Le craquage de dos", emoji: "🦴" },
};

/** Données de démonstration : trois souvenirs variés et quatre bonus (dessin, duo, cuillère, simple). */
function infoDemo(joueurs: PublicPlayer[]): CeremonyInfo {
  const ids = joueurs.map((p) => p.id);
  const dernier = ids.at(-1)!;
  const avantDernier = ids.at(-2) ?? dernier;
  const bonus = (id: keyof typeof CATEGORIES, phrase: string, winners: string[], statLabel: string, roulette: string[], extra: Partial<Award> = {}): Award =>
    ({ id, ...CATEGORIES[id], phrase, winners, points: 120, statLabel, roulette, ...extra });
  const dessinIncompris: Keepsake = { kind: "dessin", tag: "incompris", playerId: dernier, label: "Un chat qui fait du vélo", strokes: TRAITS, score: 0 };
  return {
    startedAt: T0,
    playerIds: ids,
    // Scores avant les bonus, décroissants dans l'ordre des joueurs : le classement provisoire suit la liste.
    scoresBefore: Object.fromEntries(ids.map((id, i) => [id, 1000 - i * 90])),
    timeScale: 1, pausedMs: 0, pausedSince: null,
    souvenirs: [
      { ...dessinIncompris, tag: "meilleur", playerId: ids[1] ?? ids[0]!, label: "Une tour Eiffel un peu penchée", score: 6 },
      { kind: "objet", emoji: "🎮", label: "PlayStation 5", detail: "649,99 €", score: 210 },
      { kind: "post-it", text: "Quel animal ne dort jamais ?", detail: "Le requin — 5/8 réponses", score: 0.6 },
    ],
    awards: [
      bonus("talent-incompris", "Le public n'était pas prêt.", [dernier], "0 vote sur 3 dessins", ["roi-manches", "escargot", "craquage-dos", "merci-travaux", "talent-incompris"], { keepsake: dessinIncompris }),
      bonus("duo-improbable", "Ont passé une heure ensemble sans partager une seule opinion.", [ids[1] ?? ids[0]!, ids[2] ?? dernier], "0 avis en commun", ["escargot", "roi-manches", "craquage-dos", "duo-improbable"]),
      bonus("merci-travaux", "Sans fondations, aucun podium.", [avantDernier], "3 dernières places", ["craquage-dos", "talent-incompris", "escargot", "merci-travaux"]),
      bonus("escargot", "Le temps, c'est de l'argent. Pas pour lui.", [ids[0]!], "812 ms en moyenne", ["merci-travaux", "roi-manches", "talent-incompris", "escargot"]),
    ],
    categories: CATEGORIES,
  };
}

/** Le moteur n'envoie aux téléphones que les bonus déjà révélés : on rejoue ce filtrage sur l'horloge de la galerie. */
function useBonusRevelés(info: CeremonyInfo): number {
  const { steps } = useMemo(() => ceremonyTimeline(info.souvenirs, info.awards, info.timeScale), [info]);
  const lire = () => revealedAwards(steps, ceremonyElapsed(info, horloge.now()));
  const [n, setN] = useState(lire);
  useEffect(() => {
    const t = setInterval(() => setN(lire()), 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, info]);
  return n;
}

function SceneCeremonie({ env }: { env: Env }) {
  const joueurs = useMemo(() => env.joueurs.map((p, i) => ({ ...p, score: 1000 - i * 90 })), [env.joueurs]);
  const info = useMemo(() => infoDemo(joueurs), [joueurs]);
  const duree = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale).durationMs + 1500;
  const snapshot = useMemo<GameSnapshot>(() => ({ ...snapshotDeBase("ceremony", { joueurs, skin: env.skin, paused: env.pause }), ceremony: info }),
    [joueurs, info, env.skin, env.pause]);
  const revelés = useBonusRevelés(info);
  const { definirDuree } = env;
  useEffect(() => definirDuree(duree), [duree, definirDuree]);
  // Téléphones : un gagnant du duo et le gagnant de la cuillère (ou le premier joueur à 3 invités).
  const eux = [...new Set([info.awards[1]!.winners[1]!, info.awards[2]!.winners[0]!])].map((id) => joueurs.find((p) => p.id === id)!);
  const pourTelephone = (id: string): GameSnapshot => ({
    ...snapshot, ceremony: { ...info, awards: info.awards.slice(0, revelés) }, me: { id, private: null, inRound: true },
  });
  return (
    <Disposition
      tv={(echelle) => <TvPane snapshot={snapshot} actions={actionsFactices({ pause: async () => env.basculerPause(), resume: async () => env.basculerPause() })} echelle={echelle} />}
      telephones={eux.map((p) => <PhonePane key={p.id} snapshot={pourTelephone(p.id)} joueurId={p.id} actions={actionsFactices()} taille={env.taillePhone} etiquette={`Téléphone de ${p.profile!.name}`} />)}
    />
  );
}

export const SCENES_CEREMONIE: Scene[] = [
  { id: "ecrans/ceremonie", section: "ecrans", titre: "Cérémonie de fin", aide: "Souvenirs dans la pièce, roulette des bonus, projecteur, étoiles sans aucun score ; le téléphone reçoit sa carte quand son bonus est révélé.", Composant: SceneCeremonie },
];
