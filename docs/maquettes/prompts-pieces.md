# Prompts des pièces transformées

Une variante de la pièce par univers, affichée en fondu pendant le changement de skin. Les animations
(voiture, rats, Bouftou…) restent dessinées par le jeu par-dessus : l'image ne porte que le **décor**.

## Consignes pour Codex / ChatGPT Image

- Toujours partir de l'image `src/web/theme/assets/piece-reference.png` (mode édition, image fournie en entrée).
- Sortie : PNG **1672 × 941** exactement (générer en 16:9 puis recadrer/redimensionner sans déformer).
- Fichier : `src/web/theme/assets/piece-<id>.png` (`piece-rocket-league.png`, `piece-dofus.png`…).
- Contrôle : superposer l'image à la référence à 50 % d'opacité. **La TV, la table basse, le tapis, le canapé,
  la cheminée et les fenêtres doivent tomber exactement au même endroit**, sinon le zoom final dans la TV et les
  animations seront décalés. Régénérer si ça bouge.

## Bloc commun (à mettre en tête de chaque prompt)

> Modifie cette illustration en gardant **exactement** le même cadrage, la même perspective, la même caméra et la
> même position de chaque meuble : canapé au premier plan, table basse en verre sur le tapis ovale, cheminée et poêle
> au centre, télévision sur la cheminée, pouf à gauche, jukebox et deux fenêtres à droite, porte à gauche.
> Garde le même style d'illustration peinte, détaillée et lumineuse. L'écran de la télévision reste éteint, bleu
> nuit uni, sans image. Le centre du tapis et l'espace au-dessus de la table basse restent dégagés. Pas de texte,
> pas de logo, pas de personnage. Transforme uniquement l'ambiance et la décoration selon le thème suivant :

## Rocket League — `piece-rocket-league.png`

> Thème : le salon devient un mini-stade de Rocket League, de nuit. Le tapis ovale devient une pelouse de terrain
> avec des lignes blanches lumineuses et un rond central. Des pastilles de boost orange lumineuses sont posées sur
> le parquet, autour du tapis. Le côté gauche de la pièce est éclairé en bleu néon, le côté droit en orange néon,
> comme les deux équipes. La cheminée est encadrée comme une cage de but : montants futuristes, filet lumineux
> orange derrière le poêle. Par les fenêtres : un stade la nuit, projecteurs puissants, tribunes. Plinthes et
> moulures soulignées de lignes LED bleues à gauche et orange à droite. Ambiance arène sportive futuriste, contrastée.

## Dofus — `piece-dofus.png`

> Thème : le salon devient une maison du monde d'Amakna (Dofus), style fantasy 2D peint à la main, couleurs chaudes
> et saturées. Le parquet devient des dalles de pierre claire et de bois, posées en grille isométrique bien visible
> au sol autour du tapis. Lierre et petites fleurs sur les murs, poutres en bois, lanternes rondes. Le pouf est en
> laine blanche bouclée, comme une toison de mouton (le chat dort toujours dessus). Par les fenêtres : collines
> vertes, un moulin, un ciel de fin d'après-midi doré. Quelques petites pièces dorées en forme d'étoile éparpillées
> sur le rebord des fenêtres. Ambiance aventure joyeuse et chaleureuse.

## Overwatch — `piece-overwatch.png`

> Thème : le salon devient une base futuriste Overwatch, lumineuse et optimiste. Murs en panneaux blancs et gris
> clair, arrondis, avec des liserés orange et des jointures bleu clair. Le jukebox garde sa place mais devient une
> borne futuriste blanche à écran holographique bleu. Petits écrans holographiques bleus flottant près des murs.
> Plinthes lumineuses bleu ciel. Par les fenêtres : une ville futuriste ensoleillée, tours élancées, ciel bleu.
> Lumière de jour franche, couleurs propres : blanc, gris, orange, bleu clair. Ambiance héroïque, style Blizzard.

## League of Legends — `piece-league-of-legends.png`

> Thème : le salon prend l'ambiance de la Faille de l'invocateur (League of Legends), au crépuscule. Le parquet
> devient des dalles de pierre ancienne gravées de runes bleues qui luisent faiblement. Sous la table basse, un
> socle circulaire en pierre et en métal doré, comme la base d'un nexus (rien dessus : le cristal sera ajouté par le
> jeu). Murs en pierre claire avec ornements dorés, lianes et végétation de jungle magique dans les coins. Par les
> fenêtres : une jungle magique, une rivière qui scintille, des tours de pierre au loin. Lumière bleu turquoise
> magique mêlée de reflets dorés. Ambiance épique et mystique.

## Mario Odyssey — `piece-mario-odyssey.png`

> Thème : le salon devient un niveau de Super Mario Odyssey, couleurs vives et joyeuses. Le mur du fond, à gauche
> de la cheminée, et le mur gauche deviennent un mur de briques beige clair avec une **bande horizontale en pixel art
> 8-bit** à mi-hauteur : sol de briques pixelisées, blocs « ? » jaunes pixelisés, nuages pixelisés, qui se prolonge
> jusqu'au manteau de la cheminée. Cette bande doit être dégagée (pas de personnage : il sera animé par le jeu).
> Un tuyau vert vif sort du sol dans le coin gauche, près du pouf. Par les fenêtres : les gratte-ciel d'une grande
> ville colorée de jour, ciel bleu éclatant. Quelques pièces d'or brillantes posées sur le rebord des fenêtres.
> Ambiance Nintendo, lumineuse, saturée, ludique.

## A Plague Tale — `piece-plague-tale.png`

> Thème : le salon devient une pièce médiévale française du XIVe siècle, de nuit, dans l'esprit d'A Plague Tale :
> Resonance, sombre et inquiétante. Murs en pierre et torchis, poutres anciennes, parquet en vieilles planches usées.
> La lumière chaude vient seulement du poêle, qui projette un cercle orangé sur le sol ; tout le reste baigne dans
> une pénombre froide, gris-vert et bleu nuit, avec une légère brume. Le jukebox devient un vieux coffre en bois
> cerclé de fer, avec une bougie dessus. Par les fenêtres : une ruelle médiévale de nuit, brume, clair de lune,
> toits pointus. Dans les coins du plafond et au bas des murs, un fin réseau de veines noires très ramifiées, comme
> de la dentelle ou des capillaires, parcouru de quelques filaments bleu turquoise lumineux : une corruption
> surnaturelle qui commence à gagner la pièce. Pas de rouge. Ambiance dark, tension, couleurs désaturées.

---

# Prompts des éléments animés (sprites)

Un dessin en SVG codé à la main ne peut pas atteindre la direction artistique d'un jeu en 3D. Les éléments qui
bougent sont donc aussi des images générées, que le jeu déplace, tourne, agrandit et fait clignoter.

## Consignes pour Codex / ChatGPT Image

- **Fond transparent** (PNG avec canal alpha, option `background: transparent`), aucun sol, aucune ombre portée
  au sol (le jeu dessine l'ombre), sujet entier, non coupé, centré, avec une petite marge.
- Taille : au moins 1024 px sur le plus grand côté ; garder l'orientation demandée (le jeu ne retourne pas l'image).
- Pas de texte, pas de logo officiel.
- Fichiers : `src/web/theme/assets/sprites/<id>-<nom>.png` (noms ci-dessous).
- Le style doit être celui **du jeu** (rendu 3D, couleurs, matières), pas celui de la pièce.

## Rocket League (prioritaire)

**`rocket-league-voiture.png`**
> Rendu 3D façon jeu vidéo Rocket League : une voiture de type Octane, la voiture emblématique du jeu. Carrosserie
> trapue et haute, gros nez plongeant, cabine courte et bombée reculée vers l'arrière, gros pneus tout-terrain noirs
> à jantes sportives, petit aileron, prises d'air. Peinture bleu équipe brillante métallisée, avec quelques détails
> lumineux bleu clair. Vue de trois quarts avant, de profil, **la voiture va vers la gauche**, légèrement vue d'en
> haut. Éclairage de stade nocturne, reflets nets, rendu Unreal Engine net et saturé. Pas de flammes. Fond transparent.

**`rocket-league-boost.png`**
> Traînée de boost de Rocket League : jet de flammes propulsé, cœur blanc-jaune très lumineux, flammes orange, bords
> bleutés, étincelles et fumée légère, qui s'étire horizontalement **vers la droite** depuis un point d'origine à
> gauche (là où se trouve le pot d'échappement). Forme allongée, environ 4 fois plus large que haute. Fond transparent.

**`rocket-league-ballon.png`**
> Le ballon de Rocket League, rendu 3D : grosse sphère gris anthracite et argent métallisé, recouverte d'un motif de
> panneaux hexagonaux en relief séparés par des lignes lumineuses blanc-bleu, avec un léger halo lumineux autour.
> Vue de face, sphère parfaite, éclairage de stade. Fond transparent.

**`rocket-league-explosion.png`**
> Explosion de but de Rocket League : déflagration énergétique spectaculaire, sphère de lumière blanche au centre,
> onde de choc, éclairs et gerbes d'étincelles, fumée, moitié bleu électrique et moitié orange vif (les deux équipes).
> Composition circulaire centrée, format carré. Fond transparent.

## Dofus

**`dofus-bouftou.png`**
> Un Bouftou du jeu Dofus, en illustration 2D vectorielle peinte façon Ankama : mouton trapu à grosse toison blanche
> bouclée, cornes enroulées, petites pattes, air ronchon et rigolo. Vue de trois quarts, tourné vers la gauche, en
> plein saut. Contours doux, couleurs vives. Fond transparent.

**`dofus-tofu.png`**
> Un Tofu du jeu Dofus, illustration 2D façon Ankama : petit oiseau rond jaune vif, toupet, grands yeux, petites
> ailes qui battent. Vue de profil, tourné vers la gauche, en vol. Fond transparent.

## League of Legends

**`league-of-legends-nexus.png`**
> Le Nexus de League of Legends, camp bleu : grand cristal magique bleu turquoise lumineux qui flotte et tourne
> au-dessus d'un socle de pierre et de métal doré ouvragé, énergie qui s'échappe. Vue de trois quarts légèrement
> plongeante, rendu du jeu (style peint semi-réaliste Riot). Fond transparent.

**`league-of-legends-nexus-explosion.png`**
> Explosion du Nexus de League of Legends : le cristal bleu se brise en éclats, colonne d'énergie bleue et blanche
> qui jaillit vers le haut, onde de choc, fragments de cristal et de pierre projetés. Format carré, centré. Fond transparent.

## Resonance : A Plague Tale Legacy

**`plague-tale-macula.png`**
> La Macula d'A Plague Tale : créature surnaturelle en forme d'étoile à cinq longs tentacules osseux et noueux,
> gris-noir veinés de violet, hérissés d'épines pâles. Au centre, un cœur osseux pâle en forme de pentagone percé
> d'alvéoles qui luisent en bleu turquoise. Des dizaines de longs filaments fins bleu électrique lumineux rayonnent
> et ondulent autour. Vue de face, rendu réaliste sombre et inquiétant. Fond transparent.

**`plague-tale-veines.png`**
> Réseau de veines noires très ramifiées, fines comme de la dentelle ou des capillaires, qui s'étend depuis un point
> en bas au centre vers le haut et les côtés, parcouru de quelques rubans fins bleu turquoise lumineux. Format
> panoramique 16:9. Fond transparent.

## Overwatch et Mario Odyssey

Pas de sprite à générer : l'« Action de la partie » est un habillage graphique plat (bandeaux, typographie),
et le Mario 8-bit est du pixel art, plus fidèle s'il est dessiné pixel par pixel dans le code.
