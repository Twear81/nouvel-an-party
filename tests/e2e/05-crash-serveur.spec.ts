import { expect, test } from "./helpers/fixtures";

test.describe("Crash du serveur", () => {
  test("la partie peut être reprise après un redémarrage, les téléphones se reconnectent seuls", async ({ party }) => {
    const { tv, server } = party;
    const [a, b, c] = await party.addPhones("Alice", "Bob", "Chloé");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 1 });

    // Manche 1 jusqu'aux résultats.
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await party.answerRound();
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    const deltas = await party.tvDeltas();
    const scores = { [a!.id!]: deltas[a!.id!]!, [b!.id!]: deltas[b!.id!]!, [c!.id!]: deltas[c!.id!]! };
    expect(Object.values(scores).some((s) => s > 0)).toBe(true);

    // Crash brutal du serveur : tous les écrans signalent la reconnexion.
    await server.kill();
    await expect(tv.getByTestId("reconnecting")).toBeVisible();
    for (const p of [a!, b!, c!]) await expect(p.t("reconnecting")).toBeVisible();

    // Redémarrage sur les mêmes ports et les mêmes données : la TV propose de reprendre.
    await server.start();
    await expect(tv.getByTestId("resume-game")).toBeVisible();
    await expect(tv.getByTestId("resume-game")).toContainText("manche 1/2");
    for (const p of [a!, b!, c!]) {
      await expect(p.t("reconnecting")).toHaveCount(0);
      // Le profil est conservé : retour dans le lobby, pas de création de profil.
      await expect(p.t("phone-lobby-ready")).toBeVisible();
    }
    await expect(tv.getByTestId("start-game")).toBeEnabled();

    // Reprise : la partie continue à la manche 2.
    await tv.getByTestId("resume-game").click();
    await expect(tv.getByTestId("tv-playing")).toContainText("2 / 2");
    await party.answerRound();
    await expect(tv.getByTestId("tv-results")).toBeVisible();

    // Les scores de la manche 1 ont survécu : total = manche 1 + manche 2.
    const deltas2 = await party.tvDeltas();
    for (const p of [a!, b!, c!]) {
      expect(await party.phoneScore(p)).toBe(scores[p.id!]! + deltas2[p.id!]!);
    }

    await party.continueAll();
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    for (const p of [a!, b!, c!]) await expect(p.t("phone-final")).toContainText(`${scores[p.id!]! + deltas2[p.id!]!} pts`);
  });

  test("un serveur redémarré après la fin de la partie ne propose rien à reprendre", async ({ party }) => {
    const { tv, server } = party;
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "ceci-ou-cela": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await tv.getByTestId("host-skip").click(); // fin du chrono
    await expect(tv.getByTestId("tv-results")).toBeVisible();
    await tv.getByTestId("host-skip").click(); // résultats -> classement
    await expect(tv.getByTestId("tv-final")).toBeVisible();
    await server.kill();
    await server.start();
    await expect(tv.locator("[data-phase=lobby]")).toBeVisible();
    await expect(tv.getByTestId("resume-game")).toHaveCount(0);
  });
});
