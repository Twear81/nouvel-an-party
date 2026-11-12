import { expect, test } from "./helpers/fixtures";

const CG = "culture-genante";
const names = Array.from({ length: 8 }, (_, i) => "Invité numéro " + String(i + 1).padStart(2, "0"));

async function nextFrames(page: import("@playwright/test").Page, count = 8) {
  await page.evaluate((n) => new Promise<void>((resolve) => {
    const frame = () => --n <= 0 ? resolve() : requestAnimationFrame(frame);
    requestAnimationFrame(frame);
  }), count);
}

test.describe("Scènes de la pièce", () => {
  test.setTimeout(180_000);

  test("ouverture à huit invités : pause, rechargement et passage restent synchronisés", { tag: "@compat" }, async ({ party }, testInfo) => {
    const { tv } = party;
    const phones = await party.addPhonesWith({ viewport: { width: 360, height: 640 } }, ...names);
    await expect(tv.locator("html")).not.toHaveAttribute("data-skin", /.+/);
    await party.setOnly({ "ceci-ou-cela": 1 });
    await tv.getByTestId("start-game").click();

    const scene = tv.getByTestId("tv-transition");
    await expect(scene).toHaveAttribute("data-kind", "opening");
    await tv.getByTestId("host-pause").click();
    await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    const elapsed = await scene.getAttribute("data-elapsed-ms");
    for (const p of phones) {
      await expect(p.t("phone-transition-wait")).toBeVisible();
      await expect(p.t("phone-playing")).toHaveCount(0);
      await expect(p.t("points-gained")).toHaveCount(0);
    }
    await expect(tv.getByTestId("tv-playing")).toHaveCount(0);
    await expect(tv.getByTestId("countdown")).toHaveCount(0);
    await nextFrames(tv);
    await expect(scene).toHaveAttribute("data-elapsed-ms", elapsed!);

    await tv.reload();
    await phones[0]!.page.reload();
    await expect(scene).toHaveAttribute("data-kind", "opening");
    await expect(scene).toHaveAttribute("data-elapsed-ms", elapsed!);
    await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    await expect(phones[0]!.t("phone-transition-wait")).toBeVisible({ timeout: 20_000 });
    await expect(phones[0]!.t("profile-name")).toHaveCount(0);

    await tv.getByTestId("host-pause").click();
    await expect(scene).toHaveAttribute("data-stage", "table", { timeout: 10_000 });
    await expect(tv.getByTestId("transition-room")).toHaveAttribute("data-image", "ready");
    await expect(tv.locator('[data-testid^="transition-player-"]')).toHaveCount(8);
    expect((await tv.locator('[data-testid^="transition-name-"]').allTextContents()).sort()).toEqual([...names].sort());
    await tv.screenshot({ path: testInfo.outputPath("ouverture-table-8.png") });
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await expect(scene).toHaveCount(0);
    const skin = await tv.locator("html").getAttribute("data-skin");
    expect(skin).toBeTruthy();
    await Promise.all(phones.map((p) => expect(p.page.locator("html")).toHaveAttribute("data-skin", skin!)));
    await expect(phones[0]!.t("phone-playing")).toBeVisible();

    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await tv.getByTestId("host-skip").click();
    await expect(scene).toHaveAttribute("data-kind", "closing");
    await expect(phones[0]!.t("phone-final")).toHaveCount(0);
    await tv.getByTestId("host-skip").click();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await expect(tv.locator("html")).not.toHaveAttribute("data-skin", /.+/);
  });

  test("Culture gênante termine l'univers après ses résultats, puis le jeu reprend dans le suivant", async ({ party }, testInfo) => {
    const { tv } = party;
    const phones = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "ceci-ou-cela": 4, [CG]: 1 });
    let changes = 0;
    let previousSkin = await tv.locator("html").getAttribute("data-skin");

    for (let round = 0; round < 6; round++) {
      const playing = tv.getByTestId("tv-playing");
      await expect(playing).toBeVisible({ timeout: 15_000 });
      const interlude = (await playing.getAttribute("data-interlude")) === "true";
      await expect(tv.locator("html")).toHaveAttribute("data-skin", previousSkin!);
      await tv.getByTestId("host-skip").click();
      await expect(tv.getByTestId("tv-results")).toBeVisible();
      await expect(tv.locator("html")).toHaveAttribute("data-skin", previousSkin!);
      await expect(tv.getByTestId("tv-transition")).toHaveCount(0);
      await tv.getByTestId("host-skip").click();

      if (round === 5) {
        await expect(tv.getByTestId("tv-transition")).toHaveAttribute("data-kind", "closing");
        await expect(tv.locator('[data-testid="tv-transition"][data-kind="skin"]')).toHaveCount(0);
        await tv.getByTestId("host-skip").click();
      } else if (interlude) {
        const transition = tv.getByTestId("tv-transition");
        await expect(transition).toHaveAttribute("data-kind", "skin");
        await tv.getByTestId("host-pause").click();
        await expect(tv.getByTestId("paused-overlay")).toBeVisible();
        const elapsed = await transition.getAttribute("data-elapsed-ms");
        await expect(tv.getByTestId("tv-playing")).toHaveCount(0);
        for (const p of phones) await expect(p.t("phone-transition-wait")).toBeVisible();
        await nextFrames(tv);
        await expect(transition).toHaveAttribute("data-elapsed-ms", elapsed!);
        await tv.getByTestId("host-pause").click();
        await tv.screenshot({ path: testInfo.outputPath(`changement-univers-${changes + 1}.png`) });
        await tv.getByTestId("host-skip").click();
        await expect(tv.locator("html")).not.toHaveAttribute("data-skin", previousSkin!);
        previousSkin = await tv.locator("html").getAttribute("data-skin");
        expect(previousSkin).toBeTruthy();
        await Promise.all(phones.map((p) => expect(p.page.locator("html")).toHaveAttribute("data-skin", previousSkin!)));
        changes++;
      } else {
        await expect(tv.locator('[data-testid="tv-transition"][data-kind="skin"]')).toHaveCount(0);
      }
    }
    expect(changes).toBeGreaterThanOrEqual(1);
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await expect(tv.locator("html")).not.toHaveAttribute("data-skin", /.+/);
    await expect(tv.getByTestId("tv-final")).toHaveAttribute("data-stage", "done", { timeout: 15_000 });
    for (const p of phones) await expect(p.t("phone-final")).toBeVisible();
  });

  test("un retour au lobby pendant l'ouverture annule la scène", async ({ party }) => {
    const { tv } = party;
    await party.addPhones("Alice", "Bob");
    await party.setOnly({ "ceci-ou-cela": 1 });
    await tv.getByTestId("start-game").click();
    await expect(tv.getByTestId("tv-transition")).toHaveAttribute("data-kind", "opening");
    await tv.getByTestId("host-lobby").click();
    await tv.getByTestId("confirm-yes").click();
    await expect(tv.locator("[data-phase]")).toHaveAttribute("data-phase", "lobby");
    await expect(tv.getByTestId("tv-transition")).toHaveCount(0);
    await expect(tv.locator("html")).not.toHaveAttribute("data-skin", /.+/);
    await expect(tv.getByTestId("start-game")).toBeEnabled();
  });
});
