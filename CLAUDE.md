# CLAUDE.md — Nouvel An Party

Guide pour les agents IA qui travaillent sur ce dépôt. À lire avant toute tâche.

## Le projet en bref
Jeu de soirée pour le **Nouvel An**, ~7 invités (jusqu'à 8 supportés). **Le seul objectif : que tout le monde s'amuse.**
Chaque décision (règles, durée, textes, écrans) se juge à ça : simple à comprendre en 5 secondes, drôle, personne
ne s'ennuie ni ne reste bloqué.

- **Une TV** (navigateur Chromium du PC) = maître du jeu : affiche questions, chronos, révélations, classement ;
  l'hôte la pilote à la souris (Pause, Passer, +10 s, Lobby).
- **Les téléphones** des invités = manettes : iPhone (Safari iOS 16.4+) et Android (Chrome **et** Firefox).
  Rien à installer, connexion par QR code, wifi local, **pas d'internet le jour J**.
- Livré en exe Windows portable (`bun run release`), contenu modifiable dans `config/` à côté de l'exe.
- Le design sera **personnalisé avec des références aux invités** : il doit rester facile à remplacer.

Tout le projet (code, commentaires, docs, commits, textes affichés) est **en français**.

## Documentation existante (à lire selon la tâche, ne pas dupliquer ici)
| Sujet | Fichier |
|---|---|
| Architecture, déroulé d'une partie, temps réel, reconnexion | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Créer un mini-jeu (contrat `MiniGame`, `ctx`, vues, enregistrement, exemple complet) | [docs/creer-un-mini-jeu.md](docs/creer-un-mini-jeu.md) |
| Design : thème, composants, écrans, règles d'ergonomie mobile | [docs/changer-le-design.md](docs/changer-le-design.md) |
| `config/partie.yaml`, dossier `data/` | [docs/configuration.md](docs/configuration.md) |
| Version Linux et conteneur Docker (réseau, variables, volumes) | [docs/conteneur.md](docs/conteneur.md) |
| Skins (habillages imitant des jeux vidéo) : contrat, marqueurs, rotation | [docs/skins.md](docs/skins.md) |
| Skins : bilan du chantier, validation, maquette et captures de référence | [docs/skins-suivi.md](docs/skins-suivi.md) |
| Sons de la TV (moteur, catalogue, hooks `useSfx*`, surcharge par l'organisateur) | [docs/creer-un-mini-jeu.md](docs/creer-un-mini-jeu.md#sons-tv-uniquement) |
| Règles et contenu d'un mini-jeu | `src/minigames/<id>/README.md` |
| Commandes, dev depuis WSL avec de vrais téléphones | [README.md](README.md) |

Si une tâche change un comportement décrit dans ces docs, **mettre la doc à jour dans la même branche**.

## Stack et commandes
Bun + TypeScript partout, un seul process : serveur Bun (HTTP TV :3000, HTTPS téléphones :3443, Socket.IO) qui sert
un front React 19 + Tailwind 4 + motion (Vite). Validation zod, config YAML.

| Commande | Rôle |
|---|---|
| `bun run dev` | dev à chaud — TV : https://localhost:5173/tv |
| `bun run typecheck` | TypeScript |
| `bun run test` | tests unitaires (`tests/unit`) |
| `bun run test:e2e` | E2E Playwright (Chromium complet, Firefox/WebKit sur `@compat`) |
| `bunx playwright test <fichier> --project=chromium` | un seul spec, plus rapide |
| `bun run release` | zip Windows dans `release/` |

## Invariants d'architecture (à ne pas casser)
1. **Le serveur fait autorité.** Tout l'état vit dans `GameEngine` ; les écrans reçoivent un `GameSnapshot` et n'ont
   **aucun état de jeu dans React**. Un téléphone qui recharge retrouve tout.
2. **Rien de secret dans `publicView`** (les réponses des autres). Ce que les téléphones ne doivent même pas recevoir
   va dans `tvView`. Le perso d'un joueur va dans `privateView`.
3. **`payload` vient du réseau : toujours validé**, le reste ignoré silencieusement.
4. Dans un mini-jeu : `ctx.rng()` (jamais `Math.random`), `ctx.setTimeout` / `ctx.countdown` (jamais le timer global,
   ils se figent en pause), `ctx.update()` après une modif hors `input`.
5. **Présence** : les fins anticipées passent par `allConnectedDone` + `onPresenceChange` ; un téléphone planté ne
   doit jamais bloquer la manche.
6. **Pas de spoil** : une animation de `TvResults` déclare sa durée via `revealSeconds`, calculée avec les mêmes
   constantes que l'animation.
7. **Temps de réaction mesuré sur le téléphone** (`performance.now()`, instant du toucher via `eventTime(e.timeStamp, …)`),
   jamais à l'arrivée côté serveur.
8. Sauvegarde `data/save.json` à chaque étape : un changement d'état moteur doit rester sérialisable/reprenable.

## Ajouter un mini-jeu
Suivre [docs/creer-un-mini-jeu.md](docs/creer-un-mini-jeu.md). Checklist :
- [ ] `src/minigames/<id>/game.ts`, `views.tsx`, `README.md` (pour l'organisateur, en français)
- [ ] `config/minijeux/<id>.yaml` (commence par `actif: true`, chaque option commentée)
- [ ] enregistré dans `registry.server.ts` **et** `registry.web.ts`
- [ ] `tests/e2e/fixtures/config/minijeux/<id>.yaml` (durées courtes) + entrée dans `GAME_NAMES` (`tests/e2e/helpers/party.ts`)
- [ ] `tests/unit/<id>.test.ts` + `tests/e2e/<id>.spec.ts`
- [ ] ligne dans le tableau des mini-jeux du [README.md](README.md)
- [ ] testé à fond en local avec Playwright (voir « Tests »), y compris à 8 joueurs avec pseudos de 16 caractères

Le moteur gère lobby, intro, chrono, pause, reconnexion, scores, sauvegarde : **un mini-jeu ne touche pas
`src/server/engine`**. Si un jeu a vraiment besoin d'une nouvelle brique moteur, la rendre générique (utile à
d'autres jeux), la documenter dans `creer-un-mini-jeu.md`, et la tester dans `tests/unit/engine.test.ts`.

Côté fun : règles expliquables en une phrase (`description`), manches courtes, tout le monde joue en même temps
autant que possible (ou spectateurs qui ont quelque chose à regarder), révélation qui crée du suspense sur la TV.

## UX : si ça s'explique, c'est raté
Si une action a besoin d'un texte d'aide, d'une infobulle ou d'une phrase « appuie ici pour… » pour être comprise,
**c'est l'interface qu'il faut revoir**, pas l'explication à ajouter. Les invités jouent un verre à la main, sur un
téléphone, en regardant la TV : ils ne lisent pas.
- L'action se voit à sa forme : gros bouton plein, icône + un mot (« Valider », « Rejouer »), zone tactile évidente.
  Un bouton qui dit ce qu'il fait n'est pas une explication.
- L'état se voit sur l'élément lui-même : ✓ sur le choix enregistré, avatars grisés tant qu'on n'a pas répondu,
  bouton inactif qui dit pourquoi (« Encore 2 à placer »).
- Une seule chose à faire par écran de téléphone ; ce qui n'est pas actionnable n'y est pas.
- On garde les textes qui sont du **contenu** (la question, « Anne-Sophie répond pour de vrai ») et la phrase de
  règle de la manche, annoncée une fois sur la TV à l'intro (`description`) ; jamais de texte qui explique l'interface.
- En revue (captures Playwright) : pour chaque écran, se demander « un invité qui n'a pas lu les règles sait-il quoi
  toucher ? ». Si non, on change l'écran.

## Design : rester remplaçable
- Jamais de couleur, police, taille ou ombre en dur : classes Tailwind issues de `src/web/theme/theme.css`
  (`bg-surface`, `text-accent`, `font-display`…).
- Uniquement les composants de `src/web/ui` (`Button`, `Panel`, `PlayerAvatar`, `Countdown`, `ConfirmDialog`…).
  Un besoin récurrent → un nouveau composant dans `src/web/ui`, pas du style local copié-collé.
- Avatars, cadres, couleurs de profil : `src/web/theme/profile-options.ts`. Les blagues/références aux invités vont
  dans le thème, `profile-options.ts`, `config/medias/` ou le contenu yaml — **pas codées en dur dans un mini-jeu**.
- TV dessinée en 1920×1080 lisible à 4 m ; téléphone portrait dès 360×640, usage à une main, gros boutons.
- **Zone du geste « accueil »** : le bas du téléphone porte la barre de geste du système. `PhoneStage` réserve une marge
  basse (`safe-area-inset-bottom` + 1,5 rem) : ne jamais la contourner (pas de `fixed bottom-0`, pas de petit bouton
  collé en bas) ; les gros boutons d'action peuvent être en bas, décollés du bord.
- Règles d'ergonomie mobile (iOS : champs ≥ 16 px, `h-app`, pas de `filter: blur` géant…) :
  [docs/changer-le-design.md](docs/changer-le-design.md#règles-dergonomie-à-garder-en-ajoutant-un-écran).
- **Animations** : uniquement `transform`/`opacity` ; dessins complexes en images fixes (sprite, canvas peint une fois),
  jamais de SVG animé (`stroke-dashoffset`…), de `filter`/`mix-blend-mode` sur un grand calque ni de `currentTime`
  recalé à chaque image : [règles et mesure](docs/mise-en-scene.md#performance-des-scènes).
- Ajouter un `data-testid` (et des `data-*` d'état : `data-stage`, `data-status`…) aux éléments interactifs et aux
  états importants : les E2E s'appuient dessus, pas sur les textes ni les classes CSS.

## Tests
On ne teste pas tout, on **automatise ce qui est jouable et critique** :
- **Unitaires** (`bun test`) : logique de chaque `game.ts` via `makeCtx()` (`tests/unit/helpers/minigame-ctx.ts`) —
  payloads invalides, égalités, absents/déconnectés, calcul des points, chronos d'étape.
- **E2E** (Playwright, fixture `party` : serveur neuf + TV + téléphones simulés, `tests/e2e/helpers/`) : au moins une
  manche complète par mini-jeu (lobby → jeu → résultats → points), plus les parcours critiques (profil, reconnexion,
  crash serveur, contrôles hôte, retardataire, 8 joueurs). Taguer `@compat` ce qui doit aussi passer sous Firefox et
  WebKit (iPhone) — avec parcimonie, c'est lourd. Taguer `@fumee` un test seulement s'il couvre un parcours critique
  encore non couvert par la fumée (elle doit rester sous 2 minutes).
- Tests robustes : attendre des états (`toHaveAttribute("data-stage", …)`), jamais des `waitForTimeout` calés sur
  les animations ; pas de dépendance au timing fin (la machine est chargée quand la suite tourne).
- Lire un texte avec `textContent()`, jamais `innerText()` : le skin (tiré au hasard) peut le passer en capitales.

**Développement d'un mini-jeu : test manuel complet obligatoire en local avec Playwright**, avant de dire que c'est fini.
On joue le jeu en entier (pas seulement le chemin automatisé) :
1. Écrire un spec exploratoire jetable, ex. `tests/e2e/zz-explo-<id>.spec.ts`, qui utilise la fixture `party`
   (`addPhones`, `startGame({ "<id>": 1 })`…) et prend des captures (`page.screenshot({ path: "<scratchpad>/…png" })`)
   de la TV et des téléphones à chaque étape : intro, jeu, cas limites (rien répondu, mauvaise réponse, déconnexion
   d'un téléphone, pause), révélation, résultats.
2. Le lancer : `bunx playwright test zz-explo-<id> --project=chromium` (puis `--project=webkit` / `firefox` pour
   vérifier le rendu iPhone / Firefox Android).
3. **Regarder les captures** (outil Read) : lisibilité TV, rien de coupé à 8 joueurs / 16 caractères, téléphone
   360×640 sans défilement inutile, pas de spoil sur les téléphones pendant la révélation.
4. Garder dans `tests/e2e/<id>.spec.ts` la partie critique, **supprimer le spec exploratoire** avant de commiter.

**Les E2E ne tournent PAS dans la CI GitHub** (elle ne fait que typecheck, unitaires et build) : c'est à l'agent de les
lancer **en local, sur sa branche de dev, avant de pousser**. Rien ne rattrape un oubli.

| Quand | Commande | Durée |
|---|---|---|
| Avant chaque commit | `bun run typecheck && bun run test` + les specs E2E du sujet touché (`bunx playwright test <spec> --project=chromium`) | ~1 à 3 min |
| **Avant chaque push** | les mêmes + `bun run test:e2e:fumee` (8 parcours critiques, Chromium) | +1 min 15 |
| Avant une fusion dans `main` ou une release | `bun run test:e2e` complet (Chromium, Firefox et WebKit sur `@compat`) | ~18 min |

Un test qui échoue n'est jamais poussé « en espérant » : corriger, ou signaler à l'utilisateur. Un échec isolé sous
charge se confirme en relançant le spec seul (`--repeat-each=3`) et se mentionne dans le compte rendu.

## Git
- **Une branche par feature / bugfix** depuis `main` (regrouper par thème si plus logique) :
  `minijeu/<id>`, `feat/<sujet>`, `fix/<sujet>`, `design/<sujet>`, `docs/<sujet>`, `test/<sujet>`.
- Commits faits par l'agent, messages en français, au format de l'historique : `Mini-jeu Simon`,
  `Moteur : …`, `E2E : …`, `Lobby : …`. **Auteur = l'utilisateur** (identité git du dépôt) : ne jamais signer
  avec Claude, ni en auteur ni en ligne `Co-Authored-By`. Ne jamais commiter de spec exploratoire, captures, `data/`, `release/`.
- **Jamais de `git push`** (ni tag) sans demande explicite de l'utilisateur, et jamais sans les tests locaux de « Avant
  chaque push » (voir « Tests ») : la CI ne lance pas les E2E.
- Merge dans `main` (`--no-ff`, message `Merge <sujet>`) seulement une fois les tests verts et le travail validé
  par l'utilisateur.

## Orchestration des sessions IA
La session principale (Opus, effort medium) **orchestre** : elle comprend la demande, découpe, délègue, relit,
intègre, vérifie et commite. Elle délègue l'exécution à des sous-agents (outil `Agent`, paramètre `model`) pour
économiser les tokens :

| Modèle | Pour quoi | Exemples |
|---|---|---|
| **Haiku** | tâches mécaniques, peu de jugement | recherche dans le code, lancer les tests et résumer les échecs, renommages, contenu yaml, README d'un jeu, mise à jour d'un tableau de doc |
| **Sonnet** | tâches de dev réelles | implémenter `game.ts` / `views.tsx`, écrire les tests unit/E2E, déboguer un test, session de test Playwright exploratoire, refonte d'un écran |
| **Opus (session principale)** | décisions et cohérence | conception des règles du jeu, changement de contrat ou de moteur, revue du travail des sous-agents, arbitrages, merge |

Règles :
- Chaque prompt de sous-agent est **autonome** : objectif, fichiers à lire (docs ci-dessus, jeu modèle à imiter),
  invariants qui s'appliquent, critères de fin (commandes qui doivent passer), et format du compte rendu attendu
  (fichiers modifiés, résultats des tests, points ouverts). Le sous-agent ne voit pas la conversation.
- Tâches indépendantes en parallèle ; si elles touchent les mêmes fichiers, `isolation: "worktree"` puis merge par
  l'orchestrateur (`.claude/worktrees/` est ignoré par git).
- L'orchestrateur **vérifie** le résultat (diff, tests) avant de commiter : un compte rendu de sous-agent n'est pas
  une preuve.
- Une petite tâche (quelques lignes, un fichier) se fait directement, sans sous-agent.
- Lancer tests, E2E et captures : sous-agent `verificateur` (Haiku, `.claude/agents/verificateur.md`), jamais Sonnet.
- Au plus 2 sous-agents en parallèle (au-delà, la machine sature et les runs Playwright expirent).
- Un sous-agent ne regarde qu'un échantillon de captures (≤ 15, les écrans à risque) ; l'orchestrateur relit.
- Avant de relancer un sous-agent, se demander si l'orchestrateur ne peut pas faire la retouche directement.
- En cas de flou sur les règles d'un jeu, le fun ou le design : **demander à l'utilisateur** plutôt que deviner.
