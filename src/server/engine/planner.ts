// Composition de la partie : combien de manches par mini-jeu, et dans quel ordre.
import { shuffle } from "../../shared/shuffle";
import { interludeCounts } from "../../shared/interlude";
import type { CatalogEntry, Setup } from "../../shared/types";
import type { MiniGame } from "../../minigames/contract";

export interface LoadedGame {
  game: MiniGame;
  cfg: any;
  /** Plafond de manches (`manches_max` du yaml, géré par le moteur). Absent = pas de plafond. */
  maxRounds?: number;
}

export interface PlannedRound {
  gameId: string;
  item: unknown;
  /** Manche d'un jeu interlude (surprise). Absent = manche normale. */
  interlude?: boolean;
}

/** N du jeu s'il est un interlude (entier ≥ 1), sinon null. */
export function interludeEvery(game: MiniGame, cfg: unknown): number | null {
  const n = game.interlude?.(cfg);
  return typeof n === "number" && Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

/** Nombre de manches jouables d'un jeu : ses éléments, plafonnés par `manches_max`. */
function availableRounds(game: MiniGame, cfg: unknown, maxRounds: number | undefined): number {
  return Math.min(game.items(cfg).length, maxRounds ?? Infinity);
}

export function buildCatalog(games: LoadedGame[], introSeconds: number): CatalogEntry[] {
  return games.map(({ game, cfg, maxRounds }) => {
    const every = interludeEvery(game, cfg);
    return {
      id: game.id,
      name: game.name(cfg),
      description: game.description(cfg),
      available: availableRounds(game, cfg, maxRounds),
      // Un interlude n'a pas d'annonce : pas d'intro à compter.
      secondsPerRound: Math.round(game.estimateSeconds(cfg) + (every === null ? introSeconds : 0)),
      ...(every === null ? {} : { interlude: every }),
    };
  });
}

/**
 * Réglage par défaut : chaque mini-jeu au moins une fois, puis on ajoute
 * des manches à tour de rôle jusqu'à atteindre la durée cible.
 */
export function defaultSetup(catalog: CatalogEntry[], targetMinutes: number): Setup {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const c of catalog) {
    counts[c.id] = c.available > 0 ? 1 : 0;
    if (c.interlude === undefined) total += counts[c.id]! * c.secondsPerRound;
  }
  const target = targetMinutes * 60;
  while (total < target) {
    let progressed = false;
    for (const c of catalog) {
      if (total >= target) break;
      if (c.interlude !== undefined) continue; // un interlude est un interrupteur : il reste à 1
      if (counts[c.id]! >= c.available) continue;
      counts[c.id]!++;
      total += c.secondsPerRound;
      progressed = true;
    }
    if (!progressed) break; // plus de contenu disponible
  }
  return { counts };
}

/** Borne les valeurs reçues de l'écran de config (0 ≤ n ≤ disponible). */
export function sanitizeSetup(setup: Setup, catalog: CatalogEntry[]): Setup {
  const counts: Record<string, number> = {};
  for (const c of catalog) {
    const n = Math.floor(Number(setup?.counts?.[c.id] ?? 0));
    // Interlude : interrupteur 0/1 (et rien si le jeu n'a aucun contenu).
    const max = c.interlude === undefined ? c.available : Math.min(1, c.available);
    counts[c.id] = Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
  }
  return { counts };
}

/** Après avoir joué `pick`, peut-on ordonner les manches restantes sans répétition consécutive ? */
function canFinishWithoutRepeat(pools: { items: unknown[] }[], pick: { items: unknown[] }): boolean {
  const left = pools.map((p) => p.items.length - (p === pick ? 1 : 0));
  const total = left.reduce((s, n) => s + n, 0);
  return pools.every((p, i) => (p === pick ? left[i]! <= total - left[i]! : left[i]! <= total - left[i]! + 1));
}

/**
 * Tire les manches au hasard (sans doublon) puis les ordonne :
 * - "melange" : on évite deux fois de suite le même mini-jeu quand c'est possible
 * - "groupe"  : toutes les manches d'un mini-jeu à la suite
 */
export function buildPlan(games: LoadedGame[], setup: Setup, order: "melange" | "groupe", rng: () => number): PlannedRound[] {
  const interludes = games.filter(({ game, cfg }) => interludeEvery(game, cfg) !== null);
  const normal = games.filter((g) => !interludes.includes(g));
  return insertInterludes(buildNormalPlan(normal, setup, order, rng), interludes, setup, rng);
}

/**
 * Ajoute les manches interlude au plan normal :
 * - pour chaque bloc complet de N manches normales, UNE manche interlude à une position aléatoire du bloc
 *   (après la 1re, 2e… ou dernière manche du bloc) : donc jamais en première position, et jamais deux de suite
 *   (même avec plusieurs jeux interlude : chacun prend un « trou » libre entre deux manches normales, ou renonce
 *   s'il n'y en a plus dans le bloc) ;
 * - éléments tirés sans répétition ; on s'arrête quand un jeu n'en a plus ;
 * - aucune manche normale mais un interlude activé : le plan est une seule manche interlude (voir `interludeCounts`).
 * Indépendant de l'ordre "melange" / "groupe" : on compte en manches normales.
 */
function insertInterludes(normalPlan: PlannedRound[], games: LoadedGame[], setup: Setup, rng: () => number): PlannedRound[] {
  if (games.length === 0) return normalPlan;
  const sources = games.map(({ game, cfg, maxRounds }) => ({
    id: game.id,
    every: interludeEvery(game, cfg)!,
    available: availableRounds(game, cfg, maxRounds),
    enabled: (setup.counts[game.id] ?? 0) > 0,
  }));
  const n = normalPlan.length;
  const counts = interludeCounts(n, sources);

  // gaps[m] = interlude placé juste après la m-ème manche normale (m ≥ 1 ; m = 0 serait « en premier » : interdit).
  const gaps = new Map<number, PlannedRound>();
  for (const { game, cfg } of games) {
    const want = counts[game.id] ?? 0;
    if (want === 0) continue;
    const items = shuffle(game.items(cfg), rng).slice(0, want);
    if (n === 0) {
      gaps.set(0, { gameId: game.id, item: items[0], interlude: true });
      continue;
    }
    const every = sources.find((s) => s.id === game.id)!.every;
    items.forEach((item, block) => {
      const free: number[] = [];
      for (let s = 1; s <= every; s++) {
        const m = block * every + s;
        // Un trou = entre deux manches normales : deux interludes ne sont adjacents que s'ils partagent le même trou.
        if (m <= n && !gaps.has(m)) free.push(m);
      }
      if (free.length === 0) return;
      gaps.set(free[Math.floor(rng() * free.length)]!, { gameId: game.id, item, interlude: true });
    });
  }

  if (n === 0) return [...gaps.values()];
  const out: PlannedRound[] = [];
  normalPlan.forEach((r, i) => {
    out.push(r);
    const g = gaps.get(i + 1);
    if (g) out.push(g);
  });
  return out;
}

function buildNormalPlan(games: LoadedGame[], setup: Setup, order: "melange" | "groupe", rng: () => number): PlannedRound[] {
  const pools = games
    .map(({ game, cfg, maxRounds }) => ({
      gameId: game.id,
      items: shuffle(game.items(cfg), rng).slice(0, Math.min(setup.counts[game.id] ?? 0, maxRounds ?? Infinity)),
    }))
    .filter((p) => p.items.length > 0);

  if (order === "groupe") return pools.flatMap((p) => p.items.map((item) => ({ gameId: p.gameId, item })));

  const plan: PlannedRound[] = [];
  let last: string | null = null;
  while (pools.some((p) => p.items.length)) {
    const candidates = pools.filter((p) => p.items.length && p.gameId !== last);
    let choices = candidates.length ? candidates : pools.filter((p) => p.items.length);
    // Un choix glouton peut piéger la fin du plan (ex : b, c, puis a, a). On ne garde que les choix
    // après lesquels il reste possible d'enchaîner le reste sans répétition.
    const safe = choices.filter((p) => canFinishWithoutRepeat(pools, p));
    if (safe.length) choices = safe;
    // Plus un mini-jeu a de manches restantes, plus il a de chances d'être choisi.
    const weight = choices.reduce((s, p) => s + p.items.length, 0);
    let r = rng() * weight;
    const pick = choices.find((p) => (r -= p.items.length) < 0) ?? choices[0]!;
    plan.push({ gameId: pick.gameId, item: pick.items.pop() });
    last = pick.gameId;
  }
  return plan;
}
