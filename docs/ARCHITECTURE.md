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
                │                                          photos, certificat)│
                └───────────────────────────────────────────────────────────┘
```

## Principe : le serveur fait autorité
- Tout l'état de la partie vit dans `GameEngine` (`src/server/engine/engine.ts`).
- À chaque changement, chaque écran reçoit un `GameSnapshot` complet (`src/shared/types.ts`).
  Les écrans n'ont pas d'état de jeu à eux : un téléphone qui recharge la page retrouve tout.
- Les actions passent par les événements de `src/shared/protocol.ts`.

## Déroulé
`lobby → (intro → playing → results) × N → final`
- **lobby** : les joueurs rejoignent et créent leur profil ; la TV règle le nombre de manches par mini-jeu.
- **intro** : annonce de la manche (`intro_secondes`).
- **playing** : chrono du mini-jeu (ou fin anticipée quand tout le monde a répondu).
- **results** : résultats + bouton "Continuer" ; on avance quand tous les joueurs connectés ont cliqué
  (la TV peut forcer avec "Passer").
- **final** : classement.

## Mini-jeux (`src/minigames/<id>/`)
| Fichier | Rôle |
|---|---|
| `game.ts` | logique serveur : schéma du yaml, tirage des questions, réponses, points (`contract.ts`) |
| `views.tsx` | écrans React : TV, téléphone, résultats (`views-contract.ts`) |
| `README.md` | doc pour écrire ses questions |
| `config/minijeux/<id>.yaml` | contenu et réglages |

Enregistrés dans `registry.server.ts` et `registry.web.ts`. Voir `docs/creer-un-mini-jeu.md`.

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
