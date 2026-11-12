// Sons fabriqués en WebAudio quand aucun fichier ne convient (pas de bruit de fichier à embarquer).

/** Roulement de tambour : des coups de bruit filtré de plus en plus rapprochés et de plus en plus forts (~2 s). */
export function makeRoulement(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const seconds = 2;
  const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
  const data = buffer.getChannelData(0);
  let t = 0;
  let gap = 0.16;
  while (t < seconds - 0.1) {
    const start = Math.floor(t * rate);
    const amp = 0.25 + 0.75 * (t / seconds);
    const length = Math.floor(0.09 * rate);
    let low = 0;
    for (let i = 0; i < length && start + i < data.length; i++) {
      // Bruit adouci (passe-bas simple) × enveloppe qui retombe vite : un coup mat de caisse claire.
      low += (Math.random() * 2 - 1 - low) * 0.35;
      data[start + i] = (data[start + i] ?? 0) + low * amp * Math.exp(-i / (rate * 0.025));
    }
    t += gap;
    gap = Math.max(0.035, gap * 0.9);
  }
  // Coup final plus fort.
  const end = Math.floor((seconds - 0.12) * rate);
  for (let i = 0; i < 0.12 * rate; i++) data[end + i] = (data[end + i] ?? 0) + (Math.random() * 2 - 1) * Math.exp(-i / (rate * 0.04));
  return buffer;
}
