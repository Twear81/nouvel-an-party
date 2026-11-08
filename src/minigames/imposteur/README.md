# L'imposteur

Tout le monde reçoit le **même mot** sur son téléphone (« Champagne »)… sauf **un imposteur**, tiré au sort, qui reçoit un mot proche (« Crémant ») **sans savoir qu'il est l'imposteur**. Chacun donne des indices, on débat, puis on vote pour celui qui n'a pas le même mot. Le fichier à modifier : `config/minijeux/imposteur.yaml`.

À chaque manche, une paire de mots est tirée, puis on tire au hasard lequel des deux mots va à la majorité : impossible de deviner le rôle d'après le mot. Les écrans (et les données reçues par le téléphone) sont strictement les mêmes pour tout le monde jusqu'à la révélation.

## Déroulé d'une manche (tout le monde joue en même temps)
1. **Le mot** (~6 s) : chaque téléphone affiche son mot en grand. La TV dit « Regardez votre mot en cachette ».
2. **Indices, 2 tours** (~20 s chacun) : chacun tape **un mot** qui décrit le sien (24 caractères max). Interdit d'écrire son propre mot (majuscules, accents et pluriel ignorés) : le téléphone prévient. Le tour s'arrête 2 s après que tout le monde a envoyé son indice. La TV dévoile alors tous les indices d'un coup sur un **tableau** (une carte par joueur) qui reste affiché jusqu'au vote.
3. **Débat** (~40 s) : tout le monde discute à voix haute en regardant le tableau. Chacun touche **Prêt à voter** sur son téléphone ; on passe au vote quand tout le monde est prêt, ou à la fin du chrono.
4. **Vote** (~20 s) : chacun touche le joueur qu'il soupçonne (pas soi-même ; on peut changer d'avis). La TV n'affiche que des pastilles anonymes.
5. **Révélation** : les votes tombent sous chaque joueur, suspense, puis l'imposteur est démasqué (ou pas) et la TV montre les deux mots : « Vous aviez : Champagne — Lui avait : Crémant ». Les téléphones disent « Tu étais l'imposteur ! », « Bien vu ! » ou « Raté… » seulement à ce moment-là.

Pendant tout le jeu, le **mot reste consultable** : un bandeau « Voir mon mot » en haut du téléphone ; un appui l'affiche 3 secondes puis il se recache tout seul. Rien à tenir du doigt, et le mot ne reste pas à l'écran pour un voisin curieux.

Un téléphone déconnecté ne bloque jamais la manche (même s'il s'agit de l'imposteur : la manche continue normalement).

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
| `tours_indices` | nombre de tours d'indices (1 à 3) | 2 |
| `duree_indice` | secondes par tour d'indices | 20 |
| `duree_revelation_indices` | secondes d'affichage des indices d'un tour | 4 |
| `duree_debat` | secondes de débat | 40 |
| `duree_vote` | secondes pour voter | 20 |
| `temps_resultats` | estimation de lecture des résultats (calcul de durée de la soirée) | 25 |
| `longueur_indice_max` | longueur max d'un indice (8 à 40) | 24 |
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
