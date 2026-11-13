# Spécification de l'outro « à la Mario Party » (cérémonie)

Décisions de l'organisateur (non négociables) :
- Thème de base (bleu), dans la pièce illustrée (`src/web/theme/assets/piece-reference.png`, voir docs/mise-en-scene.md).
- Déroulé : sortie de la TV (scène `closing` existante) → 2-3 SOUVENIRS de la partie posés dans le décor →
  « Attendez… ce n'est pas fini ! » + classement provisoire → 4 BONUS (tirage visible au hasard) → classement final dans la pièce → « Bonne année ! ».
- 4 bonus par défaut (configurable). Hasard ASSUMÉ (roulette visible) mais minimum fair : un joueur nettement au-dessus gagne quand même.
- Catégories imposées par l'organisateur (textes exacts) :
  - « Duo improbable » — « Ont passé une heure ensemble sans partager une seule opinion. » (paire la moins souvent d'accord ; les DEUX gagnent)
  - « Merci pour les travaux » — le plus de dernières places sur les manches jouées. « Sans fondations, aucun podium. »
  - « Le talent incompris » — le moins de votes reçus pour des dessins non vides. Une œuvre revient en grand : « Le public n'était pas prêt. »
- Autres catégories : « Le craquage de dos » (plus grosse remontée au classement en une manche ; « Un petit crac et tout se remet en place. »),
  « Roi des manches » (le plus de 1res places), « La manche de sa vie » (plus gros gain en une manche), « L'escargot » (temps de réaction moyen
  le plus lent), « Le chou-fleur d'or » (le plus souvent au milieu du classement d'une manche), « Le K-Style » (le plus d'actions/appuis),
  « L'indécis » (le plus de changements de réponse), « Le Geass » (le plus désigné dans Qui est le plus), « La cuillère à tiramisu » (le plus
  de manches à 0 point). Une catégorie n'est éligible que si les données existent dans la partie.

## A. Contrat mini-jeu (générique, facultatif, rétro-compatible)
Dans `RoundOutcome` (src/minigames/contract.ts), champs FACULTATIFS :
- `stats?: Record<PlayerId, RoundStats>` avec `RoundStats` (catalogue partagé, tout facultatif, nombres finis ≥ 0) :
  `reactionMs?: number[]` (temps mesurés sur le téléphone), `actions?: number`, `answerChanges?: number`, `designations?: number`
  (votes reçus dans un jeu de désignation), `drawingVotes?: number` et `drawings?: number` (dessins NON vides seulement).
- `opinions?: Record<PlayerId, string>[]` : une table par question/situation de la manche, valeur = choix opaque (même valeur = même avis).
- `keepsakes?: Keepsake[]` : souvenirs candidats, bornés. Union :
  - `{ kind: "dessin"; tag: "meilleur" | "incompris"; playerId; label (mot) ; strokes (format du jeu dessin, simplifié/borné) ; score }`
  - `{ kind: "objet"; emoji; label; detail; score }`
  - `{ kind: "post-it"; text; detail?; score }`
  `score` = intérêt (plus grand = plus drôle à revoir). Le moteur valide/borne (taille JSON par souvenir ≤ 24 Ko, sinon ignoré).
Le moteur ne fait JAMAIS confiance aveuglément : valeurs invalides ignorées silencieusement, une exception d'un jeu ne casse rien.

## B. Moteur
- `history: RoundSummary[]` dans le moteur, sauvegardé dans save.json, remis à zéro au démarrage d'une partie / retour lobby :
  `{ gameId, participants: PlayerId[], deltas: Record<PlayerId, number>, standingsAfter: PlayerId[] (classement cumulé après la manche),
  stats?, opinions?, keepsakes? }` — borné (keepsakes : garder au plus 3 par jeu et 1 « incompris » par joueur, le plus récent ou le moins voté).
  Une manche rejouée après crash n'est jamais comptée deux fois (même règle que les points).
- Nouvelle phase `"ceremony"` entre la fin de la scène `closing` et `"final"`. Au début : calcul UNIQUE (rng injecté) de
  `CeremonyInfo = { startedAt, playerIds, scoresBefore: Record<PlayerId, number>, souvenirs: Keepsake[] (0 à 3, kinds variés),
  awards: Award[] }`, sauvegardé (reprise après crash = même cérémonie). `Award = { id, title, phrase, emoji, winners: PlayerId[],
  points, statLabel (ex. « 812 ms en moyenne »), keepsake? (dessin incompris), roulette: string[] (ids des catégories montrées dans la machine à sous) }`.
- Chronologie : constantes partagées `src/shared/ceremony.ts` (`ceremonyTimeline(souvenirs, awards) → { steps, durationMs }`),
  utilisées par le serveur ET l'écran (invariant « pas de spoil »). Ordre des étapes : intro, chaque souvenir, classement provisoire,
  chaque bonus (roulette → carte → projecteur → gagnant), puis fin → phase `final` (la révélation finale existante démarre).
- Points des bonus : ajoutés aux scores à la FIN de la cérémonie (avant `final`). L'écran calcule l'affichage = scoresBefore + bonus déjà révélés.
- Pas de spoil côté téléphones : le snapshot téléphone ne contient que les bonus déjà révélés (selon l'horloge serveur) — un minuteur
  serveur par étape rediffuse ; le snapshot TV peut tout contenir.
- Pause/Passer de l'hôte : TimerGroup existant (Passer = étape suivante). Retour au lobby annule tout.
- Config `config/partie.yaml` : `outro: { actif: true, bonus: 4, points_bonus: auto }` (`auto` ou un entier). Textes, emojis et activation
  de chaque catégorie dans un fichier de contenu `config/outro.yaml` (l'organisateur peut renommer, désactiver), validé par zod ;
  la LOGIQUE de calcul est dans le code, indexée par id.

## C. Algorithme des bonus (fonction pure, `src/server/engine/awards.ts`, testée)
- Valeur d'un bonus B (si `auto`) : 0,375 × gain moyen du gagnant d'une manche (moyenne sur les manches du max des deltas),
  arrondi à un multiple de 10, min 10. Donc les 4 bonus ≈ 1,5 manche.
- Calcul de chaque catégorie éligible → gagnants (égalité = tous ; Duo = 2 joueurs). Catégorie sans gagnant ou sans données = non éligible.
- Tirage : sans remise, pondéré. Poids de base 1 ; ×1,6 si aucun gagnant de la catégorie n'est le leader actuel (léger coup de pouce
  aux poursuivants) ; ×0,5 si les gagnants ont déjà eu un bonus dans ce tirage (variété). Les catégories imposées par l'organisateur
  (Duo improbable, Merci pour les travaux, Talent incompris) ont un poids ×1,5 quand elles sont éligibles.
- `roulette` : 5-6 ids de catégories éligibles mélangés finissant par la catégorie tirée (affichage de la machine à sous).
- Jamais de points négatifs. Le classement final peut changer, mais un leader avec une avance > 4B gagne mathématiquement.
- Test de simulation (milliers de parties simulées, rng à graine) : un dominant (≥ 25 % d'avance sur le 2e) gagne ≥ 95 % du temps ;
  dans une partie serrée (écart < 1 manche), le leader change dans 20 à 60 % des cas. Affiner les poids si besoin, documenter.

## D. Écran (lot ultérieur, pour info)
Scène dans la pièce : souvenirs posés dans le décor (dessin encadré au mur, objet sur la table basse, post-it sur la TV dessinée),
corbeau messager qui apporte chaque enveloppe, roulette de catégories, projecteur, re-tri animé des portraits, cuillère à tiramisu
pour « Merci pour les travaux ». Puis le classement final se joue dans la même pièce passée en mode nuit (portraits qui s'installent
dans la pièce du dernier au 4e, podium devant la cheminée, feu d'artifice derrière les fenêtres, « Bonne année ! », tableau final).
Téléphones : « Regarde la TV » + carte de son bonus quand il est révélé.
