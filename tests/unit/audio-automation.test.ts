import { describe, expect, it } from "bun:test";
import { maintenirValeur } from "../../src/web/sound/automation";

describe("maintien du volume avant un fondu", () => {
  it("utilise le maintien natif lorsqu'il est disponible, avec le bon récepteur", () => {
    const appels: unknown[] = [];
    const parametre = {
      cancelAndHoldAtTime(this: unknown, instant: number) { appels.push([this === parametre, instant]); },
      cancelScheduledValues() { throw new Error("Le repli ne doit pas remplacer l'API native"); },
      setValueAtTime() { throw new Error("Le repli ne doit pas remplacer l'API native"); },
    } as unknown as AudioParam;
    maintenirValeur(parametre, 2.5);
    expect(appels).toEqual([[true, 2.5]]);
  });

  it("sans méthode native, garde le volume lu avant l'annulation d'une rampe", () => {
    const appels: unknown[] = [];
    const parametre = {
      value: 0.42,
      cancelScheduledValues(instant: number) { appels.push(["annuler", instant]); this.value = 0; },
      setValueAtTime(valeur: number, instant: number) { appels.push(["maintenir", valeur, instant]); this.value = valeur; },
    };
    maintenirValeur(parametre as unknown as AudioParam, 3.25);
    expect(appels).toEqual([["annuler", 3.25], ["maintenir", 0.42, 3.25]]);
    expect(parametre.value).toBe(0.42);
    parametre.value = 0.1;
    maintenirValeur(parametre as unknown as AudioParam, 4);
    expect(appels.slice(-2)).toEqual([["annuler", 4], ["maintenir", 0.1, 4]]);
  });
});
