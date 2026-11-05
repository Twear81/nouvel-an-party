// Outils pour piloter une soirée de test : une TV (1920x1080) + des téléphones (un contexte navigateur chacun).
import { expect, type Browser, type BrowserContext, type BrowserContextOptions, type Locator, type Page } from "@playwright/test";
import type { TestServer } from "./server";

export type GameId = "qui-est-le-plus" | "ceci-ou-cela";
export const GAME_NAMES: Record<GameId, string> = { "qui-est-le-plus": "Qui est le plus… ?", "ceci-ou-cela": "Ceci ou Cela" };

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
  /** Prend la photo avec la caméra factice au lieu d'un avatar prédéfini. */
  photo?: boolean;
  /** Taille d'écran de ce téléphone (ex : 360x640, le plus petit à supporter). */
  viewport?: { width: number; height: number };
}

export class Party {
  readonly phones: Phone[] = [];
  private contexts: BrowserContext[] = [];
  tv!: Page;

  constructor(
    private browser: Browser,
    readonly server: TestServer,
    private phoneOptions: BrowserContextOptions = DEFAULT_PHONE,
  ) {}

  // ───────────── Ouverture des écrans ─────────────

  async openTv() {
    this.tv = await this.newContextPage(this.server.tvUrl);
    return this.tv;
  }

  /** Une page 1920x1080 dans son propre contexte (par exemple une 2e TV, éventuellement avec des en-têtes forcés). */
  async newContextPage(url: string, extraHTTPHeaders?: Record<string, string>) {
    const context = await this.browser.newContext({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true, extraHTTPHeaders });
    this.contexts.push(context);
    const page = await context.newPage();
    await page.goto(url);
    await expect(page.locator("[data-phase]")).toBeVisible();
    return page;
  }

  /** Ouvre /play dans un contexte neuf (localStorage séparé), sans créer le profil. */
  async openPhonePage(overrides: BrowserContextOptions = {}): Promise<{ context: BrowserContext; page: Page }> {
    const context = await this.browser.newContext({ ...this.phoneOptions, ignoreHTTPSErrors: true, ...overrides });
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
    const { context, page } = await this.openPhonePage(opts.viewport ? { viewport: opts.viewport } : {});
    const phone: Phone = { context, page, name, id: null, t: (id) => page.getByTestId(id) };

    if (inLobby) {
      await expect.poll(async () => (await this.tvPlayerIds()).filter((id) => !before.includes(id)).length).toBe(1);
      phone.id = (await this.tvPlayerIds()).find((id) => !before.includes(id))!;
    }

    await page.getByTestId("profile-name").fill(name);
    if (opts.photo) await takePhoto(page);
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

  /** Règle le nombre de manches de chaque mini-jeu avec les boutons +/− puis lance la partie. */
  async setCounts(counts: Partial<Record<GameId, number>>) {
    for (const [id, target] of Object.entries(counts)) {
      const count = this.tv.getByTestId(`setup-count-${id}`);
      for (let guard = 0; guard < 30; guard++) {
        const current = Number(await count.innerText());
        if (current === target) break;
        await this.tv.getByTestId(`setup-${current < target! ? "inc" : "dec"}-${id}`).click();
        await expect(count).not.toHaveText(String(current));
      }
      await expect(count).toHaveText(String(target));
    }
  }

  async startGame(counts: Partial<Record<GameId, number>>) {
    await this.setCounts(counts);
    await this.tv.getByTestId("start-game").click();
    // L'annonce ne dure qu'une seconde dans la config de test : on vérifie juste qu'on a quitté le lobby.
    await expect(this.tv.locator("[data-phase]")).not.toHaveAttribute("data-phase", "lobby");
  }

  // ───────────── Déroulé d'une manche ─────────────

  /** Quel mini-jeu est affiché sur ce téléphone (pendant la phase "playing") ? */
  async gameOf(phone: Phone): Promise<GameId> {
    const choice = phone.t("choice-0");
    const vote = phone.page.locator('[data-testid^="vote-option-"]').first();
    await expect(choice.or(vote)).toBeVisible();
    return (await choice.isVisible()) ? "ceci-ou-cela" : "qui-est-le-plus";
  }

  /**
   * Tout le monde répond à la manche en cours.
   * - qui-est-le-plus : le 1er joueur vote pour le 2e, tous les autres votent pour le 1er.
   * - ceci-ou-cela : tout le monde choisit la 1re réponse (ou la 2e avec `choice: 1`).
   * Avec `spread`, les réponses sont réparties : chacun vote pour le suivant (tout le monde reçoit une voix) /
   * les joueurs pairs choisissent la 1re réponse, les impairs la 2e.
   */
  async answerRound(phones: Phone[] = this.phones, opts: { choice?: 0 | 1; spread?: boolean } = {}): Promise<GameId> {
    const game = await this.gameOf(phones[0]!);
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

  /** Points gagnés par chacun pendant la manche, lus dans la bande de résultats de la TV. */
  async tvDeltas(phones: Phone[] = this.phones): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const p of phones) {
      const text = await this.tv.getByTestId(`delta-${p.id}`).innerText();
      out[p.id!] = Number(text.split("\n")[0]!.replace("+", ""));
    }
    return out;
  }

  /** Score total affiché sur l'écran de résultats d'un téléphone ("Total : N pts"). */
  async phoneScore(phone: Phone): Promise<number> {
    const text = await phone.t("phone-results").innerText();
    return Number(/Total\s*:\s*(\d+)/.exec(text)![1]);
  }

  /** Tout le monde clique sur "Continuer". */
  async continueAll(phones: Phone[] = this.phones) {
    for (const p of phones) await p.t("continue-button").click();
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

/** Photo de profil avec la caméra factice (Chromium : args du lanceur ; Firefox : prefs `media.navigator.*`). */
export async function takePhoto(page: Page) {
  await page.getByTestId("take-photo").click();
  await page.getByTestId("capture-photo").click();
  // La caméra se ferme une fois la photo envoyée au serveur : on revient sur l'éditeur.
  await expect(page.getByTestId("capture-photo")).toBeHidden();
  await expect(page.getByTestId("profile-submit")).toBeVisible();
}
