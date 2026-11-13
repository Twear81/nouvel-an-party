// Compte à rebours de minuit : l'heure configurée est « maintenant + N secondes » (voir ServerOptions.minuit).
// Partie en cours : pause automatique, compte à rebours puis célébration sur la TV et les téléphones, reprise par l'hôte.
import { expect, test } from "./helpers/fixtures";

test.describe("Minuit", () => {
  test.describe("partie en cours, reprise par l'hôte", () => {
    test.setTimeout(150_000);
    // Marge large : la partie doit être lancée avant le début du compte à rebours (70 - 12 = 58 s après la config).
    test.use({ serverOptions: { duree: 60, minuit: { dans: 70, compteARebours: 12, repriseAuto: 0 } } });

    test("la manche se fige, compte à rebours puis « Bonne année », l'hôte relance", async ({ party }) => {
      const { tv } = party;
      const [a] = await party.addPhones("Alice", "Bob");
      await party.startGame({ "ceci-ou-cela": 1 });
      await expect(tv.getByTestId("tv-playing")).toBeVisible();

      // Compte à rebours : TV et téléphone, partie figée dessous, barre d'hôte toujours là.
      const tvMidnight = tv.getByTestId("midnight");
      const phoneMidnight = a!.t("midnight");
      await expect(tvMidnight).toHaveAttribute("data-state", "countdown", { timeout: 80_000 });
      await expect(phoneMidnight).toHaveAttribute("data-state", "countdown");
      await expect(tv.getByTestId("midnight-count")).toHaveText(/^\d\d:\d\d$|^\d+$/);
      await expect(tv.getByTestId("host-pause")).toHaveCount(0); // rien à piloter pendant le compte à rebours
      await expect(tv.getByTestId("host-sound")).toBeVisible();

      // Les 10 dernières secondes : un seul grand chiffre.
      await expect(tv.getByTestId("midnight-count")).toHaveAttribute("data-last", "true", { timeout: 20_000 });
      await expect(a!.t("midnight-count")).toHaveAttribute("data-last", "true", { timeout: 5_000 });

      // Minuit : « Bonne année <année> ! », feu d'artifice, bouton de reprise de l'hôte.
      await expect(tvMidnight).toHaveAttribute("data-state", "celebrate", { timeout: 20_000 });
      await expect(phoneMidnight).toHaveAttribute("data-state", "celebrate", { timeout: 5_000 });
      const year = String(new Date().getFullYear());
      expect((await tv.getByTestId("midnight-year").textContent())!).toMatch(/^\d{4}\s*!$/);
      expect((await tv.getByTestId("midnight-year").textContent())!).toContain(year.slice(0, 2));
      await expect(tv.getByTestId("fireworks")).toBeVisible();
      await expect(tv.getByTestId("host-pause")).toContainText("Reprendre");

      // Sans reprise automatique (reprise_auto = 0) la célébration reste tant que l'hôte n'a pas cliqué.
      await tv.getByTestId("host-pause").click();
      await expect(tvMidnight).toHaveCount(0);
      await expect(phoneMidnight).toHaveCount(0);
      await expect(tv.getByTestId("paused-overlay")).toHaveCount(0);
      await expect(a!.t("paused-overlay")).toHaveCount(0);
      await expect(tv.getByTestId("tv-playing")).toBeVisible();
    });
  });

  test.describe("lobby, reprise automatique", () => {
    test.setTimeout(90_000);
    test.use({ serverOptions: { minuit: { dans: 20, compteARebours: 6, repriseAuto: 3 } } });

    test("le compte à rebours s'affiche aussi au lobby puis disparaît tout seul", async ({ party }) => {
      const { tv } = party;
      const [a] = await party.addPhones("Alice");
      await expect(tv.getByTestId("midnight")).toHaveAttribute("data-state", "countdown", { timeout: 30_000 });
      await expect(a!.t("midnight")).toHaveAttribute("data-state", "countdown");
      await expect(tv.getByTestId("midnight")).toHaveAttribute("data-state", "celebrate", { timeout: 15_000 });
      await expect(a!.t("midnight")).toHaveAttribute("data-state", "celebrate", { timeout: 5_000 });
      await expect(tv.getByTestId("midnight")).toHaveCount(0, { timeout: 15_000 });
      await expect(a!.t("midnight")).toHaveCount(0);
      await expect(a!.t("phone-lobby-ready")).toBeVisible();
    });
  });

  test.describe("lobby, reprise manuelle", () => {
    test.use({ serverOptions: { minuit: { dans: 15, compteARebours: 6, repriseAuto: 0 } } });

    test("Continuer ferme la célébration même sans manche mise en pause", async ({ party }) => {
      await party.addPhones("Alice");
      await expect(party.tv.getByTestId("midnight")).toHaveAttribute("data-state", "celebrate", { timeout: 25_000 });
      await expect(party.tv.getByTestId("host-pause")).toContainText("Continuer");
      await party.tv.getByTestId("host-pause").click();
      await expect(party.tv.getByTestId("midnight")).toHaveCount(0);
      await expect(party.phones[0]!.t("midnight")).toHaveCount(0);
      await expect(party.tv.getByTestId("tv-lobby")).toBeVisible();
    });
  });
});
