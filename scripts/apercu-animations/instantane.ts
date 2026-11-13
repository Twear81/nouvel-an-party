// Fabrique les `GameSnapshot` de démonstration que la TV et les téléphones reçoivent du serveur.
import type { SkinId } from "../../src/shared/skins";
import type { CatalogEntry, GameSnapshot, Phase, PlayerId, PublicPlayer, RoundInfo } from "../../src/shared/types";
import { serverGames } from "../../src/minigames/registry.server";
import { gameViewProps } from "../../src/web/net/helpers";
import { revealSecondsOf } from "../../src/web/net/useReveal";
import type { Etape } from "./demos";
import { T0 } from "./horloge";
import { configDuJeu, type Session } from "./session";

export interface OptionsInstantane {
  joueurs: PublicPlayer[];
  skin: SkinId | null;
  paused: boolean;
  continues: PlayerId[];
}

let catalogue: CatalogEntry[] | null = null;
export function catalogueDeLaGalerie(): CatalogEntry[] {
  return (catalogue ??= serverGames.map((g) => {
    const cfg = configDuJeu(g.id);
    const interlude = g.interlude?.(cfg) ?? undefined;
    return { id: g.id, name: g.name(cfg), description: g.description(cfg), available: g.items(cfg).length, secondsPerRound: g.estimateSeconds(cfg), ...(interlude ? { interlude } : {}) };
  }));
}

export function snapshotDeBase(phase: Phase, o: Pick<OptionsInstantane, "joueurs" | "skin" | "paused">): GameSnapshot {
  const catalog = catalogueDeLaGalerie();
  return {
    title: "Soirée du Nouvel An", phase, paused: o.paused, finalReveal: null, transition: null, players: o.joueurs, round: null,
    continued: [], catalog, setup: { counts: Object.fromEntries(catalog.map((g) => [g.id, g.interlude ? 1 : 2])) },
    resumable: null, joinUrl: "https://192.168.1.20:3443/", skin: o.skin, me: null,
  };
}

export interface InstantaneJeu {
  tv: GameSnapshot;
  /** Ce que reçoit le téléphone du joueur `id` (vue publique + vue privée de ce joueur). */
  telephone(id: PlayerId): GameSnapshot;
  /** Durée (s) de l'animation de révélation de `TvResults`. */
  revealSeconds: number;
}

export function instantaneJeu(s: Session, etape: Etape, o: OptionsInstantane): InstantaneJeu {
  const phase: Phase = etape.phase;
  const resultat = phase === "results" ? s.finir() : null;
  const deltas = resultat ? Object.fromEntries(s.ids.map((id) => [id, resultat.scores[id] ?? 0])) : null;

  let deadline: number | null = null;
  let timerTotalMs: number | null = null;
  if (phase === "playing") {
    const cd = s.ctx.countdownState;
    const secondes = s.jeu.roundSeconds(s.cfg, s.item);
    if (cd) { deadline = s.origine + cd.endsAt; timerTotalMs = cd.seconds * 1000; }
    else if (secondes) { deadline = T0 + secondes * 1000; timerTotalMs = secondes * 1000; }
  }

  const joueurs = o.joueurs.map((p) => ({ ...p, score: p.score + (deltas?.[p.id] ?? 0) }));
  const base = snapshotDeBase(phase, { joueurs, skin: o.skin, paused: o.paused });
  const manche = (pub: unknown): RoundInfo => ({
    index: 2, total: 9, number: 3, normalTotal: 8, interlude: !!s.jeu.interlude?.(s.cfg) && phase !== "intro",
    gameId: s.jeu.id, gameName: s.jeu.name(s.cfg), participants: s.ids, deadline, pausedRemainingMs: null, timerTotalMs,
    progress: phase === "playing" ? s.progress() : null, public: pub, results: resultat?.results ?? null, deltas,
    resultsAt: phase === "results" ? T0 : null, pausedMs: 0, pausedSince: null,
  });
  const round = manche(s.vueTv());
  const tv: GameSnapshot = { ...base, round, continued: o.continues };
  const publique = s.vueTelephone();
  const revealSeconds = phase === "results" ? revealSecondsOf(gameViewProps(tv, round, null, async () => {})) : 0;
  return {
    tv,
    revealSeconds,
    telephone: (id) => ({ ...base, round: manche(publique), continued: o.continues, me: { id, private: s.vuePrivee(id), inRound: true } }),
  };
}
