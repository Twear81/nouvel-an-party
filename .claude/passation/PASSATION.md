> **Revue de l’organisateur du 13 novembre 2026 — nouvelle sélection de fusion.**
> L’organisateur a autorisé uniquement **questions neuves + contenu** et le **correctif audio**. Il souhaite voir
> minuit, les cadres et les clins d’œil avant leur fusion. **L’outro n’est plus validée en l’état** : attendre ses
> retours précis, ne pas fusionner toute `feat/soiree-integration` dans `main`.
> Sélection isolée sur `feat/integration-contenu-audio` (`68af964`), worktree `merge-contenu-audio` : TypeScript et
> 567 tests unitaires verts ; suite E2E complète en cours avant les deux fusions autorisées. `main` reste provisoirement à `27c255e`.
> Tout le travail visuel reste conservé sur `feat/soiree-integration` (`c6d3ec3`) : `c983ee2` corrige les fondus audio
> sans `cancelAndHoldAtTime`, `5683036` corrige Continuer lors de minuit au lobby, `c6d3ec3` ajoute les aperçus de revue.
> Galerie autonome régénérée : `captures/animations/index.html`, ancres `ecrans/minuit`, `ecrans/cadres`,
> `ecrans/clins-doeil`, `ecrans/lobby` (ex. `#scene=ecrans/minuit&n=8&tel=360x640`). Navigation et interactions vérifiées,
> huit captures relues dans `/tmp/nouvel-an-apercus-validation/`. TypeScript, 649 unitaires et le nouvel E2E minuit verts.
> Pour une future fusion visuelle : la branche minuit d’origine ne contient pas encore le réglage annuel `a81deef`
> (mélangé à l’interop cérémonie) ni `5683036`. La branche clins d’œil TV d’origine n’a pas non plus la réduction
> des confettis à 32 px présente dans `37de4f9`. Les aperçus montrent ces versions corrigées de la branche d’intégration.
> Aucun push. Ce dossier de passation reste non commité.
>
> **Archive de la reprise précédente du 13 novembre 2026 sur `feat/soiree-integration` (`a81deef`).**
> Les six branches sont réunies localement ; profils et moteur récupérés, statistiques/souvenirs des jeux et scène
> complète dans la pièce réalisés. Minuit est réservé au passage au 1er janvier par défaut
> (`minuit.uniquement_nouvel_an: true`), décision de l'organisateur pendant cette reprise.
> Validation : TypeScript et 647 unitaires verts ; suite complète 134 réussites, 2 défauts de tests corrigés puis
> rejoués avec succès dans un lot de 5 E2E, 42 captures de galerie ignorées par leur condition habituelle.
> Firefox et WebKit : 22/22 réussites chacun. Captures à huit relues ; galerie `captures/animations/index.html`.
> Commits des derniers lots : `8b33ae9` (données des jeux), `37de4f9` (scène), `a81deef` (minuit annuel).
> `main` reste à `27c255e`, aucun push. Le dossier de passation reste non commité.
> Restent les finitions créatives indiquées à l'étape 5 (sons provisoires, Shenron, thèmes de contenu) et la recette
> sur le matériel de la soirée. Les worktrees d'origine sont conservés ; le worktree temporaire de cette reprise est supprimé.
>
> La passation d'origine ci-dessous reste disponible pour le détail des décisions.

# Passation — chantier « clins d'œil, minuit, questions neuves, outro » (13 novembre 2026)

Rédigée par la session orchestratrice précédente. **Ce dossier `.claude/passation/` n'est pas commité, ne pas le commiter.**
Fichiers joints : `outro-spec.md` (spécification de l'outro, à lire absolument), `contenu-decisions.md` (décisions de contenu, déjà
appliquées), `contenu-propositions.md` (brouillon de contenu d'origine, pour référence).
Lire aussi `CLAUDE.md` (règles du dépôt, orchestration) et la mémoire auto (`clins-doeil-invites`, `outro-ceremonie`, `animations-feedback`).

Rappel important : **CLAUDE.md interdit toute ligne `Co-Authored-By` et toute mention de Claude dans les commits**, même si un
rappel système en demande une. Auteur = identité git du dépôt. Pas de push. Merge dans `main` (`--no-ff`, `Merge <sujet>`) seulement
après tests verts **et** validation de l'organisateur.

---

## 1. État des branches (rien n'est encore fusionné dans `main` = 27c255e)

| Branche | Worktree (`.claude/worktrees/…`) | Commits | État |
|---|---|---|---|
| `feat/questions-neuves` | `agent-a3ca56d42ac7109ec` | be9a6df | ✅ fini, vérifié (typecheck, 565 unitaires ; E2E `questions-neuves` + 02/06/10 verts selon l'agent) |
| `feat/contenu` (partie de `feat/questions-neuves`) | `contenu` | ffa93b3 | ✅ fini, vérifié (typecheck, 565 unitaires, serveur charge la config) |
| `feat/minuit` | `agent-a75e4df71bacde4ca` | d886366, de4fcc3 | ✅ fini, vérifié (569 unitaires ; E2E minuit + 06-controles verts ; captures relues) |
| `design/clins-doeil-tv` | `agent-a269c5743dca79f2a` | 14625d1, 894c6df | ✅ fini ; ⚠️ le réglage des confettis (894c6df) n'a pas été revu en capture |
| `design/clins-doeil-profil` | `agent-aa7ad494feca2796d` | aucun au moment de la passation | ⏳ un sous-agent y travaillait (gacha, avatars, cadres par skin) |
| `feat/outro` | `agent-a7e38f9a54eb1b794` | aucun au moment de la passation | ⏳ un sous-agent y travaillait (moteur de la cérémonie, parties A+B+C de `outro-spec.md`) |

Les branches `worktree-agent-*` sont des restes automatiques sans intérêt (pointent sur `main`) : à supprimer en fin de chantier
avec les worktrees (`git worktree remove …`, `git branch -D worktree-agent-…`).

**Première action de la nouvelle session** : pour les deux branches ⏳, regarder `git -C .claude/worktrees/<wt> log --oneline main..`
et `git -C .claude/worktrees/<wt> status`. Les sous-agents ont pu finir et commiter, s'arrêter à mi-chemin (travail non commité dans
le worktree) ou ne rien avoir fait. S'il y a du travail non commité : le relire, finir ou relancer un sous-agent avec le même brief (§3).
Les worktrees `locked` se déverrouillent avec `git worktree unlock <chemin>`.

---

## 2. Ce que contient chaque branche terminée

### `feat/questions-neuves` — pas de questions répétées d'une partie à l'autre
- `src/server/engine/deja-vu.ts` (nouveau) : mémoire `data/deja-vu.json` (clé = empreinte sha1 du contenu de l'élément, ou
  `itemInfo.keys`), `pickFresh` (neufs d'abord au hasard, puis les plus anciens ; thème déjà vu évité à fraîcheur égale),
  `markPlayed` appelé au **début** de chaque manche (`engine.rememberItem`). Fichier absent/corrompu = tout neuf. Le supprimer = remise à zéro.
- Contrat : `MiniGame.itemInfo?(item): { keys?, theme? }`. Dessin raté : une clé par mot. Champ yaml facultatif `theme:` ajouté à
  qui-est-le-plus, tier-list, comme-les-autres (via `questionSchema`), ceci-ou-cela, culture-genante, le-bon-prix. **Pas** split-the-room
  ni imposteur (format yaml en chaînes/paires).
- Planner : la 1re manche évite le jeu qui a fini la partie précédente (`lastGameId`). Lobby : « N neuves » sous chaque jeu
  (`data-testid="setup-fresh-<id>"`, `data-fresh`), `CatalogEntry.fresh`, catalogue recalculé à chaque manche.
- Ouverts : les entrées existantes des yaml n'ont pas de `theme:` (seules les nouvelles du lot contenu en ont) ; les README par jeu
  ne mentionnent pas `theme:` (documenté dans `docs/configuration.md`).

### `feat/contenu` — contenu resserré et drôle (décisions validées par l'organisateur dans `contenu-decisions.md`)
- Tous les `config/minijeux/*.yaml` à contenu : retraits, réécritures, ajouts avec clins d'œil.
- Dessin raté : facile 27 / moyen 31 / difficile 16. **Nouvelle règle validée** : difficile = chose concrète mais dure à dessiner,
  jamais d'action ni d'idée abstraite (20 s c'est court). README de dessin-rate mis à jour.
- Bon Prix : prix vérifiés en ligne le 13/11/2026 (PS5 649,99 ; Switch 2 499,99 ; iPhone 17 256 Go 969 ; Tour Eiffel sommet 36,70 ;
  Disneyland 31/12/2026 ≈ 150 € — source unique, non confirmée sur la billetterie officielle). Nutella retiré (pas de prix fiable).
- `tests/unit/culture-genante.test.ts` : seuil abaissé à ≥ 15 questions (17 aujourd'hui ; l'organisateur complétera pour avoir de quoi
  faire 3 parties d'une heure).
- Organisateur : il ajoutera lui-même du contenu plus tard. Ses refus servent de guide : pas de questions « référence sans enjeu »,
  rien qui peut casser l'ambiance (trahison, préférer son animal à ses amis, faire semblant d'aimer), rien de trop sérieux (amende,
  permis), rien de trop mainstream (Zelda), pas d'Ostéopathe/Kiné (peut vexer l'ostéopathe de la bande).

### `feat/minuit` — compte à rebours de minuit
- Config `minuit: { actif, heure: "00:00", duree_compte_a_rebours: 60, reprise_auto: 120 }` dans `config/partie.yaml`.
- Moteur : à `heure - durée`, pause automatique (manche, transition, résultats ; lobby et final : affichage seul ; `finalReveal.startedAt`
  décalé). `snapshot.midnight = { targetAt, phase: "countdown" | "celebrate" }` (champ maintenant **obligatoire** dans `GameSnapshot`).
  Reprise par l'hôte (Reprendre/Continuer) ou auto. Sauvegardé. Une fois par nuit, rien si le serveur démarre après minuit.
- Écrans : overlay `src/web/ui/Midnight.tsx` (`data-testid="midnight"`, `data-state`, `data-seconds`), `Fireworks.tsx`, sons `minuit.tic`
  et `minuit.fete` (réutilisent tic.ogg et fanfare.ogg ; surchargeables par `config/medias/sons/minuit.fete.ogg`).
- Ouverts : se déclenche **toutes les nuits** à l'heure dite (pas d'option date ; proposer à l'organisateur une option `date` ou le laisser
  changer l'heure pour les répétitions) ; feu d'artifice correct mais sobre (anneaux de points) — à rendre plus spectaculaire, idéalement
  en même temps que l'outro ; pas de passe WebKit/Firefox sur `minuit.spec.ts`.

### `design/clins-doeil-tv`
- Lobby : 7 Dragon Balls CSS (`src/web/ui/DragonBalls.tsx`, `data-testid="dragon-balls"` `data-lit`), 8e boule bonus, Shenron
  (`src/web/theme/assets/shenron.svg`, silhouette simple, remplaçable) traverse l'écran une fois à 7 prêts, bouton « Faire un vœu ».
- Pause TV « cliffhanger K-drama » (`PauseZoom` + `PausedOverlay` dans `src/web/ui/Stage.tsx`, `data-ui="paused-cliffhanger"`, hors skin
  volontairement) ; téléphone inchangé.
- Confettis maison (`src/web/theme/confetti-shapes.ts` : tournesol, chou-fleur, boule à étoile, balle de ping-pong, patte), tir séparé
  à 20 % (`CONFETTI_CUSTOM_SHARE`), `CONFETTI_SCALAR` 1.6. **À revoir en capture** (avant correction ils masquaient tout l'écran de résultats).
- `src/web/ui/SplitTime.tsx` (temps Trackmania, `--color-split-ahead/behind`), branché dans les résultats du Compte à rebours.
- Sons : `pause` → `pause-piano.wav`, `lobby.boule` → `boule-allumee.wav` (synthèses maison, à remplacer par de vrais samples),
  `lobby.shenron` → boum.ogg ; glob de `urls.ts` étendu à `.wav`.

---

## 3. Ce qui reste à faire, dans l'ordre

### Étape 1 — Récupérer les deux lots en cours
**Lot 4b `design/clins-doeil-profil`** (brief d'origine résumé, à redonner tel quel à un sous-agent Sonnet si c'est à refaire) :
- Avatars ajoutés à `AVATARS` (`src/web/theme/profile-options.ts`) : corbeau, tournesol, chou-fleur, tiramisu, raquette de ping-pong,
  voiture de course, boule de cristal 4★. Vérifier que l'emoji existe dans la police embarquée (Twemoji, branche historique
  `design/emoji-embarques`) ; sinon support d'image (`src`) dans `PlayerAvatar` + éditeur.
- 4 cadres : « Aura Super Saiyan », « Sceau du Geass », « Bleu Karmine », « Pétales de tournesol ». **Exigence de l'organisateur :
  les cadres s'adaptent aux skins** → une déclinaison dans le thème de base et dans chacun des 6 skins, selon le contrat de `docs/skins.md`
  (tracés `AvatarFrame`, classes `.frame-*` dans `theme.css` et `src/web/theme/skins/*.css`).
- Invocation gacha du cadre dans `ProfileEditor` : bouton « Invoquer », animation légère (transform/opacity), rareté R (bleu) / SR (violet) /
  SSR (or ★★★★★, ~10 %), « Relancer » à volonté, « aucun cadre » possible via R, pas de liste à côté, pas de texte d'aide. Testable
  (`data-testid="frame-summon"`, `data-frame`) ; adapter helpers/specs E2E qui choisissaient un cadre. Vibration courte au SSR sur Android.
- Revue : captures de l'éditeur 360×640 (chromium + webkit) et planche des cadres × 7 thèmes ; docs `skins.md` et `changer-le-design.md`.

**Lot 5a `feat/outro`** (moteur de la cérémonie) : brief = parties A, B, C de `outro-spec.md` + écran TV/téléphone provisoire textuel
(`data-testid="tv-ceremony"` / `phone-ceremony`, `data-step`), config `outro: { actif, bonus: 4, points_bonus: auto }` + `config/outro.yaml`
(textes des catégories), `tests/unit/awards.test.ts` (dont simulation de fairness : dominant ≥ 25 % d'avance gagne ≥ 95 % ; partie serrée
→ le leader change dans 20 à 60 % des cas), cas moteur dans `engine.test.ts`, `tests/e2e/ceremonie.spec.ts`, helpers E2E qui attendaient
`tv-final` mis à jour, docs (ARCHITECTURE, creer-un-mini-jeu, configuration).

### Étape 2 — Vérifier puis fusionner ce qui est fini (avec validation de l'organisateur)
Ordre conseillé : `feat/questions-neuves` → `feat/contenu` → `feat/minuit` → `design/clins-doeil-tv` → `design/clins-doeil-profil` → `feat/outro`.
Conflits attendus (branches parties de `main` en parallèle) :
- `src/server/engine/engine.ts` (déjà-vu / minuit / cérémonie : sections distinctes, fusion manuelle simple),
- `src/shared/types.ts` (`GameSnapshot.midnight` obligatoire, `CatalogEntry.fresh`, phase `ceremony`),
- `src/web/tv/Lobby.tsx` (compteur « neuves » + Dragon Balls), `src/web/tv/HostBar.tsx`, `src/web/tv/TvApp.tsx`,
- `src/web/theme/sons/catalogue.ts`, `config/medias/sons/LISEZMOI.txt`, `scripts/apercu-sons.tsx` (sons minuit + lobby + pause),
- `tests/e2e/fixtures/config/partie.yaml`, `tests/unit/helpers/*`, docs (`ARCHITECTURE.md`, `configuration.md`, `changer-le-design.md`, `creer-un-mini-jeu.md`).
Après chaque fusion : `bun run typecheck && bun run test`. Avant de proposer le merge final : `bun run test:e2e` complet (via le
sous-agent `verificateur` Haiku, 2 agents max en parallèle). Captures à relire : confettis, lobby à 8 joueurs (Dragon Balls + « neuves »),
pause dans 2-3 skins, minuit pendant une manche.

### Étape 3 — Lot 5b : les mini-jeux remplissent `stats` / `opinions` / `keepsakes` (après fusion de 5a)
Sous-agent Sonnet, 2 jeux à la fois au plus, ne pas toucher au moteur. Correspondance prévue :
- `dessin-rate` : `stats.drawingVotes` + `stats.drawings` (dessins non vides) ; keepsakes `dessin` tag `meilleur` (le plus voté, score =
  votes) et tag `incompris` (dessin non vide le moins voté de chaque joueur) — strokes simplifiés/bornés (≤ 24 Ko).
  → alimente « Le talent incompris » (l'œuvre revient en grand) et le souvenir « dessin encadré au mur ».
- `qui-est-le-plus` : `stats.designations` (votes reçus) + `opinions` (cible votée) → « Le Geass », « Duo improbable ».
- `ceci-ou-cela`, `split-the-room`, `comme-les-autres`, `tier-list` : `opinions` (choix / étage donné à chaque invité) ;
  `answerChanges` si le jeu permet de changer d'avis → « Duo improbable », « L'indécis ».
- `simon`, `compte-a-rebours`, `pierre-feuille-ciseaux` (et tout jeu de réflexe) : `reactionMs` (mesurés sur le téléphone, invariant 7),
  `actions` (appuis) → « L'escargot », « Le K-Style ».
- `le-bon-prix` : keepsake `objet` (emoji, nom, prix ; score = écart moyen des estimations : l'objet qui a le plus surpris).
- `culture-genante` : keepsake `post-it` (question + mauvaise réponse la plus choisie ; score = part de mauvaises réponses).
- `imposteur` : rien d'obligatoire (éventuellement `opinions` des votes).
Tests unitaires par jeu (champs remplis, valeurs bornées, absents), docs dans le README de chaque jeu si utile.

### Étape 4 — Lot 5c : la vraie scène de cérémonie et le classement final dans la pièce
**VALIDÉ par l'organisateur le 13/11/2026** : le classement final se joue dans la pièce passée en mode nuit (description ci-dessous),
en remplacement de l'actuel `src/web/tv/FinalScreen.tsx`.
Déroulé visé (thème de base bleu, ~3 min) :
1. Fin de la scène `closing` : retour à table dans la pièce (`piece-reference.png`, maquette `docs/maquettes/piece.html`).
2. Souvenirs (2-3, ~4 s chacun, légende) : dessin le plus voté **encadré au mur** près des affiches Whiplash/Dune ; objet du Bon Prix
   **sur la table basse** ; phrase de Culture gênante **sur un post-it collé à la TV**. Ils restent dans le décor ensuite.
3. « Attendez… ce n'est pas fini ! » + classement provisoire (portraits autour de la table avec score).
4. 4 bonus, chacun : le **corbeau** (clin d'œil Léo) apporte l'enveloppe → **roulette** type machine à sous sur `award.roulette`,
   ralentit → carte retournée (emoji, titre, phrase) → **projecteur** (image fixe en transform) qui saute d'un portrait à l'autre →
   gagnant qui bondit, « +N » + `statLabel`, portraits re-triés en direct (motion `layout`), fanfare « Lune obtenue » (signature
   `src/web/ui/signatures/MarioOdyssey.tsx` existante). « Merci pour les travaux » : **cuillère à tiramisu** (Coco). « Talent incompris » :
   le dessin revient en grand, « Le public n'était pas prêt. ». « Duo improbable » : deux portraits reliés.
5. Classement final dans la même pièce **en mode nuit** : scores cachés, corbeau qui apporte « Classement final » ; du dernier au 4e,
   chaque portrait quitte la table et s'installe dans la pièce (dernier sur le pouf à côté d'Uto le chat, avec la cuillère ; suivants sur
   les rebords de fenêtre / le canapé) ; podium dessiné devant la cheminée (3e, 2e, long roulement, 1er) ; le 1er : la TV dessinée
   s'allume avec son portrait couronné, le jukebox s'illumine, feu d'artifice derrière les fenêtres, confettis maison, « Bonne année ! » ;
   tableau final lisible à 4 m (panneau avec tout le classement). Garder la chronologie serveur commune (`final-reveal.ts`) et les
   `data-testid` existants de l'écran final (`tv-final`, `podium-N`, `data-stage`) pour ne pas casser les E2E.
6. Téléphones : « Regarde la TV » + carte de son bonus quand il est révélé (vibration Android) + son rang quand il est révélé.
   Hôte : Pause / Passer.
Images à produire (calques séparés de la pièce) : pièce de nuit (ou voile nuit + lumières), podium, feu d'artifice derrière les fenêtres,
corbeau, cuillère à tiramisu, projecteur. Règles : uniquement transform/opacity, images fixes, pas de SVG animé, pas de filter sur grand
calque (`docs/mise-en-scene.md#performance-des-scènes`). Sons TV pour chaque étape (roulette, roulement de tambour, fanfare, applaudissements).
Revue Playwright obligatoire à 8 joueurs avec pseudos de 16 caractères (TV + téléphone 360×640, chromium + webkit), captures relues.

### Étape 5 — Finitions et points ouverts à soumettre à l'organisateur
- Minuit : option `date` (ne se déclencher que le 31) ou non ; feu d'artifice plus spectaculaire (même composant que la fin d'outro).
- Remplacer les sons synthétisés (`pause-piano.wav`, `boule-allumee.wav`) et proposer un son `minuit.fete` plus festif (libre de droits ;
  si un son non libre rend vraiment mieux, le signaler et lister, ne pas l'intégrer soi-même).
- Shenron plus beau (remplacer `src/web/theme/assets/shenron.svg`).
- Ajouter `theme:` aux entrées existantes des yaml et le documenter dans les README de jeux ; envisager un format objet pour
  split-the-room/imposteur si l'organisateur veut des thèmes là aussi.
- Mettre à jour `docs/mise-en-scene.md` (« État du chantier ») et `README.md` si des comportements visibles changent.
- Nettoyage : supprimer worktrees et branches `worktree-agent-*` une fois tout fusionné ; ne jamais commiter `data/`, captures, specs `zz-explo-*`.

## 4. Idées de clins d'œil validées, pas encore réalisées
- Corbeau messager et cuillère à tiramisu (outro, étape 4), fanfare « Lune obtenue » pour chaque bonus.
- Refusé par l'organisateur : renommer les libellés des commandes de l'hôte ; questions de tier list qui ne classent pas les invités.
- Pas de photos des animaux disponibles.
