// "Comme les autres" : tout le monde répond à la même consigne ("Cite un truc qu'on trouve dans un frigo").
// On marque quand sa réponse est la même que celle d'autres joueurs ; la plus répandue rapporte un bonus.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { normalizeAnswer, normalizeQuestion, questionSchema, cleanText, endWhenAllDone, playerIds } from "../helpers";

export const MAX_LENGTH = 40;

const configSchema = z.object({
  nom: z.string().default("Comme les autres"),
  description: z.string().default("Trouvez la même réponse que les autres invités !"),
  duree: z.number().positive().default(30),
  temps_resultats: z.number().nonnegative().default(25),
  tolerance_fautes: z.boolean().default(true),
  reponses: z.number().int().min(1, "reponses : entre 1 et 3").max(3, "reponses : entre 1 et 3").default(1),
  points: z
    .object({
      par_joueur: z.number().default(50),
      majorite: z.number().default(50),
    })
    .default({ par_joueur: 50, majorite: 50 }),
  questions: z.array(questionSchema).min(1, "Ajoute au moins une question"),
});

type Cfg = z.infer<typeof configSchema>;
type Item = { text: string; duration?: number };
interface State {
  question: string;
  /** Réponses nettoyées de chaque joueur (sans doublons), dans l'ordre saisi. */
  answers: Map<string, string[]>;
}

export interface Pub {
  question: string;
  /** Nombre de réponses autorisées par joueur. */
  perPlayer: number;
  /** Qui a répondu (jamais quoi !). */
  answeredIds: string[];
}
export interface Priv {
  answers: string[];
}
export interface AnswerGroup {
  /** Réponse la plus fréquente dans le groupe, telle que tapée. */
  label: string;
  playerIds: string[];
  /** Points gagnés par chaque membre grâce à ce groupe. */
  points: number;
  /** Groupe(s) le plus nombreux, taille >= 2. */
  biggest: boolean;
}
export interface Results {
  question: string;
  /** Du plus grand au plus petit. */
  groups: AnswerGroup[];
  /** Joueurs de la manche sans aucune réponse. */
  silentIds: string[];
}

// ───────────── Regroupement des réponses ─────────────

/**
 * Vrai si a et b sont identiques à une faute près : insertion, suppression, substitution (distance de Levenshtein <= 1)
 * ou inversion de deux lettres voisines ("champagen"), la faute de frappe la plus courante sur téléphone.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  return long.slice(i + 1) === short.slice(i);
}

/** Une faute n'est tolérée que sur de vrais mots d'au moins 5 lettres (jamais sur "chat"/"chien", ni sur les nombres). */
const fuzzyEligible = (key: string) => key.length >= 5 && /^[a-z ]+$/.test(key);

const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/**
 * Regroupe les réponses de tous les joueurs. Un joueur compte une seule fois par groupe,
 * même s'il a donné deux variantes de la même réponse. Résultat trié du plus grand au plus petit.
 */
export function groupAnswers(byPlayer: Map<string, string[]>, tolerance: boolean): Omit<AnswerGroup, "points" | "biggest">[] {
  // 1. Clés normalisées → joueurs (dans l'ordre d'arrivée).
  const byKey = new Map<string, Map<string, string>>();
  for (const [playerId, texts] of byPlayer) {
    for (const text of texts) {
      const key = normalizeAnswer(text);
      if (!key) continue;
      const players = byKey.get(key) ?? new Map<string, string>();
      if (!players.has(playerId)) players.set(playerId, text);
      byKey.set(key, players);
    }
  }

  // 2. Fusion des fautes de frappe : chaque clé rejoint la plus fréquente qui lui ressemble (pas de chaîne de proche en proche).
  const keys = [...byKey.keys()].sort((a, b) => byKey.get(b)!.size - byKey.get(a)!.size || a.localeCompare(b));
  const heads: string[] = [];
  const clusters = new Map<string, string[]>();
  for (const key of keys) {
    const head = tolerance && fuzzyEligible(key) ? heads.find((h) => fuzzyEligible(h) && withinOneEdit(h, key)) : undefined;
    if (head) clusters.get(head)!.push(key);
    else {
      heads.push(key);
      clusters.set(key, [key]);
    }
  }

  // 3. Un groupe par cluster.
  const groups = heads.map((head) => {
    const members = new Map<string, string>();
    for (const key of clusters.get(head)!) for (const [pid, text] of byKey.get(key)!) if (!members.has(pid)) members.set(pid, text);
    const counts = new Map<string, number>();
    for (const text of members.values()) counts.set(text.toLowerCase(), (counts.get(text.toLowerCase()) ?? 0) + 1);
    let best = "";
    let bestCount = 0;
    for (const text of members.values()) {
      const c = counts.get(text.toLowerCase())!;
      if (c > bestCount || (c === bestCount && text.length < best.length)) {
        best = text;
        bestCount = c;
      }
    }
    return {
      label: capitalize(best),
      playerIds: [...members.keys()],
    };
  });
  return groups.sort((a, b) => b.playerIds.length - a.playerIds.length || a.label.localeCompare(b.label, "fr"));
}

/** Fin anticipée : tous les joueurs connectés ont répondu. */
function checkAllAnswered(state: State, ctx: RoundContext<Cfg>) {
  endWhenAllDone(ctx, (id) => state.answers.has(id));
}

export default defineMiniGame<Cfg, Item, State>({
  id: "comme-les-autres",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.questions.map(normalizeQuestion),
  roundSeconds: (cfg, item) => item.duration ?? cfg.duree,
  estimateSeconds: (cfg) => cfg.duree + cfg.temps_resultats,

  start: (item) => ({ question: item.text, answers: new Map() }),

  input(state, playerId, payload, ctx) {
    const raw = (payload as { answers?: unknown } | null)?.answers;
    if (!Array.isArray(raw)) return;
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const r of raw) {
      if (typeof r !== "string") continue;
      const text = cleanText(r, MAX_LENGTH);
      const key = normalizeAnswer(text);
      if (!key || seen.has(key)) continue; // vide, ou doublon : ne compte qu'une fois
      seen.add(key);
      cleaned.push(text);
      if (cleaned.length >= ctx.cfg.reponses) break;
    }
    // Pas de réponse valable : on retire la réponse précédente (le joueur peut se rétracter).
    if (cleaned.length === 0) state.answers.delete(playerId);
    else state.answers.set(playerId, cleaned);
    checkAllAnswered(state, ctx);
  },

  onPresenceChange: checkAllAnswered,

  publicView: (state, ctx): Pub => ({ question: state.question, perPlayer: ctx.cfg.reponses, answeredIds: [...state.answers.keys()] }),
  privateView: (state, playerId): Priv => ({ answers: state.answers.get(playerId) ?? [] }),

  finish(state, ctx) {
    const { par_joueur, majorite } = ctx.cfg.points;
    const raw = groupAnswers(state.answers, ctx.cfg.tolerance_fautes);
    const biggest = Math.max(0, ...raw.map((g) => g.playerIds.length));
    const scores: Record<string, number> = {};
    const groups: AnswerGroup[] = raw.map((g) => {
      const size = g.playerIds.length;
      const isBiggest = size >= 2 && size === biggest;
      const points = size >= 2 ? par_joueur * (size - 1) + (isBiggest ? majorite : 0) : 0;
      if (points) for (const id of g.playerIds) scores[id] = (scores[id] ?? 0) + points;
      return { ...g, points, biggest: isBiggest };
    });
    const silentIds = playerIds(ctx).filter((id) => !state.answers.has(id));
    const results: Results = { question: state.question, groups, silentIds };
    return { results, scores };
  },
});
