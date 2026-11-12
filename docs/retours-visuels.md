# Retours visuels — 12 novembre 2026

Les quatre corrections de revue sont regroupées dans la [comparaison avant / après](../captures/retours-visuels/index.html).

- **Dessin raté** : la couronne est centrée au-dessus de la feuille, dans un emplacement réservé. Elle ne recouvre plus le dessin. Arrivée, son et confettis gardent leurs constantes de synchronisation.
- **Alignements** : `--spacing-tv-gutter` fixe la marge extérieure commune à 3,5 rem ; `--spacing-tv-panel` fixe le retrait intérieur à 2 rem. Cadres, titres, contenus, en-têtes et bande des points suivent cette grille, quel que soit le skin. Lobby, intro et classement final utilisent aussi la marge extérieure commune.
- **Simon** : le classement utilise la couronne de `PlayerAvatar`, peinte au-dessus du cadre, proportionnelle à l’avatar et ancrée sur son haut. Son délai d’arrivée est conservé.
- **Champs envoyés** : conformément au choix de l’organisateur, les saisies de Comme les autres et Split the Room sont désactivées après acceptation, grisées et verrouillées même après rechargement. Le serveur conserve la première réponse valable et refuse modification ou retrait. Une saisie invalide reste corrigeable. Les votes et les montants du Bon Prix gardent leurs règles.

Les sons ne sont pas modifiés dans ce lot.

## Vérification ciblée

- `bun run typecheck` : validé.
- `bun test tests/unit/comme-les-autres.test.ts tests/unit/split-the-room.test.ts` : 53 réussis.
- Specs Chromium `comme-les-autres.spec.ts` et `split-the-room.spec.ts` : 3 réussis ; Comme les autres revérifié avec le cas de saisie refusée et le verrouillage après rechargement.
- Galerie à huit joueurs, thème de base et six skins : 14 comparaisons des deux bords, écart maximal de 0 px, retraits intérieurs identiques entre cadre et bandeau ; couronne du dessin entièrement au-dessus de la feuille ; champs réellement désactivés. Simon également regardé à trois joueurs.
- Captures regardées ; spec exploratoire supprimé avant commit. Suite complète volontairement non relancée à la demande de l’organisateur.
