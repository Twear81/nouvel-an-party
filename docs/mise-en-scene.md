# Mise en scène de la soirée

## État du chantier

Direction confirmée par l'organisateur, réalisée par lots. Le retrait GunZ/photos, l'attente pendant le final,
l'ouverture de la pièce, les transitions après Culture gênante et la sortie avant le podium sont intégrés.
Les statistiques des manches, les souvenirs et la cérémonie finale enrichie sont réalisés sur la branche de travail :
les quatre bonus prolongent la sortie de la TV, puis le classement se révèle dans la même pièce en mode nuit.
Le moteur de sons (TV seulement) et les sons des mini-jeux sont livrés. La rotation livrée est décrite dans [skins.md](skins.md).

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

Première série jugée trop peu reconnaissable (petits dessins plats sur une pièce inchangée). Refonte validée
par l'organisateur le **10 novembre 2026** :

- **Pièce transformée** : une variante peinte de l'illustration par univers (`src/web/theme/assets/piece-<id>.png`),
  en fondu pendant la scène ; les animations restent dessinées par-dessus. Prompts : [prompts-pieces.md](maquettes/prompts-pieces.md).
- **Pas de carton titre** (sauf « Action de la partie », texte français du jeu) : le jeu n’est jamais nommé, c'est la scène puis l'interface qui le font deviner.
- Éléments ressemblant aux jeux autorisés (usage privé, local, non commercial), sans reprendre de logo.

| Univers | Scène retenue |
|---|---|
| Rocket League | Une vraie Octane (sprite) arrive en boost avec flamme et traînée, saute et frappe le ballon du jeu vers la TV ; la caméra tremble, explosion de but bleue et orange. |
| Dofus | Phase de placement d'un combat : une grille de cases en losange (projetée dans le plan du sol) se dessine en vague depuis le centre, des cases bleues (alliés, côté canapé) et rouges (ennemis, côté cheminée) s'allument, les avatars des invités tombent chacun sur une case bleue (rebond, ombre), un Bouftou (en sautillant) et un Tofu (en volant) se posent sur des cases rouges ; la frise d'ordre de jeu (avatars + monstres) glisse en bas à droite, puis éclat doré avant le replongeon. Scène et avatars suivent la caméra, la frise est une surimpression d'écran : `signatures/Dofus.tsx`. |
| Overwatch | « Action de la partie » : bandes blanches, orange et bleues en biais balaient l’écran, flash, personnage (avatar de la vedette) en grand à droite, texte empilé à gauche « ACTION DE LA PARTIE » / pseudo orangé / « EN TANT QUE <avatar> » qui glisse lentement (vedette = `spotlightPlayerId`, choisie par le serveur : un des gagnants de la manche précédente, sinon au hasard), puis les bandes repassent avant le replongeon. Surimpression d’écran hors caméra : `signatures/Overwatch.tsx`. |
| League of Legends | Les runes du socle s’allument, un vrai Nexus (sprite) se matérialise sur la table basse, encaisse des coups (fissures, secousses), puis explose : colonne de lumière, onde de choc au sol, éclats de cristal et tremblement de caméra ; la lueur file vers la TV. |
| Mario Odyssey | Comme sur les murs 2D d'Odyssey : un Mario 8-bit (sprites 16×16 ×3, déplacé par pas de 3 pour un mouvement saccadé façon NES) sort du tuyau vert, saute dans le mur (« pouf » pixelisé), court sur le sol de briques de la bande peinte, franchit d'un grand saut le placard, cogne le bloc « ? » (copie de la peinture qui rebondit, pièce 8-bit qui jaillit), puis bondit dans la TV dont l'écran s'illumine en iris carré. La caméra zoome sur la bande pendant la course (pixel de sprite = 6 px d'écran en 1920×1080) : `signatures/MarioOdyssey.tsx`. |
| Resonance : A Plague Tale Legacy | Pièce plongée dans le noir ; un fin réseau de veines noires ramifiées, traversé de filaments turquoise lumineux, gagne les murs depuis le poêle. Puis la Macula se déploie devant la cheminée : étoile à cinq tentacules osseux hérissés d'épines, cœur pâle aux alvéoles turquoise, longs filaments bleus qui ondulent ; elle pulse, et la caméra plonge dans la TV. |

**Avancement (10 novembre 2026)** — les six pièces transformées sont livrées. Scènes refaites : Rocket League,
Overwatch, League of Legends, Dofus (phase de placement, `signatures/Dofus.tsx`), Resonance (veines générées dans `signatures/PlagueTale.tsx` + sprite de la Macula), Mario (`signatures/MarioOdyssey.tsx`, sprites 8-bit `mario-odyssey-8bit-*`). Validées par l'organisateur : LoL ; RL, Overwatch et Resonance à revoir en mouvement.
Plus rien à refaire : toutes les scènes sont dans leur version actuelle.
Les sprites sont dans `src/web/theme/assets/sprites/` ; modèle à imiter : `src/web/ui/signatures/RocketLeague.tsx`.

Fluidité : voir [Performance des scènes](#performance-des-scènes) (règles obligatoires pour toute nouvelle scène).

Tous les mouvements suivent la même horloge que la caméra, pause comprise : `RoomTransition` cale les animations sur
l'horloge du serveur puis les **laisse tourner seules** ; il ne les recale qu'en pause/reprise ou si elles dérivent
de plus de 50 ms. La préférence système « réduire les animations » est ignorée : les scènes jouent toujours en entier.

## Performance des scènes

La TV est un PC ordinaire, souvent avec une puce graphique intégrée : une scène qui rame casse tout l'effet.
**Leçon de Resonance (12 novembre 2026)** : la première version tombait à 14–26 images/s. Le profil Firefox montrait
~80 tracés SVG animés en `stroke-dashoffset` redessinés au processeur à chaque image (23 ms de thread principal, jusqu'à
~40 Mo de textures renvoyées au GPU par image), redessinés encore à chaque échelle pendant le replongeon (×6), et
des animations figées puis recalées en JS à chaque image, donc jamais confiées au compositeur.

### À faire
- **N'animer que `transform` et `opacity`**, sur des éléments HTML, des `<img>` ou des `<canvas>` déjà dessinés.
  Ce sont les seules propriétés que le compositeur anime sans redessiner.
- **Dessins complexes = images fixes** : sprites PNG, ou canvas dessiné **une seule fois** au montage (Resonance :
  veines générées dans le code puis peintes dans 5 canvas concentriques, révélés en `opacity` + `scale`). Un effet
  « qui pousse » se fait par bandes révélées l'une après l'autre, pas en animant le tracé.
- **Laisser les animations natives tourner** (`animate` fourni à la scène) : jamais de `currentTime` recalé à chaque
  image, jamais de `requestAnimationFrame` propre à une scène, jamais d'écriture dans le DOM ou de style inline à chaque image.
- **Une seule animation de `transform` par élément**, en mode « replace » : les secousses et zooms propres à une scène
  vont sur le support de caméra `.room-rig`, la caméra `.room-camera` garde le dézoom/replongeon. Pas de
  `composite: "add"` (Chromium refuse alors de jouer l'animation sur le compositeur).
- **Calques à la taille de l'écran** (au plus ~1,4× s'ils s'agrandissent ou rétrécissent) : un élément animé bien plus
  grand que l'écran n'est plus confié au compositeur.
- `will-change: transform, opacity` sur les éléments **réellement** animés, pas ailleurs.

### À éviter
- Animer des propriétés SVG ou de peinture : `stroke-dashoffset`, `d`, `stroke-width`, `fill`, `stop-color`,
  `width`/`height`, `top`/`left`, `background`, `box-shadow`, `clip-path`, `mask`.
- Un SVG lourd (des dizaines de tracés) dans un conteneur qui zoome : il est redessiné à chaque nouvelle échelle.
  Même un `scale(1.02)` de secousse suffit.
- `filter` (`blur`, `drop-shadow`, `feGaussianBlur`), `mix-blend-mode`, `backdrop-filter` sur un grand calque
  (le `mix-blend-mode` de `.room-light` coûtait ~25 ms par image sous Resonance). Une lueur = un dégradé radial ou une
  sous-couche translucide, ou un `shadowBlur` peint une seule fois dans un canvas.
- Des centaines d'animations séparées : regrouper ce qui apparaît ensemble dans une même couche.

### Mesurer
La TV du jour J est **Chromium** : vérifier là d'abord (DevTools → Performance ; Rendering → « Frame Rendering
Stats »), puis sous Firefox, plus sévère sur les SVG. Dans la galerie (`bun run apercu:transitions`), lancer la lecture
d'un univers et enregistrer le profil sur toute la scène. Signes d'alerte : images à plus de 16 ms, longues tâches
« Paint »/« WebRender display list » (Firefox) ou « Paint »/« Rasterize » (Chromium) pendant que rien de neuf
n'apparaît, gros volume de « Texture uploads ». Une scène saine ne fait presque rien sur le thread principal entre
deux étapes de la scène.

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
skin de départ et d'arrivée, instant de départ, durée, participants et **vedette** (`spotlightPlayerId`, choisie par le
serveur à la création de la scène : un des plus gros gagnants de la manche qui vient de finir, tirage `rng` en cas
d'égalité, participant au hasard si personne n'a marqué, `null` pour l'ouverture et la sortie ; sauvegardée, vieille
sauvegarde = `null`). Le moteur décide quand une scène commence
et se termine ; React affiche son avancement à partir de l'horloge synchronisée. Les durées partagées sont dans
`src/shared/transitions.ts` : ouverture 9 s, changement 6 s (`SKIN_TIMING` : dézoom 1 s, scène jusqu’à 4,6 s, replongeon jusqu’à 5,9 s), sortie 2,4 s.

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
6. Sons et réglage du mixage, exclusivement sur la TV. **Moteur livré** (`src/web/sound/`, catalogue dans
   `src/web/theme/sons/`, sons CC0 de Kenney, sons globaux de la partie et des scènes) ; mode d'emploi dans
   [creer-un-mini-jeu.md](creer-un-mini-jeu.md#sons-tv-uniquement). Restent à faire : les sons propres aux skins (via
   `SONS_PAR_SKIN` ou `config/medias/sons/<skin>/`), les sons des mini-jeux et la recette d'écoute sur la vraie TV.

Pour le lot moteur : tests de pause, reprise, passage, retour lobby, crash aux frontières, absence d'interlude,
épuisement du contenu et absence de double comptage. Puis parcours Playwright avec rechargement TV/téléphones,
huit joueurs et petits écrans. Recette finale sur le PC, les vrais téléphones et le wifi prévu, hors ligne.

### Statistiques et souvenirs fournis par les jeux

Les jeux de choix transmettent les avis réellement enregistrés : cible de Qui est le plus, choix de Ceci ou cela,
vote de chaque phrase de Split the room, étage de chaque invité dans Tier list. Les réponses de Comme les autres
utilisent les mêmes groupes que le calcul des points, y compris la tolérance aux fautes et les réponses multiples.
Une absence ne devient jamais un avis. Les choix modifiables comptent uniquement les changements après un premier choix valide.

Dessin raté garde les votes des dessins non vides, une copie allégée de chaque œuvre incomprise et le dessin le plus voté.
Chaque trait conserve ses extrémités ; le souvenir reste sous 24 Ko. Le Bon Prix propose l'objet dont les estimations
s'écartent le plus du vrai prix. Culture gênante garde la mauvaise réponse la plus partagée en QCM ; sans erreur,
aucun post-it n'est inventé.

Simon et Pierre-feuille-ciseaux comptent les appuis acceptés. Le Compte à rebours compte l'arrêt volontaire comme un appui :
sa durée visée ne représente pas un réflexe. Les temps de réaction disponibles viennent des QCM de Culture gênante,
mesurés sur le téléphone et déjà bornés par le jeu ; aucune durée n'est déduite de la latence réseau.

### Cérémonie et classement dans la pièce

Le déroulé validé le 13 novembre 2026 conserve la pièce de référence : souvenirs (dessin encadré au mur,
objet sur la table, post-it près de la TV), classement provisoire, puis quatre bonus tirés avec une roulette visible.
Le corbeau apporte les enveloppes ; la carte se retourne, le projecteur cherche le gagnant et son portrait bondit.
Les deux gagnants du Duo improbable sont reliés ; le Talent incompris ressort son dessin et Merci pour les travaux
fait apparaître la cuillère à tiramisu. Les scores affichés ajoutent uniquement les bonus déjà révélés.

La nuit tombe pour le classement final. Les portraits quittent la table du dernier au quatrième, puis occupent
le podium devant la cheminée ; le dernier retrouve le pouf et la cuillère. Le portrait couronné du premier apparaît
dans la TV dessinée, avec lumières du jukebox, feu d'artifice aux fenêtres et confettis maison.
Le tableau final conserve les huit rangs et scores, tandis que les téléphones attendent la révélation de leur rang.
Les souvenirs restent posés dans le décor. Pause et Passer utilisent la même horloge serveur pendant ces deux phases.

Les composants sont `ui/RoomCeremony.tsx`, `ui/CeremonyRoom.tsx` et `tv/FinalScreen.tsx` ; les coordonnées et jetons
visuels se trouvent dans `theme/ceremony.css`. Le décor n'est pas repeint : un voile nuit et des lumières distinctes
préservent sa géométrie. Corbeau et cuillère sont des images SVG fixes, importées comme sprites ; aucun tracé SVG
n'est animé. Les dessins sont peints une fois sur canvas. Les calques mobiles utilisent seulement transform/opacity.

Revue hors ligne : `bun run apercu:animations`, puis **Écrans TV → Souvenirs et bonus** ou **Classement final**,
avec huit invités et téléphone 360×640. Le curseur permet de revoir chaque souvenir et chaque bonus.
Les données de cette galerie sont fictives ; la partie réelle utilise exclusivement l'historique du moteur.
