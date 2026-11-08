import { expect, test } from "./helpers/fixtures";
import type { Phone } from "./helpers/party";

async function sendClue(p: Phone, text: string) {
  await p.t("clue-input").fill(text);
  await p.t("clue-send").click();
  await expect(p.t("clue-send")).toHaveAttribute("data-sent", "true");
}

test.describe("L'imposteur", () => {
  test("mots, indices, débat, vote, révélation et points", async ({ party }) => {
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

    // Tour 1 : son propre mot est refusé, puis chacun envoie un indice.
    const a = phones[0]!;
    await expect(a.t("clue-input")).toBeVisible({ timeout: 10_000 });
    await a.t("clue-input").fill(words[0]!);
    await expect(a.t("clue-error")).toBeVisible();
    for (const [i, p] of phones.entries()) await sendClue(p, `tour1-${i}`);
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "montre", { timeout: 10_000 });
    await expect(tv.getByTestId(`clue-${a.id}-0`)).toHaveText("tour1-0");

    // Tour 2 : les indices du tour 1 restent affichés, ceux du tour 2 arrivent à la fin du tour.
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "indice", { timeout: 10_000 });
    await expect(tv.getByTestId(`clue-${a.id}-0`)).toBeVisible();
    for (const [i, p] of phones.entries()) await sendClue(p, `tour2-${i}`);
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "debat", { timeout: 15_000 });
    await expect(tv.getByTestId(`clue-${a.id}-1`)).toHaveText("tour2-0");

    // Le mot reste consultable sur le téléphone.
    await a.t("word-peek").click();
    await expect(a.t("word-peek")).toHaveAttribute("data-shown", "true");
    await expect(a.t("word-peek-word")).toHaveText(words[0]!);

    // Débat : tout le monde prêt → vote.
    for (const p of phones) await p.t("ready-btn").click();
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "vote");
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

  test("imposteur non démasqué et téléphone déconnecté : la manche ne bloque pas", async ({ party }) => {
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

    // L'imposteur ferme son navigateur : les deux autres terminent chaque étape sans lui.
    await expect(x.t("clue-input")).toBeVisible({ timeout: 10_000 });
    await imp.page.close();
    await sendClue(x, "x1");
    await sendClue(y, "y1");
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "indice", { timeout: 20_000 });
    await expect(tv.getByTestId(`clue-${x.id}-0`)).toHaveText("x1");
    await sendClue(x, "x2");
    await sendClue(y, "y2");
    await expect(tv.getByTestId("tv-imposteur")).toHaveAttribute("data-step", "debat", { timeout: 20_000 });
    await x.t("ready-btn").click();
    await y.t("ready-btn").click();
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
