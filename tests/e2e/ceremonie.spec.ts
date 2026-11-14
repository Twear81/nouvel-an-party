import { expect, test } from "./helpers/fixtures";

test.describe("Cérémonie de fin", () => {
  test.use({ serverOptions: { outro: true, ceremonyTimeScale: 0.12 } });
  test("bonus synchronisés, pause, rechargement et classement final", { tag: ["@compat", "@fumee"] }, async ({ party }) => {
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-est-le-plus": 1 });
    await expect(party.tv.getByTestId("tv-playing")).toBeVisible();
    await party.answerRound();
    await party.continueAll();
    await expect(party.tv.getByTestId("tv-ceremony")).toBeVisible({ timeout: 15_000 });
    await party.tv.getByTestId("host-pause").click();
    const step = await party.tv.getByTestId("tv-ceremony").getAttribute("data-step");
    await phones[0]!.page.reload();
    await expect(phones[0]!.t("phone-ceremony")).toHaveAttribute("data-step", step!);
    await expect(phones[0]!.t("phone-final")).toHaveCount(0);
    await party.tv.getByTestId("host-skip").click();
    await expect(party.tv.getByTestId("tv-ceremony")).not.toHaveAttribute("data-step", step!);
    await party.tv.getByTestId("host-pause").click();
    await expect(party.tv.getByTestId("tv-final")).toHaveAttribute("data-stage", "done", { timeout: 40_000 });
    for (const p of phones) await expect(p.t("phone-final")).toBeVisible();
  });
});
