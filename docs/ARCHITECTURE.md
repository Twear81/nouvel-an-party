# Architecture

Un seul langage (TypeScript), un seul process : le serveur Bun sert le front ET gère la partie en temps réel.

```
                ┌──────────────────── PC (NouvelAn.exe) ────────────────────┐
                │  src/server                                               │
 TV (navigateur │   index.ts      HTTP :3000 + HTTPS :3443 + Socket.IO       │
 du PC) ◄──────►│   socket.ts     événements réseau ⇄ moteur                 │
 http://local-  │   engine/       machine à états de la partie (fait foi)    │
 host:3000/tv   │   config.ts     lecture/validation des .yaml               │
                │   network.ts    IP wifi + certificat HTTPS auto-signé      │
 Téléphones ◄──►│   static/       sert le front (embarqué dans l'exe)        │
 https://IP:    │                                                           │
 3443/play      │  config/  (à côté de l'exe, modifiable)  data/ (sauvegarde,│
                │                                          certificat)        │
                └───────────────────────────────────────────────────────────┘
```

## Principe : le serveur fait autorité
- Tout l'état de la partie vit dans `GameEngine` (`src/server/engine/engine.ts`).
- À chaque changement, chaque écran reçoit un `GameSnapshot` complet (`src/shared/types.ts`).
  Les écrans n'ont pas d'état de jeu à eux : un téléphone qui recharge la page retrouve tout.
- Les actions passent par les événements de `src/shared/protocol.ts`.
- `round.progress` (`{ done, expected }` ou `null`) : compteur « qui a répondu » calculé par le moteur via `MiniGame.progress` (phase `playing` seulement, protégé comme `publicView`) ; la TV l'affiche dans le chrono sans connaître le jeu.
- Le snapshot porte aussi `skin` (habillage courant, identique TV + téléphones ; `null` = thème de base).
  Les univers sont attribués au plan sauvegardé par `assignRoundSkins`, avec changement après une frontière
  `changeSkinAfter`. Culture gênante ferme un univers ; voir [skins.md](skins.md#rotation).

## Déroulé
`lobby → transition d'ouverture → (intro → playing → results) × N → transition de sortie → final`
- **lobby** : les joueurs rejoignent et créent leur profil ; la TV règle le nombre de manches par mini-jeu.
- **transition** : scène de la pièce, avec `snapshot.transition` ; `round` vaut `null` et aucun mini-jeu n'est lancé.
  L'ouverture dure 9 s, le changement d'univers 4 s, la sortie 2,4 s. Les durées et l'instant de bascule du skin
  sont partagés dans `src/shared/transitions.ts`. Le serveur utilise `TimerGroup` ; Pause/Reprendre/Passer et
  retour au lobby s'appliquent aussi à ces scènes. Les téléphones attendent la TV. Le rendu compte depuis
  le départ serveur, en retirant les pauses ; un rechargement reprend le bon instant de l'animation.
  `transition.spotlightPlayerId` est la **vedette** de la scène, choisie par le serveur à sa création (brique
  générique, utilisable par n'importe quelle scène) : pour un changement d'univers, un des participants ayant gagné
  le plus de points à la manche qui vient de finir (`deltas`, gain > 0), départagés par le `rng` du moteur ; si
  personne n'a marqué, un participant au hasard (`rng`) ; `null` pour l'ouverture et la sortie. Elle est sauvegardée
  avec la scène (une ancienne sauvegarde sans le champ donne `null`) et rien n'y est secret.
- **intro** : annonce de la manche (`intro_secondes`).
- **playing** : chrono du mini-jeu (ou fin anticipée quand tout le monde a répondu).
- **results** : animation de révélation sur la TV (`revealSeconds` du mini-jeu), puis les points et le bouton
  "Continuer" apparaissent ; on avance quand tous les joueurs connectés ont cliqué (la TV peut forcer avec "Passer").
  Avant la fin de l'animation les téléphones affichent « Regarde la TV » pour ne rien spoiler. Tous les écrans
  comptent depuis `round.resultsAt` (heure serveur) : un téléphone qui recharge en pleine révélation est resynchronisé.
- **final** : classement. `snapshot.finalReveal` fixe le départ serveur et les participants de la cérémonie.
  TV et téléphones partagent la cadence de `src/shared/final-reveal.ts` via `useFinalReveal` : les téléphones
  gardent « Regarde la TV ! » jusqu'à la fin de l'entrée du dernier portrait révélé. Un rechargement de la TV
  ou d'un téléphone reprend au bon moment au lieu de relancer le classement. Il s'agit d'une synchronisation
  d'affichage : les scores cumulés restent publics, comme pendant les manches. Pause et Passer
  s'appliquent aussi au classement, via `finalRevealElapsed` ; les souvenirs déjà révélés restent dans
  `finalReveal.souvenirs` pour conserver le décor. Le final terminé conserve le
  comportement de sauvegarde existant : après un redémarrage serveur, retour au lobby avec les profils et scores.
  Un nouvel invité arrivé pendant le podium reste spectateur. La première synchronisation d'horloge précède
  l'inscription réseau des écrans, pour éviter qu'une horloge locale en avance dévoile les rangs au rechargement.

Les jeux « interlude » (surprises, ex. Culture gênante) s'insèrent dans le plan environ toutes les N manches
normales, sans **intro** (le moteur passe directement de la manche précédente à `playing`) et avec une TV en plein
écran gérée par le jeu ; ils ne comptent pas dans « Manche x / y ». Voir `docs/creer-un-mini-jeu.md`, « Jeux interlude ».

La propriété facultative `MiniGame.changeSkinAfter` marque une frontière dans le plan. Après ses résultats,
le moteur joue la scène vers l'univers suivant avant la prochaine manche. Si c'était la dernière manche,
il joue directement la sortie ; Culture gênante ne change jamais d'univers au milieu de sa question.

Le décor, la chronologie et les futurs souvenirs de fin sont décrits dans [mise-en-scene.md](mise-en-scene.md).

## Minuit
Brique générique du moteur (`engine.ts`, section « Minuit » ; réglée par `minuit:` dans `partie.yaml`, voir
[configuration.md](configuration.md#minuit)). `snapshot.midnight` vaut `null` toute la soirée, puis
`{ targetAt, phase: "countdown" | "celebrate", year }` pendant minuit ; la TV et les téléphones affichent alors
`MidnightOverlay` (`src/web/ui/Midnight.tsx`) par-dessus tout, calé sur `targetAt` avec `serverNow()`.
- **Déclenchement** : par défaut (`uniquement_nouvel_an: true`), le moteur vise le **prochain 1er janvier** à `heure`
  (heure locale du PC, `clock.now()` donc testable avec `FakeClock`). Le compte à rebours démarre à
  `targetAt - duree_compte_a_rebours`, donc le 31 décembre pour l'heure habituelle `00:00`. Un serveur lancé
  *dans* la fenêtre affiche le temps restant ; lancé *après* minuit, il attend l'année suivante. Le mode répétition
  (`uniquement_nouvel_an: false`) vise aujourd'hui ou demain, une seule occurrence par nuit. Un minuteur de veille
  revérifie au plus toutes les 30 s.
- **Pause** : réutilise la pause existante (`pause()`), donc `TimerGroup` fige chronos de manche et scènes de
  transition, `input()` est refusé. Pendant le classement final, son départ (`finalReveal.startedAt`)
  est décalé de la durée de minuit pour reprendre où il en était. Au lobby, seul l'affichage change. Pendant minuit : Passer, +10 s et l'avance automatique des résultats (« Continuer ») sont
  ignorés ; l'hôte peut toujours revenir au lobby. Le skin est forcé à `null` (thème de base, bleu).
- **Fin** : pendant `countdown`, Reprendre est ignoré ; pendant `celebrate`, le clic de l'hôte (même bouton que la
  pause) ou `reprise_auto` secondes après minuit relance. Si **c'est minuit qui a mis en pause**
  (`pausedByMidnight`), la partie repart là où elle en était. Si l'hôte avait **déjà** mis en pause avant, la
  reprise automatique la respecte (la partie reste en pause, c'est lui qui reprend) ; son clic lève la pause.
  Avec `reprise_auto: 0` seul l'hôte relance.
- **Sauvegarde** : `save.json` porte `midnight: { targetAt }` tant que minuit est en cours (pas écrit au lobby si
  une partie interrompue y attend sa reprise). Après un crash, le compte à rebours se retrouve par le calcul de
  l'heure ; une célébration est reprise si moins de `max(reprise_auto, 60 s)` se sont écoulées depuis minuit, et la
  partie reprise (`resumeSave`) se fige aussitôt dessous. En mode annuel, un ancien `targetAt` quotidien qui ne tombe
  pas le 1er janvier est ignoré ; une célébration du Nouvel An sauvegardée reste reprenable.
- **Sons** (TV) : `minuit.tic` (une fois par seconde sur les 10 dernières) et `minuit.fete` (+ applaudissements) via
  `useGlobalSfx`, fonction pure `midnightStep` dans `src/web/sound/events.ts`.

## Mini-jeux (`src/minigames/<id>/`)

| Fichier | Rôle |
|---|---|
| `game.ts` | logique serveur : schéma du yaml, tirage des questions, réponses, points (`contract.ts`) |
| `views.tsx` | écrans React : TV, téléphone, résultats (`views-contract.ts`) |
| `README.md` | doc pour écrire ses questions |
| `config/minijeux/<id>.yaml` | contenu et réglages |

Enregistrés dans `registry.server.ts` et `registry.web.ts`. Voir `docs/creer-un-mini-jeu.md`.

## Présence en direct
Le moteur compte les connexions de chaque joueur. Un mini-jeu lit `ctx.isConnected(id)` et reçoit `onPresenceChange`
quand un participant se (dé)connecte pendant `playing` : les règles « tout le monde a répondu » ne comptent que les
joueurs connectés (`allConnectedDone`, `helpers.ts`), un téléphone planté ne bloque donc pas la manche.

## Front (`src/web`)
- `/tv` : écran TV (pensé 16:9, lisible de loin) + contrôles maître du jeu (souris/clavier sur le PC).
- `/play` : téléphone (portrait, gros boutons).
- Le design est centralisé dans `src/web/theme/` (voir `docs/changer-le-design.md`).

## Reconnexion & crash
- Le téléphone garde un jeton dans `localStorage` → il retrouve son joueur à la reconnexion.
- `data/save.json` est réécrit à chaque étape → au redémarrage du serveur, la TV propose de reprendre.
- `data/deja-vu.json` (`src/server/engine/deja-vu.ts`) mémorise, par mini-jeu, les éléments déjà joués (empreinte du contenu, ou `itemInfo.keys`) avec un numéro d'ordre, écrit au **début** de chaque manche (une manche interrompue compte comme vue ; un plan abandonné ne brûle rien). `buildPlan` en tire les neufs d'abord puis les plus anciens, et évite les thèmes déjà vus ; le catalogue envoie `fresh` au lobby. Fichier absent ou corrompu : tout est neuf.
- Une scène sauvegarde sa destination, ses participants, sa progression et un horodatage de contrôle. Sa reprise
  garde le temps écoulé (y compris l'arrêt du serveur hors pause) ou reste figée si elle était en pause.
  Une scène déjà achevée mène directement à sa destination ; aucun résultat ni point n'est recalculé.

## Temps réel
- Les chronos sont des timestamps serveur (`deadline`) ; les écrans corrigent le décalage d'horloge
  via `time:sync`.
- Pour un futur jeu de réflexe : mesurer le temps de réaction SUR le téléphone (`performance.now()`, instant du toucher via
  `eventTime(e.timeStamp, …)`)
  et l'envoyer, pour que la latence wifi n'avantage personne.
