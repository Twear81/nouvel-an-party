// Maintien du volume à l'instant courant avant de programmer un nouveau fondu.
// Certains navigateurs n'exposent pas cancelAndHoldAtTime : lire AVANT d'annuler,
// car cancelScheduledValues peut rétablir la valeur précédant une rampe en cours.
export function maintenirValeur(parametre: AudioParam, maintenant: number): void {
  if (typeof parametre.cancelAndHoldAtTime === "function") {
    parametre.cancelAndHoldAtTime(maintenant);
  } else {
    const valeur = parametre.value;
    parametre.cancelScheduledValues(maintenant);
    parametre.setValueAtTime(valeur, maintenant);
  }
}
