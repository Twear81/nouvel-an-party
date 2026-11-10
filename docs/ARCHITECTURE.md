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
- Le snapshot porte aussi `skin` (habillage courant, identique TV + téléphones) : calculé par le moteur depuis l'ordre des 6 skins tiré au hasard (`skinOrder`, retiré à chaque retour au lobby, sauvegardé dans `save.json`) et `skinForRound` ; voir [skins.md](skins.md#rotation).

## Déroulé
`lobby → (intro → playing → results) × N → final`
- **lobby** : les joueurs rejoignent et créent leur profil ; la TV règle le nombre de manches par mini-jeu.
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
  d'affichage : les scores cumulés restent publics, comme pendant les manches. Le final terminé conserve le
  comportement de sauvegarde existant : après un redémarrage serveur, retour au lobby avec les profils et scores.
  Un nouvel invité arrivé pendant le podium reste spectateur. La première synchronisation d'horloge précède
  l'inscription réseau des écrans, pour éviter qu'une horloge locale en avance dévoile les rangs au rechargement.

Les jeux « interlude » (surprises, ex. Culture gênante) s'insèrent dans le plan environ toutes les N manches
normales, sans **intro** (le moteur passe directement de la manche précédente à `playing`) et avec une TV en plein
écran gérée par le jeu ; ils ne comptent pas dans « Manche x / y ». Voir `docs/creer-un-mini-jeu.md`, « Jeux interlude ».

Le futur déroulé avec pièce commune, ouverture, changements de skin après Culture gênante et souvenirs de fin
est décrit dans [mise-en-scene.md](mise-en-scene.md). Ce document distingue la cible du comportement livré.

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

## Temps réel
- Les chronos sont des timestamps serveur (`deadline`) ; les écrans corrigent le décalage d'horloge
  via `time:sync`.
- Pour un futur jeu de réflexe : mesurer le temps de réaction SUR le téléphone (performance.now)
  et l'envoyer, pour que la latence wifi n'avantage personne.
