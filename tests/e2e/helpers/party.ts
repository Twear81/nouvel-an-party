// Outils pour piloter une soirée de test : une TV (1920x1080) + des téléphones (un contexte navigateur chacun).
import { expect, type Browser, type BrowserContext, type BrowserContextOptions, type Locator, type Page } from "@playwright/test";
import type { TestServer } from "./server";

/** Id d'un mini-jeu (nom de son dossier dans src/minigames). */
export const GAME_NAMES = {
  "qui-est-le-plus": "Qui est le plus… ?",
  "ceci-ou-cela": "Ceci ou Cela",
  "tier-list": "Tier list",
  "comme-les-autres": "Comme les autres",
  "le-bon-prix": "Le bon prix",
  "split-the-room": "Split the Room",
  "compte-a-rebours": "Compte à rebours chaotique",
  simon: "Simon",
  "pierre-feuille-ciseaux": "Pierre-feuille-ciseaux : le tournoi",
  "culture-genante": "Culture gênante",
  imposteur: "L'imposteur",
  "dessin-rate": "Dessin raté",
} as const;
export type GameId = keyof typeof GAME_NAMES | (string & {});

/** Délai max (ms) pour que la révélation des résultats se termine (la plus longue : tier list à 8 joueurs, ~15 s). */
export const REVEAL_TIMEOUT = 45_000;

/** Téléphone par défaut (les projets Playwright imposent le leur : Android, Firefox mobile, iPhone). */
export const DEFAULT_PHONE: BrowserContextOptions = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export interface Phone {
  context: BrowserContext;
  page: Page;
  name: string;
  /** Id du joueur (lu sur la TV au moment de l'inscription ; null si arrivé en cours de partie). */
  id: string | null;
  t(testId: string): Locator;
}

export interface JoinOptions {
  /** Taille d'écran de ce téléphone (ex : 360x640, le plus petit à supporter). */
  viewport?: { width: number; height: number };
  /** Autre moteur pour ce téléphone (ex : un iPhone dans une partie Android), avec ses options de contexte. */
  browser?: { browser: Browser; options: BrowserContextOptions };
}

export class Party {
  readonly phones: Phone[] = [];
  private contexts: BrowserContext[] = [];
  tv!: Page;

  /**
   * @param browser    navigateur des téléphones (celui du projet : Chromium, Firefox ou WebKit)
   * @param tvBrowser  navigateur de la TV : toujours Chromium, comme le PC de la soirée
   */
  constructor(
    private browser: Browser,
    readonly server: TestServer,
    private phoneOptions: BrowserContextOptions = DEFAULT_PHONE,
    private tvBrowser: Browser = browser,
  ) {}

  // ───────────── Ouverture des écrans ─────────────

  async openTv() {
    this.tv = await this.newContextPage(this.server.tvUrl);
    return this.tv;
  }

  /** Une page 1920x1080 dans son propre contexte (par exemple une 2e TV, éventuellement avec des en-têtes forcés). */
  async newContextPage(url: string, extraHTTPHeaders?: Record<string, string>) {
    const context = await this.tvBrowser.newContext({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true, extraHTTPHeaders });
    this.contexts.push(context);
    const page = await context.newPage();
    await page.goto(url);
    await expect(page.locator("[data-phase]")).toBeVisible();
    return page;
  }

  /** Ouvre /play dans un contexte neuf (localStorage séparé), sans créer le profil. */
  async openPhonePage(overrides: BrowserContextOptions = {}, other?: JoinOptions["browser"]): Promise<{ context: BrowserContext; page: Page }> {
    const context = other
      ? await other.browser.newContext({ ...other.options, ignoreHTTPSErrors: true, ...overrides })
      : await this.browser.newContext({ ...this.phoneOptions, ignoreHTTPSErrors: true, ...overrides });
    this.contexts.push(context);
    const page = await context.newPage();
    await page.goto(this.server.playUrl);
    await expect(page.getByTestId("profile-name")).toBeVisible();
    return { context, page };
  }

  /** Un téléphone rejoint la partie et crée son profil. À appeler un téléphone à la fois (l'id se déduit de la TV). */
  async addPhone(name: string, opts: JoinOptions = {}): Promise<Phone> {
    const inLobby = (await this.tv.locator("[data-phase]").getAttribute("data-phase")) === "lobby";
    const before = inLobby ? await this.tvPlayerIds() : [];
    const { context, page } = await this.openPhonePage(opts.viewport ? { viewport: opts.viewport } : {}, opts.browser);
    const phone: Phone = { context, page, name, id: null, t: (id) => page.getByTestId(id) };

    if (inLobby) {
      await expect.poll(async () => (await this.tvPlayerIds()).filter((id) => !before.includes(id)).length).toBe(1);
      phone.id = (await this.tvPlayerIds()).find((id) => !before.includes(id))!;
    }

    await page.getByTestId("profile-name").fill(name);
    await page.getByTestId("profile-submit").click();
    if (inLobby) await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
    this.phones.push(phone);
    return phone;
  }

  async addPhones(...names: string[]) {
    const out: Phone[] = [];
    for (const n of names) out.push(await this.addPhone(n));
    return out;
  }

  /** Plusieurs téléphones avec les mêmes options (ex : 8 joueurs sur un petit écran). */
  async addPhonesWith(opts: JoinOptions, ...names: string[]) {
    const out: Phone[] = [];
    for (const n of names) out.push(await this.addPhone(n, opts));
    return out;
  }

  // ───────────── Lecture de la TV ─────────────

  async tvPlayerIds(): Promise<string[]> {
    const ids = await this.tv.locator('[data-testid^="tv-player-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.slice("tv-player-".length)));
    return ids;
  }

  tvPlayer(id: string) {
    return this.tv.getByTestId(`tv-player-${id}`);
  }

  phase(page: Page = this.tv) {
    return page.locator("[data-phase]");
  }

  // ───────────── Écran de lancement ─────────────

  /**
   * Règle le nombre de manches des mini-jeux cités avec les boutons +/− (les autres ne bougent pas).
   * Un jeu interlude (surprise) n'a qu'un interrupteur : 0 = désactivé, autre = activé.
   */
  async setCounts(counts: Partial<Record<GameId, number>>) {
    for (const [id, target] of Object.entries(counts)) {
      const toggle = this.tv.getByTestId(`setup-toggle-${id}`);
      if (await toggle.count()) {
        const want = target! > 0 ? "true" : "false";
        if ((await toggle.getAttribute("data-on")) !== want) await toggle.click();
        await expect(toggle).toHaveAttribute("data-on", want);
        continue;
      }
      const count = this.tv.getByTestId(`setup-count-${id}`);
      for (let guard = 0; guard < 30; guard++) {
        const current = Number(await count.textContent() ?? "");
        if (current === target) break;
        await this.tv.getByTestId(`setup-${current < target! ? "inc" : "dec"}-${id}`).click();
        await expect(count).not.toHaveText(String(current));
      }
      await expect(count).toHaveText(String(target));
    }
  }

  /** Règle exactement ces manches : tous les autres mini-jeux du catalogue sont mis à 0. */
  async setOnly(counts: Partial<Record<GameId, number>>) {
    const rows = await this.tv.locator('[data-testid^="setup-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.slice("setup-row-".length)));
    await this.setCounts({ ...Object.fromEntries(rows.map((id) => [id, 0])), ...counts });
  }

  /** Lance une partie avec exactement ces manches : les mini-jeux non cités sont mis à 0. */
  async startGame(counts: Partial<Record<GameId, number>>) {
    await this.setOnly(counts);
    await this.tv.getByTestId("start-game").click();
    // L’ouverture de la pièce précède la première annonce : les tests de manches attendent sa fin.
    // Les tests dédiés aux scènes cliquent directement sur start-game pour parcourir cette ouverture.
    await expect(this.tv.locator("[data-phase]").last()).toHaveAttribute("data-phase", /^(intro|playing)$/, { timeout: 20_000 });
  }

  // ───────────── Déroulé d'une manche ─────────────

  /** Quel mini-jeu est affiché sur ce téléphone (pendant la phase "playing") ? */
  async gameOf(phone: Phone): Promise<GameId> {
    const playing = phone.t("phone-playing");
    await expect(playing).toHaveAttribute("data-game", /.+/);
    return (await playing.getAttribute("data-game"))!;
  }

  /**
   * Tout le monde répond à la manche en cours.
   * - qui-est-le-plus : le 1er joueur vote pour le 2e, tous les autres votent pour le 1er.
   * - ceci-ou-cela : tout le monde choisit la 1re réponse (ou la 2e avec `choice: 1`).
   * Les autres mini-jeux ont leurs propres tests (leurs écrans sont trop différents) : erreur explicite ici.
   * Avec `spread`, les réponses sont réparties : chacun vote pour le suivant (tout le monde reçoit une voix) /
   * les joueurs pairs choisissent la 1re réponse, les impairs la 2e.
   */
  async answerRound(phones: Phone[] = this.phones, opts: { choice?: 0 | 1; spread?: boolean } = {}): Promise<GameId> {
    const game = await this.gameOf(phones[0]!);
    if (game !== "ceci-ou-cela" && game !== "qui-est-le-plus") throw new Error(`answerRound ne sait pas jouer « ${game} » : écrire un test dédié`);
    for (const [i, p] of phones.entries()) {
      if (game === "ceci-ou-cela") {
        await p.t(`choice-${opts.spread ? i % 2 : (opts.choice ?? 0)}`).click();
      } else {
        const target = opts.spread ? phones[(i + 1) % phones.length]! : i === 0 ? phones[1]! : phones[0]!;
        await p.t(`vote-option-${target.id}`).click();
      }
    }
    return game;
  }

  /** Points gagnés par chacun pendant la manche, lus dans la bande de résultats de la TV (une fois la révélation finie). */
  async tvDeltas(phones: Phone[] = this.phones): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const p of phones) {
      const value = this.tv.getByTestId(`delta-value-${p.id}`);
      await expect(value).toBeVisible({ timeout: REVEAL_TIMEOUT });
      out[p.id!] = Number((await value.textContent() ?? "").replace("+", ""));
    }
    return out;
  }

  /** Attend la fin de la révélation sur un téléphone : « Regarde la TV » laisse place aux points et au bouton Continuer. */
  async phoneRevealed(phone: Phone) {
    await expect(phone.t("points-gained")).toBeVisible({ timeout: REVEAL_TIMEOUT });
  }

  /** Score total affiché sur l'écran de résultats d'un téléphone ("Total : N pts"). */
  async phoneScore(phone: Phone): Promise<number> {
    await this.phoneRevealed(phone);
    const text = await phone.t("phone-results").textContent() ?? "";
    return Number(/Total\s*:\s*(\d+)/.exec(text)![1]);
  }

  /** Tout le monde clique sur "Continuer". */
  async continueAll(phones: Phone[] = this.phones) {
    for (const p of phones) await p.t("continue-button").click({ timeout: REVEAL_TIMEOUT });
  }

  /** Joue une manche complète : réponses, résultats, tout le monde continue. */
  async playRound(phones: Phone[] = this.phones) {
    await expect(this.tv.getByTestId("tv-playing")).toBeVisible();
    const game = await this.answerRound(phones);
    await expect(this.tv.getByTestId("tv-results")).toBeVisible();
    await this.continueAll(phones);
    return game;
  }

  // ───────────── Mise en page ─────────────

  /**
   * Éléments dont le contenu est coupé (débordement caché) dans une zone de la TV : signe d'un écran qui ne tient pas.
   * Les textes tronqués par « … » (pseudos longs) sont tolérés.
   */
  async clippedIn(testId: string, page: Page = this.tv): Promise<string[]> {
    return page.getByTestId(testId).evaluate((root) => {
      const out: string[] = [];
      for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")] as HTMLElement[]) {
        // Les calques décoratifs (étincelles aux fenêtres, cadres…) peuvent être recadrés volontairement.
        if (el.closest('[aria-hidden="true"]')) continue;
        const cs = getComputedStyle(el);
        if (cs.textOverflow === "ellipsis") continue;
        const clipsY = cs.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 2;
        const clipsX = cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 2;
        if (clipsX || clipsY) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}`);
      }
      return out;
    });
  }

  // ───────────── Fin ─────────────

  async close() {
    await Promise.all(this.contexts.map((c) => c.close().catch(() => {})));
  }
}

/**
 * Invoque un cadre précis sur l'éditeur de profil : le tirage est forcé (`localStorage["summon-force"]`) puis on attend
 * la fin de l'animation. Renvoie quand le cadre est appliqué à l'aperçu.
 */
export async function summonFrame(page: Page, frameId: string) {
  const previous = await page.evaluate((id) => {
    const old = localStorage.getItem("summon-force");
    localStorage.setItem("summon-force", id);
    return old;
  }, frameId);
  try {
    await page.getByTestId("frame-summon-button").scrollIntoViewIfNeeded();
    await page.getByTestId("frame-summon-button").click();
    await expect(page.getByTestId("frame-summon")).toHaveAttribute("data-phase", "summoning");
    await expect(page.getByTestId("frame-summon")).toHaveAttribute("data-phase", "done", { timeout: 10_000 });
    await expect(page.getByTestId("frame-result")).toHaveAttribute("data-frame", frameId);
    await expect(page.getByTestId("profile-preview").locator('[data-ui="avatar"]')).toHaveAttribute("data-frame", frameId);
  } finally {
    await page.evaluate((old) => {
      if (old === null) localStorage.removeItem("summon-force");
      else localStorage.setItem("summon-force", old);
    }, previous);
  }
}
