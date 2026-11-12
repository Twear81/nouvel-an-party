import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { SoundEngine } from "../../src/web/sound/engine";

// Doubles WebAudio : vérifier les courses de décodage et les changements de morceau sans carte son.
const fichiers = ["lobby.musique.ogg", "dofus/lobby.musique.ogg", "overwatch/lobby.musique.ogg"];
let demarrages: number[], arrets: number[], rampes: number[];
let debloquer: () => void;
let attendreDofus: boolean;
let terminerDofus: () => void;
const sauvegarde = new Map<string, PropertyDescriptor | undefined>();
const laisserPasser = () => new Promise<void>((r) => setTimeout(r, 0));

class Parametre {
  value = 0;
  cancelAndHoldAtTime() {}
  linearRampToValueAtTime(v: number) { rampes.push(v); }
  setValueAtTime() {}
}
class Gain {
  gain = new Parametre();
  connect(noeud: unknown) { return noeud; }
  disconnect() {}
}
class Source {
  buffer: { repere: number } | null = null;
  loop = false;
  connect(noeud: unknown) { return noeud; }
  disconnect() {}
  start() { demarrages.push(this.buffer!.repere); }
  stop() { arrets.push(this.buffer!.repere); }
}
class Contexte {
  state = "running";
  currentTime = 0;
  destination = {};
  createGain() { return new Gain(); }
  createBufferSource() { return new Source(); }
  addEventListener() {}
  resume() { return Promise.resolve(); }
  decodeAudioData(octets: ArrayBuffer) {
    const repere = new Uint8Array(octets)[0]!;
    if (repere === 1 && attendreDofus) return new Promise((r) => { terminerDofus = () => r({ repere }); });
    return Promise.resolve({ repere });
  }
}

beforeEach(() => {
  demarrages = []; arrets = []; rampes = []; attendreDofus = false;
  const globals: Record<string, unknown> = {
    document: { documentElement: { dataset: { app: "tv" } } },
    navigator: { webdriver: false },
    window: { AudioContext: Contexte },
    localStorage: { getItem: () => null, setItem() {} },
    addEventListener: (nom: string, rappel: () => void) => { if (nom === "pointerdown") debloquer = rappel; },
    fetch: async (url: string) => ({
      ok: true,
      json: async () => ({ fichiers }),
      arrayBuffer: async () => new Uint8Array([fichiers.indexOf(decodeURIComponent(url.slice("/medias/sons/".length)))]).buffer,
    }),
  };
  for (const [nom, valeur] of Object.entries(globals)) {
    sauvegarde.set(nom, Object.getOwnPropertyDescriptor(globalThis, nom));
    Object.defineProperty(globalThis, nom, { configurable: true, writable: true, value: valeur });
  }
});
afterEach(() => {
  for (const [nom, descriptor] of sauvegarde) {
    if (descriptor) Object.defineProperty(globalThis, nom, descriptor);
    else Reflect.deleteProperty(globalThis, nom);
  }
  sauvegarde.clear();
});

async function lancer() {
  const moteur = new SoundEngine();
  moteur.start();
  moteur.setLobby(true);
  await laisserPasser();
  return moteur;
}

describe("ambiance musicale de la TV", () => {
  it("attend un geste, garde une boucle unique, croise les fondus et revient au morceau général", async () => {
    const moteur = await lancer();
    expect(demarrages).toEqual([]);
    debloquer(); await laisserPasser();
    expect(demarrages).toEqual([0]);
    debloquer(); moteur.setSkin(null); await laisserPasser();
    expect(demarrages).toEqual([0]);
    moteur.setSkin("dofus"); await laisserPasser();
    expect(demarrages).toEqual([0, 1]);
    expect(arrets).toEqual([0]);
    expect(rampes).toContain(0);
    moteur.setSkin(null); await laisserPasser();
    expect(demarrages).toEqual([0, 1, 0]);
    expect(arrets).toEqual([0, 1]);
    moteur.setLobby(false);
    expect(arrets).toEqual([0, 1, 0]);
  });

  it("un décodage tardif ne relance pas un ancien univers", async () => {
    const moteur = await lancer();
    debloquer(); await laisserPasser();
    attendreDofus = true;
    moteur.setSkin("dofus"); await laisserPasser();
    // L’ancienne musique continue jusqu’au décodage du nouveau morceau.
    expect(arrets).toEqual([]);
    moteur.setSkin("overwatch"); await laisserPasser();
    terminerDofus(); await laisserPasser();
    expect(demarrages).toEqual([0, 2]);
    expect(arrets).toEqual([0]);
    moteur.setLobby(false);
  });

  it("revenir au morceau courant ou quitter l’ambiance annule le chargement en cours", async () => {
    const moteur = await lancer();
    debloquer(); await laisserPasser();
    attendreDofus = true;
    moteur.setSkin("dofus"); await laisserPasser();
    moteur.setSkin(null);
    terminerDofus(); await laisserPasser();
    expect(demarrages).toEqual([0]);
    expect(arrets).toEqual([]);
    moteur.setMuted(true);
    expect(arrets).toEqual([0]);
    moteur.setMuted(false); await laisserPasser();
    expect(demarrages).toEqual([0, 0]);
    moteur.setPaused(true);
    expect(arrets).toEqual([0, 0]);
    moteur.setLobby(false);
  });

  it("quitter le lobby pendant le décodage empêche tout démarrage tardif", async () => {
    const moteur = await lancer();
    attendreDofus = true;
    moteur.setSkin("dofus");
    debloquer(); await laisserPasser();
    moteur.setLobby(false);
    terminerDofus(); await laisserPasser();
    expect(demarrages).toEqual([]);
  });
});
