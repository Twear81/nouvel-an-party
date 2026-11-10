# Mise en scène de la soirée

## État du chantier

Direction confirmée par l'organisateur, à réaliser par lots. Cette page décrit une cible : les scènes de pièce,
la rotation après Culture gênante et les souvenirs ne sont pas encore implémentés.
Le retrait de GunZ et des photos de profil ainsi que l'attente du téléphone pendant le classement final
constituent le premier lot. La rotation livrée reste celle décrite dans [skins.md](skins.md).

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

## Modèle de la pièce à fournir

Un dessin à la main, photographié ou scanné en PNG/JPG, un PDF ou un croquis numérique conviennent.
Prévoir une vue du dessus avec la table, la télévision, les sièges et les ouvertures, puis une flèche indiquant
le point de vue souhaité pour l'illustration. Une esquisse de face est facultative. Les proportions approximatives
suffisent ; les dimensions exactes et la qualité du dessin ne sont pas nécessaires.

À annoter : couleurs des murs/sol/meubles, emplacement des invités, deux ou trois objets reconnaissables et
objets liés aux anecdotes du groupe. Les références appartiennent au décor ou au contenu, sans imposer de lien
entre une personne réelle et un avatar.

Rendu proposé : illustration 2D en calques, avec objets et portraits séparés. Une même composition pour
l'ouverture, les transitions et la fin, avec quelques éléments variant selon l'univers. La conception précise
du décor et des animations attend ce croquis.

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
