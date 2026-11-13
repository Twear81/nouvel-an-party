# Signatures à déposer par l’organisateur

Ces propositions concernent des bruitages de signature propriétaires : **aucun de ces bruitages n’a été téléchargé ni intégré au dépôt**.
Les six ambiances musicales originales ont en revanche été ajoutées le 13 novembre 2026 sur demande explicite de
l’organisateur : [sélection, sources et écoute](ambiances-musicales.md).
L’organisateur choisit et fournit l’extrait pour sa soirée. Les liens renvoient aux jeux officiels ; les moments
indiqués permettent de retrouver le son dans une partie / un replay personnel, sans confondre un téléchargement
public avec une licence libre.

Tous les chemins ci-dessous partent de `config/medias/sons/`. `.mp3` et `.wav` fonctionnent aussi à la place de `.ogg`.
Garder les débuts nets, les extraits courts et une marge de pic de −2 dB. Redémarrer le jeu après dépôt.

| Skin | Signature proposée et où la retrouver | Nom logique | Fichier à déposer |
|---|---|---|---|
| Rocket League | [But](https://www.rocketleague.com/) : marquer en entraînement ou reprendre un replay, explosion de but sans commentaire | `boum` | `rocket-league/boum.ogg` |
| Rocket League | Sirène de fin de match, replay à 0:00 après que le ballon touche le sol | `chrono.fin` | `rocket-league/chrono.fin.ogg` |
| Overwatch | [« Play of the Game »](https://overwatch.blizzard.com/) : écran du temps fort en fin de partie ; garder le jingle et l’annonce (2–4 s) | `manche.intro` | `overwatch/manche.intro.ogg` |
| Mario Odyssey | [Pièce](https://www.nintendo.com/us/store/products/super-mario-odyssey-switch/) : ramassage d’une pièce isolée, sans musique | `points.gagnes` | `mario-odyssey/points.gagnes.ogg` |
| Mario Odyssey | Lune de puissance : fanfare au ramassage d’une lune (version courte) | `bonne.reponse` | `mario-odyssey/bonne.reponse.ogg` |
| League of Legends | [« Victory »](https://www.leagueoflegends.com/) : écran de victoire d’une partie / replay | `bonne.reponse` | `league-of-legends/bonne.reponse.ogg` |
| League of Legends | « Ace » / « As ! » : annonce quand l’équipe adverse est éliminée, selon la langue du client | `resultats.arrivee` | `league-of-legends/resultats.arrivee.ogg` |
| Dofus | [Début de combat](https://www.dofus.com/) : passage du placement au premier tour ; préciser version actuelle ou Retro selon le souvenir voulu | `manche.intro` | `dofus/manche.intro.ogg` |
| Plague Tale | [Grouillement de rats](https://www.asobostudio.com/games/plague-tale-requiem) : court passage d’une vague de rats sans dialogue, 1–2 s | `transition.entree` | `plague-tale/transition.entree.ogg` |

Le classement final et le lobby restent dans le thème de base : une fanfare déposée dans un skin n’y sera pas jouée.
Pour remplacer le roulement par un son de rats pendant les révélations de ce skin, déposer aussi
`plague-tale/roulement.ogg` et **garder exactement 2 secondes** : les animations calculent leur vitesse à partir de cette durée.
Pour Simon, garder un échantillon de **do4** si l’on remplace `simon.note` : les quatre hauteurs sont transposées par le jeu.

## Musiques d’ambiance par univers

Le moteur sélectionne `lobby.musique` selon le skin affiché et change de morceau en fondu. Les six univers ont déjà
une ambiance originale embarquée et incluse dans les aperçus. Elle continue pendant les mini-jeux et leurs résultats.
Les chemins ci-dessous permettent de remplacer cette sélection. Les extraits restent propriétaires et réservés
au périmètre privé décrit dans [ambiances-musicales.md](ambiances-musicales.md).

| Univers | Ambiance à chercher dans le jeu / la bande-son officielle | Fichier à déposer dans `config/medias/sons/` |
|---|---|---|
| Dofus | menu ou ambiance de village, version actuelle / Retro selon le souvenir recherché | `dofus/lobby.musique.ogg` |
| Overwatch | musique orchestrale du menu, sans annonce ni voix | `overwatch/lobby.musique.ogg` |
| League of Legends | ambiance instrumentale du client ou de la Faille | `league-of-legends/lobby.musique.ogg` |
| Rocket League | musique de menu, de préférence instrumentale pour laisser parler les invités | `rocket-league/lobby.musique.ogg` |
| Mario Odyssey | musique d’exploration d’un royaume, sans voix | `mario-odyssey/lobby.musique.ogg` |
| Plague Tale | ambiance discrète du menu ou d’exploration, sans dialogue | `plague-tale/lobby.musique.ogg` |

Choisir un extrait raccordable de 30 à 90 secondes, à volume modéré (environ −24 LUFS avant le volume du catalogue).
Les adresses officielles des jeux figurent dans le tableau des signatures ci-dessus. `.mp3` / `.wav` sont aussi acceptés.
