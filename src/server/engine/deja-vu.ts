// Mémoire des éléments déjà joués (data/deja-vu.json) : une 2e ou 3e partie dans la soirée évite les questions,
// objets et mots déjà vus, et les thèmes déjà rencontrés. Brique générique : aucun mini-jeu n'y touche,
// il peut seulement décrire ses éléments via `MiniGame.itemInfo`.
import { createHash } from "node:crypto";
import type { MiniGame } from "../../minigames/contract";
import { shuffle } from "../../shared/shuffle";

export interface DejaVuData {
  version: 1;
  /** Compteur croissant : chaque manche démarrée en prend un (ordre d'ancienneté, sans horloge). */
  counter: number;
  /** id du jeu → clé d'élément → numéro d'ordre de sa dernière apparition. */
  items: Record<string, Record<string, number>>;
  /** thème (normalisé) → numéro d'ordre de sa dernière apparition (tous jeux confondus). */
  themes: Record<string, number>;
  /** Jeu de la dernière manche démarrée (la partie suivante ne commence pas par lui, si possible). */
  lastGameId?: string;
}

export interface DejaVuStore {
  load(): unknown;
  save(data: DejaVuData): void;
}

export const emptyDejaVu = (): DejaVuData => ({ version: 1, counter: 0, items: {}, themes: {} });

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const toSeq = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** Relit un contenu quelconque (fichier corrompu, autre version…) : tout ce qui est invalide est ignoré. */
export function sanitizeDejaVu(raw: unknown): DejaVuData {
  const out = emptyDejaVu();
  if (!isRecord(raw) || raw.version !== 1) return out;
  let max = toSeq(raw.counter) ?? 0;
  if (isRecord(raw.items)) {
    for (const [gameId, keys] of Object.entries(raw.items)) {
      if (!isRecord(keys)) continue;
      const clean: Record<string, number> = {};
      for (const [key, seq] of Object.entries(keys)) {
        const n = toSeq(seq);
        if (n === null) continue;
        clean[key] = n;
        max = Math.max(max, n);
      }
      out.items[gameId] = clean;
    }
  }
  if (isRecord(raw.themes)) {
    for (const [theme, seq] of Object.entries(raw.themes)) {
      const n = toSeq(seq);
      if (n === null) continue;
      out.themes[theme] = n;
      max = Math.max(max, n);
    }
  }
  if (typeof raw.lastGameId === "string") out.lastGameId = raw.lastGameId;
  out.counter = max;
  return out;
}

/** JSON à clés triées : deux éléments de même contenu donnent le même texte, quel que soit l'ordre des champs. */
function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (isRecord(v)) {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

export const fingerprint = (item: unknown): string => createHash("sha1").update(stableStringify(item)).digest("hex").slice(0, 16);

/** Un thème est comparé sans casse ni espaces superflus. */
const normalizeTheme = (t: unknown): string | null => (typeof t === "string" && t.trim() ? t.trim().toLowerCase() : null);

function info(game: MiniGame, item: unknown): { keys?: string[]; theme?: string } {
  try {
    return game.itemInfo?.(item) ?? {};
  } catch {
    return {}; // un itemInfo cassé ne doit jamais bloquer une partie
  }
}

/** Clés mémorisées d'un élément : celles que décrit `itemInfo`, sinon son empreinte. */
export function itemKeys(game: MiniGame, item: unknown): string[] {
  const keys = info(game, item).keys;
  return keys && keys.length > 0 ? keys : [fingerprint(item)];
}

export const itemTheme = (game: MiniGame, item: unknown): string | null => normalizeTheme(info(game, item).theme);

/** Nombre de clés déjà vues, et ordre de la plus récente (0 = aucune). */
function seen(data: DejaVuData, game: MiniGame, item: unknown): { count: number; last: number } {
  const known = data.items[game.id] ?? {};
  let count = 0;
  let last = 0;
  for (const key of itemKeys(game, item)) {
    const seq = known[key];
    if (seq === undefined) continue;
    count++;
    last = Math.max(last, seq);
  }
  return { count, last };
}

/** Éléments encore jamais joués (un composite est neuf si aucune de ses clés n'a été vue). */
export function countFresh(data: DejaVuData, game: MiniGame, items: unknown[]): number {
  return items.filter((item) => seen(data, game, item).count === 0).length;
}

/**
 * Les `limit` éléments les plus prioritaires d'un jeu :
 * jamais vus d'abord (ordre aléatoire), puis les moins « vus » (composite : moins de clés déjà vues), puis les plus
 * anciennement vus. À fraîcheur égale, on préfère un thème pas encore rencontré (`usedThemes` : thèmes déjà pris dans
 * la partie en cours, partagé entre les jeux ; sinon le thème vu il y a le plus longtemps).
 * Les thèmes des éléments choisis sont ajoutés à `usedThemes`.
 */
export function pickFresh<T>(data: DejaVuData, game: MiniGame, items: T[], usedThemes: Set<string>, rng: () => number, limit: number): T[] {
  const pool = shuffle(items, rng).map((item) => ({ item, ...seen(data, game, item), theme: itemTheme(game, item) }));
  pool.sort((a, b) => a.count - b.count || a.last - b.last);
  const themeRank = (theme: string | null) => (theme === null ? 0 : usedThemes.has(theme) ? Infinity : (data.themes[theme] ?? 0));
  const out: T[] = [];
  while (out.length < limit && pool.length > 0) {
    const first = pool[0]!;
    let best = first;
    for (const p of pool) {
      if (p.count !== first.count || p.last !== first.last) break; // le pool est trié : fin des ex æquo
      if (themeRank(p.theme) < themeRank(best.theme)) best = p;
    }
    pool.splice(pool.indexOf(best), 1);
    if (best.theme) usedThemes.add(best.theme);
    out.push(best.item);
  }
  return out;
}

/** Note qu'une manche démarre : ses clés et son thème prennent le prochain numéro d'ordre. */
export function markPlayed(data: DejaVuData, game: MiniGame, item: unknown): void {
  const seq = ++data.counter;
  const known = (data.items[game.id] ??= {});
  for (const key of itemKeys(game, item)) known[key] = seq;
  const theme = itemTheme(game, item);
  if (theme) data.themes[theme] = seq;
  data.lastGameId = game.id;
}
