// "Split the Room" : on termine une situation (« Tu gagnes 1 million d'euros, mais… »), puis la salle vote OUI / NON
// sur chaque phrase anonyme. L'auteur marque d'autant plus que la salle est coupée en deux (50/50 = jackpot).
// Une manche, trois étapes : écrire (chrono 1), puis une phrase à la fois : vote (chrono 2) + révélation (chrono 3).
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { allConnectedDone } from "../helpers";

const configSchema = z.object({
  nom: z.string().default("Split the Room"),
  description: z.string().default("Finis la phrase pour diviser la salle : OUI ou NON, le plus 50/50 gagne"),
  duree_ecriture: z.number().positive().default(60),
  duree_vote: z.number().positive().default(15),
  duree_revelation: z.number().positive().default(9),
  temps_resultats: z.number().nonnegative().default(15),
  longueur_max: z.number().int().min(10).max(200).default(80),
  points: z.object({ max: z.number().nonnegative().default(300) }).default({ max: 300 }),
  situations: z.array(z.string().min(1)).min(1, "Ajoute au moins une situation"),
});

type Cfg = z.infer<typeof configSchema>;
type Ctx = RoundContext<Cfg>;
type Item = string;
type Step = "write" | "vote" | "reveal";

/** Quand tout le monde a écrit, on laisse ce délai (s) pour corriger une faute avant d'enchaîner. */
export const GRACE_SECONDS = 3;

/** perfect = écart minimal possible ; unanimous = tout le monde pareil ; none = moins de 2 votes ; split = entre les deux. */
export type Verdict = "perfect" | "split" | "unanimous" | "none";

interface Sentence {
  authorId: string;
  text: string;
  /** votant → true (OUI) / false (NON), rempli au fil du vote */
  votes: Map<string, boolean>;
  done: boolean;
  /** Votes dans l'ordre d'affichage de la jauge (mélangé, anonyme), figé à la révélation. */
  order: boolean[];
  gain: number;
}

interface State {
  start: string;
  step: Step;
  texts: Map<string, string>; // auteur → fin de phrase (non vide)
  graceStarted: boolean;
  sentences: Sentence[];
  index: number;
  scores: Record<string, number>;
}

/** Ce que reçoivent TV et téléphones. L'auteur et les votes n'y figurent qu'à la révélation. */
export interface Pub {
  step: Step;
  /** Début de la situation (« Tu peux voler, mais… »). */
  start: string;
  maxLength: number;
  /** Étape écrire : qui a envoyé une fin (pas ce qu'il a écrit). */
  writtenIds: string[];
  allWritten: boolean;
  /** Étapes voter / révéler. */
  index: number;
  total: number;
  /** Fin de phrase écrite par l'auteur. */
  ending: string | null;
  /** Votes reçus / attendus (tous sauf l'auteur). */
  votedCount: number;
  voterCount: number;
  /** Révélation seulement. */
  authorId: string | null;
  yes: number;
  no: number;
  /** Les votes dans l'ordre de remplissage de la jauge (true = OUI). */
  sequence: boolean[];
  verdict: Verdict | null;
  authorGain: number;
}

export interface Priv {
  /** Ma fin de phrase envoyée (étape écrire), null si rien envoyé. */
  text: string | null;
  /** Suis-je l'auteur de la phrase affichée ? */
  isAuthor: boolean;
  /** Mon vote sur la phrase affichée (true = OUI), null si pas voté. */
  vote: boolean | null;
}

export interface ResultSentence {
  authorId: string;
  text: string;
  yes: number;
  no: number;
  gain: number;
  /** Phrase réellement passée au vote (false si la manche a été écourtée). */
  played: boolean;
  /** La plus coupée de la manche (plus gros gain, > 0). */
  best: boolean;
}
export interface Results {
  start: string;
  sentences: ResultSentence[];
}

/** Texte nettoyé : espaces réduits, coupé à la longueur max. Chaîne vide = pas de phrase. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, max).trim();
}

/** Verdict et points de l'auteur d'après le nombre de OUI / NON. */
export function scoreSplit(yes: number, no: number, max: number): { verdict: Verdict; gain: number } {
  const n = yes + no;
  if (n < 2) return { verdict: "none", gain: 0 };
  const gap = Math.abs(yes - no);
  const minGap = n % 2;
  if (gap === n) return { verdict: "unanimous", gain: 0 };
  const gain = Math.round((max * (n - gap)) / (n - minGap));
  return { verdict: gap === minGap ? "perfect" : "split", gain };
}

const count = (s: Sentence) => {
  const all = [...s.votes.values()];
  const yes = all.filter(Boolean).length;
  return { yes, no: all.length - yes };
};

export default defineMiniGame<Cfg, Item, State>({
  id: "split-the-room",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.situations,
  roundSeconds: () => null,
  estimateSeconds: (cfg) => cfg.duree_ecriture * 0.7 + 7 * (cfg.duree_vote * 0.5 + cfg.duree_revelation) + cfg.temps_resultats,

  start: (item) => ({ start: item, step: "write", texts: new Map(), graceStarted: false, sentences: [], index: 0, scores: {} }),

  onPlay(state, ctx) {
    ctx.countdown(ctx.cfg.duree_ecriture, () => startVoting(state, ctx));
  },

  input(state, playerId, payload, ctx) {
    if (!ctx.players.some((p) => p.id === playerId)) return;
    const p = payload as { text?: unknown; vote?: unknown } | null;

    if (state.step === "write") {
      if (typeof p?.text !== "string") return;
      const text = cleanText(p.text, ctx.cfg.longueur_max);
      if (text) state.texts.set(playerId, text);
      else state.texts.delete(playerId); // vide = pas de phrase
      checkWritten(state, ctx);
      return;
    }

    if (state.step === "vote") {
      const sentence = state.sentences[state.index];
      if (!sentence || typeof p?.vote !== "boolean") return;
      if (playerId === sentence.authorId) return; // l'auteur ne vote pas
      sentence.votes.set(playerId, p.vote); // on peut changer d'avis jusqu'à la fin du chrono
      checkVoted(state, ctx);
    }
  },

  onPresenceChange(state, ctx) {
    checkWritten(state, ctx);
    checkVoted(state, ctx);
  },

  publicView(state, ctx): Pub {
    const sentence = state.step === "write" ? undefined : state.sentences[state.index];
    const revealed = state.step === "reveal" && sentence ? sentence : null;
    const c = revealed ? count(revealed) : { yes: 0, no: 0 };
    return {
      step: state.step,
      start: state.start,
      maxLength: ctx.cfg.longueur_max,
      writtenIds: [...state.texts.keys()],
      allWritten: allWritten(state, ctx),
      index: state.index,
      total: state.sentences.length,
      ending: sentence?.text ?? null,
      votedCount: sentence?.votes.size ?? 0,
      voterCount: Math.max(0, ctx.players.length - 1),
      authorId: revealed?.authorId ?? null,
      yes: c.yes,
      no: c.no,
      sequence: revealed?.order ?? [],
      verdict: revealed ? scoreSplit(c.yes, c.no, ctx.cfg.points.max).verdict : null,
      authorGain: revealed?.gain ?? 0,
    };
  },

  privateView(state, playerId): Priv {
    const sentence = state.step === "write" ? undefined : state.sentences[state.index];
    return {
      text: state.texts.get(playerId) ?? null,
      isAuthor: sentence?.authorId === playerId,
      vote: sentence?.votes.get(playerId) ?? null,
    };
  },

  finish(state) {
    const best = Math.max(0, ...state.sentences.filter((s) => s.done).map((s) => s.gain));
    // Phrases non jouées (manche écourtée, ou moins de 2 phrases) : on les montre quand même.
    const written: Sentence[] =
      state.sentences.length > 0
        ? state.sentences
        : [...state.texts].map(([authorId, text]) => ({ authorId, text, votes: new Map(), done: false, order: [], gain: 0 }));
    const results: Results = {
      start: state.start,
      sentences: written.map((s) => {
        const c = s.done ? count(s) : { yes: 0, no: 0 };
        return { authorId: s.authorId, text: s.text, ...c, gain: s.done ? s.gain : 0, played: s.done, best: s.done && best > 0 && s.gain === best };
      }),
    };
    return { results, scores: state.scores };
  },
});

const allWritten = (state: State, ctx: Ctx) => allConnectedDone(ctx, ctx.players.map((p) => p.id), (id) => state.texts.has(id));

/** Tous les joueurs connectés ont écrit : court délai pour corriger, puis on enchaîne. */
function checkWritten(state: State, ctx: Ctx) {
  if (state.step !== "write" || state.graceStarted || !allWritten(state, ctx)) return;
  state.graceStarted = true;
  ctx.countdown(GRACE_SECONDS, () => startVoting(state, ctx));
}

/** Tous les votants connectés (tout le monde sauf l'auteur) ont voté : on révèle sans attendre le chrono. */
function checkVoted(state: State, ctx: Ctx) {
  const sentence = state.sentences[state.index];
  if (state.step !== "vote" || !sentence) return;
  const voters = ctx.players.map((p) => p.id).filter((id) => id !== sentence.authorId);
  if (allConnectedDone(ctx, voters, (id) => sentence.votes.has(id))) reveal(state, ctx);
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Fin de l'écriture : on tire l'ordre des phrases puis on lance la première. */
function startVoting(state: State, ctx: Ctx) {
  const authors = shuffle([...state.texts.keys()], ctx.rng);
  if (authors.length < 2) return ctx.end(); // pas de quoi voter : direct aux résultats
  state.sentences = authors.map((authorId) => ({ authorId, text: state.texts.get(authorId)!, votes: new Map(), done: false, order: [], gain: 0 }));
  state.index = 0;
  beginVote(state, ctx);
}

function beginVote(state: State, ctx: Ctx) {
  state.step = "vote";
  ctx.countdown(ctx.cfg.duree_vote, () => reveal(state, ctx));
}

/** Fin du vote (chrono ou tout le monde a voté) : points de l'auteur, puis révélation. */
function reveal(state: State, ctx: Ctx) {
  const sentence = state.sentences[state.index];
  if (!sentence || state.step !== "vote") return;
  state.step = "reveal";
  sentence.done = true;
  sentence.order = shuffle([...sentence.votes.values()], ctx.rng);
  const { yes, no } = count(sentence);
  sentence.gain = scoreSplit(yes, no, ctx.cfg.points.max).gain;
  if (sentence.gain > 0) state.scores[sentence.authorId] = (state.scores[sentence.authorId] ?? 0) + sentence.gain;
  ctx.countdown(ctx.cfg.duree_revelation, () => {
    state.index++;
    if (state.index >= state.sentences.length) return ctx.end();
    beginVote(state, ctx);
  });
}
