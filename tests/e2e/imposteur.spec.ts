import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/fixtures";
import type { Phone } from "./helpers/party";

/**
 * Fait parler, un par un, l'orateur affiché sur la TV (« J'ai dit mon indice ») jusqu'à la fin du tour.
 * Un téléphone fermé (absent) n'a rien à toucher : le serveur le saute tout seul.
 */
async function speakTour(tv: Page, alive: Phone[]) {
  const speaker = () => tv.getByTestId("tv-speaker").getAttribute("data-speaker", { timeout: 1000 }).catch(() => null);
  const step = () => tv.getByTestId("tv-imposteur").getAttribute("data-step", { timeout: 1000 }).catch(() => null);
  const spoken: string[] = [];
  for (let guard = 0; guard < 30 && (await step()) === "parole"; guard++) {
    const cur = await speaker();
    const phone = alive.find((p) => p.id === cur);
    if (phone) {
      await phone.t("speech-done").click();
      spoken.push(cur!);
    }
    await expect.poll(async () => (await step()) !== "parole" || (await speaker()) !== cur, { timeout: 15_000 }).toBe(true);
  }
  return spoken;
}

test.describe("L'imposteur", () => {
  test("mots, indices à voix haute, 2e tour, vote, révélation et points", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé", "David");
    await party.startGame({ imposteur: 1 });
    await expect(tv.getByTestId("tv-word-title")).toBeVisible({ timeout: 15_000 });

    // Chacun lit son mot : un seul a l'autre mot, sans que rien ne l'indique.
    const words: string[] = [];
    for (const p of phones) {
      await expect(p.t("word-big")).toBeVisible();
      words.push(await p.t("word-big").innerText());
    }
    const lower = words.map((w) => w.toLowerCase());
    const impIdx = lower.findIndex((w) => lower.filter((x) => x === w).length === 1);
    expect(impIdx).toBeGreaterThanOrEqual(0);
    const imp = phones[impIdx]!;
    const others = phones.filter((p) => p !== imp);

    // Tour 1 : un seul orateur à la fois, bouton réservé à l'orateur, l'imposteur ne parle jamais en premier.
    await expect(tv.getByTestId("tv-speaker")).toBeVisible({ timeout: 10_000 });
    const first = (await tv.getByTestId("tv-speaker").getAttribute("data-speaker"))!;
    expect(first).not.toBe(imp.id);
    const firstPhone = phones.find((p) => p.id === first)!;
    await expect(firstPhone.t("speech-done")).toBeVisible();
    for (const p of phones.filter((x) => x !== firstPhone)) await expect(p.t("speech-done")).toHaveCount(0);
    await expect(tv.getByTestId(`queue-${first}`)).toHaveAttribute("data-state", "current");
    const spoken1 = await speakTour(tv, phones);
    expect(new Set(spoken1).size).toBe(4);

    // Décision : tout le monde veut un 2e tour (compteurs anonymes sur la TV).
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "decision", { timeout: 10_000 });
    await phones[0]!.t("decision-tour").click();
    await expect(tv.getByTestId("tv-count-tour")).toHaveAttribute("data-count", "1");
    for (const p of phones) await p.t("decision-tour").click();
    await expect(tv.getByTestId("tv-count-tour")).toHaveAttribute("data-count", "4");
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "parole", { timeout: 10_000 });
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-tour", "2");
    const spoken2 = await speakTour(tv, phones);
    expect(new Set(spoken2).size).toBe(4);

    // Après le tour 2 : vote direct. Le mot reste consultable.
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "vote", { timeout: 10_000 });
    const a = phones[0]!;
    await a.t("word-peek").click();
    await expect(a.t("word-peek-word")).toHaveText(words[0]!);
    await expect(imp.t(`vote-option-${imp.id}`)).toHaveCount(0); // pas de vote pour soi

    // Tout le monde (imposteur compris, qui ne sait pas) vote ; les autres désignent l'imposteur.
    for (const p of others) await p.t(`vote-option-${imp.id}`).click();
    await imp.t(`vote-option-${others[0]!.id}`).click();

    // Révélation : démasqué, les deux mots, points.
    await expect(tv.getByTestId("tv-verdict")).toBeVisible({ timeout: 20_000 });
    await expect(tv.getByTestId("tv-verdict")).toHaveAttribute("data-unmasked", "true");
    await expect(tv.getByTestId("tv-imposter")).toContainText(imp.name);
    expect((await tv.getByTestId("tv-word-imposter").innerText()).toLowerCase()).toBe(lower[impIdx]!);
    expect((await tv.getByTestId("tv-word-majority").innerText()).toLowerCase()).toBe(lower.find((w) => w !== lower[impIdx]!)!);
    await party.phoneRevealed(imp);
    await expect(imp.t("imposteur-result")).toHaveAttribute("data-role", "imposter");
    await expect(others[0]!.t("imposteur-result")).toHaveAttribute("data-role", "right");
    expect(await party.tvDeltas()).toEqual(Object.fromEntries(phones.map((p) => [p.id!, p === imp ? 0 : 100])));
  });

  test("vote direct, imposteur déconnecté non démasqué : la manche ne bloque pas", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ imposteur: 1 });
    const words: string[] = [];
    for (const p of phones) {
      await expect(p.t("word-big")).toBeVisible({ timeout: 15_000 });
      words.push((await p.t("word-big").innerText()).toLowerCase());
    }
    const impIdx = words.findIndex((w) => words.filter((x) => x === w).length === 1);
    const imp = phones[impIdx]!;
    const [x, y] = phones.filter((p) => p !== imp) as [Phone, Phone];

    // L'imposteur ferme son navigateur : son tour est sauté, les deux autres parlent.
    await expect(tv.getByTestId("tv-speaker")).toBeVisible({ timeout: 10_000 });
    await imp.page.close();
    const spoken = await speakTour(tv, [x, y]);
    expect(spoken.sort()).toEqual([x.id!, y.id!].sort());

    // Décision : « On vote » → vote direct, sans attendre l'absent.
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "decision", { timeout: 10_000 });
    await x.t("decision-vote").click();
    await y.t("decision-vote").click();
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "vote", { timeout: 10_000 });

    // Les innocents se votent entre eux : l'imposteur s'en sort et gagne 300.
    await x.t(`vote-option-${y.id}`).click();
    await y.t(`vote-option-${x.id}`).click();
    await expect(tv.getByTestId("tv-verdict")).toBeVisible({ timeout: 20_000 });
    await expect(tv.getByTestId("tv-verdict")).toHaveAttribute("data-unmasked", "false");
    await party.phoneRevealed(x);
    await expect(x.t("imposteur-result")).toHaveAttribute("data-role", "wrong");
    await expect(tv.getByTestId(`delta-value-${imp.id}`)).toHaveText("+300", { timeout: 10_000 });
  });
});
