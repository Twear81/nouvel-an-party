// Horloge simulée : le temps n'avance que via advance().
import type { Clock } from "../../../src/server/engine/clock";

interface Pending {
  id: number;
  at: number;
  fn: () => void;
}

export class FakeClock implements Clock {
  private time: number;
  private nextId = 1;
  private pending: Pending[] = [];

  constructor(start = 1_000_000) {
    this.time = start;
  }

  now() {
    return this.time;
  }

  setTimeout(fn: () => void, ms: number): unknown {
    const id = this.nextId++;
    this.pending.push({ id, at: this.time + Math.max(0, ms), fn });
    return id;
  }

  clearTimeout(handle: unknown) {
    this.pending = this.pending.filter((t) => t.id !== handle);
  }

  /** Nombre de timers en attente (utile pour vérifier qu'on ne fuit rien). */
  get pendingCount() {
    return this.pending.length;
  }

  /** Avance le temps en déclenchant les timers échus dans l'ordre, y compris ceux créés par les callbacks. */
  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      const due = this.pending.filter((t) => t.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.pending = this.pending.filter((t) => t !== due);
      this.time = Math.max(this.time, due.at);
      due.fn();
    }
    this.time = target;
  }
}
