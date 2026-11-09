# Skins : suivi du chantier (pour reprendre le travail)

État au 9 novembre 2026. Le contrat technique est dans [skins.md](skins.md) ; ce fichier dit **où on en est** et
**comment reprendre**. À mettre à jour à chaque étape, à supprimer (ou réduire) une fois le chantier fusionné dans `main`.

## Références
- **Maquette validée par l'utilisateur** : **https://claude.ai/code/artifact/63f8e7a3-35e1-4279-886f-feffba7ec5bc** (fait foi) ; copie locale [maquettes/skins.html](maquettes/skins.html), à ouvrir dans un navigateur
  (← → pour changer de skin, chrono de démo qui tourne). C'est LA référence visuelle : couleurs, polices, formes, détails.
  Son CSS (`[data-skin="dofus"]`, `ow`, `lol`, `rl`, `gunz`, `mario`, `plague`) est la source à reproduire.
- **Captures du vrai jeu fournies par l'utilisateur** : [maquettes/references/](maquettes/references/), un dossier par
  skin (menus, inventaires, charte officielle pour Plague Tale). Usage privé, pour s'inspirer : jamais de logo ni
  d'élément officiel dans le jeu.

## Décisions de l'utilisateur
- 7 skins, qui imitent l'interface de jeux vidéo des invités : on doit se dire « c'est Dofus ! » en voyant n'importe quel
  écran (police, bordures, couleurs, effets), sans logo.
- **Rester au plus près de la maquette**, sauf problème UX grave (lisibilité à 4 m, téléphone 360×640, zones tactiles).
- **Cohérence** : aucun écran ne doit « sortir du thème ». Seules exceptions : les couleurs des 4 pastilles du Simon et
  les couleurs de contenu (étages de tier-list, feutres, papier du dessin).
- Toujours les 7 skins, ordre tiré au hasard, aucune option de config. Changement uniquement à l'annonce d'une manche,
  avec un rideau neutre (pas d'annonce, pas de texte).
- Thème de base (filet de sécurité au chargement) : bleu Karmine Corp au lieu du violet.
- Compteur commun « ont répondu / attendus » dans le moteur (affiché par le chrono Rocket League).
- Animations demandées : propres à chaque skin (toucher, sélection, chrono, fond d'ambiance léger), cœur Dofus qui se vide.
- Économie : mode « éco » (voir CLAUDE.md, Orchestration) — un skin à la fois, pas de sous-agents en parallèle.

## Ce qui est fait (branche `design/skins`, non fusionnée dans `main`)
- Moteur : skin dans le snapshot, rotation, sauvegarde/reprise, compteur `progress` (tests unitaires).
- Front : `SkinProvider` + rideau, marqueurs `data-ui`, composants `Choice`, `ResultBar`, `DuelGauge`, cadre commun
  `game-frame` des écrans de jeu TV, variantes du chrono, polices embarquées, `?skin=<id>` pour forcer un skin.
- Les 7 fichiers `src/web/theme/skins/<id>.css` existent et habillent l'essentiel.
- Spec de captures : `CAPTURES_SKIN=<id> bun run captures:skin` → `test-results/skins/<id>/` (~140 écrans, ~2 min 30).

## État par skin
| Skin | État | Écarts connus avec la maquette |
|---|---|---|
| `rocket-league` | ✅ revu sur captures et validé par l'utilisateur | — |
| `dofus` | corrigé le 9/11 (cadre de jeu, camps, lisibilité), à valider par l'utilisateur sur captures | — |
| `overwatch` | corrigé le 9/11 (cadre de jeu, camps, lisibilité), à valider par l'utilisateur sur captures | — |
| `league-of-legends` | corrigé le 9/11 (cadre de jeu, camps, lisibilité), à valider par l'utilisateur sur captures | — |
| `gunz` | corrigé le 9/11 (cadre de jeu, camps, lisibilité), à valider par l'utilisateur sur captures | — |
| `mario-odyssey` | corrigé le 9/11 (cadre de jeu, camps, lisibilité), à valider par l'utilisateur sur captures | — |
| `plague-tale` | corrigé le 9/11 (cadre de jeu, camps, lisibilité), à valider par l'utilisateur sur captures | — |

Revue complète sur captures du 9 novembre 2026 : détail par skin dans `captures/REVUE.md` (dossier local, ignoré par git).
Les emojis sont embarqués (Twemoji, voir changer-le-design.md) : plus de dépendance à la police système.

## Procédure pour finir un skin (mode éco)
1. `CAPTURES_SKIN=<id> CAPTURES_DIR=$PWD/captures/<id> bun run captures:skin` (en arrière-plan ; `captures/` est ignoré par git).
2. Regarder un échantillon d'écrans clés et les comparer à la maquette + aux références : lobby TV, un jeu TV (chrono),
   résultats TV, choix téléphone, Ceci ou Cela (camps), un jeu à étapes, pause, final.
3. Corriger dans `src/web/theme/skins/<id>.css` uniquement (dessiner `game-frame` / `game-frame-title`, s'inspirer de
   `rocket-league.css` qui est la référence terminée). Si un composant bloque, l'ajouter au contrat (docs/skins.md).
4. Recapturer seulement les écrans corrigés (`bunx playwright test skins-captures --project=chromium -g "<jeu>"`).
5. `bun run typecheck && bun run test`, commit « Skin <Jeu> : … ».

## Reste à faire avant de proposer le merge
- Faire valider les 6 skins corrigés le 9/11 (captures dans `captures/<skin>/_planches/`).
- Suite E2E complète sur machine calme (`bun run test:e2e`, Chromium + `@compat` Firefox/WebKit) : jamais lancée en
  entier depuis l'intégration (machine saturée pendant les runs des agents).
- Vérifier le thème de base (sans skin) et le rideau de transition en conditions réelles (`bun run dev`, vrais téléphones).
- Faire valider les captures par l'utilisateur, puis merge `--no-ff` dans `main` (« Merge skins »).
