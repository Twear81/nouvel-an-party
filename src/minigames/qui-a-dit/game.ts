// "Qui a dit ça ?" : tout le monde répond à la même consigne, puis on devine qui a écrit chaque citation.
// Une manche, deux étapes : écrire (chrono 1), puis une citation à la fois : vote (chrono 2) + révélation (chrono 3).
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";

const configSchema = z.object({
  nom: z.string().default("Qui a dit ça ?"),
  description: z.string().default("Écrivez une réponse, puis devinez qui a écrit quoi"),
  duree_ecriture: z.number().positive().default(60),
  duree_vote: z.number().positive().default(15),
  duree_revelation: z.number().positive().default(5),
  temps_resultats: z.number().nonnegative().default(15),
  longueur_max: z.number().int().min(10).max(200).default(80),
  points: z
    .object({
      bonne_reponse: z.number().default(100),
      auteur_piegeur: z.number().default(50),
    })
    .default({ bonne_reponse: 100, auteur_piegeur: 50 }),
  consignes: z.array(z.string().min(1)).min(1, "Ajoute au moins une consigne"),
});

type Cfg = z.infer<typeof configSchema>;
type Ctx = RoundContext<Cfg>;
type Item = string;
type Step = "write" | "guess" | "reveal";

/** Quand tout le monde a écrit, on laisse ce délai (s) pour corriger une faute avant d'enchaîner. */
export const GRACE_SECONDS = 3;

interface Quote {
  authorId: string;
  text: string;
  /** votant → joueur désigné (rempli au fil du vote) */
  votes: Map<string, string>;
  done: boolean;
}

interface State {
  prompt: string;
  step: Step;
  texts: Map<string, string>; // auteur → citation (non vide)
  graceStarted: boolean;
  quotes: Quote[];
  index: number;
  scores: Record<string, number>;
}

export interface VoteInfo {
  voterId: string;
  targetId: string;
}

/** Ce que reçoivent TV et téléphones. L'auteur n'y figure qu'à la révélation. */
export interface Pub {
  step: Step;
  prompt: string;
  maxLength: number;
  /** Étape écrire : qui a envoyé une citation (pas ce qu'il a écrit). */
  writtenIds: string[];
  allWritten: boolean;
  /** Étapes deviner / révéler. */
  index: number;
  total: number;
  quote: string | null;
  /** Les auteurs possibles : tous ceux qui ont écrit, toujours dans le même ordre. */
  candidateIds: string[];
  /** Votes reçus / attendus (même total pour toutes les citations : on ne devine pas l'auteur par élimination). */
  votedCount: number;
  voterCount: number;
  /** Révélation seulement. */
  authorId: string | null;
  votes: VoteInfo[];
  /** Points gagnés par l'auteur grâce à cette citation. */
  authorGain: number;
  /** Points d'une bonne réponse (affichés sur le téléphone). */
  rightPoints: number;
}

export interface Priv {
  /** Ma citation envoyée (étape écrire), null si je n'ai rien envoyé. */
  text: string | null;
  /** Suis-je l'auteur de la citation affichée ? */
  isAuthor: boolean;
  /** Mon vote sur la citation affichée. */
  vote: string | null;
}

export interface ResultQuote {
  authorId: string;
  text: string;
  votes: VoteInfo[];
  /** Citation réellement passée au vote (false si la manche a été écourtée). */
  played: boolean;
}
export interface Results {
  prompt: string;
  quotes: ResultQuote[];
  /** Auteur(s) ayant trompé le plus de monde. */
  trickster: { playerIds: string[]; fooled: number } | null;
  /** Meilleur(s) détective(s) : le plus de bonnes réponses. */
  detective: { playerIds: string[]; correct: number } | null;
}

/** Texte nettoyé : espaces réduits, coupé à la longueur max. Chaîne vide = pas de citation. */
export function cleanQuote(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, max).trim();
}

const votesOf = (q: Quote): VoteInfo[] => [...q.votes].map(([voterId, targetId]) => ({ voterId, targetId }));
const fooledBy = (q: Quote) => [...q.votes.values()].filter((t) => t !== q.authorId).length;

export default defineMiniGame<Cfg, Item, State>({
  id: "qui-a-dit",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.consignes,
  roundSeconds: () => null,
  estimateSeconds: (cfg) => cfg.duree_ecriture * 0.7 + 6 * (cfg.duree_vote * 0.5 + cfg.duree_revelation) + cfg.temps_resultats,

  start: (item) => ({ prompt: item, step: "write", texts: new Map(), graceStarted: false, quotes: [], index: 0, scores: {} }),

  onPlay(state, ctx) {
    ctx.countdown(ctx.cfg.duree_ecriture, () => startGuessing(state, ctx));
  },

  input(state, playerId, payload, ctx) {
    if (!ctx.players.some((p) => p.id === playerId)) return;
    const p = payload as { text?: unknown; target?: unknown } | null;

    if (state.step === "write") {
      if (typeof p?.text !== "string") return;
      const text = cleanQuote(p.text, ctx.cfg.longueur_max);
      if (text) state.texts.set(playerId, text);
      else state.texts.delete(playerId); // vide = pas de citation
      // Tout le monde a écrit : court délai pour corriger, puis on enchaîne.
      if (!state.graceStarted && state.texts.size >= ctx.players.length) {
        state.graceStarted = true;
        ctx.countdown(GRACE_SECONDS, () => startGuessing(state, ctx));
      }
      return;
    }

    if (state.step === "guess") {
      const quote = state.quotes[state.index];
      const target = p?.target;
      if (!quote || typeof target !== "string") return;
      if (playerId === quote.authorId || target === playerId) return; // l'auteur ne vote pas, pas de vote pour soi
      if (!state.texts.has(target)) return; // seuls ceux qui ont écrit sont des auteurs possibles
      quote.votes.set(playerId, target); // on peut changer d'avis jusqu'à la fin du chrono
      if (quote.votes.size >= ctx.players.length - 1) reveal(state, ctx);
    }
  },

  publicView(state, ctx): Pub {
    const quote = state.step === "write" ? undefined : state.quotes[state.index];
    const revealed = state.step === "reveal" && quote;
    return {
      step: state.step,
      prompt: state.prompt,
      maxLength: ctx.cfg.longueur_max,
      writtenIds: [...state.texts.keys()],
      allWritten: state.texts.size >= ctx.players.length,
      index: state.index,
      total: state.quotes.length,
      quote: quote?.text ?? null,
      candidateIds: ctx.players.filter((pl) => state.texts.has(pl.id)).map((pl) => pl.id),
      votedCount: quote?.votes.size ?? 0,
      voterCount: Math.max(0, ctx.players.length - 1),
      authorId: revealed ? quote.authorId : null,
      votes: revealed ? votesOf(quote) : [],
      authorGain: revealed ? fooledBy(quote) * ctx.cfg.points.auteur_piegeur : 0,
      rightPoints: ctx.cfg.points.bonne_reponse,
    };
  },

  privateView(state, playerId): Priv {
    const quote = state.step === "write" ? undefined : state.quotes[state.index];
    return {
      text: state.texts.get(playerId) ?? null,
      isAuthor: quote?.authorId === playerId,
      vote: quote?.votes.get(playerId) ?? null,
    };
  },

  finish(state) {
    const fooled: Record<string, number> = {};
    const correct: Record<string, number> = {};
    for (const q of state.quotes) {
      if (!q.done) continue;
      fooled[q.authorId] = (fooled[q.authorId] ?? 0) + fooledBy(q);
      for (const [voter, target] of q.votes) if (target === q.authorId) correct[voter] = (correct[voter] ?? 0) + 1;
    }
    const top = (counts: Record<string, number>) => {
      const max = Math.max(0, ...Object.values(counts));
      return max > 0 ? { max, ids: Object.keys(counts).filter((k) => counts[k] === max) } : null;
    };
    const t = top(fooled);
    const d = top(correct);

    // Citations non jouées (manche écourtée, ou moins de 2 citations) : on les montre quand même.
    const written: Quote[] =
      state.quotes.length > 0 ? state.quotes : [...state.texts].map(([authorId, text]) => ({ authorId, text, votes: new Map(), done: false }));
    const results: Results = {
      prompt: state.prompt,
      quotes: written.map((q) => ({ authorId: q.authorId, text: q.text, votes: q.done ? votesOf(q) : [], played: q.done })),
      trickster: t ? { playerIds: t.ids, fooled: t.max } : null,
      detective: d ? { playerIds: d.ids, correct: d.max } : null,
    };
    return { results, scores: state.scores };
  },
});

function shuffle<T>(list: T[], rng: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Fin de l'écriture : on tire l'ordre des citations puis on lance la première. */
function startGuessing(state: State, ctx: Ctx) {
  const authors = shuffle([...state.texts.keys()], ctx.rng);
  if (authors.length < 2) return ctx.end(); // pas de quoi deviner : direct aux résultats
  state.quotes = authors.map((authorId) => ({ authorId, text: state.texts.get(authorId)!, votes: new Map(), done: false }));
  state.index = 0;
  beginVote(state, ctx);
}

function beginVote(state: State, ctx: Ctx) {
  state.step = "guess";
  ctx.countdown(ctx.cfg.duree_vote, () => reveal(state, ctx));
}

/** Fin du vote (chrono ou tout le monde a voté) : points, puis révélation de l'auteur. */
function reveal(state: State, ctx: Ctx) {
  const quote = state.quotes[state.index];
  if (!quote || state.step !== "guess") return;
  state.step = "reveal";
  quote.done = true;
  for (const [voter, target] of quote.votes) {
    if (target === quote.authorId) state.scores[voter] = (state.scores[voter] ?? 0) + ctx.cfg.points.bonne_reponse;
  }
  const gain = fooledBy(quote) * ctx.cfg.points.auteur_piegeur;
  if (gain > 0) state.scores[quote.authorId] = (state.scores[quote.authorId] ?? 0) + gain;
  ctx.countdown(ctx.cfg.duree_revelation, () => {
    state.index++;
    if (state.index >= state.quotes.length) return ctx.end();
    beginVote(state, ctx);
  });
}
