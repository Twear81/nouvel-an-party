# L'imposteur

Tout le monde reçoit le **même mot** sur son téléphone (« Champagne »)… sauf **un imposteur**, tiré au sort, qui reçoit un mot proche (« Crémant ») **sans savoir qu'il est l'imposteur**. Chacun donne un indice à voix haute, puis on vote pour celui qui n'a pas le même mot. Le fichier à modifier : `config/minijeux/imposteur.yaml`.

À chaque manche, une paire de mots est tirée, puis on tire au hasard lequel des deux mots va à la majorité : impossible de deviner le rôle d'après le mot. Les écrans (et les données reçues par le téléphone) sont strictement les mêmes pour tout le monde jusqu'à la révélation.

## Déroulé d'une manche
1. **Le mot** (~6 s) : chaque téléphone affiche son mot en grand. La TV dit « Regardez votre mot en cachette ».
2. **Parole** (un joueur à la fois, 15 s max chacun) : la TV montre en très grand celui qui parle (« À Kevin ! Dis ton indice à voix haute ») et la file des suivants (ceux qui ont parlé sont cochés). Il dit **UN indice à voix haute** (un mot ou une courte phrase qui décrit son mot, sans le prononcer) puis touche l'énorme bouton **« J'ai dit mon indice ✓ »** de son téléphone ; les autres téléphones affichent « Kevin parle… ». Si le temps est écoulé, la parole passe toute seule au suivant. L'ordre est tiré au hasard à chaque tour, et **au 1er tour l'imposteur ne passe jamais en premier** (parler en premier, sans rien avoir entendu, le ferait se griller trop vite).
3. **Décision** (après le 1er tour seulement, ~15 s, si `tours_max` vaut 2) : « On vote ou on refait un tour ? ». Chacun touche **🗳️ On vote** ou **🔁 Encore un tour** (on peut changer d'avis) ; la TV affiche deux compteurs en direct, sans noms. Majorité **stricte** pour « Encore un tour » → 2e tour de parole (nouvel ordre). Égalité ou personne n'a répondu → on vote. Après le 2e tour, on vote directement (2 tours maximum).
4. **Vote** (~20 s) : chacun touche le joueur qu'il soupçonne (pas soi-même ; on peut changer d'avis). La TV n'affiche qu'un compteur anonyme.
5. **Révélation** : les votes tombent sous chaque joueur, suspense, puis l'imposteur est démasqué (ou pas) et la TV montre les deux mots : « Vous aviez : Champagne — Lui avait : Crémant ». Les téléphones disent « Tu étais l'imposteur ! », « Bien vu ! » ou « Raté… » seulement à ce moment-là.

Pendant tout le jeu, le **mot reste consultable** : un bandeau « Voir mon mot » en haut du téléphone ; un appui l'affiche 3 secondes puis il se recache tout seul. Rien à tenir du doigt, et le mot ne reste pas à l'écran pour un voisin curieux.

Un téléphone déconnecté ne bloque jamais la manche (même s'il s'agit de l'imposteur) : son tour de parole est sauté, il n'est pas attendu pour la décision ni pour le vote. S'il se déconnecte pendant son tour de parole, on passe au suivant.

## Points
- **Imposteur démasqué** (il a *strictement* le plus de votes) : chaque joueur qui a voté pour lui gagne `points.bon_vote` (100).
- **Imposteur pas démasqué** (y compris en cas d'égalité en tête) : il gagne `points.imposteur_survit` (300).

Exemple, 7 joueurs : 4 votent pour l'imposteur, 2 pour Alice, 1 ne vote pas. Il est démasqué : 4 × 100 points pour ceux qui ont bien vu. S'il avait été à égalité avec Alice, il aurait gagné 300 points.

## Options du yaml
| Option | Rôle | Défaut |
|---|---|---|
| `actif` | `false` retire le jeu de la partie | `true` |
| `nom`, `description` | titre et phrase d'explication | |
| `duree_mot` | secondes pour lire son mot | 6 |
| `duree_parole` | secondes de parole par joueur (il peut passer la main avant) | 15 |
| `tours_max` | 1 = un seul tour puis vote ; 2 = la table peut choisir un 2e tour | 2 |
| `duree_decision` | secondes pour choisir « On vote » / « Encore un tour » | 15 |
| `duree_vote` | secondes pour voter | 20 |
| `temps_resultats` | estimation de lecture des résultats (calcul de durée de la soirée) | 25 |
| `points.bon_vote` | par joueur ayant désigné l'imposteur démasqué | 100 |
| `points.imposteur_survit` | pour l'imposteur non démasqué | 300 |
| `paires` | les paires de mots (voir ci-dessous) | |

## Écrire de bonnes paires
Une paire = deux mots entre crochets, entre guillemets : `- ["Champagne", "Crémant"]`. Une paire est tirée par manche, donc plus il y en a, moins on revoit les mêmes (30 à 60 est idéal).

Une bonne paire est :
- **assez proche** pour que l'imposteur ne se doute de rien : les mêmes indices « marchent » pour les deux mots (« bulles », « fête », « minuit » vont aussi bien pour Champagne que Crémant) ;
- **assez différente** pour qu'on puisse le repérer : il existe au moins un indice qui ne colle qu'à l'un des deux (« Reims », « cher », « fromage »).

Trop proche (« Chat » / « Chatte ») : personne ne trouve. Trop différent (« Champagne » / « Tracteur ») : l'imposteur se grille tout de suite. Les références à vos invités marchent très bien (deux plats, deux bars, deux souvenirs que tout le monde connaît). Les deux mots sont symétriques : la paire fonctionne dans les deux sens.

Piège YAML : toujours des guillemets autour des mots, surtout s'ils contiennent `:` ou `#`.

Après modification du yaml, relancer `NouvelAn.exe`.
