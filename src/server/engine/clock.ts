// Horloge injectable : le vrai temps en prod, un temps simulé dans les tests.
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Groupe de timers qu'on peut mettre en pause / reprendre / tout annuler. */
export class TimerGroup {
  private timers = new Map<number, { fireAt: number; remaining: number; fn: () => void; handle: unknown }>();
  private nextId = 1;
  private paused = false;

  constructor(private clock: Clock) {}

  add(ms: number, fn: () => void): number {
    const id = this.nextId++;
    const t = { fireAt: this.clock.now() + ms, remaining: ms, fn, handle: null as unknown };
    this.timers.set(id, t);
    if (!this.paused) this.arm(id);
    return id;
  }

  /** Repousse (ou avance) un timer existant. */
  shift(id: number, deltaMs: number) {
    const t = this.timers.get(id);
    if (!t) return;
    t.remaining = Math.max(0, t.remaining + deltaMs);
    t.fireAt += deltaMs;
    if (!this.paused) {
      this.clock.clearTimeout(t.handle);
      t.remaining = Math.max(0, t.fireAt - this.clock.now());
      this.arm(id);
    }
  }

  cancel(id: number) {
    const t = this.timers.get(id);
    if (!t) return;
    this.clock.clearTimeout(t.handle);
    this.timers.delete(id);
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    const now = this.clock.now();
    for (const t of this.timers.values()) {
      this.clock.clearTimeout(t.handle);
      t.remaining = Math.max(0, t.fireAt - now);
    }
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    const now = this.clock.now();
    for (const [id, t] of this.timers) {
      t.fireAt = now + t.remaining;
      this.arm(id);
    }
  }

  clear() {
    for (const t of this.timers.values()) this.clock.clearTimeout(t.handle);
    this.timers.clear();
  }

  remaining(id: number): number | null {
    const t = this.timers.get(id);
    if (!t) return null;
    return this.paused ? t.remaining : Math.max(0, t.fireAt - this.clock.now());
  }

  fireAt(id: number): number | null {
    return this.timers.get(id)?.fireAt ?? null;
  }

  private arm(id: number) {
    const t = this.timers.get(id)!;
    t.handle = this.clock.setTimeout(() => {
      this.timers.delete(id);
      t.fn();
    }, Math.max(0, t.fireAt - this.clock.now()));
  }
}
