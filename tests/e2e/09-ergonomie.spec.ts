import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";

// Règle de conception : rien à deviner. Ces tests vérifient que l'interface se suffit à elle-même et reste utilisable sur de petits écrans.
test.describe("Ergonomie téléphone", () => {
  test("le bouton du profil reste visible sur un écran très court (360 px de haut)", { tag: "@compat" }, async ({ party }) => {
    const { page } = await party.openPhonePage({ viewport: { width: 360, height: 360 } });
    const submit = page.getByTestId("profile-submit");
    // Sans pseudo, le bouton lui-même dit pourquoi il est inactif.
    await expect(submit).toBeDisabled();
    await expect(submit).toContainText("Choisis un pseudo");
    await expect(submit).toBeInViewport({ ratio: 1 });
    await page.getByTestId("profile-name").fill("Petit écran");
    await expect(submit).toContainText("C'est parti");
    await expect(submit).toBeInViewport({ ratio: 1 });
    // Il suit aussi quand on fait défiler la liste des avatars.
    await page.getByTestId("avatar-option").last().scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport({ ratio: 1 });
    await submit.click();
    await expect(page.getByTestId("phone-lobby-ready")).toBeVisible();
  });

  test("la touche « Go » du clavier valide le profil", { tag: "@compat" }, async ({ party }) => {
    const { page } = await party.openPhonePage();
    await page.getByTestId("profile-name").fill("Clavier");
    await page.getByTestId("profile-name").press("Enter");
    await expect(page.getByTestId("phone-lobby-ready")).toContainText("Clavier");
  });

  test("anti-zoom iOS, tactile et pas de rebond : réglages CSS des téléphones", { tag: "@compat" }, async ({ party }) => {
    const { page } = await party.openPhonePage();
    const input = await page.getByTestId("profile-name").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(input).toBeGreaterThanOrEqual(16); // en dessous, Safari iOS zoome sur le champ
    const submit = page.getByTestId("profile-submit");
    expect(await submit.evaluate((el) => getComputedStyle(el).touchAction)).toBe("manipulation");
    const root = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).overscrollBehaviorY,
      body: getComputedStyle(document.body).overscrollBehaviorY,
    }));
    expect(root.html).toBe("none"); // pas de « tirer pour rafraîchir » en pleine partie
    expect(root.body).toBe("none");
    // Les champs de saisie restent sélectionnables, les boutons non.
    expect(await page.getByTestId("profile-name").evaluate((el) => { const cs = getComputedStyle(el) as CSSStyleDeclaration & { webkitUserSelect?: string }; return cs.userSelect || cs.webkitUserSelect; })).not.toBe("none");
    // (Safari 16 n'expose que la version préfixée.)
    expect(await submit.evaluate((el) => { const cs = getComputedStyle(el) as CSSStyleDeclaration & { webkitUserSelect?: string }; return cs.userSelect || cs.webkitUserSelect; })).toBe("none");
  });

  test("la caméra est un <video playsinline muted autoplay> et se coupe en quittant", { tag: "@compat" }, async ({ party, browserName }) => {
    test.skip(browserName === "webkit", "WebKit (Playwright) n'a pas de caméra factice.");
    const { page } = await party.openPhonePage();
    await page.getByTestId("take-photo").click();
    await expect(page.getByTestId("capture-photo")).toBeVisible();
    const video = page.locator("video");
    await expect(video).toHaveAttribute("playsinline", "");
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.autoplay)).toBe(true);
    const tracks = () => page.evaluate(() => (document.querySelector("video")?.srcObject as MediaStream | null)?.getTracks().map((t) => t.readyState) ?? []);
    expect(await tracks()).toEqual(["live"]);
    // On garde la référence au flux pour vérifier qu'il est bien arrêté après « Annuler ».
    await page.evaluate(() => {
      (window as unknown as { __stream: MediaStream }).__stream = document.querySelector("video")!.srcObject as MediaStream;
    });
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.locator("video")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __stream: MediaStream }).__stream.getTracks().map((t) => t.readyState))).toEqual(["ended"]);
  });

  test("la phase de vote indique clairement quel choix est enregistré", async ({ party }) => {
    const [a, b] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
    const option = a!.t(`vote-option-${b!.id}`);
    await expect(option).toHaveAttribute("aria-pressed", "false");
    await option.click();
    await expect(option).toHaveAttribute("aria-pressed", "true");
    await expect(option.locator("svg")).toHaveCount(1); // pastille ✓
    // La TV montre que ce joueur a voté, sans dire pour qui.
    await expect(party.tv.getByTestId("tv-answered-count")).toContainText("1 / 2");
    await expect(party.tv.getByTestId("tv-answered").locator("svg")).toHaveCount(1); // un seul ✓ sur son avatar
  });
});

// Zone du geste « accueil » : le bas du téléphone porte la barre système, aucun contrôle ne doit y coller.
const HOME_GESTURE_MARGIN_PX = 24; // 1,5 rem
async function lowestControlGap(page: Page) {
  return page.evaluate(() => {
    let min = Infinity;
    let who = "";
    for (const el of document.querySelectorAll<HTMLElement>("button, input, textarea, [role=button]")) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const gap = window.innerHeight - r.bottom;
      if (gap < 0) continue; // hors écran : dans une liste qui défile, pas collé au bord
      if (gap < min) {
        min = gap;
        who = el.getAttribute("data-testid") ?? el.textContent?.slice(0, 20) ?? el.tagName;
      }
    }
    return { gap: min, who };
  });
}

test.describe("Zone du geste « accueil »", () => {
  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 640 }]) {
    test(`aucun contrôle collé au bas de l'écran (${size.width}×${size.height})`, { tag: "@compat" }, async ({ party }) => {
      const check = async (label: string, page: Page) => {
        const { gap, who } = await lowestControlGap(page);
        expect(gap, `${label} : « ${who} » est à ${Math.round(gap)} px du bas`).toBeGreaterThanOrEqual(HOME_GESTURE_MARGIN_PX);
      };
      // Profil (avant de rejoindre) : le bouton « C'est parti » reste décollé du bord.
      const { page: profile } = await party.openPhonePage({ viewport: size });
      await check("profil", profile);
      const phones = await party.addPhonesWith({ viewport: size }, "Alice", "Bob", "Chloé");
      await check("lobby", phones[0]!.page);
      await party.startGame({ "ceci-ou-cela": 1, "qui-est-le-plus": 0 });
      await expect(phones[0]!.t("choice-1")).toBeVisible();
      await check("ceci ou cela : choix", phones[0]!.page); // le 2e choix est le plus bas
      await party.answerRound();
      await expect(phones[0]!.t("continue-button")).toBeVisible({ timeout: 60_000 });
      await check("résultats : Continuer", phones[0]!.page);
      await party.continueAll();
      await expect(phones[0]!.t("phone-final")).toBeVisible({ timeout: 15_000 });
      await check("classement final", phones[0]!.page);
    });
  }
});

test.describe("Ceci ou Cela : lisibilité", () => {
  test("deux réponses géantes, la cible répond pour de vrai, les autres devinent", async ({ party }) => {
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-est-le-plus": 0, "ceci-ou-cela": 6 });
    // On parcourt les manches jusqu'à trouver une question sur un invité, puis une question d'opinion.
    const seen = { cible: false, majorite: false };
    for (let round = 1; round <= 6 && !(seen.cible && seen.majorite); round++) {
      await expect(party.tv.getByTestId("tv-playing")).toContainText(`${round} / 6`);
      await expect(a!.t("choice-0")).toBeVisible();
      await expect(a!.t("choice-1")).toBeVisible();
      const left = await party.tv.getByTestId("tv-choice-0").textContent() ?? "";
      const right = await party.tv.getByTestId("tv-choice-1").textContent() ?? "";
      expect(left).not.toBe(right);
      await expect(a!.t("choice-0")).toContainText(left);
      await expect(a!.t("choice-1")).toContainText(right);
      // Les libellés les plus longs (14 lettres) tiennent dans les boutons sans être coupés.
      for (const phone of [a!, b!, c!]) {
        for (const i of [0, 1]) {
          const fits = await phone.t(`choice-${i}`).evaluate((btn) => {
            const label = btn.querySelector("span")!;
            return label.getBoundingClientRect().right <= btn.getBoundingClientRect().right && btn.scrollWidth <= btn.clientWidth + 1;
          });
          expect(fits).toBe(true);
        }
      }
      if (await party.tv.getByTestId("mode-cible").count()) {
        seen.cible = true;
        const targets = [a!, b!, c!];
        // Un seul téléphone (la cible) lit « pour de vrai », les deux autres « devine ».
        await expect(party.phones[0]!.page.locator('[data-testid="phone-mode-cible"], [data-testid="phone-mode-devine"]')).toHaveCount(1);
        const n = await Promise.all(targets.map((p) => p.t("phone-mode-cible").count()));
        expect(n.reduce((x, y) => x + y, 0)).toBe(1);
      } else seen.majorite = true;
      await party.answerRound();
      await expect(party.tv.getByTestId("tv-results")).toBeVisible();
      await expect(party.tv.getByTestId("ceci-results")).toHaveAttribute("data-mode", /cible|majorite/);
      await expect(party.tv.getByTestId("camp-0")).toHaveAttribute("data-winner", "true");
      for (const p of party.phones) await expect(p.t("phone-ceci-result")).toHaveAttribute("data-ok", "true");
      await party.continueAll();
    }
    expect(seen.cible || seen.majorite).toBe(true);
  });

  test("égalité : les deux camps marquent, la TV l'affiche", async ({ party }) => {
    const phones = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 0, "ceci-ou-cela": 1 });
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
    // Alice choisit la 1re réponse, Bob la 2e.
    await phones[0]!.t("choice-0").click();
    await phones[1]!.t("choice-1").click();
    await expect(party.tv.getByTestId("tv-results")).toBeVisible();
    const mode = await party.tv.getByTestId("ceci-results").getAttribute("data-mode");
    if (mode === "majorite") {
      await expect(party.tv.getByTestId("ceci-results")).toContainText("Égalité");
      const deltas = await party.tvDeltas();
      expect(Object.values(deltas)).toEqual([100, 100]);
    } else {
      // Question sur un invité : la cible a répondu pour de vrai, un seul camp gagne.
      await expect(party.tv.locator('[data-testid^="camp-"][data-winner="true"]')).toHaveCount(1);
    }
  });
});
