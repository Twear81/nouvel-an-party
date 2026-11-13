// Moteur de sons de la TV (WebAudio). Les téléphones n'ont jamais de son : tout est alors un no-op,
// aucun fichier n'est téléchargé. Voir docs/creer-un-mini-jeu.md (« Sons »).
//
// - Les fichiers sont chargés au démarrage de la TV (octets), décodés dès que le navigateur autorise le son.
// - Chromium refuse le son avant un geste : le premier `pointerdown` / `keydown` débloque ("locked" -> "on").
// - Sous Playwright (`navigator.webdriver`) rien ne sort : les lectures sont seulement notées dans `window.__sfx`.
import { SKINS } from "../../shared/skins";
import type { NomSon } from "../theme/sons/catalogue";
import { allSounds, resolveSound, type SonResolu } from "./resolve";

export type SoundState = "locked" | "on" | "muted";

export interface PlayOptions {
  /** Multiplicateur de volume (0–1+), en plus du volume du catalogue. */
  volume?: number;
  /** Vitesse de lecture : 1 = normale, 1.2 = plus aigu. */
  rate?: number;
  /** Décalage de hauteur en centièmes de ton. */
  detune?: number;
  /** Variation aléatoire de hauteur (± centièmes) ; remplace celle du catalogue. */
  variation?: number;
  /** Joue même en pause (réservé au son de la pause elle-même). */
  ignorePause?: boolean;
}

const MUTE_KEY = "nouvel-an-son-coupe";
const DEFAULT_VOLUME = 0.8;

declare global {
  interface Window {
    /** Sons « joués » en mode test (navigator.webdriver) : nom et options. */
    __sfx?: { nom: string; options?: PlayOptions; skin?: string | null; fichier?: string }[];
  }
}

const readMuted = (): boolean => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
};

export class SoundEngine {
  private mediasPrets = false;
  private ambiance = false;
  private musique: { source: AudioBufferSourceNode; gain: GainNode; url: string; volume: number } | null = null;
  private musiqueTrace: string | null = null;
  private musiqueVersion = 0;
  private musiqueEnChargement: string | null = null;
  private musiqueBaisseJusqua = 0;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private files: string[] = [];
  private volume = DEFAULT_VOLUME;
  private muted = readMuted();
  private gesture = false;
  private started = false;
  private paused = false;
  private skin: string | null = null;
  private raw = new Map<string, Promise<ArrayBuffer | null>>();
  private decoded = new Map<string, Promise<AudioBuffer | null>>();
  private listeners = new Set<() => void>();
  private pauseListeners = new Set<() => void>();
  private cachedState: SoundState = this.muted ? "muted" : "locked";

  /** Vrai seulement sur l'écran TV (main.tsx pose `data-app`). */
  get isTv(): boolean {
    return typeof document !== "undefined" && document.documentElement.dataset.app === "tv";
  }
  private get silent(): boolean {
    return typeof navigator !== "undefined" && navigator.webdriver === true;
  }

  // ── État observable (haut-parleur du lobby, bouton de la barre de l'hôte)
  getState = (): SoundState => this.cachedState;
  private computeState(): SoundState {
    if (this.muted) return "muted";
    const running = this.ctx?.state === "running";
    return this.gesture && (this.silent || running) ? "on" : "locked";
  }
  private emit() {
    const next = this.computeState();
    if (next === this.cachedState) return;
    this.cachedState = next;
    this.listeners.forEach((l) => l());
  }
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  };
  getPaused = () => this.paused;
  subscribePause = (l: () => void) => {
    this.pauseListeners.add(l);
    return () => void this.pauseListeners.delete(l);
  };

  // ── Démarrage (TV uniquement, idempotent)
  /** `sansReseau` : page autonome (planche d'écoute), pas de liste de sons à demander au serveur de la TV. */
  start(options: { sansReseau?: boolean } = {}) {
    if (this.started || !this.isTv) return;
    this.started = true;
    const unlock = () => {
      this.gesture = true;
      this.ensureContext();
      void this.ctx?.resume().then(() => this.afterUnlock(), () => {});
      this.emit();
      this.syncMusique();
    };
    addEventListener("pointerdown", unlock, true);
    addEventListener("keydown", unlock, true);
    if (this.silent) { this.mediasPrets = true; return; }
    if (options.sansReseau) {
      this.mediasPrets = true;
      this.preload();
      return;
    }
    // Liste des sons de l'organisateur, puis préchargement des octets (sans contexte audio : pas d'avertissement du navigateur).
    void fetch("/medias/_sons")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((info: { volume?: number; fichiers?: string[] } | null) => {
        if (info) {
          if (typeof info.volume === "number") this.setVolume(info.volume);
          if (Array.isArray(info.fichiers)) this.files = info.fichiers.filter((f) => typeof f === "string");
        }
        this.mediasPrets = true;
        this.preload();
        this.syncMusique();
      });
  }

  private preload() {
    for (const skin of [null, ...SKINS]) {
      for (const s of allSounds(skin, this.files).values()) if (s.url) void this.getRaw(s.url);
    }
  }

  private ensureContext() {
    if (this.ctx || this.silent) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    this.ctx.addEventListener("statechange", () => this.emit());
  }

  private afterUnlock() {
    this.emit();
    this.syncMusique();
    // Décodage anticipé : le premier son joué ne doit pas attendre.
    for (const s of allSounds(this.skin, this.files).values()) void this.getBuffer(s);
  }

  // ── Réglages
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }
  setSkin(skin: string | null) {
    if (skin === this.skin) return;
    this.skin = skin;
    this.syncMusique();
  }
  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    this.pauseListeners.forEach((l) => l());
    this.syncMusique();
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* navigation privée : le réglage ne survit pas au rechargement */
    }
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
    this.emit();
    this.syncMusique();
  }
  toggleMuted() {
    this.setMuted(!this.muted);
  }

  /** Configure l’ambiance continue ; un geste explicite sur la TV reste requis. */
  setAmbiance(actif: boolean) {
    this.ambiance = actif;
    this.syncMusique();
  }

  /** Alias conservé pour les planches d’écoute et les intégrations existantes. */
  setLobby(actif: boolean) { this.setAmbiance(actif); }

  private syncMusique() {
    const actif = this.isTv && this.ambiance && this.gesture && !this.muted && !this.paused;
    const def = actif ? resolveSound("lobby.musique", this.skin, this.files) : null;
    if (this.silent) {
      if (def && this.musiqueTrace !== def.url) (window.__sfx ??= []).push({ nom: "lobby.musique", skin: this.skin, fichier: def.url });
      this.musiqueTrace = def?.url ?? null;
      return;
    }
    if (!def) {
      this.musiqueVersion++;
      this.musiqueEnChargement = null;
      this.arreterMusique();
      return;
    }
    if (!this.mediasPrets || !this.ctx || this.ctx.state !== "running" || !this.master) return;
    if (this.musique?.url === def.url) {
      // Retour au morceau en cours pendant le décodage du suivant : invalider la requête devenue inutile.
      if (this.musiqueEnChargement) { this.musiqueVersion++; this.musiqueEnChargement = null; }
      return;
    }
    if (this.musiqueEnChargement === def.url) return;
    const version = ++this.musiqueVersion;
    this.musiqueEnChargement = def.url;
    void this.getBuffer(def).then((buffer) => {
      if (version !== this.musiqueVersion) return;
      this.musiqueEnChargement = null;
      if (!buffer || !this.ctx || !this.master) return;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      const maintenant = this.ctx.currentTime;
      const encoreBas = this.musiqueBaisseJusqua > maintenant;
      gain.gain.linearRampToValueAtTime(def.volume * (encoreBas ? 0.25 : 1), maintenant + (encoreBas ? Math.min(1.2, this.musiqueBaisseJusqua - maintenant) : 1.2));
      if (encoreBas) {
        gain.gain.setValueAtTime(def.volume * 0.25, this.musiqueBaisseJusqua);
        gain.gain.linearRampToValueAtTime(def.volume, this.musiqueBaisseJusqua + 0.6);
      }
      source.connect(gain).connect(this.master);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      // L’ancienne boucle reste audible jusqu’au décodage, puis les deux fondus se croisent.
      this.arreterMusique();
      this.musique = { source, gain, url: def.url, volume: def.volume };
      source.start();
    });
  }

  private arreterMusique() {
    const ancienne = this.musique;
    this.musique = null;
    if (!ancienne || !this.ctx) return;
    const t = this.ctx.currentTime;
    ancienne.gain.gain.cancelAndHoldAtTime(t);
    ancienne.gain.gain.linearRampToValueAtTime(0, t + 0.8);
    ancienne.source.stop(t + 0.85);
  }

  private duckMusique(duree: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musiqueBaisseJusqua = Math.max(this.musiqueBaisseJusqua, t + Math.max(duree, 0.1));
    if (!this.musique) return;
    const volume = this.musique.volume;
    const gain = this.musique.gain.gain;
    gain.cancelAndHoldAtTime(t);
    gain.linearRampToValueAtTime(volume * 0.25, t + 0.06);
    gain.setValueAtTime(volume * 0.25, this.musiqueBaisseJusqua);
    gain.linearRampToValueAtTime(volume, this.musiqueBaisseJusqua + 0.6);
  }

  // ── Chargement
  private getRaw(url: string): Promise<ArrayBuffer | null> {
    let p = this.raw.get(url);
    if (!p) {
      p = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null), () => null);
      this.raw.set(url, p);
    }
    return p;
  }

  private getBuffer(sound: SonResolu): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    const key = sound.url;
    let p = this.decoded.get(key);
    if (!p) {
      p = this.getRaw(sound.url).then((bytes) => (bytes ? ctx.decodeAudioData(bytes.slice(0)) : null)).catch(() => null);
      this.decoded.set(key, p);
    }
    return p;
  }

  // ── Lecture
  play(nom: NomSon, options: PlayOptions = {}) {
    if (!this.isTv || this.muted) return;
    if (this.paused && !options.ignorePause) return;
    if (this.silent) {
      (window.__sfx ??= []).push({ nom, options });
      return;
    }
    if (!this.ctx || this.ctx.state !== "running" || !this.master) return;
    const sound = resolveSound(nom, this.skin, this.files);
    if (!sound) return;
    const ctx = this.ctx;
    const master = this.master;
    void this.getBuffer(sound).then((buffer) => {
      if (!buffer || ctx.state !== "running" || this.muted || (this.paused && !options.ignorePause)) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = options.rate ?? 1;
      const variation = options.variation ?? sound.variation;
      source.detune.value = (options.detune ?? 0) + (variation ? (Math.random() * 2 - 1) * variation : 0);
      const gain = ctx.createGain();
      gain.gain.value = sound.volume * (options.volume ?? 1);
      source.connect(gain).connect(master);
      source.onended = () => gain.disconnect();
      source.start();
      // Les jingles prennent la place de la musique ; les petits clics ne font pas pomper le mixage.
      if (["partie.lancement", "manche.intro", "resultats.arrivee", "final.fanfare", "boum", "roulement", "tension", "applaudissements"].includes(nom)) this.duckMusique(buffer.duration / source.playbackRate.value);
    });
  }
}

export const sound = new SoundEngine();

/** Joue un son (no-op hors TV). Préférer les hooks de `hooks.ts` dans un composant. */
export const play = (nom: NomSon, options?: PlayOptions) => sound.play(nom, options);
