import { expect, test } from "./helpers/fixtures";

// Le fixture contient 5 questions "qui-est-le-plus" et 6 "oui-non".
const QUI = "qui-est-le-plus";
const OUI = "oui-non";

test.describe("Écran de lancement", () => {
  test("les compteurs de manches sont bornés entre 0 et le nombre de questions", async ({ party }) => {
    const { tv } = party;
    for (const [id, max] of [[QUI, 5], [OUI, 6]] as const) {
      await expect(tv.getByTestId(`setup-row-${id}`)).toContainText(`sur ${max}`);
      // Descendre jusqu'à 0 : le bouton "−" se désactive.
      await party.setCounts({ [id]: 0 });
      await expect(tv.getByTestId(`setup-dec-${id}`)).toBeDisabled();
      await expect(tv.getByTestId(`setup-inc-${id}`)).toBeEnabled();
      // Monter jusqu'au maximum : le bouton "+" se désactive et le compteur ne dépasse pas.
      await party.setCounts({ [id]: max });
      await expect(tv.getByTestId(`setup-inc-${id}`)).toBeDisabled();
      await expect(tv.getByTestId(`setup-count-${id}`)).toHaveText(String(max));
      await expect(tv.getByTestId(`setup-dec-${id}`)).toBeEnabled();
    }
  });

  test("le total des manches se met à jour", async ({ party }) => {
    const total = party.tv.getByTestId("setup-total");
    await party.setCounts({ [QUI]: 0, [OUI]: 0 });
    await expect(total).toContainText("0 manche");
    await party.setCounts({ [QUI]: 2 });
    await expect(total).toContainText("2 manches");
    await party.setCounts({ [OUI]: 3 });
    await expect(total).toContainText("5 manches");
    await party.setCounts({ [QUI]: 1 });
    await expect(total).toContainText("4 manches");
    await party.setCounts({ [QUI]: 0, [OUI]: 1 });
    await expect(total).toContainText("1 manche");
    await expect(total).not.toContainText("manches");
  });

  test("le bouton Lancer est désactivé sans joueur prêt puis sans manche", async ({ party }) => {
    const { tv } = party;
    const start = tv.getByTestId("start-game");
    await party.setCounts({ [QUI]: 1, [OUI]: 0 });
    // Personne.
    await expect(start).toBeDisabled();
    await expect(tv.getByTestId("start-blocked")).toContainText("joueur prêt");

    // Un téléphone connecté mais sans profil n'est pas "prêt".
    await party.openPhonePage();
    await expect(tv.getByText("crée son profil…")).toBeVisible();
    await expect(start).toBeDisabled();

    // Un joueur prêt : on peut lancer…
    await party.addPhone("Alice");
    await expect(start).toBeEnabled();

    // …sauf s'il n'y a aucune manche.
    await party.setCounts({ [QUI]: 0, [OUI]: 0 });
    await expect(start).toBeDisabled();
    await expect(tv.getByTestId("start-blocked")).toContainText("au moins une manche");
    await party.setCounts({ [OUI]: 1 });
    await expect(start).toBeEnabled();
  });

  test.describe("annonce longue", () => {
    // Annonce de 60 s : on la passe à la main, ce qui rend les vérifications sur l'annonce stables.
    test.use({ serverOptions: { introSeconds: 60 } });

    test("la partie lancée contient le nombre de manches configuré", async ({ party }) => {
      const { tv } = party;
      const [alice] = await party.addPhones("Alice", "Bob");
      await party.startGame({ [QUI]: 2, [OUI]: 1 });
      await expect(alice!.t("phone-intro")).toContainText("Manche 1 / 3");

      // On déroule les manches avec « Passer » et on compte : exactement 3 manches puis le classement.
      for (let n = 1; n <= 3; n++) {
        await expect(tv.getByTestId("tv-intro")).toContainText(`Manche ${n} / 3`);
        await tv.getByTestId("host-skip").click();
        await expect(tv.getByTestId("tv-playing")).toContainText(`${n} / 3`);
        await tv.getByTestId("host-skip").click();
        await expect(tv.getByTestId("tv-results")).toContainText(`${n} / 3`);
        await tv.getByTestId("host-skip").click();
      }
      await expect(tv.getByTestId("tv-final")).toBeVisible();
    });
  });
});
