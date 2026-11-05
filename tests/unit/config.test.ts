import { afterAll, beforeEach, afterEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ConfigError, loadConfig } from "../../src/server/config";
import { serverGames } from "../../src/minigames/registry.server";

const realConfig = path.resolve(import.meta.dir, "../../config");

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Crée un dossier config temporaire à partir d'un dictionnaire { "chemin/relatif.yaml": contenu }. */
function tmpConfig(files: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), "nouvel-an-cfg-"));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(dir, rel);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, content);
  }
  return dir;
}

const CECI = "questions:\n  - Une question ?\n";
const QUI = "questions:\n  - Qui est le plus fou ?\n";

let warn: ReturnType<typeof spyOn>;
beforeEach(() => {
  warn = spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

function errorOf(fn: () => unknown): ConfigError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigError);
    return err as ConfigError;
  }
  throw new Error("ConfigError attendue");
}

describe("loadConfig", () => {
  it("charge le vrai dossier config/ sans erreur", () => {
    const { settings, games } = loadConfig(realConfig);
    expect(settings.titre.length).toBeGreaterThan(0);
    // Chaque mini-jeu enregistré a son yaml dans config/minijeux.
    expect(games.map((g) => g.game.id).sort()).toEqual(serverGames.map((g) => g.id).sort());
    for (const g of games) expect(g.game.items(g.cfg).length).toBeGreaterThan(0);
  });

  it("partie.yaml absent : réglages par défaut", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": CECI, "minijeux/qui-est-le-plus.yaml": QUI });
    const { settings, games } = loadConfig(dir);
    expect(settings).toEqual({
      titre: "Soirée du Nouvel An",
      duree_cible_minutes: 60,
      ordre: "melange",
      intro_secondes: 4,
      port_http: 3000,
      port_https: 3443,
      ip: "auto",
      ouvrir_navigateur: true,
    });
    expect(games).toHaveLength(2);
  });

  it("partie.yaml vide : défauts également", () => {
    const dir = tmpConfig({ "partie.yaml": "# rien\n", "minijeux/ceci-ou-cela.yaml": CECI });
    expect(loadConfig(dir).settings.duree_cible_minutes).toBe(60);
  });

  it("lit les valeurs de partie.yaml", () => {
    const dir = tmpConfig({ "partie.yaml": "titre: Test\nordre: groupe\nintro_secondes: 0\n", "minijeux/ceci-ou-cela.yaml": CECI });
    expect(loadConfig(dir).settings).toMatchObject({ titre: "Test", ordre: "groupe", intro_secondes: 0 });
  });

  it("actif: false désactive le mini-jeu", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": "actif: false\n" + CECI, "minijeux/qui-est-le-plus.yaml": QUI });
    expect(loadConfig(dir).games.map((g) => g.game.id)).toEqual(["qui-est-le-plus"]);
  });

  it("actif: false dispense de contenu valide", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": "actif: false\n", "minijeux/qui-est-le-plus.yaml": QUI });
    expect(loadConfig(dir).games).toHaveLength(1);
  });

  it("un yaml de mini-jeu absent désactive le jeu avec un avertissement", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": CECI });
    const { games } = loadConfig(dir);
    expect(games.map((g) => g.game.id)).toEqual(["ceci-ou-cela"]);
    expect(warn).toHaveBeenCalled();
  });

  it("applique les défauts du mini-jeu et retire la clé actif de la cfg", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": "actif: true\n" + CECI });
    const cfg = loadConfig(dir).games[0]!.cfg;
    expect(cfg.duree).toBe(20);
    expect("actif" in cfg).toBe(false);
  });
});

describe("loadConfig : erreurs lisibles", () => {
  it("yaml cassé : le message donne le fichier", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": "questions: [oups\n  - ça\n" });
    const e = errorOf(() => loadConfig(dir));
    expect(e.message).toContain(path.join(dir, "minijeux", "ceci-ou-cela.yaml"));
    expect(e.message).toContain("YAML invalide");
  });

  it("partie.yaml cassé", () => {
    const dir = tmpConfig({ "partie.yaml": "titre: [pas fermé\n" });
    const e = errorOf(() => loadConfig(dir));
    expect(e.message).toContain(path.join(dir, "partie.yaml"));
  });

  it("mauvais type : fichier et champ dans le message", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": 'duree: "beaucoup"\n' + CECI });
    const e = errorOf(() => loadConfig(dir));
    expect(e.message).toContain(path.join(dir, "minijeux", "ceci-ou-cela.yaml"));
    expect(e.message).toContain("duree");
  });

  it("champ imbriqué : le chemin complet est indiqué", () => {
    const dir = tmpConfig({ "minijeux/qui-est-le-plus.yaml": "points:\n  majorite: peu\n  elu: 5\n" + QUI });
    expect(errorOf(() => loadConfig(dir)).message).toContain("points.majorite");
  });

  it("partie.yaml avec un mauvais type", () => {
    const dir = tmpConfig({ "partie.yaml": "ordre: aleatoire\nintro_secondes: -3\n" });
    const e = errorOf(() => loadConfig(dir));
    expect(e.message).toContain(path.join(dir, "partie.yaml"));
    expect(e.message).toContain("ordre");
    expect(e.message).toContain("intro_secondes");
  });

  it("liste de questions vide ou absente", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": "questions: []\n", "minijeux/qui-est-le-plus.yaml": "nom: x\n" });
    const e = errorOf(() => loadConfig(dir));
    expect(e.message).toContain("questions");
    expect(e.message).toContain("Ajoute au moins une question");
    expect(e.message).toContain(path.join(dir, "minijeux", "ceci-ou-cela.yaml"));
    // les erreurs de plusieurs fichiers sont rassemblées
    expect(e.message).toContain(path.join(dir, "minijeux", "qui-est-le-plus.yaml"));
  });

  it("question vide refusée, avec son index", () => {
    const dir = tmpConfig({ "minijeux/ceci-ou-cela.yaml": 'questions:\n  - ""\n' });
    expect(errorOf(() => loadConfig(dir)).message).toContain("questions.0");
  });
});
