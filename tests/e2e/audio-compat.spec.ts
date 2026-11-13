// Audio réel : les tests ordinaires de téléphone gardent une TV Chromium.
// Ce fichier vérifie aussi une TV Firefox et l'absence volontaire de l'API de maintien.
import type { Browser } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";
import type { Party } from "./helpers/party";

const testTvFirefox = test.extend<{}, { tvBrowser: Browser }>({
  tvBrowser: [async ({ playwright }, use) => {
    const navigateur = await playwright.firefox.launch();
    try { await use(navigateur); } finally { await navigateur.close(); }
  }, { scope: "worker" }],
});

async function verifierFondus(party: Party, sansMaintienNatif: boolean) {
  const { tv } = party;
  const erreurs: string[] = [];
  tv.on("pageerror", (erreur) => erreurs.push(erreur.message));
  await tv.addInitScript((supprimer) => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    const natif = AudioParam.prototype.cancelAndHoldAtTime;
    const etat = { boucles: 0, arrets: 0, annulations: 0, natifs: 0, apiNative: !supprimer && typeof natif === "function" };
    (window as any).__audioCompat = etat;
    if (supprimer) Object.defineProperty(AudioParam.prototype, "cancelAndHoldAtTime", { configurable: true, value: undefined });
    else if (typeof natif === "function") AudioParam.prototype.cancelAndHoldAtTime = function(instant) {
      etat.natifs++; return natif.call(this, instant);
    };
    const annuler = AudioParam.prototype.cancelScheduledValues;
    AudioParam.prototype.cancelScheduledValues = function(instant) { etat.annulations++; return annuler.call(this, instant); };
    const creer = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function() {
      const source = creer.call(this);
      const demarrer = source.start.bind(source), arreter = source.stop.bind(source);
      source.start = (...args) => { if (source.loop) etat.boucles++; demarrer(...args); };
      source.stop = (...args) => { if (source.loop) etat.arrets++; arreter(...args); };
      return source;
    };
  }, sansMaintienNatif);
  const etat = () => tv.evaluate(() => (window as any).__audioCompat as {
    boucles: number; arrets: number; annulations: number; natifs: number; apiNative: boolean;
  });
  await tv.goto(`${party.server.tvUrl}?skin=dofus`);
  await tv.locator("body").click({ position: { x: 5, y: 5 } });
  await expect.poll(async () => (await etat()).boucles).toBe(1);
  await party.addPhones("Alice", "Bob");
  await party.startGame({ "ceci-ou-cela": 1 });
  // Le lancement et l'intro baissent la musique sous les jingles.
  await expect.poll(async () => { const e = await etat(); return e.annulations + e.natifs; }).toBeGreaterThan(0);
  const apresJingle = await etat();
  expect(apresJingle.apiNative ? apresJingle.natifs : apresJingle.annulations).toBeGreaterThan(0);
  await tv.getByTestId("host-pause").click();
  await expect(tv.getByTestId("paused-overlay")).toBeVisible();
  await expect.poll(async () => (await etat()).arrets).toBe(1);
  await tv.getByTestId("host-pause").click();
  await expect(tv.getByTestId("paused-overlay")).toHaveCount(0);
  await expect.poll(async () => (await etat()).boucles).toBe(2);
  await tv.getByTestId("host-sound").click();
  await expect.poll(async () => (await etat()).arrets).toBe(2);
  expect(erreurs).toEqual([]);
}

test("WebAudio compatible : jingles, pause et muet sans cancelAndHoldAtTime", async ({ party }) => {
  await verifierFondus(party, true);
});

testTvFirefox("WebAudio compatible : jingles, pause et muet avec une TV Firefox réelle", async ({ party }) => {
  await verifierFondus(party, false);
});
