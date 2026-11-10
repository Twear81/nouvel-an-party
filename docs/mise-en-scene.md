# Mise en scène de la soirée

## État du chantier

Direction confirmée par l'organisateur, réalisée par lots. Le retrait GunZ/photos, l'attente pendant le final,
l'ouverture de la pièce, les transitions après Culture gênante et la sortie avant le podium sont intégrés.
Les statistiques, souvenirs de partie et la cérémonie finale enrichie restent à réaliser ; le son viendra en dernier,
exclusivement sur la TV. La rotation livrée est décrite dans [skins.md](skins.md).

Le décor de la pièce a été validé par l'organisateur le **10 novembre 2026** :
[illustration de référence](../src/web/theme/assets/piece-reference.png). La [maquette animée](maquettes/piece.html)
permet de régler l'installation des portraits et l'entrée dans la TV ; elle s'ouvre directement dans un navigateur.
Cette maquette est un outil de conception autonome, avec des invités fictifs ; elle ne modifie pas le déroulé du jeu.

## Déroulé retenu

1. Lobby dans le thème de base bleu.
2. Ouverture : les avatars s'installent autour de la table, dans une illustration de la véritable pièce.
3. Entrée dans la télévision dessinée ; premier skin, tiré au hasard.
4. Plusieurs manches normales dans cet univers.
5. Culture gênante, jusqu'à ses résultats compris, dans le même skin.
6. Une fois les résultats quittés, courte scène dans la pièce : son décor se transforme selon le skin suivant.
7. Retour dans la TV et reprise des manches ; répétition de ces séquences.
8. Après la dernière manche : sortie de la TV, retour à table, souvenirs, distinctions, classement et tableau final.

Les signatures propres aux univers se jouent uniquement pendant ces changements, jamais à chaque question,
réponse ou changement de leader. Une scène courte et soignée par transition. Le son sera traité après les
animations ; il sortira toujours de la TV.

## Pièce de référence validée

Le croquis vu du dessus et les précisions de l'organisateur ont servi à produire l'illustration de référence.
Le fichier PNG versionné est une copie non modifiée de la dernière maquette validée ; les variantes antérieures
ne font pas référence.

- Vue légèrement plongeante depuis l'arrière du canapé, décalée vers la gauche, vers la cheminée et le mur droit.
- Murs blancs, parquet bois, canapé beige au premier plan ; table basse rectangulaire en verre sur un tapis blanc ovale.
- Cheminée au fond au centre, poêle à bois noir arrondi devant, TV posée en hauteur sur la tablette et bac à bûches à droite.
  Le conduit forme une saillie blanche dans le mur derrière la TV, jusqu'au plafond. Le plafond est haut comme dans
  un appartement ancien, avec la hauteur intermédiaire de l'illustration finale.
- Portes du placard technique au fond à gauche ; porte ancienne moulurée à poignée ronde et petit meuble bas sur le mur gauche.
- Grand pouf gris foncé à gauche avec Uto, chat adulte Sacré de Birmanie blanc à poils longs, endormi et petit par rapport au pouf.
- Jukebox rétro vintage à néons au milieu du mur droit. Les affiches **Whiplash** et **Dune** sont superposées au-dessus.
- Deux fenêtres anciennes hautes de part et d'autre du jukebox, avec de profondes embrasures et de larges rebords où s'asseoir.
- Vue du **premier étage** sur une rue piétonne, le bâtiment d'en face et des décorations de Noël dans la rue.

Les références appartiennent au décor et au contenu, indépendamment de l'avatar choisi par chaque invité.
La composition retenue sera partagée entre ouverture, transitions et fin ; les portraits resteront séparés du décor.
Pour l'intégration, seuls les éléments qui doivent bouger ou changer d'univers nécessiteront un calque distinct.
La maquette de chorégraphie utilise pour l'instant l'illustration complète et des portraits superposés.

### Essayer l'introduction

Ouvrir [piece.html](maquettes/piece.html) dans un navigateur, puis choisir **Lire**. Les commandes restent hors
de la scène : **Pause/Reprendre**, **Rejouer** et **7/8 invités**. Les pseudos de démonstration font 16 caractères.
La chronologie dure neuf secondes : découverte de la pièce, installation des portraits, courte tenue autour de la
table, effacement des portraits et entrée dans l'écran TV. Avec la préférence système de mouvement réduit,
les portraits apparaissent en fondu et le grand zoom est remplacé par un fondu.

Les coordonnées de la table, le rectangle de l'écran TV et les durées sont regroupés dans `REGLAGES` dans le HTML.
La maquette fonctionne hors ligne ; elle ne lance pas de serveur, de mini-jeu ou de son.

Validation locale Chromium en 1920×1080 : ouverture directe hors ligne, lecture complète, pause/reprise,
rejeu, changement d'effectif et mouvement réduit vérifiés. À sept et huit invités, les pseudos de 16 caractères
ne recouvrent ni les portraits ni les autres noms, sans débordement. Captures relues ; aucune erreur de console
ni requête HTTP. TypeScript et les 502 tests unitaires du jeu passent ; le code du jeu n'a pas changé dans ce lot.

### Examiner les six changements d'univers

Générer la galerie avec `bun run apercu:transitions`, puis ouvrir `captures/transitions/index.html` directement
dans le navigateur. Chaque univers dispose de sa proposition animée, avec lecture, pause et curseur de progression.
La galerie utilise `RoomTransition` et les signatures du jeu : elle n'entretient pas une seconde version des effets.
Son contrôleur emploie des snapshots de démonstration, sans lancer de partie ni se connecter au serveur.

Ces propositions visuelles sont **en attente de validation par l'organisateur** :

| Univers | Petite scène proposée |
|---|---|
| Dofus | Un œuf vert apparaît au-dessus de la table ; des cases et des étincelles l'accompagnent. |
| Overwatch | La TV projette un hologramme : balayage, hexagones et viseur orange. |
| League of Legends | Un portail hextech bleu et doré s'ouvre dans le salon. |
| Rocket League | Un ballon rebondit avec une traînée de boost bleue et orange, puis rejoint la TV. |
| Mario Odyssey | Une casquette rouge à yeux traverse la pièce, accompagnée de pièces dorées. |
| Resonance : A Plague Tale Legacy | La Macula gagne les murs par des ramifications noires depuis la cheminée ; une pulsation ambrée traverse le réseau. |

Pour Resonance, cette interprétation visuelle part de la Macula et de la lumière décrites dans le
[devblog officiel](https://community.focus-entmt.com/focus-entertainment/a-plague-tale-series/blogs/433-devblog-5-seadogs).
Elle remplace les anciennes bandes de brume. Les scènes restent muettes et durent quatre secondes.
Tous les mouvements suivent la même horloge que la caméra ; la pause et le mouvement réduit s'appliquent aux détails.

## Changements techniques nécessaires

### Des frontières explicites entre les univers

`buildPlan` conserve le placement aléatoire des interludes dans des blocs. La propriété facultative
`MiniGame.changeSkinAfter` marque une frontière, puis `assignRoundSkins` attribue chaque univers au plan.
Le moteur ne connaît aucun état interne ni identifiant de Culture gênante : le jeu déclare cette propriété.

Le skin précédent reste actif pendant toute la surprise et ses résultats. La bascule s'effectue au point couvert
de la scène, avant la prochaine annonce de manche. L'ancien rideau automatique de `SkinProvider` est supprimé :
une seule transition visible, pilotée par le serveur. `null` représente le thème de base dans le snapshot.

### Une seule brique moteur pour les scènes

La phase générique `transition` porte un petit descriptif sérialisable : nature (ouverture, changement, sortie),
skin de départ et d'arrivée, instant de départ, durée et participants. Le moteur décide quand une scène commence
et se termine ; React affiche son avancement à partir de l'horloge synchronisée. Les durées partagées sont dans
`src/shared/transitions.ts` : ouverture 9 s, changement 4 s, sortie 2,4 s.

`TimerGroup` gère Pause/Reprendre/Passer et annule les échéances au retour au lobby. Aucun mini-jeu ni chrono
ne démarre sous une scène. La sauvegarde garde progression, destination et un horodatage de contrôle :
un rechargement de page reprend la scène ; un redémarrage serveur retrouve sa destination sans rejouer les points.
Les téléphones montrent uniquement l'attente pendant ces scènes. La logique propre aux mini-jeux reste intacte.

La révélation finale actuelle dispose déjà d'un départ serveur commun, après la sortie de la TV. La future
cérémonie avec statistiques et souvenirs prolongera cette chronologie, en gardant les rangs et les distinctions
cachés sur les téléphones jusqu'au bon moment.

### Des souvenirs compacts

À chaque fin de manche, enregistrer une seule fois un résumé borné : manche, jeu, gains et classement. Cela suffit
pour les meilleurs gains et les remontées. Les statistiques comme les votes communs demandent un résumé explicite
fourni par les jeux concernés ; elles ne doivent pas être déduites arbitrairement de résultats hétérogènes.

Un petit contrat facultatif de souvenir peut être ajouté aux mini-jeux concernés : dessin révélé, objet du Bon Prix,
phrase montrée sur la TV. Garder seulement quelques souvenirs sélectionnés et sérialisables, avec une limite de taille,
sans conserver tous les snapshots ni rejouer la partie. Les résumés et souvenirs sont sauvegardés avec les scores,
pour qu'une reprise ne les compte pas deux fois. Les contenus secrets restent dans la vue TV jusqu'à leur révélation.

## Cas particuliers de la rotation

- Culture gênante désactivée ou sans questions restantes : conserver le skin courant jusqu'à la fin ; ne jamais
  créer une fausse question pour déclencher un changement.
- Culture gênante en dernière manche : aller directement vers la sortie et la cérémonie, sans visiter un univers vide.
- Partie courte : montrer uniquement les univers effectivement visités. Six skins ne supposent pas six passages obligatoires.
- Plus de six univers : nouveau cycle mélangé sans répétition immédiate. Le rythme de Culture gênante n'est pas
  modifié pour forcer six univers.
- Démo composée seulement de Culture gênante : prévoir ouverture, surprise, sortie, sans transition intermédiaire vide.

## Ordre des lots et validation

1. Retrait GunZ/photos et correctif de la révélation finale.
2. Croquis puis validation de la pièce et d'une scène représentative.
3. Chronologie générique et rotation aux frontières, d'abord avec des scènes simples.
4. Ouverture et six variantes visuelles de changement, partageant la même pièce.
5. Résumés/souvenirs, distinctions et cérémonie finale.
6. Sons et réglage du mixage, exclusivement sur la TV.

Pour le lot moteur : tests de pause, reprise, passage, retour lobby, crash aux frontières, absence d'interlude,
épuisement du contenu et absence de double comptage. Puis parcours Playwright avec rechargement TV/téléphones,
huit joueurs et petits écrans. Recette finale sur le PC, les vrais téléphones et le wifi prévu, hors ligne.
