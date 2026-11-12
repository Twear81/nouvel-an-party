import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./helpers/fixtures";

// Sous Playwright le moteur de sons ne joue rien : il note seulement les sons demandés dans window.__sfx.
const sfx = (page: import("@playwright/test").Page) => page.evaluate(() => (window.__sfx ?? []).map((s) => s.nom));

test.describe("Sons de la TV", () => {
  test("la route de liste répond et voit les fichiers déposés par l'organisateur", async ({ party }) => {
    const url = `http://localhost:${party.server.httpPort}/medias/_sons`;
    const first = await (await fetch(url)).json();
    expect(first.volume).toBe(0.8);
    expect(first.fichiers).not.toContain("chrono.fin.mp3");

    const dir = path.join(path.dirname(party.server.dataDir), "config", "medias", "sons");
    mkdirSync(path.join(dir, "dofus"), { recursive: true });
    writeFileSync(path.join(dir, "chrono.fin.mp3"), "x");
    writeFileSync(path.join(dir, "dofus", "pause.ogg"), "x");
    writeFileSync(path.join(dir, "LISEZMOI.txt"), "x");
    const second = await (await fetch(url)).json();
    expect(second.fichiers).toEqual(expect.arrayContaining(["chrono.fin.mp3", "dofus/pause.ogg"]));
    expect(second.fichiers).not.toContain("LISEZMOI.txt");
  });

  test("verrouillé jusqu'au premier clic, le bouton de la barre de l'hôte coupe et remet le son", async ({ party }) => {
    const { tv } = party;
    await expect(tv.getByTestId("sound-state")).toHaveAttribute("data-sound", "locked");
    await tv.locator("body").click({ position: { x: 5, y: 5 } });
    await expect(tv.getByTestId("sound-state")).toHaveAttribute("data-sound", "on");

    // Un joueur arrive : le son est demandé (et noté), sans jamais rien jouer pour de vrai.
    await party.addPhones("Alice", "Bob");
    await expect.poll(() => sfx(tv)).toContain("joueur.rejoint");

    await party.startGame({ "ceci-ou-cela": 1 });
    const button = tv.getByTestId("host-sound");
    await expect(button).toHaveAttribute("data-sound", "on");
    await button.click();
    await expect(button).toHaveAttribute("data-sound", "muted");
    const before = (await sfx(tv)).length;
    await tv.getByTestId("host-pause").click();
    await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    expect((await sfx(tv)).length).toBe(before); // coupé : aucun son demandé
    await button.click();
    await expect(button).toHaveAttribute("data-sound", "on");

    // Reprise : le son de reprise est joué (celui de la pause a été coupé plus haut).
    await tv.getByTestId("host-pause").click();
    await expect.poll(() => sfx(tv)).toContain("reprise");
  });

  test("le réglage coupé survit au rechargement de la TV, qui reste silencieuse", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "ceci-ou-cela": 1 });
    await tv.getByTestId("host-sound").click();
    await expect(tv.getByTestId("host-sound")).toHaveAttribute("data-sound", "muted");
    await tv.reload();
    await expect(tv.getByTestId("host-sound")).toHaveAttribute("data-sound", "muted");
    expect(await sfx(tv)).toEqual([]); // rien rejoué au rechargement
  });
});

test("la musique attend un geste, reste unique, et le rechargement reste silencieux", async ({ party }) => {
  const {tv} = party;
  expect(await sfx(tv)).not.toContain("lobby.musique");
  await tv.locator("body").click({position:{x:5,y:5}});
  await expect.poll(()=>sfx(tv)).toContain("lobby.musique");
  await tv.locator("body").click({position:{x:5,y:5}});
  expect((await sfx(tv)).filter(n=>n === "lobby.musique")).toHaveLength(1);
  await tv.reload();
  await expect(tv.getByTestId("sound-state")).toHaveAttribute("data-sound","locked");
  expect(await sfx(tv)).toEqual([]);
});

test("WebAudio réel : fichiers décodables, boucle unique, fondu de sortie", async ({ party }) => {
  const {tv} = party;
  await tv.addInitScript(() => {
    Object.defineProperty(navigator,"webdriver",{get:()=>false});
    const etat = {decodes:0, erreurs:0, boucles:0, arrets:0, fondus:0};
    (window as any).__audioRevue = etat;
    const decoder = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function(...args: Parameters<AudioContext['decodeAudioData']>) {
      return decoder.apply(this,args).then(b=>{etat.decodes++; return b;},e=>{etat.erreurs++; throw e;});
    };
    const creer = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function() {
      const source = creer.call(this);
      const demarrer = source.start.bind(source), arreter = source.stop.bind(source);
      source.start = (...args) => {if(source.loop) etat.boucles++; demarrer(...args);};
      source.stop = (...args) => {if(source.loop) etat.arrets++; arreter(...args);};
      return source;
    };
    const rampe = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function(...args) {etat.fondus++; return rampe.apply(this,args);};
  });
  await tv.reload();
  await expect(tv.getByTestId('sound-state')).toHaveAttribute('data-sound','locked');
  await tv.locator('body').click({position:{x:5,y:5}});
  await expect.poll(()=>tv.evaluate(()=>(window as any).__audioRevue.decodes)).toBeGreaterThanOrEqual(31);
  expect(await tv.evaluate(()=>(window as any).__audioRevue.erreurs)).toBe(0);
  await expect.poll(()=>tv.evaluate(()=>(window as any).__audioRevue.boucles)).toBe(1);
  await tv.locator('body').click({position:{x:5,y:5}});
  expect(await tv.evaluate(()=>(window as any).__audioRevue.boucles)).toBe(1);
  await party.addPhones('Alice','Bob');
  await party.startGame({'ceci-ou-cela':1});
  await expect.poll(()=>tv.evaluate(()=>(window as any).__audioRevue.arrets)).toBe(1);
  expect(await tv.evaluate(()=>(window as any).__audioRevue.fondus)).toBeGreaterThanOrEqual(2);
});
