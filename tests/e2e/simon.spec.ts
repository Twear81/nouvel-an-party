// Simon : la TV joue la suite (lue ici dans data-sequence), les téléphones la reproduisent ; une faute élimine, le dernier debout gagne.
import { expect, test } from "./helpers/fixtures";
import type { Phone } from "./helpers/party";

test.describe("Simon", () => {
  test.setTimeout(120_000);

  test("3 joueurs : deux se trompent, le dernier debout gagne", async ({ party }) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    const [a, b, c] = phones as [Phone, Phone, Phone];
    await party.startGame({ simon: 1 });

    const simonTv = tv.getByTestId("simon-tv");
    /** Attend que la TV joue une suite de `length` notes et la renvoie. */
    const readSequence = async (length: number) => {
      await expect(simonTv).toHaveAttribute("data-stage", "show", { timeout: 15_000 });
      await expect(simonTv).toHaveAttribute("data-length", String(length));
      const seq = (await simonTv.getAttribute("data-sequence"))!.split(",").map(Number);
      expect(seq).toHaveLength(length);
      return seq;
    };
    const tapAll = async (p: Phone, seq: number[]) => {
      for (const pad of seq) await p.t(`simon-pad-${pad}`).click();
    };

    // ── Étape 1 (2 notes) : la suite s'allume sur la TV, jamais sur les téléphones.
    let seq = await readSequence(2);
    for (const p of phones) {
      await expect(p.t("simon-phone")).toHaveAttribute("data-status", "watch");
      expect(await p.page.locator("[data-sequence], [data-lit]").count()).toBe(0);
    }
    for (const p of phones) await expect(p.t("simon-phone")).toHaveAttribute("data-status", "play", { timeout: 10_000 });
    await tapAll(a, seq);
    await expect(a.t("simon-phone")).toHaveAttribute("data-status", "done");
    await expect(tv.getByTestId(`simon-player-${a.id}`)).toHaveAttribute("data-state", "done");
    await tapAll(b, seq);
    await tapAll(c, seq);

    // ── Étape 2 (3 notes) : Bob se trompe dès la 1re note, il est éliminé tout de suite.
    seq = await readSequence(3);
    await expect(b.t("simon-phone")).toHaveAttribute("data-status", "play", { timeout: 10_000 });
    await b.t(`simon-pad-${(seq[0]! + 1) % 4}`).click();
    await expect(b.t("simon-phone")).toHaveAttribute("data-status", "out");
    await expect(tv.getByTestId(`simon-player-${b.id}`)).toHaveAttribute("data-state", "out");
    // Spectateur : il voit qui est encore en lice.
    await expect(b.t(`simon-roster-${a.id}`)).toHaveAttribute("data-state", "alive");
    await expect(b.t(`simon-roster-${b.id}`)).toHaveAttribute("data-state", "out");
    await tapAll(a, seq);
    await tapAll(c, seq);

    // ── Étape 3 (4 notes) : Chloé se trompe à la dernière note, Alice réussit : Alice gagne.
    seq = await readSequence(4);
    await expect(c.t("simon-phone")).toHaveAttribute("data-status", "play", { timeout: 10_000 });
    await tapAll(c, seq.slice(0, 3));
    await c.t(`simon-pad-${(seq[3]! + 1) % 4}`).click();
    await expect(c.t("simon-phone")).toHaveAttribute("data-status", "out");
    await tapAll(a, seq);
    await expect(simonTv).toHaveAttribute("data-stage", "over");
    await expect(a.t("simon-phone")).toHaveAttribute("data-status", "win");
    await expect(tv.getByTestId("simon-banner")).toContainText("Alice gagne");

    // ── Résultats : Alice 3 étapes + bonus, Chloé 2 étapes, Bob 1 étape.
    await expect(tv.getByTestId("tv-results")).toBeVisible({ timeout: 15_000 });
    await expect(tv.getByTestId(`simon-col-${a.id}`)).toHaveAttribute("data-winner", "true");
    expect(await party.tvDeltas()).toEqual({ [a.id!]: 3 * 20 + 150, [b.id!]: 20, [c.id!]: 2 * 20 });
    await expect(a.t("phone-simon-result")).toHaveAttribute("data-winner", "true");
    await party.continueAll();

    // ── Classement final.
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    for (const p of phones) await expect(p.t("phone-final")).toBeVisible();
  });
});
