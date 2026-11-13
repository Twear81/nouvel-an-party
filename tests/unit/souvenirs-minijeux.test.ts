// Les données de cérémonie viennent d'actions validées, sans modifier les règles ni les points.
import { describe, expect, it } from "bun:test";
import ceci from "../../src/minigames/ceci-ou-cela/game";
import qui from "../../src/minigames/qui-est-le-plus/game";
import tier from "../../src/minigames/tier-list/game";
import comme from "../../src/minigames/comme-les-autres/game";
import split from "../../src/minigames/split-the-room/game";
import dessin from "../../src/minigames/dessin-rate/game";
import prix from "../../src/minigames/le-bon-prix/game";
import culture from "../../src/minigames/culture-genante/game";
import simon from "../../src/minigames/simon/game";
import pfc, { TIMINGS } from "../../src/minigames/pierre-feuille-ciseaux/game";
import compte, { GO_LEAD_MS } from "../../src/minigames/compte-a-rebours/game";
import { cleanStrokes, souvenirStrokes, type Stroke } from "../../src/minigames/dessin-rate/shared";
import type { MiniGame } from "../../src/minigames/contract";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

function round(game: MiniGame, content: unknown, count = 4) {
  const cfg = game.configSchema.parse(content);
  const ctx = makeCtx(cfg, makePlayers(count), () => 0.25);
  const state = game.start(game.items(cfg)[0], ctx);
  const input = (id: string, payload: unknown) => game.input(state, id, payload, ctx);
  return { ctx, state, input, finish: () => game.finish(state, ctx) };
}

describe("Cérémonie : avis et hésitations", () => {
  it("compte uniquement les changements valides, exclut les absents des avis", () => {
    const r = round(ceci, { questions: ["Mer ou montagne ?"] });
    r.input("p1", { choice: 0 });
    r.input("p1", { choice: 0 });
    r.input("p1", { choice: 3 });
    r.input("p1", { choice: 1 });
    r.input("p2", { choice: 1 });
    expect(r.finish().opinions).toEqual([{ p1: "1", p2: "1" }]);
    expect(r.finish().stats).toEqual({ p1: { answerChanges: 1 }, p2: { answerChanges: 0 } });
    expect(ceci.publicView(r.state, r.ctx)).not.toHaveProperty("opinions");
  });
  it("désignations : votes reçus et cibles choisies sont distincts", () => {
    const r = round(qui, { questions: ["Qui ?"] });
    r.input("p1", { target: "p2" });
    r.input("p1", { target: "p3" });
    r.input("p1", { target: "inconnu" });
    r.input("p2", { target: "p3" });
    expect(r.finish().stats?.p3?.designations).toBe(2);
    expect(r.finish().stats?.p1?.answerChanges).toBe(1);
    expect(r.finish().opinions).toEqual([{ p1: "p3", p2: "p3" }]);
  });
  it("tier list : une comparaison par invité, pas de notes inventées pour les absents", () => {
    const r = round(tier, { questions: ["Qui ?"] });
    r.input("p1", { target: "p3", tier: 0 });
    r.input("p1", { target: "p3", tier: 2 });
    r.input("p1", { target: "p3", tier: 2 });
    r.input("p2", { target: "p3", tier: 2 });
    expect(r.finish().opinions).toContainEqual({ p1: "2", p2: "2" });
    expect(r.finish().stats?.p1?.answerChanges).toBe(1);
  });
  it("réponses libres : respecte le regroupement des fautes et les réponses multiples", () => {
    const r = round(comme, { questions: ["Un fruit ?"], reponses: 2 });
    r.input("p1", { answers: ["banane", "kiwi"] });
    r.input("p2", { answers: ["bananne"] });
    r.input("p3", { answers: ["kiwi"] });
    const tables = r.finish().opinions!;
    expect(tables.some((table) => table.p1 === table.p2)).toBe(true);
    expect(tables.some((table) => table.p1 === table.p3)).toBe(true);
    expect(tables.every((table) => !("p4" in table))).toBe(true);
    expect(tables.some((table) => table.p2 === table.p3)).toBe(false);
  });
  it("split : garde les votes d'une phrase jouée, jamais l'auteur comme votant", () => {
    const r = round(split, { situations: ["Tu peux voler, mais…"] });
    split.onPlay!(r.state, r.ctx);
    for (const id of ["p1", "p2", "p3", "p4"]) r.input(id, { text: id });
    r.ctx.finishCountdown();
    const author = r.state.sentences[0].authorId;
    const voters = r.ctx.players.map((p) => p.id).filter((id) => id !== author);
    r.input(voters[0]!, { vote: true });
    r.input(voters[0]!, { vote: false });
    r.input(voters[1]!, { vote: false });
    expect(r.finish().opinions![0]).toEqual({ [voters[0]!]: "false", [voters[1]!]: "false" });
    expect(r.finish().stats?.[voters[0]!]!.answerChanges).toBe(1);
  });
});

describe("Cérémonie : souvenirs réels et bornés", () => {
  it("dessins : exclut la page blanche et conserve les dessins sans vote pour le talent incompris", () => {
    const r = round(dessin, { mots: { facile: Array.from({ length: 8 }, (_, i) => `mot${i}`) } });
    dessin.onPlay!(r.state, r.ctx);
    r.input("p1", { strokes: [{ c: 0, w: 0, p: [0, 0, 1000, 1000] }] });
    r.input("p2", { strokes: [{ c: 1, w: 1, p: [0, 1000, 1000, 0] }] });
    r.ctx.finishCountdown();
    while (!r.ctx.ended && r.state.step === "gallery") r.ctx.finishCountdown();
    r.input("p3", { target: "p1" });
    const outcome = r.finish();
    expect(outcome.stats?.p1).toEqual({ drawingVotes: 1, drawings: 1 });
    expect(outcome.stats?.p2).toEqual({ drawingVotes: 0, drawings: 1 });
    expect(outcome.stats?.p4).toBeUndefined();
    expect(outcome.keepsakes).toContainEqual(expect.objectContaining({ tag: "meilleur", playerId: "p1", score: 1 }));
    expect(outcome.keepsakes).toContainEqual(expect.objectContaining({ tag: "incompris", playerId: "p2", score: 0 }));
    for (const k of outcome.keepsakes!) expect(new TextEncoder().encode(JSON.stringify(k)).length).toBeLessThan(24 * 1024);
  });
  it("allège un dessin maximal sans perdre les traits ni les extrémités", () => {
    const strokes: Stroke[] = Array.from({ length: 80 }, () => ({ c: 0, w: 0, p: Array.from({ length: 60 }, (_, i) => i % 2 ? 1000 : 0) }));
    const compact = souvenirStrokes(strokes);
    expect(compact).toHaveLength(80);
    expect(cleanStrokes(compact)).not.toBeNull();
    expect(new TextEncoder().encode(JSON.stringify(compact)).length).toBeLessThan(22 * 1024);
    for (let i = 0; i < strokes.length; i++) {
      expect(compact[i]!.p.slice(0, 2)).toEqual(strokes[i]!.p.slice(0, 2));
      expect(compact[i]!.p.slice(-2)).toEqual(strokes[i]!.p.slice(-2));
    }
  });
  it("bon prix : souvenir seulement avec une estimation, vrai prix et écart moyen", () => {
    const r = round(prix, { objets: [{ nom: "Un objet", prix: 10 }] });
    expect(r.finish().keepsakes).toEqual([]);
    r.input("p1", { cents: 1500 });
    expect(r.finish().keepsakes).toEqual([{ kind: "objet", emoji: "🎁", label: "Un objet", detail: "10,00 €", score: 500 }]);
  });
  it("culture : vraie erreur commune et réaction mesurée sur téléphone", () => {
    const r = round(culture, { accroches: [{ rigolo: "Surprise !", serieux: "La question" }], questions: [{ texte: "Combien ?", reponses: ["Bonne", "Fausse", "Autre"] }] });
    culture.onPlay!(r.state, r.ctx);
    r.ctx.finishCountdown(); r.ctx.finishCountdown();
    const wrong = (r.state.correctIndex + 1) % r.state.choices.length;
    r.input("p1", { choice: wrong, ms: 812 });
    r.input("p2", { choice: wrong, ms: Number.NaN });
    expect(r.finish().stats?.p1?.reactionMs).toEqual([812]);
    expect(r.finish().stats?.p2).toBeUndefined();
    expect(r.finish().keepsakes?.[0]).toMatchObject({ kind: "post-it", text: "Combien ?", score: 1 });
  });
});

it("Cérémonie : compte les appuis acceptés de Simon et PFC, sans inventer un temps réseau", () => {
  const s = round(simon, {});
  s.input("p1", { pad: 0 }); // avant le jeu : ignoré
  simon.onPlay!(s.state, s.ctx);
  while (s.state.stage !== "play") s.ctx.advance(100);
  s.input("p1", { pad: s.state.seq[0] });
  s.input("p1", { pad: 99 });
  expect(s.finish().stats?.p1).toEqual({ actions: 1 });
  const p = round(pfc, {});
  pfc.onPlay!(p.state, p.ctx); p.ctx.advance(TIMINGS.draw);
  const player = [...p.state.bracket[0]].find((duel: any) => duel.a && duel.b)!.a;
  p.input(player, { choice: 0 }); p.input(player, { choice: 0 });
  expect(p.finish().stats?.[player]).toEqual({ actions: 1 });
});

it("Cérémonie : l'arrêt volontaire du compte à rebours compte comme un appui, sans faux réflexe", () => {
  const r = round(compte, {});
  compte.onPlay!(r.state, r.ctx); r.ctx.finishCountdown(); r.ctx.advance(GO_LEAD_MS + 1000);
  r.input("p1", { ms: 1000 }); r.input("p1", { ms: 1000 });
  expect(r.finish().stats).toEqual({ p1: { actions: 1 } });
});
