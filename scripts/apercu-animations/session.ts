// Une manche de vrai mini-jeu jouée sans moteur : la vraie logique de `game.ts` (start, input, timers, finish) tourne dans
// le faux contexte des tests unitaires (`makeCtx`). Les données affichées par la galerie restent ainsi justes si le jeu change.
import { parse } from "yaml";
import { makeCtx, type TestCtx } from "../../tests/unit/helpers/minigame-ctx";
import type { MiniGame, RoundOutcome } from "../../src/minigames/contract";
import { serverGames } from "../../src/minigames/registry.server";
import type { PublicPlayer } from "../../src/shared/types";

const fichiers = import.meta.glob("../../config/minijeux/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export const jeuParId = (id: string): MiniGame => {
  const jeu = serverGames.find((g) => g.id === id);
  if (!jeu) throw new Error(`Mini-jeu inconnu : ${id}`);
  return jeu;
};

/** Contenu réel de config/minijeux/<id>.yaml, validé par le schéma du jeu. */
export function configDuJeu(id: string): any {
  const brut = fichiers[`../../config/minijeux/${id}.yaml`];
  if (brut === undefined) throw new Error(`Config introuvable pour ${id}`);
  return jeuParId(id).configSchema.parse(parse(brut));
}

/** Aléatoire déterministe : une même démo donne toujours la même manche. */
export function mulberry32(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Session {
  jeu: MiniGame;
  cfg: any;
  ctx: TestCtx<any>;
  state: any;
  item: any;
  players: PublicPlayer[];
  ids: string[];
  /** Heure (horloge de la galerie) du temps simulé 0. */
  origine: number;
  /** Temps simulé écoulé depuis le début de la manche (ms). */
  readonly sim: number;
  /** Réponse du joueur n° `qui` (index ou id). */
  input(qui: number | string, payload: unknown): void;
  advance(ms: number): void;
  /** Lance le chrono / les étapes du jeu (fin de l'intro). */
  jouer(): void;
  vueTv(): unknown;
  vueTelephone(): unknown;
  vuePrivee(id: string): unknown;
  progress(): { done: number; expected: number } | null;
  /** Fin de manche (une seule fois). */
  finir(): RoundOutcome;
}

export interface OptionsSession {
  origine: number;
  /** Choisit la question / variante jouée parmi `items(cfg)` ; défaut : la première. */
  choisir?: (items: any[], rng: () => number) => number;
  graine?: number;
}

export function creerSession(id: string, players: PublicPlayer[], options: OptionsSession): Session {
  const jeu = jeuParId(id);
  const cfg = configDuJeu(id);
  const rng = mulberry32(options.graine ?? 20271);
  const ctx = makeCtx(cfg, players, rng);

  // Temps simulé exact, y compris dans les minuteurs : `cur` vaut l'instant d'échéance pendant qu'un minuteur s'exécute.
  let cur = 0;
  const { setTimeout: setT, countdown: cd, advance: adv } = ctx;
  ctx.setTimeout = (ms, fn) => {
    const echeance = cur + ms;
    setT(ms, () => {
      const avant = cur;
      cur = echeance;
      fn();
      cur = avant;
    });
  };
  ctx.countdown = (secondes, onEnd) => {
    const echeance = cur + secondes * 1000;
    cd(
      secondes,
      onEnd
        ? () => {
            const avant = cur;
            cur = echeance;
            onEnd();
            cur = avant;
          }
        : undefined,
    );
  };
  ctx.advance = (ms) => {
    const cible = cur + ms;
    adv(ms);
    cur = cible;
  };
  ctx.now = () => options.origine + cur;
  ctx.activeNow = ctx.now;

  const items = jeu.items(cfg);
  const item = items[options.choisir ? options.choisir(items, rng) : 0];
  const state = jeu.start(item, ctx);
  const ids = players.map((p) => p.id);
  let resultat: RoundOutcome | null = null;
  const session: Session = {
    jeu, cfg, ctx, state, item, players, ids,
    origine: options.origine,
    get sim() { return cur; },
    input(qui, payload) {
      if (ctx.ended) return;
      const joueur = typeof qui === "number" ? ids[qui] : qui;
      if (joueur) jeu.input(state, joueur, payload, ctx);
    },
    advance: (ms) => ctx.advance(ms),
    jouer: () => jeu.onPlay?.(state, ctx),
    vueTv: () => (jeu.tvView ?? jeu.publicView).call(jeu, state, ctx),
    vueTelephone: () => jeu.publicView(state, ctx),
    vuePrivee: (joueur) => jeu.privateView?.(state, joueur, ctx) ?? null,
    progress: () => {
      try { return jeu.progress?.(state, ctx) ?? null; } catch { return null; }
    },
    finir: () => (resultat ??= jeu.finish(state, ctx)),
  };
  return session;
}
