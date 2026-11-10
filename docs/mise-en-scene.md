# Mise en scène de la soirée

## État du chantier

Direction confirmée par l'organisateur, à réaliser par lots. Cette page décrit une cible : les scènes de pièce,
la rotation après Culture gênante et les souvenirs ne sont pas encore implémentés.
Le retrait de GunZ et des photos de profil ainsi que l'attente du téléphone pendant le classement final
constituent le premier lot. La rotation livrée reste celle décrite dans [skins.md](skins.md).

Le décor de la pièce a été validé par l'organisateur le **10 novembre 2026** :
[illustration de référence](maquettes/piece-reference.png). La [maquette animée](maquettes/piece.html)
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

## Changements techniques nécessaires

### Des frontières explicites entre les univers

Aujourd'hui, `skinForRound` répartit les skins par tranches du nombre total de manches ; `buildPlan` place les
interludes aléatoirement dans des blocs. La cible conserve ce placement, mais calcule les univers depuis les
frontières après Culture gênante. Une annotation générique dans le plan indique ces frontières ; le moteur
ne doit pas importer le code de Culture gênante ni tester son état interne.

Le skin précédent reste actif pendant toute la surprise et ses résultats. La bascule s'effectue au point couvert
de la scène, avant la prochaine annonce de manche. L'actuel rideau automatique de `SkinProvider` devra être
remplacé pour ce parcours : une seule transition visible, pilotée par le serveur. `null` pourra représenter le
thème de base dans le snapshot, sans ajouter un faux septième skin à la rotation.

### Une seule brique moteur pour les scènes

Ajouter une phase générique `transition`, avec un petit descriptif sérialisable : nature (ouverture, changement,
sortie), skin de départ et d'arrivée, instant de départ, durée et destination. Le moteur décide quand une scène
commence et se termine ; React affiche son avancement à partir de l'horloge synchronisée.

Réutiliser `TimerGroup` pour Pause/Reprendre/Passer et annuler les échéances au retour au lobby. Ne pas démarrer
le chrono d'une manche sous une scène. Sauvegarder la destination et les informations nécessaires à la reprise ;
un rechargement de page reprend la scène, un redémarrage serveur retrouve sa destination sans rejouer les points.
Les téléphones montrent uniquement l'attente pendant ces scènes. La logique propre aux mini-jeux reste intacte.

La révélation finale actuelle dispose déjà d'un départ serveur commun. La future sortie de la TV et la cérémonie
étendront cette chronologie, pour garder les rangs et les distinctions cachés sur les téléphones jusqu'au bon moment.

### Des souvenirs compacts

À chaque fin de manche, enregistrer une seule fois un résumé borné : manche, jeu, gains et classement. Cela suffit
pour les meilleurs gains et les remontées. Les statistiques comme les votes communs demandent un résumé explicite
fourni par les jeux concernés ; elles ne doivent pas être déduites arbitrairement de résultats hétérogènes.

Un petit contrat facultatif de souvenir peut être ajouté aux mini-jeux concernés : dessin révélé, objet du Bon Prix,
phrase montrée sur la TV. Garder seulement quelques souvenirs sélectionnés et sérialisables, avec une limite de taille,
sans conserver tous les snapshots ni rejouer la partie. Les résumés et souvenirs sont sauvegardés avec les scores,
pour qu'une reprise ne les compte pas deux fois. Les contenus secrets restent dans la vue TV jusqu'à leur révélation.

## Cas à fixer avant de modifier la rotation

- Culture gênante désactivée ou sans questions restantes : conserver le skin courant jusqu'à la fin ; ne jamais
  créer une fausse question pour déclencher un changement.
- Culture gênante en dernière manche : aller directement vers la sortie et la cérémonie, sans visiter un univers vide.
- Partie courte : montrer uniquement les univers effectivement visités. Six skins ne supposent pas six passages obligatoires.
- Plus de six univers : choix de l'organisateur encore attendu entre un nouveau tour mélangé sans répétition immédiate
  et la conservation du dernier skin. Ne pas modifier le rythme de Culture gênante pour forcer six univers.
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
