// Une démo par mini-jeu : des étapes (intro, jeu, résultats…) obtenues en jouant la vraie manche dans une `Session`.
// Chaque étape est CUMULATIVE : pour afficher l'étape k, on rejoue les actions des étapes 0…k sur une manche neuve.
// Pour ajouter un mini-jeu à la galerie : ajouter une entrée à `DEMOS` (voir docs/changer-le-design.md).
import { pendingDuels } from "../../src/minigames/pierre-feuille-ciseaux/bracket";
import { GRID } from "../../src/minigames/dessin-rate/shared";
import { GO_LEAD_MS } from "../../src/minigames/compte-a-rebours/game";
import type { PublicPlayer } from "../../src/shared/types";
import { T0 } from "./horloge";
import { creerSession, type Session } from "./session";

export interface Etape {
  id: string;
  titre: string;
  phase: "intro" | "playing" | "results";
  /** Actions de cette étape, ajoutées à celles des précédentes. */
  agir?: (s: Session) => void;
  /** Variante de la dernière étape : ignorée quand on affiche une étape plus loin dans la liste. */
  alternatif?: boolean;
  /** Joueurs qui ont déjà répondu à la fin de l'étape (point de départ du bouton « Faire répondre le suivant »). */
  repondus?: number;
  /** Téléphones à montrer (index de joueurs) ; par défaut les deux premiers. */
  telephones?: (s: Session) => number[];
}

export interface Demo {
  /** Id unique de la démo (le jeu si une seule démo). */
  id: string;
  jeu: string;
  titre: string;
  choisir?: (items: any[]) => number;
  /** Réponse du joueur n° i : alimente le bouton « Faire répondre le suivant ». */
  repondre?: (s: Session, i: number) => void;
  etapes: Etape[];
}

const jusqua = (s: Session, n: number, f: (s: Session, i: number) => void) => {
  for (let i = 0; i < Math.min(n, s.ids.length); i++) f(s, i);
};
const moitie = (s: Session) => Math.ceil(s.ids.length / 2);
const premiersPuisTous = (f: (s: Session, i: number) => void): Pick<Etape, "agir"> => ({ agir: (s) => jusqua(s, s.ids.length, f) });

// ── Jeux « une réponse, puis révélation » ────────────────────────────────────────────────────────────────────────────

const vote = (s: Session, i: number) => {
  const cible = i % 3 === 0 ? 2 : 0;
  s.input(i, { target: s.ids[cible === i ? 1 : cible] });
};

const quiEstLePlus: Demo = {
  id: "qui-est-le-plus", jeu: "qui-est-le-plus", titre: "Qui est le plus…", repondre: vote,
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "jeu", titre: "Personne n'a voté", phase: "playing", repondus: 0 },
    { id: "quelques", titre: "La moitié a voté", phase: "playing", agir: (s) => jusqua(s, moitie(s), vote), repondus: 0 },
    { id: "resultats", titre: "Révélation", phase: "results", ...premiersPuisTous(vote) },
  ],
};

const ceciOuCela: Demo = {
  id: "ceci-ou-cela", jeu: "ceci-ou-cela", titre: "Ceci ou Cela",
  choisir: (items) => Math.max(0, items.findIndex((i) => i.text.includes("{joueur}"))),
  repondre: (s, i) => s.input(i, { choice: i % 3 === 0 ? 1 : 0 }),
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "jeu", titre: "Personne n'a répondu", phase: "playing", repondus: 0 },
    { id: "quelques", titre: "La moitié a répondu", phase: "playing", agir: (s) => jusqua(s, moitie(s), (x, i) => x.input(i, { choice: i % 3 === 0 ? 1 : 0 })), repondus: 0 },
    { id: "resultats", titre: "Révélation", phase: "results", ...premiersPuisTous((s, i) => s.input(i, { choice: i % 3 === 0 ? 1 : 0 })) },
  ],
};

const REPONSES_FRIGO = ["Beurre", "Du beurre", "Moutarde", "Champagne", "Moutarde", "Fromage", "Lait", "Moutarde"];
const commeLesAutres: Demo = {
  id: "comme-les-autres", jeu: "comme-les-autres", titre: "Comme les autres",
  repondre: (s, i) => s.input(i, { answers: [REPONSES_FRIGO[i]!, "Yaourt", "Oeufs"].slice(0, s.cfg.reponses) }),
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "jeu", titre: "Personne n'a répondu", phase: "playing", repondus: 0 },
    { id: "quelques", titre: "La moitié a répondu", phase: "playing", agir: (s) => jusqua(s, moitie(s), (x, i) => x.input(i, { answers: [REPONSES_FRIGO[i]!, "Yaourt", "Oeufs"].slice(0, x.cfg.reponses) })), repondus: 0 },
    { id: "resultats", titre: "Révélation des groupes", phase: "results", ...premiersPuisTous((s, i) => s.input(i, { answers: [REPONSES_FRIGO[i]!, "Yaourt", "Oeufs"].slice(0, s.cfg.reponses) })) },
  ],
};

const noter = (s: Session, votant: number, jusquaCible = s.ids.length) => {
  const nbTiers = s.cfg.tiers.length;
  for (let t = 0; t < Math.min(jusquaCible, s.ids.length); t++) {
    if (!s.cfg.noter_soi_meme && t === votant) continue;
    const consensus = t % nbTiers;
    const decale = (votant + t) % 5 === 0 ? Math.min(nbTiers - 1, consensus + 1) : consensus;
    s.input(votant, { target: s.ids[t], tier: decale });
  }
};
const tierList: Demo = {
  id: "tier-list", jeu: "tier-list", titre: "Tier list", repondre: (s, i) => noter(s, i),
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "jeu", titre: "Personne n'a noté", phase: "playing", repondus: 0 },
    { id: "quelques", titre: "Quelques-uns ont fini, d'autres notent", phase: "playing", agir: (s) => {
      jusqua(s, moitie(s), (x, i) => noter(x, i));
      if (s.ids.length > moitie(s)) noter(s, moitie(s), 1);
    }, repondus: 0 },
    { id: "resultats", titre: "Révélation de l'étage", phase: "results", agir: (s) => jusqua(s, s.ids.length, (x, i) => noter(x, i)) },
  ],
};

const PRIX = [0.5, 0.9, 1, 1.3, 1.1, 2, 0.75, 1.5];
const devinerPrix = (s: Session, i: number) => s.input(i, { cents: Math.max(0, Math.round(s.state.priceCents * PRIX[i]!)) + (i === 1 ? 7 : 0) });
const leBonPrix: Demo = {
  id: "le-bon-prix", jeu: "le-bon-prix", titre: "Le bon prix", repondre: devinerPrix,
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "jeu", titre: "Personne n'a proposé de prix", phase: "playing", repondus: 0 },
    { id: "quelques", titre: "La moitié a proposé", phase: "playing", agir: (s) => jusqua(s, moitie(s), devinerPrix), repondus: 0 },
    { id: "resultats", titre: "Révélation du prix", phase: "results", ...premiersPuisTous(devinerPrix) },
  ],
};

// ── Culture gênante (interlude : accroche, bascule, question) ────────────────────────────────────────────────────────

function cultureGenante(id: string, titre: string, type: "qcm" | "estimation"): Demo {
  const repondre = (s: Session, i: number) => {
    if (type === "qcm") {
      const bonne = s.state.correctIndex as number;
      const autre = (bonne + 1) % s.state.choices.length;
      s.input(i, { choice: i % 3 === 2 ? autre : bonne, ms: 1500 + i * 1700 });
    } else {
      const exact = s.state.item.estimation as number;
      const facteurs = [0.8, 1.05, 1.5, 0.3, 2, 1, 0.6, 1.2];
      s.input(i, { value: Math.max(0, Math.round(exact * facteurs[i]!)) });
    }
  };
  return {
    id, jeu: "culture-genante", titre, repondre,
    choisir: (items) => Math.max(0, items.findIndex((q) => (type === "qcm" ? q.reponses !== undefined : q.estimation !== undefined))),
    etapes: [
      { id: "accroche", titre: "L'accroche rigolote", phase: "playing" },
      { id: "bascule", titre: "La bascule", phase: "playing", agir: (s) => s.advance(s.cfg.duree_accroche * 1000) },
      { id: "question", titre: "La question sérieuse", phase: "playing", agir: (s) => s.advance(s.cfg.duree_bascule * 1000), repondus: 0 },
      { id: "quelques", titre: "La moitié a répondu", phase: "playing", agir: (s) => jusqua(s, moitie(s), repondre), repondus: 0 },
      { id: "resultats", titre: "Révélation", phase: "results", ...premiersPuisTous(repondre) },
    ],
  };
}

// ── Jeux en plusieurs étapes ─────────────────────────────────────────────────────────────────────────────────────────

const FINS = ["tu dois le dépenser en une heure", "tout le monde le sait", "tu perds ton téléphone", "plus jamais de fromage", "tu chantes en public chaque jour", "ta belle-mère emménage", "tu dois tout offrir", "tu ne peux plus dire non"];
const ecrire = (s: Session, i: number) => s.input(i, { text: FINS[i] });
/** Tout le monde a écrit : la grâce de 3 s puis le premier vote. */
const passerAuVote = (s: Session) => {
  jusqua(s, s.ids.length, ecrire);
  s.advance(3000);
};
const voterPhrase = (s: Session, jusquA = s.ids.length) => {
  const phrase = s.state.sentences[s.state.index];
  if (!phrase) return;
  let n = 0;
  for (let i = 0; i < s.ids.length && n < jusquA; i++) {
    if (s.ids[i] === phrase.authorId) continue;
    s.input(i, { vote: (i + s.state.index) % 2 === 0 });
    n++;
  }
};
const splitTheRoom: Demo = {
  id: "split-the-room", jeu: "split-the-room", titre: "Split the Room", repondre: ecrire,
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "ecriture", titre: "Écriture : personne n'a fini", phase: "playing", repondus: 0 },
    { id: "ecriture-partielle", titre: "Écriture : la moitié a fini", phase: "playing", agir: (s) => jusqua(s, moitie(s), ecrire), repondus: 0 },
    { id: "vote", titre: "Vote sur une phrase", phase: "playing", agir: (s) => { passerAuVote(s); voterPhrase(s, Math.max(1, Math.floor((s.ids.length - 1) / 2))); } },
    { id: "revelation", titre: "Révélation d'une phrase", phase: "playing", agir: (s) => voterPhrase(s) },
    { id: "resultats", titre: "Résultats de la manche", phase: "results", agir: (s) => {
      for (let garde = 0; garde < 20 && !s.ctx.ended; garde++) {
        if (s.state.step === "reveal") s.advance(s.cfg.duree_revelation * 1000);
        else if (s.state.step === "vote") { voterPhrase(s); if (s.state.step === "vote") s.advance(s.cfg.duree_vote * 1000); }
        else break;
      }
    } },
  ],
};

const offsets = [-120, 340, -420, 60, 210, -260, 150, -30];
const compteARebours: Demo = {
  id: "compte-a-rebours", jeu: "compte-a-rebours", titre: "Compte à rebours chaotique",
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "annonce", titre: "La cible est annoncée", phase: "playing" },
    { id: "pret", titre: "Prêts ? Le compteur démarre", phase: "playing", agir: (s) => s.advance(s.cfg.annonce * 1000) },
    { id: "course", titre: "Le compteur tourne", phase: "playing", agir: (s) => s.advance(GO_LEAD_MS) },
    { id: "stops", titre: "Les premiers appuient sur STOP", phase: "playing", agir: (s) => {
      s.advance(Math.max(500, s.state.cible * 1000 - 2500));
      const ecoule = s.ctx.activeNow() - s.state.startedAt;
      jusqua(s, moitie(s), (x, i) => x.input(i, { ms: Math.round(ecoule - 150 * i) }));
    } },
    { id: "resultats", titre: "Révélation des écarts", phase: "results", agir: (s) => {
      s.advance(2500);
      jusqua(s, s.ids.length, (x, i) => x.input(i, { ms: Math.round(x.state.cible * 1000 + offsets[i]!) }));
    } },
  ],
};

// Simon : le joueur 1 gagne ; plus on est loin dans la liste, plus on tombe tôt.
function jouerSimon(s: Session, jusquAEtat: (s: Session) => boolean) {
  const debut = s.state.item.start as number;
  for (let garde = 0; garde < 400 && !s.ctx.ended && !jusquAEtat(s); garde++) {
    const st = s.state;
    if (st.stage === "show") s.advance(1600 + st.seq.length * (st.show?.noteMs ?? 400) + 500);
    else if (st.stage === "play") {
      s.ids.forEach((id, i) => {
        if (!st.alive.has(id) || st.done.has(id)) return;
        const chute = i > 0 && st.seq.length === debut + Math.max(0, s.ids.length - 1 - i);
        for (const pad of st.seq as number[]) {
          if (!st.alive.has(id)) break;
          s.input(i, { pad: chute ? (pad + 1) % 4 : pad });
          if (chute) break;
        }
      });
      if (st.stage === "play") s.advance(5000);
    } else if (st.stage === "between") s.advance(2600);
    else if (st.stage === "over") s.advance(5000);
    else s.advance(100);
  }
}
const simon: Demo = {
  id: "simon", jeu: "simon", titre: "Simon",
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "memorisation", titre: "La suite est montrée", phase: "playing" },
    { id: "reproduction", titre: "Les joueurs reproduisent", phase: "playing", agir: (s) => {
      s.advance(1600 + s.state.seq.length * s.state.show.noteMs + 500);
      jusqua(s, Math.floor((s.ids.length - 1) / 2), (x, i) => { for (const pad of x.state.seq as number[]) x.input(i, { pad }); });
      uneErreur(s);
    } },
    { id: "tour2", titre: "Tour suivant : un joueur a fini", phase: "playing", agir: (s) => jouerSimon(s, (x) => x.state.stage === "show" && x.state.seq.length > s.state.item.start) },
    { id: "victoire", titre: "Le dernier debout", phase: "playing", agir: (s) => jouerSimon(s, (x) => x.state.stage === "over") },
    { id: "resultats", titre: "Résultats de la manche", phase: "results", agir: (s) => jouerSimon(s, (x) => x.ctx.ended) },
  ],
};
/** Le dernier joueur de la liste se trompe (visible dans « éliminés »). */
function uneErreur(s: Session) {
  const dernier = s.ids.length - 1;
  if (dernier > 0 && s.state.alive.has(s.ids[dernier])) s.input(dernier, { pad: (s.state.seq[0] + 1) % 4 });
}

// Pierre-feuille-ciseaux : tournoi, joueurs jouent selon leur place et le numéro du lancer.
function jouerPfc(s: Session, jusquAEtat: (s: Session) => boolean) {
  for (let garde = 0; garde < 300 && !s.ctx.ended && !jusquAEtat(s); garde++) {
    const st = s.state;
    if (st.step === "draw") s.advance(5000);
    else if (st.step === "pick") {
      for (const { duel, index } of pendingDuels(st.bracket, st.round)) {
        if (!st.active.has(index)) continue;
        const a = s.ids.indexOf(duel.a!);
        const b = s.ids.indexOf(duel.b!);
        s.input(duel.a!, { choice: (a + st.throwNo) % 3 });
        s.input(duel.b!, { choice: (b + st.throwNo + (a === b ? 0 : 2)) % 3 });
      }
      if (st.step === "pick") s.advance(12000);
    } else if (st.step === "reveal") s.advance(7000);
    else if (st.step === "advance") s.advance(3000);
    else s.advance(1000);
  }
}
const pierreFeuilleCiseaux: Demo = {
  id: "pierre-feuille-ciseaux", jeu: "pierre-feuille-ciseaux", titre: "Pierre-feuille-ciseaux",
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "tirage", titre: "Tirage du tableau", phase: "playing" },
    { id: "choix", titre: "Les duels choisissent", phase: "playing", agir: (s) => s.advance(5000) },
    { id: "egalite", titre: "Égalité : les mêmes coups", phase: "playing", alternatif: true, agir: (s) => {
      for (const {duel} of pendingDuels(s.state.bracket, s.state.round)) { s.input(duel.a!, {choice: 0}); s.input(duel.b!, {choice: 0}); }
    } },
    { id: "rejeu", titre: "Égalité ! On rejoue", phase: "playing", alternatif: true, agir: (s) => {
      for (const {duel} of pendingDuels(s.state.bracket, s.state.round)) { s.input(duel.a!, {choice: 0}); s.input(duel.b!, {choice: 0}); }
      s.advance(6000);
    } },
    { id: "revelation", titre: "Révélation des coups", phase: "playing", agir: (s) => jouerPfc(s, (x) => x.state.step === "reveal") },
    { id: "tour", titre: "Les gagnants avancent", phase: "playing", agir: (s) => jouerPfc(s, (x) => x.state.step === "advance") },
    { id: "resultats", titre: "Le champion", phase: "results", agir: (s) => jouerPfc(s, (x) => x.ctx.ended) },
  ],
};

// Imposteur
const imposteur: Demo = {
  id: "imposteur", jeu: "imposteur", titre: "L'imposteur",
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "mot", titre: "Chacun découvre son mot", phase: "playing", telephones: (s) => [s.ids.indexOf(s.state.imposterId), s.ids.indexOf(s.state.imposterId) === 0 ? 1 : 0] },
    { id: "parole", titre: "Chacun son tour, un indice", phase: "playing", agir: (s) => s.advance(s.cfg.duree_mot * 1000), telephones: (s) => [s.ids.indexOf(s.state.order[s.state.speaker] ?? s.ids[0]), (s.ids.indexOf(s.state.order[s.state.speaker]) + 1) % s.ids.length] },
    { id: "parole-suite", titre: "Trois ont parlé", phase: "playing", agir: (s) => parler(s, Math.min(3, s.ids.length - 1)) },
    { id: "decision", titre: "Revoter ou un 2e tour ?", phase: "playing", agir: (s) => parler(s, s.ids.length) },
    { id: "vote", titre: "Le vote", phase: "playing", agir: (s) => {
      if (s.state.step === "decision") { jusqua(s, s.ids.length, (x, i) => x.input(i, { choice: "vote" })); s.advance(2000); }
    } },
    { id: "resultats", titre: "Démasqué !", phase: "results", agir: (s) => voterImposteur(s, true) },
    { id: "resultats-gagne", titre: "L'imposteur s'en sort", phase: "results", alternatif: true, agir: (s) => voterImposteur(s, false) },
  ],
};
function parler(s: Session, n: number) {
  for (let k = 0; k < n && s.state.step === "parole"; k++) s.input(s.state.order[s.state.speaker], { done: true });
}
function voterImposteur(s: Session, demasque: boolean) {
  parler(s, s.ids.length);
  if (s.state.step === "decision") { jusqua(s, s.ids.length, (x, i) => x.input(i, { choice: "vote" })); s.advance(2000); }
  const imp = s.state.imposterId as string;
  const innocents = s.ids.filter((id) => id !== imp);
  s.ids.forEach((id, i) => {
    if (id === imp) return s.input(i, { target: innocents[0] });
    const autres = innocents.filter((x) => x !== id);
    // Démasqué : presque tout le monde vote pour lui. Il s'en sort : les voix se dispersent sur les innocents.
    s.input(i, { target: demasque ? (i % 4 === 3 ? autres[0] : imp) : autres[i % autres.length] });
  });
}

// Dessin raté : chaque joueur dessine un petit visage différent ; le dernier rend une page blanche.
function visage(i: number): { c: number; w: number; p: number[] }[] {
  const cx = 500, cy = 500, r = 260 + i * 15;
  const rond: number[] = [];
  for (let k = 0; k <= 28; k++) {
    const a = (k / 28) * Math.PI * 2 + i;
    rond.push(Math.round(cx + Math.cos(a) * r * (1 + 0.06 * Math.sin(k + i))), Math.round(cy + Math.sin(a) * r));
  }
  const bouche: number[] = [];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * (0.15 + 0.7 * (k / 10));
    bouche.push(Math.round(cx + Math.cos(a) * r * 0.55), Math.round(cy + (i % 2 ? 1 : -1) * Math.sin(a) * r * 0.5 + (i % 2 ? 0 : 200)));
  }
  return [
    { c: i % 5, w: 1, p: rond },
    { c: (i + 1) % 5, w: 1, p: [380, 400, 392, 410] },
    { c: (i + 1) % 5, w: 1, p: [620, 400, 632, 410] },
    { c: (i + 2) % 5, w: 0, p: bouche },
    ...(i % 3 === 0 ? [{ c: (i + 3) % 5, w: 0, p: [250, 150, 400, 80, 520, 150, 640, 70, 760, 150] }] : []),
  ].map((t) => ({ ...t, p: t.p.map((v) => Math.max(0, Math.min(GRID, v))) }));
}
const dessiner = (s: Session, i: number) => { if (i < s.ids.length - 1 || s.ids.length < 3) s.input(i, { strokes: visage(i) }); };
const dessinRate: Demo = {
  id: "dessin-rate", jeu: "dessin-rate", titre: "Dessin raté",
  etapes: [
    { id: "intro", titre: "Annonce de la manche", phase: "intro" },
    { id: "dessin", titre: "Tout le monde dessine (en direct)", phase: "playing", agir: (s) => jusqua(s, s.ids.length, dessiner) },
    { id: "galerie", titre: "Défilé des dessins", phase: "playing", agir: (s) => s.advance(s.cfg.duree_dessin * 1000 + 100) },
    { id: "vote", titre: "Le vote", phase: "playing", agir: (s) => s.advance(s.state.gallery.length * s.cfg.duree_galerie * 1000) },
    { id: "resultats", titre: "Le plus beau raté", phase: "results", agir: (s) => {
      const candidats: string[] = s.state.order.filter((id: string) => (s.state.drawings.get(id)?.length ?? 0) > 0);
      s.ids.forEach((id, i) => {
        const cible = candidats[(i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 0) % candidats.length]!;
        s.input(i, { target: cible === id ? candidats[(candidats.indexOf(cible) + 1) % candidats.length] : cible });
      });
    } },
  ],
};

export const DEMOS: Demo[] = [
  quiEstLePlus,
  ceciOuCela,
  tierList,
  commeLesAutres,
  leBonPrix,
  splitTheRoom,
  compteARebours,
  simon,
  pierreFeuilleCiseaux,
  cultureGenante("culture-genante-qcm", "Culture gênante : QCM", "qcm"),
  cultureGenante("culture-genante-estimation", "Culture gênante : estimation", "estimation"),
  imposteur,
  dessinRate,
];

/** Rejoue les étapes 0…k sur une manche neuve dont le temps simulé aboutit à l'instant zéro de la scène. */
export function monterEtape(demo: Demo, k: number, joueurs: PublicPlayer[]): Session {
  const jouer = (origine: number) => {
    const s = creerSession(demo.jeu, joueurs, { origine, choisir: demo.choisir });
    let lance = false;
    demo.etapes.forEach((e, j) => {
      if (j > k || (e.alternatif && j !== k)) return;
      if (e.phase !== "intro" && !lance) { s.jouer(); lance = true; }
      e.agir?.(s);
    });
    return s;
  };
  const essai = jouer(0);
  return jouer(T0 - essai.sim);
}
