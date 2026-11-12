// Planche d'écoute : tous les sons du catalogue, réglables, sans lancer de partie. Voir construire-apercu-sons.ts.
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SKINS, type SkinId } from "../src/shared/skins";
import { NOMS_SONS, SONS, SONS_PAR_SKIN, type NomSon, type SonDef } from "../src/web/theme/sons/catalogue";
import { sound, play, type PlayOptions } from "../src/web/sound/engine";
import { useSoundState } from "../src/web/sound/hooks";
import { CHRONO_INITIAL, chronoStep, popRate, type SfxCall } from "../src/web/sound/events";
import { Button } from "../src/web/ui/Button";
import { Panel } from "../src/web/ui/Panel";
import "../src/web/theme/theme.css";

declare const __USAGES__: Record<string, string[]>;
declare const __ORIGINES__: Record<string, string>;

// Le moteur ne joue que sur la TV : la planche se déclare TV, sans demander la liste des sons au serveur.
document.documentElement.dataset.app = "tv";
sound.start({ sansReseau: true });

/** Quand le jeu joue ce son (écrit à la main d'après events.ts, useGlobalSfx.ts et les mini-jeux). */
const QUAND: Record<NomSon, string> = {
  "lobby.musique": "Boucle jazz du lobby (63 s) : démarre au clic, fondus et baisse pendant les jingles.",
  "applaudissements": "Public au gain des points : bref, discret, après la révélation.",
  "tension": "Riser de deux secondes avant le dessin gagnant.",
  "echec.trombone": "Trombone acoustique : l’imposteur s’en sort (chute amicale).",
  "joueur.rejoint": "Lobby : un invité rejoint la partie (hauteur légèrement variable).",
  "joueur.quitte": "Lobby : un invité part ou se déconnecte.",
  "partie.lancement": "L'hôte lance la partie (lobby vers intro).",
  "manche.intro": "Annonce d'une manche (écran d'intro de chaque mini-jeu).",
  "reponse.recue": "Un joueur vient de répondre ; la hauteur monte à chaque réponse (popRate).",
  "reponse.toutes": "Tout le monde a répondu (juste après le dernier pop).",
  "chrono.tic": "Chacune des 5 dernières secondes d'un chrono, de plus en plus aigu.",
  "chrono.fin": "Le chrono arrive à zéro (buzzer de jeu télé).",
  "temps.ajoute": "L'hôte clique « +10 s ».",
  "pause": "L'hôte met la partie en pause.",
  "reprise": "L'hôte reprend la partie.",
  "resultats.arrivee": "L'écran de résultats d'une manche s'affiche.",
  "points.gagnes": "Fin de la révélation d'une manche, quand des points sont gagnés (aussi certaines révélations de mini-jeux).",
  "final.fanfare": "Le classement final s'affiche.",
  "transition.entree": "Scène de changement d'univers : entrée (aussi changement de question/dessin dans certains jeux).",
  "transition.sortie": "Scène de changement d'univers : sortie.",
  "ui.clic": "Petit tic générique : compteurs, apparition d'un mot ou d'un choix, rythme d'une révélation (hauteur variable selon le jeu).",
  "bonne.reponse": "Double ding de sonnette : bonne réponse, bon choix, victoire d'une étape.",
  "mauvaise.reponse": "Mauvaise réponse, erreur, perdant d'une révélation.",
  "roulement": "Caisse claire seule en crescendo, sans cymbale : deux secondes avant le verdict.",
  "pfc.choc": "Pierre-feuille-ciseaux : impact de combat bref au choc des mains.",
  "pfc.egalite": "Pierre-feuille-ciseaux : égalité.",
  "simon.note": "Simon : une case s'allume ; la hauteur change selon la case.",
  "simon.rate": "Simon : un joueur se trompe.",
  "carte.pose": "Une carte se pose : vote révélé, indice, joueur qui stoppe au compte à rebours.",
  "jeton.pose": "Un jeton se pose : chiffre du prix qui tombe, avancée d'une manche de pierre-feuille-ciseaux.",
  "boum": "Gros impact : révélation, annonce du compte à rebours, fin de Simon.",
};

const GROUPES: { titre: string; noms: NomSon[] }[] = [
  { titre: "Partie et lobby", noms: ["lobby.musique", "joueur.rejoint", "joueur.quitte", "partie.lancement"] },
  { titre: "Manche", noms: ["manche.intro", "reponse.recue", "reponse.toutes", "temps.ajoute", "pause", "reprise"] },
  { titre: "Chrono", noms: ["chrono.tic", "chrono.fin"] },
  { titre: "Résultats", noms: ["resultats.arrivee", "roulement", "tension", "applaudissements", "echec.trombone", "points.gagnes", "final.fanfare"] },
  { titre: "Transitions", noms: ["transition.entree", "transition.sortie"] },
  { titre: "Interface et verdicts", noms: ["ui.clic", "bonne.reponse", "mauvaise.reponse"] },
];
const dejaPlaces = new Set(GROUPES.flatMap((g) => g.noms));
// Les autres sons se rangent par préfixe (pfc.*, simon.*) ; ceux sans point forment « Mini-jeux divers ».
const parPrefixe = new Map<string, NomSon[]>();
for (const nom of NOMS_SONS) {
  if (dejaPlaces.has(nom)) continue;
  const cle = nom.includes(".") ? `${nom.split(".")[0]}.*` : "Mini-jeux divers";
  parPrefixe.set(cle, [...(parPrefixe.get(cle) ?? []), nom]);
}
for (const [titre, noms] of parPrefixe) GROUPES.push({ titre: titre.endsWith("*") ? `Mini-jeu : ${titre}` : titre, noms });
// Un nom absent de toutes les listes ne doit jamais disparaître de la planche.
const defDe = (nom: NomSon, skin: SkinId | null): { def: SonDef; duSkin: boolean } => {
  const duSkin = skin ? SONS_PAR_SKIN[skin]?.[nom] : undefined;
  return { def: duSkin ?? SONS[nom], duSkin: !!duSkin };
};

type Pas = [delaiMs: number, nom: NomSon, options?: PlayOptions];
function sequenceChrono(): Pas[] {
  // Même fonction que useGlobalSfx : on lui donne le temps restant seconde après seconde.
  const pas: Pas[] = [];
  let state = CHRONO_INITIAL;
  for (let i = 0; i <= 6; i++) {
    const etape = chronoStep(state, (6 - i) * 1000 - 50);
    state = etape.state;
    const appel: SfxCall | null = etape.call;
    if (appel) pas.push([i * 1000, appel.nom, appel.options]);
  }
  return pas;
}
const SEQUENCES: { id: string; titre: string; pas: () => Pas[] }[] = [
  { id: "chrono", titre: "Fin de chrono", pas: sequenceChrono },
  {
    id: "reponses", titre: "8 réponses qui arrivent",
    pas: () => Array.from({ length: 8 }, (_, i): Pas[] => {
      const rate = popRate(i + 1);
      return i === 7 ? [[i * 450, "reponse.recue", { rate }], [i * 450 + 150, "reponse.toutes"]] : [[i * 450, "reponse.recue", { rate }]];
    }).flat(),
  },
  { id: "resultats", titre: "Résultats", pas: () => [[0, "resultats.arrivee"], [900, "roulement"], [900, "tension"], [2900, "boum"], [3400, "bonne.reponse"], [4500, "applaudissements"], [5000, "points.gagnes"]] },
  { id: "rejoint", titre: "Joueur rejoint ×3", pas: () => [[0, "joueur.rejoint"], [900, "joueur.rejoint"], [1700, "joueur.rejoint"]] },
  { id: "simon", titre: "Simon : do, mi, sol, do", pas: () => [1, 2 ** (4 / 12), 2 ** (7 / 12), 2].map((rate, i) => [i * 650, "simon.note", { rate }]) },
  { id: "pfc", titre: "PFC : choc et verdict", pas: () => [[0, "roulement", { rate: 1.5 }], [1300, "pfc.choc"], [1900, "bonne.reponse"]] },
  { id: "final", titre: "Finale", pas: () => [[0, "transition.entree"], [700, "resultats.arrivee"], [2500, "final.fanfare"], [3500, "points.gagnes"]] },
];

function Planche() {
  const etat = useSoundState();
  const [skin, setSkin] = useState<SkinId | null>(null);
  const [volumeMaitre, setVolumeMaitre] = useState(0.8);
  const [reglages, setReglages] = useState<Record<string, { volume: number; rate: number }>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const minuteurs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => sound.setSkin(skin), [skin]);
  useEffect(() => sound.setVolume(volumeMaitre), [volumeMaitre]);
  useEffect(() => () => minuteurs.current.forEach(clearTimeout), []);

  const arreter = () => {
    minuteurs.current.forEach(clearTimeout);
    minuteurs.current = [];
    sound.setLobby(false);
    setEnCours(null);
  };
  const programmer = (id: string, pas: Pas[]) => {
    arreter();
    setEnCours(id);
    for (const [delai, nom, options] of pas) minuteurs.current.push(setTimeout(() => play(nom, options), delai));
    const fin = Math.max(...pas.map((p) => p[0])) + 1500;
    minuteurs.current.push(setTimeout(() => setEnCours(null), fin));
  };
  const reglage = (nom: string) => reglages[nom] ?? { volume: 1, rate: 1 };
  const regler = (nom: string, patch: Partial<{ volume: number; rate: number }>) => setReglages((r) => ({ ...r, [nom]: { ...reglage(nom), ...patch } }));
  const options = (nom: string): PlayOptions => ({ volume: reglage(nom).volume, rate: reglage(nom).rate });

  return (
    <div className="fixed inset-0 overflow-y-auto bg-bg text-ink font-body" data-testid="planche-sons" data-sound-state={etat}>
      <main className="mx-auto flex max-w-[110rem] flex-col gap-6 p-8">
        <header className="flex flex-wrap items-center gap-6">
          <div className="flex-1">
            <h1 className="font-display text-5xl text-accent">Planche des sons</h1>
            <p className="text-ink-muted">Tous les sons du catalogue, tels que la TV les joue. Aucune partie nécessaire.</p>
          </div>
          {etat === "locked" && <Button size="lg" data-testid="activer-son" onClick={() => play("ui.clic")}>Activer le son</Button>}
          {etat === "muted" && <Button size="lg" variant="secondary" onClick={() => sound.setMuted(false)}>Son coupé : réactiver</Button>}
          <label className="flex items-center gap-3 text-lg">Volume général
            <input type="range" min={0} max={1} step={0.05} value={volumeMaitre} onChange={(e) => setVolumeMaitre(Number(e.target.value))} data-testid="volume-general" />
            <span className="w-12 tabular-nums">{Math.round(volumeMaitre * 100)}%</span>
          </label>
        </header>

        <Panel title="Séquences de démonstration (vrais enchaînements et délais)">
          <div className="flex flex-wrap gap-3">
            {SEQUENCES.map((s) => (
              <Button key={s.id} variant={enCours === s.id ? "good" : "secondary"} data-testid={`seq-${s.id}`} onClick={() => programmer(s.id, s.pas())}>▶ {s.titre}</Button>
            ))}
            <Button variant="danger" onClick={arreter}>Stop</Button>
          </div>
        </Panel>

        <Panel title="Skin (résolution par univers)">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant={skin === null ? "primary" : "secondary"} onClick={() => setSkin(null)}>Aucun</Button>
            {SKINS.map((s) => (
              <Button key={s} size="sm" variant={skin === s ? "primary" : "secondary"} data-testid={`skin-${s}`} onClick={() => setSkin(s)}>{s}</Button>
            ))}
          </div>
          <p className="mt-3 text-ink-muted">
            Pour remplacer un son : déposer <code className="text-accent">config/medias/sons/&lt;nom logique&gt;.mp3|ogg|wav</code>
            {skin ? <> ; pour cet univers seulement : <code className="text-accent">config/medias/sons/{skin}/&lt;nom logique&gt;.ogg</code></> : <> ; pour un seul skin : <code className="text-accent">config/medias/sons/&lt;skin&gt;/&lt;nom logique&gt;.ogg</code></>}
            . Le fichier du skin l'emporte sur celui du dossier, qui l'emporte sur le son fourni.
          </p>
        </Panel>

        {GROUPES.map((groupe) => (
          <Panel key={groupe.titre} title={groupe.titre}>
            <div className="flex flex-col divide-y divide-line">
              {groupe.noms.map((nom) => {
                const { def, duSkin } = defDe(nom, skin);
                const usages = __USAGES__[nom] ?? [];
                const r = reglage(nom);
                return (
                  <div key={nom} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3" data-testid={`son-${nom}`}>
                    <Button size="sm" data-testid={`play-${nom}`} onClick={() => { if (nom === "lobby.musique") { sound.setLobby(enCours !== "musique"); setEnCours(enCours === "musique" ? null : "musique"); } else play(nom, options(nom)); }}>{nom === "lobby.musique" && enCours === "musique" ? "■" : "▶"}</Button>
                    <div className="w-[26rem] min-w-[16rem] flex-1">
                      <div className="font-mono text-xl text-accent">{nom}</div>
                      <div>{QUAND[nom]}</div>
                      {usages.length > 0 && <div className="text-sm text-ink-muted">Utilisé par : {usages.join(", ")}</div>}
                    </div>
                    <div className="w-60 text-sm text-ink-muted">
                      <div>Fichier : <span className="text-ink">{def.fichier}</span>{duSkin && " (skin)"}</div>
                      {def.fichier && <div>Source et licence : {__ORIGINES__[def.fichier] ?? "?"}</div>}
                      <div>Volume catalogue : {def.volume}{def.variation ? ` · variation ±${def.variation}` : ""}</div>
                    </div>
                    {nom !== "lobby.musique" && <>
                    <label className="flex items-center gap-2 text-sm">Volume ×{r.volume.toFixed(2)}
                      <input type="range" min={0} max={2} step={0.05} value={r.volume} onChange={(e) => regler(nom, { volume: Number(e.target.value) })} />
                    </label>
                    <label className="flex items-center gap-2 text-sm">Rate {r.rate.toFixed(2)}
                      <input type="range" min={0.5} max={2} step={0.05} value={r.rate} onChange={(e) => regler(nom, { rate: Number(e.target.value) })} />
                    </label>
                    <Button size="sm" variant="secondary" onClick={() => programmer(`boucle-${nom}`, [0, 1, 2, 3, 4].map((i): Pas => [i * 350, nom, options(nom)]))}>Boucle ×5</Button>
                    </>}
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </main>
    </div>
  );
}

createRoot(document.getElementById("planche")!).render(<Planche />);
