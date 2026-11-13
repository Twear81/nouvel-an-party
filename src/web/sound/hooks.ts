// Hooks de son pour les composants et les mini-jeux (exportés par src/web/ui/index.ts). Tous sont sûrs sur le téléphone :
// le moteur n'y joue rien. Aucun ne joue au montage (une TV qui recharge ne doit pas tout rejouer).
import { useEffect, useRef, useSyncExternalStore } from "react";
import { serverNow } from "../net/socket";
import type { NomSon } from "../theme/sons/catalogue";
import { play, sound, type PlayOptions, type SoundState } from "./engine";
import { chronologie, delaiAvant, type SonPlanifie } from "./planifier";

/** `play(nom, options?)` : joue un son du catalogue (superposable). Stable d'un rendu à l'autre. */
export function useSfx(): typeof play {
  return play;
}

/**
 * Joue un son quand `valeur` change, APRÈS le montage. `son` est un nom fixe, ou une fonction `(avant, après) => nom | null`
 * (null = silence) ; une fonction peut aussi renvoyer `{ nom, options }`.
 */
export function useSfxOnChange<T>(
  valeur: T,
  son: NomSon | ((avant: T, apres: T) => NomSon | { nom: NomSon; options?: PlayOptions } | null),
  options?: PlayOptions,
) {
  const previous = useRef(valeur);
  const choose = useRef(son);
  choose.current = son;
  useEffect(() => {
    const before = previous.current;
    previous.current = valeur;
    if (Object.is(before, valeur)) return;
    const wanted = typeof choose.current === "function" ? choose.current(before, valeur) : choose.current;
    if (!wanted) return;
    if (typeof wanted === "string") play(wanted, options);
    else play(wanted.nom, { ...options, ...wanted.options });
    // `options` volontairement hors dépendances : seul un changement de valeur déclenche.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur]);
}

/** true pendant la pause (celle du snapshot, relayée par `useGlobalSfx`). */
export function useSoundPaused(): boolean {
  return useSyncExternalStore(sound.subscribePause, sound.getPaused, () => false);
}

/** État du son de la TV : verrouillé (pas encore de clic), actif ou coupé. */
export function useSoundState(): SoundState {
  return useSyncExternalStore(sound.subscribe, sound.getState, () => "locked" as SoundState);
}

/**
 * Planifie des sons à des heures serveur. Un son déjà passé de plus de ~1 s au montage n'est pas joué (rechargement) ;
 * tout est annulé au démontage ; en pause les minuteurs sont suspendus et reprennent avec le temps restant.
 */
function useSchedule(items: readonly SonPlanifie[]) {
  const paused = useSoundPaused();
  const fired = useRef(new Set<string>());
  const rest = useRef(new Map<string, number>());
  const key = items.map((i) => `${i.heure}|${i.nom}`).join(";");
  const latest = useRef(items);
  latest.current = items;

  useEffect(() => {
    if (paused) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const pending = new Map<string, number>();
    latest.current.forEach((item, i) => {
      const id = `${i}|${item.heure}|${item.nom}`;
      if (fired.current.has(id)) return;
      const delay = rest.current.get(id) ?? delaiAvant(item.heure, serverNow());
      rest.current.delete(id);
      if (delay === null) {
        fired.current.add(id); // trop tard : on ne le rejouera pas
        return;
      }
      const startedAt = performance.now();
      pending.set(id, startedAt + delay);
      timers.push(
        setTimeout(() => {
          fired.current.add(id);
          pending.delete(id);
          play(item.nom, item.options);
        }, delay),
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      // Les sons encore en attente gardent leur temps restant (pause) : on le retrouvera à la reprise.
      const now = performance.now();
      pending.forEach((at, id) => rest.current.set(id, Math.max(0, at - now)));
    };
  }, [key, paused]);
}

/** Joue `nom` à l'heure serveur `heureMs` (ex. un instant de révélation). `null` = rien de prévu. */
export function useSfxAt(heureMs: number | null, nom: NomSon, options?: PlayOptions) {
  useSchedule(heureMs === null ? [] : [{ heure: heureMs, nom, options }]);
}

/** Plusieurs sons « à N secondes » après `depuisMs` (heure serveur, ex. `round.resultsAt`). `null` = rien de prévu. */
export function useSfxTimeline(depuisMs: number | null, liste: readonly { à: number; son: NomSon; options?: PlayOptions }[]) {
  useSchedule(depuisMs === null ? [] : chronologie(depuisMs, liste));
}
