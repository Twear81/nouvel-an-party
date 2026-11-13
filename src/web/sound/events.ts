// Quels sons déclencher quand l'état de la partie change ? Fonctions pures (testées sous Bun), appelées par `useGlobalSfx`.
// Règle : uniquement sur CHANGEMENT entre deux snapshots, jamais au montage (une TV qui recharge ne rejoue rien).
import type { GameSnapshot, PublicPlayer } from "../../shared/types";
import type { NomSon } from "../theme/sons/catalogue";
import type { PlayOptions } from "./engine";

export interface SfxCall {
  nom: NomSon;
  options?: PlayOptions;
}

const present = (players: PublicPlayer[]) => new Set(players.filter((p) => p.profile && p.connected).map((p) => p.id));

/** Ambiance continue entre les manches ; la sortie laisse la place à la fanfare finale. */
export function ambianceActive(snapshot: GameSnapshot | null): boolean {
  return snapshot !== null && snapshot.phase !== "final" && !(snapshot.phase === "transition" && snapshot.transition?.kind === "closing");
}

/** Hauteur du « pop » de réponse : monte à chaque réponse, plafonnée. */
export const popRate = (done: number) => 1 + Math.min(Math.max(done, 1) - 1, 10) * 0.06;

export function diffSnapshots(prev: GameSnapshot | null, next: GameSnapshot): SfxCall[] {
  if (!prev) return [];
  const out: SfxCall[] = [];

  if (!prev.paused && next.paused) out.push({ nom: "pause", options: { ignorePause: true } });
  if (prev.paused && !next.paused) out.push({ nom: "reprise" });

  if (prev.phase === "lobby" && next.phase === "lobby") {
    const before = present(prev.players);
    const after = present(next.players);
    if ([...after].some((id) => !before.has(id))) out.push({ nom: "joueur.rejoint" });
    if ([...before].some((id) => !after.has(id))) out.push({ nom: "joueur.quitte" });
  }

  if (prev.phase !== next.phase) {
    if (prev.phase === "lobby" && next.phase !== "final") out.push({ nom: "partie.lancement" });
    if (prev.phase === "transition") out.push({ nom: "transition.sortie" });
    if (next.phase === "transition" && next.transition?.kind !== "opening") out.push({ nom: "transition.entree" });
    if (next.phase === "intro") out.push({ nom: "manche.intro" });
    if (next.phase === "results") out.push({ nom: "resultats.arrivee" });
    if (next.phase === "final") out.push({ nom: "final.fanfare" });
  } else if (next.phase === "playing" && prev.round && next.round && prev.round.index === next.round.index) {
    const before = prev.round.progress;
    const after = next.round.progress;
    if (before && after && after.expected === before.expected && after.done > before.done) {
      out.push({ nom: "reponse.recue", options: { rate: popRate(after.done) } });
      if (after.expected > 0 && after.done >= after.expected) out.push({ nom: "reponse.toutes" });
    }
    // « +10 s » de l'hôte : la fin et le total décalés exactement de la même durée (une nouvelle étape ou une reprise
    // de pause ne décale pas le total de la même quantité).
    const dDeadline = (next.round.deadline ?? 0) - (prev.round.deadline ?? 0);
    const dTotal = (next.round.timerTotalMs ?? 0) - (prev.round.timerTotalMs ?? 0);
    if (prev.round.deadline !== null && next.round.deadline !== null && dTotal >= 1000 && Math.abs(dDeadline - dTotal) < 60) out.push({ nom: "temps.ajoute" });
  }
  return out;
}

/** Instant (heure serveur) du son « points gagnés » : à la fin de la révélation, ou null s'il n'y a rien à gagner. */
export function pointsSoundAt(resultsAt: number | null, revealSeconds: number, deltas: Record<string, number> | null): number | null {
  if (resultsAt === null || !deltas || !Object.values(deltas).some((d) => d > 0)) return null;
  return resultsAt + Math.max(revealSeconds, 0.8) * 1000;
}

// ── Chrono : un tic par seconde sur les 5 dernières, un buzzer à zéro.
export interface ChronoState {
  /** Dernière seconde affichée (arrondie au-dessus) ; null = pas encore vue. */
  last: number | null;
  /** Le buzzer de ce chrono a déjà retenti. */
  ended: boolean;
}
export const CHRONO_INITIAL: ChronoState = { last: null, ended: false };

export function chronoStep(state: ChronoState, remainingMs: number | null): { state: ChronoState; call: SfxCall | null } {
  if (remainingMs === null) return { state: CHRONO_INITIAL, call: null };
  const sec = Math.ceil(Math.max(0, remainingMs) / 1000);
  // Premier échantillon (chargement, nouveau chrono) ou temps ajouté : on repart sans bruit.
  if (state.last === null || sec > state.last) return { state: { last: sec, ended: sec === 0 }, call: null };
  if (sec === state.last) return { state, call: null };
  if (sec === 0) return { state: { last: 0, ended: true }, call: state.ended ? null : { nom: "chrono.fin" } };
  const call = sec <= 5 ? { nom: "chrono.tic" as const, options: { rate: 1 + (5 - sec) * 0.12 } } : null;
  return { state: { last: sec, ended: false }, call };
}
