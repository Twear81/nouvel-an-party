// Logique pure du tournoi (sans moteur ni réseau) : tirage, lancers, égalités, avancement, points.

/** 0 = pierre, 1 = feuille, 2 = ciseaux. */
export type Choice = 0 | 1 | 2;
export const isChoice = (v: unknown): v is Choice => v === 0 || v === 1 || v === 2;

/** `a` bat `b` ? (feuille bat pierre, ciseaux bat feuille, pierre bat ciseaux) */
export const beats = (a: Choice, b: Choice) => (a - b + 3) % 3 === 1;

export type ThrowResult = "a" | "b" | "tie";

export interface ThrowRecord {
  a: Choice | null;
  b: Choice | null;
  result: ThrowResult;
  /** Gagnant désigné au hasard (personne n'a joué). */
  random: boolean;
}

/** Un duel de l'arbre. `b === null` dans le 1er tour = qualifié d'office (bye). */
export interface Duel {
  a: string | null;
  b: string | null;
  bye: boolean;
  winner: string | null;
  /** Lancers gagnés par a et par b. */
  wins: [number, number];
  /** Égalités déjà jouées. */
  ties: number;
  /** Duel décidé au sort (trop d'égalités). */
  byChance: boolean;
}

export type Bracket = Duel[][];

export interface Rules {
  /** Lancers à gagner pour remporter le duel (1 = un seul lancer, 2 = au meilleur des 3). */
  winsNeeded: number;
  /** Rejeux autorisés après une égalité ; ensuite le gagnant est tiré au sort. */
  maxReplays: number;
}

const emptyDuel = (): Duel => ({ a: null, b: null, bye: false, winner: null, wins: [0, 0], ties: 0, byChance: false });

/** Plus petite puissance de deux ≥ n (au moins 2). */
export function bracketSize(n: number): number {
  let s = 2;
  while (s < n) s *= 2;
  return s;
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Tire l'arbre au sort. Pour N joueurs, la taille est la puissance de 2 suivante ;
 * les (taille - N) qualifiés d'office sont des joueurs au hasard, dans des duels différents du 1er tour.
 * N = 0 ou 1 : arbre vide (pas de duel).
 */
export function buildBracket(ids: string[], rng: () => number): Bracket {
  if (ids.length < 2) return [];
  const size = bracketSize(ids.length);
  const duels = size / 2;
  const byes = size - ids.length;
  const order = shuffle(ids, rng);
  const byeSlots = new Set(shuffle([...Array(duels).keys()], rng).slice(0, byes));

  let next = 0;
  const first: Duel[] = [];
  for (let i = 0; i < duels; i++) {
    const d = emptyDuel();
    d.a = order[next++]!;
    if (byeSlots.has(i)) {
      d.bye = true;
      d.winner = d.a;
    } else {
      d.b = order[next++]!;
    }
    first.push(d);
  }
  const bracket: Bracket = [first];
  for (let n = duels / 2; n >= 1; n /= 2) bracket.push(Array.from({ length: n }, emptyDuel));
  advanceWinners(bracket, 0);
  return bracket;
}

/** Duel à jouer : deux joueurs, pas de gagnant. */
export const isPending = (d: Duel) => d.a !== null && d.b !== null && d.winner === null;

export const pendingDuels = (bracket: Bracket, round: number) =>
  (bracket[round] ?? []).map((duel, index) => ({ duel, index })).filter(({ duel }) => isPending(duel));

/** Tous les duels du tour ont un gagnant. */
export const isRoundDone = (bracket: Bracket, round: number) => (bracket[round] ?? []).every((d) => d.winner !== null);

/** Place les gagnants du tour `round` dans le tour suivant (idempotent). */
export function advanceWinners(bracket: Bracket, round: number) {
  const next = bracket[round + 1];
  if (!next) return;
  bracket[round]!.forEach((d, i) => {
    if (d.winner === null) return;
    const target = next[Math.floor(i / 2)]!;
    if (i % 2 === 0) target.a = d.winner;
    else target.b = d.winner;
  });
}

/** Résultat d'un lancer. Personne n'a joué : hasard. Un seul a joué : il gagne. */
export function judgeThrow(a: Choice | null, b: Choice | null, rng: () => number): { result: ThrowResult; random: boolean } {
  if (a === null && b === null) return { result: rng() < 0.5 ? "a" : "b", random: true };
  if (a === null) return { result: "b", random: false };
  if (b === null) return { result: "a", random: false };
  if (a === b) return { result: "tie", random: false };
  return { result: beats(a, b) ? "a" : "b", random: false };
}

/** Joue un lancer dans un duel : met à jour les victoires, les égalités et, si besoin, le gagnant du duel. */
export function applyThrow(duel: Duel, a: Choice | null, b: Choice | null, rules: Rules, rng: () => number): ThrowRecord {
  const { result, random } = judgeThrow(a, b, rng);
  if (result === "tie") {
    duel.ties++;
    if (duel.ties > rules.maxReplays) {
      // Trop d'égalités : tirage au sort du duel entier.
      duel.winner = rng() < 0.5 ? duel.a : duel.b;
      duel.byChance = true;
    }
  } else {
    duel.wins[result === "a" ? 0 : 1]++;
    if (duel.wins[0] >= rules.winsNeeded) duel.winner = duel.a;
    else if (duel.wins[1] >= rules.winsNeeded) duel.winner = duel.b;
  }
  return { a, b, result, random };
}

/** Termine au hasard tous les duels restants (manche interrompue par le maître du jeu). */
export function completeBracket(bracket: Bracket, rng: () => number) {
  bracket.forEach((round, r) => {
    for (const d of round) {
      if (d.winner === null && d.a !== null && d.b !== null) {
        d.winner = rng() < 0.5 ? d.a : d.b;
        d.byChance = true;
      }
    }
    advanceWinners(bracket, r);
  });
}

export const championOf = (bracket: Bracket): string | null => bracket.at(-1)?.[0]?.winner ?? null;

/**
 * Tour atteint par chaque joueur : index du tour où il a été battu, ou `bracket.length` pour le champion.
 * Les joueurs encore en lice (tournoi incomplet) sont comptés comme ayant atteint leur tour actuel.
 */
export function reachedRounds(bracket: Bracket): Record<string, number> {
  const out: Record<string, number> = {};
  bracket.forEach((round, r) => {
    for (const d of round) {
      for (const id of [d.a, d.b]) if (id !== null) out[id] = r;
      if (d.winner !== null && r === bracket.length - 1) out[d.winner] = bracket.length;
    }
  });
  return out;
}

/**
 * Points : le champion gagne `winner`, puis `others[0]` pour le finaliste, `others[1]` pour les demi-finalistes, etc.
 * Au-delà de la liste : 0.
 */
export function tournamentScores(bracket: Bracket, winner: number, others: number[]): Record<string, number> {
  const scores: Record<string, number> = {};
  const rounds = bracket.length;
  for (const [id, reached] of Object.entries(reachedRounds(bracket))) {
    scores[id] = reached >= rounds ? winner : (others[rounds - 1 - reached] ?? 0);
  }
  return scores;
}

/** Nom du tour pour l'affichage (« Finale », « Demi-finales »…). */
export function roundLabel(roundCount: number, round: number): string {
  const left = roundCount - round;
  if (left <= 1) return "Finale";
  if (left === 2) return "Demi-finales";
  if (left === 3) return "Quarts de finale";
  if (left === 4) return "Huitièmes de finale";
  return `Tour ${round + 1}`;
}
