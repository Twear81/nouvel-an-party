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
- Avatars : portrait et décor séparés (`PlayerAvatar` / `AvatarFrame`), tracés SVG communs aux six cadres,
  silhouette choisie par les jetons du skin. Le profil garde ses identifiants ; les aperçus utilisent le portrait
  réellement choisi (emoji ou photo). Choix du profil habillables, cadres sur trois colonnes à 360 px.
- Marqueur `data-tone` sur `Choice` : la sélection ne dépend plus d'une classe `.glass` qui disparaissait après le choix.
  Nom du jeu affiché une seule fois sur la TV ; libellés Pierre / Feuille / Ciseaux agrandis.
- Mario : champs blancs, sélection rouge avec contour blanc, choix écartés gris opaques, ombre des grands chiffres retirée,
  textes accentués des titres blancs sur le bandeau olive (nom de l'orateur de l'Imposteur compris).
- WebKit : dépendances installées par l'utilisateur ; contournement du proxy pour les serveurs locaux dans
  `playwright.config.ts`. L'outil de captures fonctionne aussi en Firefox/WebKit et force le même skin sur la TV Chromium.

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

## Validation locale du dernier lot (9 novembre 2026)
- `bun run typecheck` : réussi ; `bun run test` : **498 tests réussis**, 0 échec (18 770 assertions).
- `bun run test:e2e --workers=2` : **115 réussis, 44 ignorés, 2 échecs**, en 16,7 min. Échecs identifiés :
  collision de port au démarrage de la fixture du test « retirer un joueur », et ancien test du choix enregistré
  qui comptait tous les SVG (cadre compris) au lieu de cibler la coche. Ce test utilise maintenant les marqueurs
  `choice-check`, `roster-item[data-done]` et `avatar-badge`.
- Relance des deux seuls scénarios concernés (`06-controles-hote 09-ergonomie --project=chromium --workers=1
  -g 'retirer un joueur|la phase de vote indique'`) : **2 réussis**, en 15,3 s.
  Bilan agrégé : **117 scénarios validés**. Les ignorés sont l'outil de captures sans skin demandé et la caméra
  factice indisponible sous WebKit ; le parcours galerie photo est testé sur les trois moteurs.
- Les **21 combinaisons skin/moteur** des tests d'avatars passent : six cadres, vrai aperçu emoji/photo,
  conservation après rechargement, boutons dans les 360 px et animations figées en mode réduit.
- Captures de jeu : **27 scénarios Chromium** (lobby à 8, Ceci ou Cela, pause/final des 7 skins, plus écrans Mario
  corrigés). Captures WebKit : Overwatch (lobby, Ceci ou Cela, Culture gênante) et Mario (Comme les autres,
  Pierre-feuille-ciseaux, Imposteur). Relecture locale face aux maquettes, dont le nom de l'orateur et les champs Mario.
- Preuves locales : `captures/validation-finale/` (journaux, résultats et traces du run complet avant relance),
  `captures/revue-avatars/` (63 PNG), `captures/revue-finition/index.html` (galerie, régénérable avec
  `python3 captures/revue-finition/generer-galerie.py`). Ce sont des contrôles locaux, sans validation utilisateur
  ni essai sur les vrais appareils de la soirée.

## Procédure pour finir un skin (mode éco)
1. `CAPTURES_SKIN=<id> CAPTURES_DIR=$PWD/captures/<id> bun run captures:skin` (en arrière-plan ; `captures/` est ignoré par git).
2. Regarder un échantillon d'écrans clés et les comparer à la maquette + aux références : lobby TV, un jeu TV (chrono),
   résultats TV, choix téléphone, Ceci ou Cela (camps), un jeu à étapes, pause, final.
3. Corriger dans `src/web/theme/skins/<id>.css` uniquement (dessiner `game-frame` / `game-frame-title`, s'inspirer de
   `rocket-league.css` qui est la référence terminée). Si un composant bloque, l'ajouter au contrat (docs/skins.md).
4. Recapturer seulement les écrans corrigés (`bunx playwright test skins-captures --project=chromium -g "<jeu>"`).
5. `bun run typecheck && bun run test`, commit « Skin <Jeu> : … ».

## Reste à faire avant de proposer le merge
1. **Valider visuellement les cadres et les 6 skins corrigés** : galerie locale
   `captures/revue-finition/index.html` (maquette, cadres emoji/photo, lobby à 8, jeu, résultats, pause, final).
   Détails : `captures/revue-finition/<skin>/<moteur>/` et `captures/revue-avatars/<moteur>/`.
   Ce dossier reste ignoré par Git ; les captures antérieures dans `captures/<skin>/_planches/` peuvent être périmées.
2. **Culture gênante** : le mode sérieux garde pour l'instant sa rupture sombre (comportement existant) ; les textes
   sont éclaircis pour rester lisibles sous les skins clairs. Faire valider ce choix visuel par l'utilisateur.
3. Vérifier le thème de base (sans skin) et le rideau de transition en conditions réelles (`bun run dev`, vrais téléphones).
4. Merge `--no-ff` dans `main` (« Merge skins ») après validation de l'utilisateur.

## Points de vigilance
- L'Imposteur : les captures Mario renouvelées confirment le cadre commun à toutes les étapes ; les anciennes images
  sans cadre étaient périmées.
- Profil : garder les deux boutons d'édition dans les 360 px utiles, même avec les polices larges des skins ;
  vérifier aussi les aperçus photo, les badges et les tailles d'avatar petites/grandes.
- Captures : avec 4 workers sur machine chargée, des jeux échouent au hasard (relancer seuls) ; certaines étapes brèves
  (« pick » de Pierre-feuille-ciseaux, mot de l'Imposteur) ne sont pas toujours photographiées.
