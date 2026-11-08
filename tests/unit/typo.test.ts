import { expect, test } from "bun:test";
import { typo } from "../../src/web/ui/typo";

const N = " ";

test("espace insécable avant ! ? ; :", () => {
  expect(typo("Santé ! À nous ! Aux amis !")).toBe(`Santé${N}! À nous${N}! Aux amis${N}!`);
  expect(typo("Vraiment? Oui; non: peut-être")).toBe(`Vraiment${N}? Oui${N}; non${N}: peut-être`);
});

test("signes collés ou enchaînés", () => {
  expect(typo("Quoi ?!")).toBe(`Quoi${N}?!`);
  expect(typo("Quoi !!!")).toBe(`Quoi${N}!!!`);
  expect(typo("Fin...")).toBe("Fin...");
});

test("pas de changement dans une heure ou une URL", () => {
  expect(typo("Rendez-vous à 12:30")).toBe("Rendez-vous à 12:30");
  expect(typo("https://exemple.fr")).toBe("https://exemple.fr");
});

test("guillemets français", () => {
  expect(typo("Il a dit « oui » hier")).toBe(`Il a dit «${N}oui${N}» hier`);
  expect(typo("«oui»")).toBe(`«${N}oui${N}»`);
  expect(typo("« oui ! »")).toBe(`«${N}oui${N}!${N}»`);
});

test("idempotent, vide et null", () => {
  const s = typo("Salut ! « ok » ?");
  expect(typo(s)).toBe(s);
  expect(typo("")).toBe("");
  expect(typo(null)).toBeUndefined();
});
