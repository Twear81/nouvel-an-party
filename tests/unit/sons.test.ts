import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { settingsSchema } from "../../src/server/config";
import { listSoundFiles } from "../../src/server/static/sons";
import type { GameSnapshot, PublicPlayer, RoundInfo } from "../../src/shared/types";
import { SKINS } from "../../src/shared/skins";
import { ambianceActive, chronoStep, CHRONO_INITIAL, diffSnapshots, pointsSoundAt, popRate } from "../../src/web/sound/events";
import { chronologie, delaiAvant } from "../../src/web/sound/planifier";
import { findOverride, resolveSound } from "../../src/web/sound/resolve";
import { SONS, SONS_PAR_SKIN, type SonDef } from "../../src/web/theme/sons/catalogue";

const fakeUrl = (f: string) => `/assets/${f}`;

describe("résolution des sons", () => {
  it("renvoie le fichier du catalogue par défaut", () => {
    expect(resolveSound("chrono.fin", null, [], fakeUrl)).toMatchObject({ url: "/assets/gong.ogg", volume: SONS["chrono.fin"].volume });
  });

  it("un fichier de l'organisateur remplace le son par défaut (mp3 avant ogg avant wav)", () => {
    expect(resolveSound("chrono.fin", null, ["chrono.fin.wav", "chrono.fin.ogg"], fakeUrl)?.url).toBe("/medias/sons/chrono.fin.ogg");
    expect(resolveSound("chrono.fin", null, ["chrono.fin.ogg", "chrono.fin.mp3"], fakeUrl)?.url).toBe("/medias/sons/chrono.fin.mp3");
  });

  it("le dossier d'un skin l'emporte sur le fichier général, mais seulement pour ce skin", () => {
    const files = ["chrono.fin.mp3", "rocket-league/chrono.fin.ogg"];
    expect(resolveSound("chrono.fin", "rocket-league", files, fakeUrl)?.url).toBe("/medias/sons/rocket-league/chrono.fin.ogg");
    expect(resolveSound("chrono.fin", "dofus", files, fakeUrl)?.url).toBe("/medias/sons/chrono.fin.mp3");
    expect(resolveSound("chrono.fin", null, files, fakeUrl)?.url).toBe("/medias/sons/chrono.fin.mp3");
  });

  it("le catalogue d'un skin remplace le son par défaut, la surcharge de l'organisateur reste prioritaire", () => {
    const parSkin: Record<string, Record<string, SonDef>> = { dofus: { "chrono.fin": { fichier: "dofus.ogg", volume: 0.9 } } };
    expect(resolveSound("chrono.fin", "dofus", [], fakeUrl, SONS, parSkin)).toMatchObject({ url: "/assets/dofus.ogg", volume: 0.9 });
    expect(resolveSound("chrono.fin", "overwatch", [], fakeUrl, SONS, parSkin)?.url).toBe("/assets/gong.ogg");
    expect(resolveSound("chrono.fin", "dofus", ["chrono.fin.mp3"], fakeUrl, SONS, parSkin)).toMatchObject({ url: "/medias/sons/chrono.fin.mp3", volume: 0.9 });
  });

  it("le roulement est échantillonné, un nom inconnu ou un fichier introuvable ne donne rien", () => {
    expect(resolveSound("roulement", null, [], fakeUrl)).toMatchObject({ url: "/assets/roulement.ogg" });
    expect(resolveSound("roulement", null, ["roulement.mp3"], fakeUrl)?.url).toBe("/medias/sons/roulement.mp3");
    expect(resolveSound("nimporte.quoi", null, [], fakeUrl)).toBeNull();
    expect(resolveSound("toString", null, [], fakeUrl)).toBeNull();
    expect(resolveSound("chrono.fin", null, [], () => null)).toBeNull();
  });

  it("findOverride ignore la casse et les autres noms", () => {
    expect(findOverride(["Chrono.Fin.MP3"], "chrono.fin")).toBe("Chrono.Fin.MP3");
    expect(findOverride(["chrono.fin.txt", "autre.mp3"], "chrono.fin")).toBeNull();
  });

  it("tous les fichiers du catalogue existent dans le thème", () => {
    const definitions = [...Object.values(SONS), ...Object.values(SONS_PAR_SKIN).flatMap((sons) => Object.values(sons ?? {}))] as SonDef[];
    for (const def of definitions) {
      if (def.fichier) expect(existsSync(path.join(import.meta.dir, "../../src/web/theme/sons", def.fichier))).toBe(true);
    }
  });

  it("chaque univers possède sa propre ambiance et les surcharges musicales restent prioritaires", () => {
    const pistes = SKINS.map((skin) => resolveSound("lobby.musique", skin, [], fakeUrl)!.url);
    expect(new Set(pistes).size).toBe(SKINS.length);
    expect(pistes).not.toContain(resolveSound("lobby.musique", null, [], fakeUrl)!.url);
    expect(resolveSound("lobby.musique", "dofus", ["dofus/lobby.musique.mp3"], fakeUrl)?.url).toBe("/medias/sons/dofus/lobby.musique.mp3");
    expect(resolveSound("lobby.musique", "overwatch", ["lobby.musique.ogg"], fakeUrl)?.url).toBe("/medias/sons/lobby.musique.ogg");
  });
});

describe("musiques du classement final", () => {
  it("livrées avec le jeu, remplaçables par un fichier de l'organisateur (mp3 compris)", () => {
    expect(resolveSound("final.musique", null, [], fakeUrl)?.url).toBe("/assets/final-musique.ogg");
    expect(resolveSound("final.premier", null, [], fakeUrl)?.url).toBe("/assets/final-premier.ogg");
    expect(resolveSound("final.musique", null, ["final.musique.mp3"], fakeUrl)?.url).toBe("/medias/sons/final.musique.mp3");
    expect(resolveSound("final.premier", null, ["final.premier.mp3"], fakeUrl)?.url).toBe("/medias/sons/final.premier.mp3");
  });
});

describe("liste des sons de l'organisateur", () => {
  it("liste les audios à la racine et dans les dossiers de skin, sans le reste", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "sons-"));
    writeFileSync(path.join(dir, "chrono.fin.mp3"), "x");
    writeFileSync(path.join(dir, "LISEZMOI.txt"), "x");
    mkdirSync(path.join(dir, "dofus"));
    writeFileSync(path.join(dir, "dofus", "pause.ogg"), "x");
    writeFileSync(path.join(dir, "dofus", "notes.txt"), "x");
    expect(listSoundFiles(dir)).toEqual(["chrono.fin.mp3", "dofus/pause.ogg"]);
    expect(listSoundFiles(path.join(dir, "absent"))).toEqual([]);
  });

  it("volume_sons : défaut 0.8, borné entre 0 et 1", () => {
    expect(settingsSchema.parse({}).volume_sons).toBe(0.8);
    expect(settingsSchema.safeParse({ volume_sons: 1.5 }).success).toBe(false);
    expect(settingsSchema.safeParse({ volume_sons: 0 }).success).toBe(true);
  });
});

describe("planification des sons sur l'heure serveur", () => {
  it("joue à l'heure prévue, tolère 1 s de retard, pas plus", () => {
    expect(delaiAvant(1500, 1000)).toBe(500);
    expect(delaiAvant(1000, 1200)).toBe(0);
    expect(delaiAvant(1000, 2000)).toBe(0);
    expect(delaiAvant(1000, 2001)).toBeNull();
    expect(delaiAvant(1000, 60_000)).toBeNull();
  });

  it("chronologie : instants en secondes après le départ", () => {
    expect(chronologie(10_000, [{ à: 0, son: "pop" as never }, { à: 1.5, son: "gong" as never }]).map((e) => e.heure)).toEqual([10_000, 11_500]);
  });
});

// ── Événements d'état
const player = (id: string, over: Partial<PublicPlayer> = {}): PublicPlayer => ({
  id,
  profile: { name: id, avatar: { kind: "preset", id: "x" }, frame: "none", color: "#fff" },
  score: 0,
  connected: true,
  ...over,
});
const round = (over: Partial<RoundInfo> = {}): RoundInfo => ({
  index: 0, total: 3, number: 1, normalTotal: 3, interlude: false, gameId: "g", gameName: "G", participants: ["a", "b", "c"],
  deadline: 10_000, pausedRemainingMs: null, timerTotalMs: 8_000, progress: { done: 0, expected: 3 }, public: null, results: null,
  deltas: null, resultsAt: null, pausedMs: 0, pausedSince: null, ...over,
});
const snap = (over: Partial<GameSnapshot> = {}): GameSnapshot => ({
  title: "T", phase: "lobby", paused: false, finalReveal: null, midnight: null, ceremony: null, transition: null, players: [], round: null, continued: [],
  catalog: [], setup: { counts: {} }, resumable: null, joinUrl: "", skin: null, me: null, ...over,
});
const names = (calls: { nom: string }[]) => calls.map((c) => c.nom);

describe("sons globaux : seulement sur changement", () => {
  it("l’ambiance accompagne le lobby, les manches et les changements d’univers, puis s’arrête à la sortie", () => {
    expect(ambianceActive(null)).toBe(false);
    for (const phase of ["lobby", "intro", "playing", "results"] as const) expect(ambianceActive(snap({ phase }))).toBe(true);
    for (const kind of ["opening", "skin"] as const) expect(ambianceActive(snap({ phase: "transition", transition: { kind } as never }))).toBe(true);
    expect(ambianceActive(snap({ phase: "transition", transition: { kind: "closing" } as never }))).toBe(false);
    expect(ambianceActive(snap({ phase: "final" }))).toBe(false);
  });
  it("rien au premier snapshot (rechargement de la TV)", () => {
    expect(diffSnapshots(null, snap({ phase: "final", players: [player("a")] }))).toEqual([]);
  });

  it("lobby : arrivée, départ et déconnexion d'un joueur", () => {
    const a = snap({ players: [player("a")] });
    expect(names(diffSnapshots(a, snap({ players: [player("a"), player("b")] })))).toEqual(["joueur.rejoint"]);
    expect(names(diffSnapshots(snap({ players: [player("a"), player("b")] }), a))).toEqual(["joueur.quitte"]);
    expect(names(diffSnapshots(snap({ players: [player("a"), player("b")] }), snap({ players: [player("a"), player("b", { connected: false })] })))).toEqual(["joueur.quitte"]);
    expect(diffSnapshots(a, snap({ players: [player("a")] }))).toEqual([]);
    // un joueur sans profil n'est pas encore « arrivé »
    expect(diffSnapshots(a, snap({ players: [player("a"), player("c", { profile: null })] }))).toEqual([]);
  });

  it("enchaînement des phases", () => {
    expect(names(diffSnapshots(snap(), snap({ phase: "transition", transition: { kind: "opening" } as never })))).toEqual(["partie.lancement"]);
    expect(names(diffSnapshots(snap({ phase: "intro", round: round() }), snap({ phase: "playing", round: round() })))).toEqual([]);
    expect(names(diffSnapshots(snap({ phase: "transition", transition: { kind: "opening" } as never }), snap({ phase: "intro", round: round() })))).toEqual(["transition.sortie", "manche.intro"]);
    expect(names(diffSnapshots(snap({ phase: "playing", round: round() }), snap({ phase: "results", round: round() })))).toEqual(["resultats.arrivee"]);
    expect(names(diffSnapshots(snap({ phase: "results", round: round() }), snap({ phase: "transition", transition: { kind: "skin" } as never })))).toEqual(["transition.entree"]);
    expect(names(diffSnapshots(snap({ phase: "transition", transition: { kind: "closing" } as never }), snap({ phase: "final" })))).toEqual(["transition.sortie"]);
  });

  it("chaque réponse reçue fait un pop de plus en plus aigu, la dernière ajoute la complétion", () => {
    const at = (done: number) => snap({ phase: "playing", round: round({ progress: { done, expected: 3 } }) });
    const first = diffSnapshots(at(0), at(1));
    const second = diffSnapshots(at(1), at(2));
    expect(names(first)).toEqual(["reponse.recue"]);
    expect(second[0]!.options!.rate!).toBeGreaterThan(first[0]!.options!.rate!);
    expect(names(diffSnapshots(at(2), at(3)))).toEqual(["reponse.recue", "reponse.toutes"]);
    expect(diffSnapshots(at(2), at(2))).toEqual([]);
    // nouvelle étape : le compteur retombe, pas de son
    expect(diffSnapshots(at(3), at(0))).toEqual([]);
    expect(popRate(1)).toBe(1);
    expect(popRate(99)).toBeLessThan(1.7);
  });

  it("pause et reprise ; +10 s de l'hôte distinct d'une nouvelle étape", () => {
    const base = snap({ phase: "playing", round: round() });
    const paused = diffSnapshots(base, snap({ phase: "playing", paused: true, round: round() }));
    expect(paused).toEqual([{ nom: "pause", options: { ignorePause: true } }]);
    expect(names(diffSnapshots(snap({ phase: "playing", paused: true, round: round() }), base))).toEqual(["reprise"]);
    const plusDix = snap({ phase: "playing", round: round({ deadline: 20_000, timerTotalMs: 18_000 }) });
    expect(names(diffSnapshots(base, plusDix))).toEqual(["temps.ajoute"]);
    const nouvelleEtape = snap({ phase: "playing", round: round({ deadline: 25_000, timerTotalMs: 12_000 }) });
    expect(diffSnapshots(base, nouvelleEtape)).toEqual([]);
  });

  it("points gagnés à la fin de la révélation, seulement s'il y a des points", () => {
    expect(pointsSoundAt(1000, 5, { a: 100, b: 0 })).toBe(6000);
    expect(pointsSoundAt(1000, 0, { a: 100 })).toBe(1800);
    expect(pointsSoundAt(1000, 5, { a: 0 })).toBeNull();
    expect(pointsSoundAt(null, 5, { a: 1 })).toBeNull();
    expect(pointsSoundAt(1000, 5, null)).toBeNull();
  });
});

describe("sons du chrono", () => {
  /** Rejoue un chrono de `from` ms à 0 par pas de 100 ms et renvoie les sons dans l'ordre. */
  function run(from: number, start = CHRONO_INITIAL) {
    let state = start;
    const calls: { nom: string; rate?: number; at: number }[] = [];
    for (let ms = from; ms >= 0; ms -= 100) {
      const step = chronoStep(state, ms);
      state = step.state;
      if (step.call) calls.push({ nom: step.call.nom, rate: step.call.options?.rate, at: ms });
    }
    return calls;
  }

  it("un tic par seconde sur les 5 dernières (de plus en plus aigu) puis le gong à zéro", () => {
    const calls = run(8_000);
    expect(calls.map((c) => c.nom)).toEqual(["chrono.tic", "chrono.tic", "chrono.tic", "chrono.tic", "chrono.tic", "chrono.fin"]);
    const rates = calls.slice(0, 5).map((c) => c.rate!);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
    expect(new Set(rates).size).toBe(5);
  });

  it("ne dit rien au premier échantillon ni quand le temps est déjà écoulé (rechargement)", () => {
    expect(chronoStep(CHRONO_INITIAL, 3_000).call).toBeNull();
    expect(chronoStep(CHRONO_INITIAL, 0).call).toBeNull();
  });

  it("figé en pause, repart sans bruit après +10 s, un seul gong", () => {
    let state = chronoStep(CHRONO_INITIAL, 4_500).state;
    for (let i = 0; i < 20; i++) expect(chronoStep(state, 4_500).call).toBeNull(); // pause : temps restant constant
    state = chronoStep(state, 14_500).state; // +10 s
    expect(chronoStep(state, 14_450).call).toBeNull();
    const calls = run(2_000, state);
    expect(calls.filter((c) => c.nom === "chrono.fin")).toHaveLength(1);
  });

  it("pas de chrono : on repart de zéro", () => {
    expect(chronoStep({ last: 3, ended: false }, null)).toEqual({ state: CHRONO_INITIAL, call: null });
  });
});
