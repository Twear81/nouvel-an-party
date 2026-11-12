// Horloge locale de la galerie, branchée à la place de `serverNow` : les écrans la lisent comme l'horloge du serveur,
// la galerie peut la figer (pause) et la repositionner (curseur). `T0` = instant « zéro » de toute scène.
import { imposerHorloge } from "../../src/web/net/socket";

export const T0 = 1_800_000_000_000;

let base = T0;
let depuis: number | null = null; // performance.now() au dernier démarrage, null = figée

export const horloge = {
  now: () => base + (depuis === null ? 0 : performance.now() - depuis),
  /** Temps écoulé depuis le début de la scène (ms). */
  ecoule() {
    return horloge.now() - T0;
  },
  placer(ms: number) {
    base = T0 + ms;
    if (depuis !== null) depuis = performance.now();
  },
  lire() {
    if (depuis === null) depuis = performance.now();
  },
  figer() {
    base = horloge.now();
    depuis = null;
  },
  enMarche: () => depuis !== null,
};

imposerHorloge(horloge.now);
