# Ambiances musicales des univers

Intégrées le 13 novembre 2026, après demande explicite de l’organisateur de récupérer les originaux disponibles
pour la version locale de sa soirée privée. Les trois bruitages validés lors de la dernière revue sont inchangés.

## Sélection et provenance

| Univers | Extrait original | Source | Boucle | Volume du catalogue |
|---|---|---|---|---|
| Dofus | Astrub — Guillaume Pladys | [Lecteur et téléchargement Angom8](https://angom8.net/musiques-dofus/) | 63 s | 0,30 |
| Overwatch | Rejuvenescência — Derek Duke / Lúcio | [Album offert par Blizzard en 2018, copie archivée](https://archive.org/details/Synaesthesia-Auditiva) | 63 s | 0,28 |
| League of Legends | Tales Of The Rift — Riot Games Music Team | [Archive du ZIP officiel gratuit, Volume 1](https://web.archive.org/web/20150201000000id_/http://l3cdn.riotgames.com/MusicOfLoL/The_Music_of_League_of_Legends_Volume_1.zip) | 63 s | 0,30 |
| Rocket League | Infinite Power! — TheFatRat, version originale du morceau repris pour Rumble | [MP3 proposé par l’artiste](https://www.thefatrat.com/release/infinite-power) | 63 s | 0,26 |
| Mario Odyssey | Jump Up, Super Star! (Short ver.) — The Super Mario Players feat. Kate Davis | [Musique du site officiel Nintendo](https://www.nintendo.co.jp/switch/aaaca/) | 63 s | 0,24 |
| Plague Tale | A Plague Tale — Olivier Deriviere | [Extrait de 60 s du lecteur du compositeur](https://olivierderiviere.com/album/a-plague-tale-innocence-a-plague-tale/) | 57 s | 0,32 |

Les fichiers sont dans `src/web/theme/sons/ambiance-<skin>.ogg`, embarqués par Vite puis dans l’exécutable.
Tout fonctionne sans Internet le jour de la soirée. Les six boucles pèsent **4 124 527 octets** ; le catalogue
complet compte **37 fichiers Ogg, 5 830 849 octets**, sous le budget de 8 Mo.

Ce sont des musiques propriétaires, avec crédits et droits réservés, sans les présenter comme des ressources libres.
Les téléchargements gratuits des artistes / éditeurs ne constituent pas une licence générale d’exploitation dans
un jeu. Les conditions de TheFatRat excluent notamment cette intégration de la licence publique proposée sur son site.
Le périmètre de ce lot est la version locale pour la soirée privée demandée par l’organisateur ; aucun droit de
redistribution ou d’exploitation publique n’est revendiqué. Détails dans [les crédits](../src/web/theme/sons/LICENCES.md).

## Déroulement

- L’accueil garde le jazz de Kevin MacLeod.
- Dès la bascule du skin, l’ambiance change par fondu croisé : sortie de l’ancienne sur 0,8 s, entrée de la nouvelle sur 1,2 s.
- La boucle continue entre les annonces, le jeu, les résultats et les scènes de changement d’univers.
- Les jingles, roulements, risers et applaudissements baissent temporairement la musique à 25 % de son volume.
  Une superposition de sons ne la relève pas trop tôt ; la nouvelle piste hérite d’une baisse encore en cours.
- Pause et muet coupent l’ambiance ; la sortie de partie l’arrête pour laisser la place à la fanfare finale.
- Aucun départ au montage ou rechargement : un geste dans la page TV courante reste nécessaire. Aucun son sur les téléphones.

Le nom logique historique `lobby.musique` reste valable. Une surcharge
`config/medias/sons/<skin>/lobby.musique.(mp3|ogg|wav)` remplace l’ambiance de cet univers sans recompiler.

## Écoute et préparation

`bun run apercu:sons` produit [la planche autonome](../captures/sons/index.html).
Lancer `lobby.musique`, puis cliquer les skins sans arrêter la lecture pour écouter les changements en fondu.

`ambiances.json` conserve les noms, liens exacts, découpes et volumes ; `provenance-ambiances.json` conserve
la mesure de sonie et les empreintes des originaux et des exports. Pour reproduire le traitement :

```sh
python3 scripts/preparer-ambiances.py /dossier/des/originaux --ffmpeg ffmpeg
```

Le traitement raccorde chaque extrait par un fondu croisé d’une seconde, normalise en deux passes à −24 LUFS
avec plafond −2 dBTP, puis exporte en Vorbis 96 kbit/s, stéréo 48 kHz. Le gain du catalogue s’ajoute à cette sonie.

## Vérifications ciblées

- TypeScript et 28 tests unitaires audio : résolution des six pistes, priorités des surcharges, absence d’autoplay,
  changement d’univers pendant le décodage, annulation des requêtes obsolètes et baisse de volume pendant les sons superposés.
- Six E2E Chromium audio : parcours de changement d’univers, continuité jeu / résultats, sortie sans reprise du jazz,
  rechargement silencieux, muet, décodage WebAudio réel et surcharge musicale d’un skin.
- Planche en `file://` : 37 fichiers décodés par WebAudio, sept démarrages (accueil puis six univers), une boucle
  active après chaque fondu, zéro après arrêt. Aucun démarrage avant le geste, aucune erreur et aucune requête HTTP.
  Galerie des animations également régénérée et ouverte sans erreur ni requête HTTP.
- Les exports mesurés vont de −24,22 à −23,91 LUFS, avec un pic maximal de −6,61 dBTP. Mesures locales dans
  `captures/sons/verification-ambiances.json`. Le choix et le niveau artistiques restent à apprécier sur les enceintes de la TV.
- La suite complète n’est pas relancée, conformément à la demande de vérifications ponctuelles.
