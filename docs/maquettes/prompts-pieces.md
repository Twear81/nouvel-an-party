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

> Thème : le salon devient une pièce médiévale française du XIVe siècle, de nuit, dans l'esprit d'A Plague Tale,
> sombre et inquiétante. Murs en pierre et torchis, poutres anciennes, parquet en vieilles planches usées.
> La seule lumière chaude vient du poêle, qui projette un cercle de lumière orangée sur le sol ; tout le reste est
> dans une pénombre bleu-gris froide. Le jukebox devient un vieux coffre en bois cerclé de fer, avec une bougie
> dessus. Par les fenêtres : une ruelle médiévale de nuit, brume, clair de lune, toits pointus. Dans les coins du
> plafond et au bas des murs, de discrètes traînées organiques rouge sombre, veinées, comme une maladie qui
> commence à ronger la pièce. Ambiance dark, tension, peu saturée.
