// Petite vibration de confirmation (Android ; ignorée sur iPhone et sur PC). Ne lève jamais.
export function haptique(ms = 15) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* pas de vibration : tant pis */
  }
}
