// Une cérémonie de démonstration complète, avec les vrais écrans et des souvenirs fictifs.
import { useEffect, useMemo } from "react";
import { ceremonyElapsed, ceremonyTimeline, ceremonyStepAt, revealedAwards, revealedSouvenirs, type CeremonyInfo, type Keepsake } from "../../src/shared/ceremony";
import { serverNow } from "../../src/web/net/socket";
import { snapshotDeBase } from "./instantane";
import { actionsFactices, Disposition, PhonePane, TvPane } from "./panneaux";
import { T0, horloge } from "./horloge";
import type { Env, Scene } from "./types";

export const SOUVENIRS_DEMO: Keepsake[] = [
  { kind: "dessin", tag: "meilleur", playerId: "demo", label: "Un tournesol", score: 5, strokes: [
    { c: 2, w: 1, p: [500, 850, 500, 500] }, { c: 2, w: 1, p: [500, 740, 300, 650, 400, 770, 500, 740] },
    { c: 3, w: 1, p: [500, 460, 330, 320, 400, 460, 280, 510, 440, 530, 400, 680, 520, 550, 640, 660, 610, 520, 760, 480, 590, 440, 640, 300, 500, 460] },
    { c: 0, w: 1, p: [480, 430, 540, 430, 575, 470, 550, 520, 490, 520, 460, 480, 480, 430] },
  ] },
  { kind: "objet", emoji: "🎮", label: "Une console", detail: "499,99 €", score: 200 },
  { kind: "post-it", text: "La capitale de l'Australie ?", detail: "Sydney — 6/8 réponses", score: .75 },
];

function SceneCeremonie({ env }: { env: Env }) {
  const info = useMemo<CeremonyInfo>(() => {
    const ids = env.joueurs.map((p) => p.id);
    const categories = {
      "duo-improbable": { title: "Duo improbable", emoji: "🧲" },
      "merci-travaux": { title: "Merci pour les travaux", emoji: "🏗️" },
      "talent-incompris": { title: "Le talent incompris", emoji: "🎨" },
      "k-style": { title: "Le K-Style", emoji: "⚡" },
    };
    const selected = Object.keys(categories);
    const phrases = ["Ont passé une heure ensemble sans partager une seule opinion.", "Sans fondations, aucun podium.", "Le public n'était pas prêt.", "Des doigts qui ne s'arrêtent jamais."];
    return {
      startedAt: T0, playerIds: ids, scoresBefore: Object.fromEntries(ids.map((id, i) => [id, 1100 - i * 50])),
      souvenirs: SOUVENIRS_DEMO.map((k) => k.kind === "dessin" ? { ...k, playerId: ids[0]! } : k),
      awards: selected.map((id, i) => ({ id, title: categories[id as keyof typeof categories].title, emoji: categories[id as keyof typeof categories].emoji,
        phrase: phrases[i]!, winners: i === 0 ? [ids[1]!, ids[2]!] : [ids[(i + 2) % ids.length]!], points: 80,
        statLabel: ["7 désaccords sur 8", "4 dernières places", "0 vote pour ses dessins", "168 appuis"][i]!,
        roulette: [...selected.filter((key) => key !== id), id], ...(i === 2 ? { keepsake: SOUVENIRS_DEMO[0] } : {}) })),
      categories, timeScale: 1, pausedMs: 0, pausedSince: env.pause ? horloge.now() : null,
    };
  }, [env.joueurs, env.pause]);
  const duree = ceremonyTimeline(info.souvenirs, info.awards).durationMs;
  const { definirDuree } = env;
  useEffect(() => definirDuree(duree), [definirDuree, duree]);
  const snapshot = { ...snapshotDeBase("ceremony", { joueurs: env.joueurs, skin: null, paused: env.pause }), ceremony: info };
  const phone = (id: string) => {
    const elapsed = ceremonyElapsed(info, serverNow());
    const { steps } = ceremonyTimeline(info.souvenirs, info.awards);
    return { ...snapshot, me: { id, private: null, inRound: true }, ceremony: { ...info, step: ceremonyStepAt(steps, elapsed), categories: {},
      souvenirs: info.souvenirs.slice(0, revealedSouvenirs(steps, elapsed)), awards: info.awards.slice(0, revealedAwards(steps, elapsed)) } };
  };
  return <Disposition tv={(echelle) => <TvPane snapshot={snapshot} actions={actionsFactices({ pause: async () => env.basculerPause(), resume: async () => env.basculerPause() })} echelle={echelle} />}
    telephones={env.joueurs.slice(1, 3).map((p) => <PhonePane key={p.id} snapshot={phone(p.id)} joueurId={p.id} actions={actionsFactices()} taille={env.taillePhone} etiquette={`Téléphone de ${p.profile!.name}`} />)} />;
}

export const SCENES_CEREMONIE: Scene[] = [{ id: "ecrans/ceremonie", section: "ecrans", titre: "Souvenirs et bonus", aide: "La pièce, les trois souvenirs, les quatre bonus puis le podium. Curseur et pause disponibles.", Composant: SceneCeremonie }];
