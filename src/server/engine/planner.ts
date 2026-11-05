// Composition de la partie : combien de manches par mini-jeu, et dans quel ordre.
import type { CatalogEntry, Setup } from "../../shared/types";
import type { MiniGame } from "../../minigames/contract";

export interface LoadedGame {
  game: MiniGame;
  cfg: any;
}

export interface PlannedRound {
  gameId: string;
  item: unknown;
}

export function buildCatalog(games: LoadedGame[], introSeconds: number): CatalogEntry[] {
  return games.map(({ game, cfg }) => ({
    id: game.id,
    name: game.name(cfg),
    description: game.description(cfg),
    available: game.items(cfg).length,
    secondsPerRound: Math.round(game.estimateSeconds(cfg) + introSeconds),
  }));
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
    total += counts[c.id]! * c.secondsPerRound;
  }
  const target = targetMinutes * 60;
  while (total < target) {
    let progressed = false;
    for (const c of catalog) {
      if (total >= target) break;
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
    counts[c.id] = Number.isFinite(n) ? Math.min(Math.max(n, 0), c.available) : 0;
  }
  return { counts };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
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
  const pools = games
    .map(({ game, cfg }) => ({
      gameId: game.id,
      items: shuffle(game.items(cfg), rng).slice(0, setup.counts[game.id] ?? 0),
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
