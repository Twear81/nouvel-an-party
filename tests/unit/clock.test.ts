import { describe, expect, it } from "bun:test";
import { TimerGroup } from "../../src/server/engine/clock";
import { eventTime } from "../../src/shared/clock";
import { FakeClock } from "./helpers/fake-clock";

function setup() {
  const clock = new FakeClock(0);
  return { clock, group: new TimerGroup(clock), fired: [] as string[] };
}

describe("FakeClock", () => {
  it("déclenche les timers dans l'ordre, y compris ceux créés par un callback", () => {
    const clock = new FakeClock(0);
    const log: string[] = [];
    clock.setTimeout(() => {
      log.push("b@200");
      clock.setTimeout(() => log.push("c@250"), 50);
    }, 200);
    clock.setTimeout(() => log.push("a@100"), 100);
    clock.advance(1000);
    expect(log).toEqual(["a@100", "b@200", "c@250"]);
    expect(clock.now()).toBe(1000);
  });

  it("clearTimeout empêche le déclenchement", () => {
    const clock = new FakeClock(0);
    let n = 0;
    const h = clock.setTimeout(() => n++, 10);
    clock.clearTimeout(h);
    clock.advance(100);
    expect(n).toBe(0);
  });
});

describe("TimerGroup", () => {
  it("add déclenche au bon moment, une seule fois", () => {
    const { clock, group, fired } = setup();
    group.add(100, () => fired.push("x"));
    clock.advance(99);
    expect(fired).toEqual([]);
    clock.advance(1);
    clock.advance(500);
    expect(fired).toEqual(["x"]);
    expect(group.remaining(1)).toBeNull();
  });

  it("remaining et fireAt reflètent l'écoulement du temps", () => {
    const { clock, group } = setup();
    const id = group.add(1000, () => {});
    clock.advance(300);
    expect(group.remaining(id)).toBe(700);
    expect(group.fireAt(id)).toBe(1000);
    expect(group.remaining(999)).toBeNull();
    expect(group.fireAt(999)).toBeNull();
  });

  it("cancel annule le timer", () => {
    const { clock, group, fired } = setup();
    const id = group.add(100, () => fired.push("x"));
    group.cancel(id);
    group.cancel(id); // idempotent
    clock.advance(200);
    expect(fired).toEqual([]);
    expect(group.remaining(id)).toBeNull();
  });

  it("shift repousse et avance un timer", () => {
    const { clock, group, fired } = setup();
    const id = group.add(100, () => fired.push("x"));
    group.shift(id, 400);
    clock.advance(499);
    expect(fired).toEqual([]);
    clock.advance(1);
    expect(fired).toEqual(["x"]);

    const id2 = group.add(1000, () => fired.push("y"));
    group.shift(id2, -900);
    clock.advance(100);
    expect(fired).toEqual(["x", "y"]);
  });

  it("shift ne passe jamais sous zéro et ignore un id inconnu", () => {
    const { clock, group, fired } = setup();
    const id = group.add(100, () => fired.push("x"));
    group.shift(id, -10_000);
    group.shift(42, 5);
    clock.advance(0);
    expect(fired).toEqual(["x"]);
  });

  it("pause fige le temps restant, resume le reprend", () => {
    const { clock, group, fired } = setup();
    const id = group.add(1000, () => fired.push("x"));
    clock.advance(400);
    group.pause();
    expect(group.remaining(id)).toBe(600);
    clock.advance(10_000);
    expect(fired).toEqual([]);
    expect(group.remaining(id)).toBe(600);
    group.resume();
    expect(group.fireAt(id)).toBe(clock.now() + 600);
    clock.advance(599);
    expect(fired).toEqual([]);
    clock.advance(1);
    expect(fired).toEqual(["x"]);
  });

  it("un timer ajouté pendant la pause ne démarre qu'à la reprise", () => {
    const { clock, group, fired } = setup();
    group.pause();
    group.add(100, () => fired.push("x"));
    clock.advance(1000);
    expect(fired).toEqual([]);
    group.resume();
    clock.advance(100);
    expect(fired).toEqual(["x"]);
  });

  it("shift pendant la pause modifie le temps restant", () => {
    const { clock, group, fired } = setup();
    const id = group.add(1000, () => fired.push("x"));
    group.pause();
    group.shift(id, 500);
    expect(group.remaining(id)).toBe(1500);
    group.resume();
    clock.advance(1499);
    expect(fired).toEqual([]);
    clock.advance(1);
    expect(fired).toEqual(["x"]);
  });

  it("pause/resume répétés sont sans effet de bord", () => {
    const { clock, group } = setup();
    const id = group.add(1000, () => {});
    group.resume(); // pas en pause
    group.pause();
    group.pause();
    clock.advance(500);
    group.resume();
    group.resume();
    expect(group.remaining(id)).toBe(1000);
  });

  it("clear annule tout", () => {
    const { clock, group, fired } = setup();
    group.add(10, () => fired.push("a"));
    group.add(20, () => fired.push("b"));
    group.clear();
    clock.advance(100);
    expect(fired).toEqual([]);
    expect(clock.pendingCount).toBe(0);
  });
});

describe("eventTime (instant réel d'un toucher)", () => {
  it("prend event.timeStamp quand il est dans le repère de performance.now()", () => {
    expect(eventTime(1200, 1260)).toBe(1200);
  });
  it("retombe sur maintenant si le repère est différent (époque Unix) ou absent", () => {
    expect(eventTime(1_700_000_000_000, 1260)).toBe(1260);
    expect(eventTime(0, 1260)).toBe(1260);
  });
});
