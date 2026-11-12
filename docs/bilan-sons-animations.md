# Bilan du lot sons et corrections visuelles — 12 novembre 2026

Branche : `feat/sons-animations`. Travail local, sans push ni fusion dans `main`.
Les profils Firefox non suivis ont été conservés. Aucun fichier de `src/server/engine` n’a été modifié.

## Retouches après écoute de l’organisateur

La [comparaison sonore avant / après](../captures/sons-retouches/index.html) isole les trois remplacements ;
la [planche complète](../captures/sons/index.html) conserve tous les autres bruitages validés.

- `roulement` : caisse claire seule en crescendo, exactement 2 s, sans cymbale ; −21,10 LUFS, pic −8,45 dBTP.
- `bonne.reponse` : double ding de sonnette de comptoir, 1,1 s ; −19,04 LUFS, pic −3,33 dBTP.
- `pfc.choc` : impact physique de combat, 0,4 s ; −20,25 LUFS, pic −3,72 dBTP.
- Musique : résolution selon le skin affiché, y compris le skin forcé en développement, fondu croisé entre morceaux,
  annulation des décodages devenus obsolètes. Aucun nouveau morceau n’est intégré en attendant le choix de l’organisateur
  entre originaux à fournir et alternatives libres ; le périmètre lobby / partie reste à préciser.

Vérifications ciblées : TypeScript, 25 tests unitaires audio, cinq E2E audio Chromium (dont décodage WebAudio réel
et surcharge musicale d’un skin), aperçus en `file://` sans erreur ni requête HTTP. Le scénario WebAudio a été
relancé seul après correction du chemin de sa fixture sous Node. Suite complète non relancée, conformément à la demande.
Mesures des trois exports : `captures/sons/retouches-mesures.json`. La qualité artistique des trois remplacements
reste à valider à l’écoute ; les niveaux et la durée ont été contrôlés.

## Sons

Les 26 fichiers Kenney et le roulement synthétique ont été remplacés ; le catalogue compte **31 fichiers, 1 706 322 octets** (1,71 Mo).
Roulement de caisse claire échantillonné de 2 s (contrat des révélations conservé), cuivres + applaudissements pour la
fanfare, buzzer de fin, impact cinématique, sons physiques de cartes / jetons, piano do–mi–sol–do pour Simon.
Un riser accompagne le dessin gagnant, les applaudissements suivent les gains après révélation et le trombone
ponctue la victoire de l’imposteur. Les animations de feedback restent en place.

L’ambiance de lobby est un extrait jazz de Kevin MacLeod raccordé en boucle de 63 s. Elle attend un geste dans la
page courante : aucun départ au montage / rechargement. Fondu d’entrée 1,2 s, sortie 0,8 s, arrêt en pause / muet,
une seule boucle et baisse de volume pendant les jingles. Les téléphones restent silencieux.

Traitement : ffmpeg, stéréo 48 kHz, Vorbis 128 kbit/s, suppression du silence initial, fondus courts (raccord croisé
pour la musique). Mesure des exports après décodage : fanfare −15,51 LUFS, lancement −16,09, intro −16,07,
impact −16,18 ; effets fréquents plus bas. Pic maximal du catalogue **−2,56 dBTP**. Aucun fichier silencieux.
Mesures détaillées locales : `captures/sons/verification-sonie.json` et `verification-formats.json`.
Les contrôles de décodage ne remplacent pas l’écoute sur les enceintes de la TV : le choix et l’équilibre artistiques
restent à valider par l’organisateur dans [la planche](../captures/sons/index.html).

Fichiers : `src/web/theme/sons/`, `src/web/sound/engine.ts`, `useGlobalSfx.ts`, vues Simon / Imposteur / Dessin raté,
`scripts/apercu-sons.tsx`, `scripts/preparer-sons.py`. Les sources, traitements et empreintes sont dans
[provenance.json](../src/web/theme/sons/provenance.json). Les notices de licence accompagnent aussi la version portable
(`scripts/build-release.ts`). Aucun son propriétaire n’est fourni ; les propositions pour les six skins sont dans
[signatures-sonores.md](signatures-sonores.md).

| Nom logique | Fichier embarqué | Source | Licence |
|---|---|---|---|
| `lobby.musique` | `lobby.ogg` | [Kevin MacLeod](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300012) | CC BY 4.0 |
| `joueur.rejoint` | `rejoint.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIClick_MagicalOpen_OS_01.ogg) | CC BY 4.0 |
| `joueur.quitte` | `quitte.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIClick_CasualPopsBack_OS_01.ogg) | CC BY 4.0 |
| `partie.lancement` | `lancement.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/MUSCStngr_VictoryOrchestral_OS_02.ogg) | CC BY 4.0 |
| `manche.intro` | `intro.ogg` | [plasterbrain](https://freesound.org/people/plasterbrain/sounds/397354/) | CC0 1.0 |
| `reponse.recue` | `pop.ogg` | [unfa](https://freesound.org/people/unfa/sounds/245646/) | CC0 1.0 |
| `reponse.toutes` | `complet.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIClick_MagicalConfirm_OS_01.ogg) | CC BY 4.0 |
| `chrono.tic` | `tic.ogg` | [ST303](https://freesound.org/people/ST303/sounds/171041/) | CC0 1.0 |
| `chrono.fin` | `gong.ogg` | [guitarguy1985](https://freesound.org/people/guitarguy1985/sounds/54047/) | CC0 1.0 |
| `temps.ajoute` | `temps-ajoute.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIMisc_BelltreeUp_OS_01.ogg) | CC BY 4.0 |
| `pause` | `pause.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIClick_CasualPopsClose_OS_01.ogg) | CC BY 4.0 |
| `reprise` | `reprise.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIClick_MagicalOpen_OS_01.ogg) | CC BY 4.0 |
| `resultats.arrivee` | `resultats.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/MUSCStngr_VictoryMallet_OS_01.ogg) | CC BY 4.0 |
| `points.gagnes` | `points.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/OBJCoin_CoinsUI_LOOP_01.ogg) | CC BY 4.0 |
| `final.fanfare` | `fanfare.ogg` | [Oculus VR, LLC + peridactyloptrix](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/MUSCStngr_VictoryOrchestral_OS_03.ogg) | CC BY 4.0 + CC0 1.0 |
| `transition.entree` | `whoosh-entree.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/SWSH_Swoosh_OS_02.ogg) | CC BY 4.0 |
| `transition.sortie` | `whoosh-sortie.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/SWSH_Swoosh_OS_04.ogg) | CC BY 4.0 |
| `applaudissements` | `applaudissements.ogg` | [peridactyloptrix](https://freesound.org/people/peridactyloptrix/sounds/196094/) | CC0 1.0 |
| `tension` | `tension.ogg` | [deleted_user_3277771](https://freesound.org/people/deleted_user_3277771/sounds/177242/) | CC0 1.0 |
| `echec.trombone` | `trombone.ogg` | [kirbydx](https://freesound.org/people/kirbydx/sounds/175409/) | CC0 1.0 |
| `ui.clic` | `clic.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIClick_CasualPopsConfirm_OS_01.ogg) | CC BY 4.0 |
| `bonne.reponse` | `bravo.ogg` | [Joseph SARDIN — Counter Bell #3](https://bigsoundbank.com/counter-bell-3-s2531.html) | CC0 1.0 |
| `mauvaise.reponse` | `rate.ogg` | [guitarguy1985](https://freesound.org/people/guitarguy1985/sounds/54047/) | CC0 1.0 |
| `roulement` | `roulement.ogg` | [Joseph SARDIN — Drum roll 3 L](https://bigsoundbank.com/drum-roll-3-l-s2408.html) | CC0 1.0 |
| `pfc.choc` | `pfc-choc.ogg` | [Oculus VR, LLC — PunchHarder](https://github.com/facebookincubator/Meta-open-sound/blob/251c0be57d5d1b3242b91f53e0cde62ab1cb42d9/corpora/oculus-audio-pack/ogg/FGHTImpt_PunchHarder_OS_01.ogg) | CC BY 4.0 |
| `pfc.egalite` | `pfc-egalite.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIAlert_MagicalError_OS_01.ogg) | CC BY 4.0 |
| `simon.note` | `simon-note.ogg` | [Meta](https://github.com/facebookincubator/Meta-open-sound/tree/main/systems/instruments/meta-piano) | CC0 1.0 |
| `simon.rate` | `simon-rate.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/UIAlert_MagicalError_OS_01.ogg) | CC BY 4.0 |
| `carte.pose` | `carte.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/PAPRImpt_PaperBallDrop_OS_01.ogg) | CC BY 4.0 |
| `jeton.pose` | `jeton.ogg` | [Oculus VR, LLC](https://github.com/facebookincubator/Meta-open-sound/blob/main/corpora/oculus-audio-pack/ogg/CERMImpt_CeramicSmallImpact_OS_01.ogg) | CC BY 4.0 |
| `boum` | `boum.ogg` | [deleted_user_3277771](https://freesound.org/people/deleted_user_3277771/sounds/177242/) | CC0 1.0 |

Les originaux précis figurent dans [LICENCES.md](../src/web/theme/sons/LICENCES.md).

## Corrections et captures

Comparaison visuelle : [avant / après](../captures/corrections/index.html).

La galerie [animations](../captures/animations/index.html) propose les vrais écrans et les scènes d’égalité / rejeu PFC.
Les captures sont locales et ignorées par git, avec huit joueurs / pseudos de 16 caractères, téléphone 360×640.
Le lobby possède aussi une [capture à huit invités](../captures/corrections/apres/lobby-huit.png).
Chaque suffixe de skin existe dans `captures/corrections/avant/` et `apres/` ; `base` désigne le thème de base.

| Tâche | Cause et correction | Avant | Après |
|---|---|---|---|
| Validation Comme les autres | Les sélecteurs de camps `bg-good text-bg` attrapaient la pastille de validation. Exclusion de `selected-badge` et `choice-check` dans les quatre skins ; remplissage redevenu uniforme. Le libellé de cet écran est « Envoyé ». | [Overwatch](../captures/corrections/avant/validation-overwatch-telephones.png) | [Overwatch](../captures/corrections/apres/validation-overwatch-telephones.png) |
| Thème bleu | Le halo utilisait `hot`, encore rose ; `hot` devient bleu électrique, `ink` blanc bleuté. L’or reste l’accent. Les jetons des six skins et les couleurs de profil restent indépendants. | [Lobby](../captures/corrections/avant/lobby.png), [intro](../captures/corrections/avant/annonce.png), [résultats](../captures/corrections/avant/resultats.png), [final](../captures/corrections/avant/final.png) | [Lobby](../captures/corrections/apres/lobby.png), [intro](../captures/corrections/apres/annonce.png), [résultats](../captures/corrections/apres/resultats.png), [final](../captures/corrections/apres/final.png) |
| Simon | L’encre du texte dépassait la boîte rognée par `truncate` / le dégradé. `glyph-safe` réserve les jambages sans déplacer la mise en page. | [Base](../captures/corrections/avant/simon-base.png) | [Base](../captures/corrections/apres/simon-base.png) |
| Couronnes | Couronne proportionnelle et ancrée au `PlayerAvatar` dans les points et le podium, inclinée et au-dessus du portrait. Un peu plus d’espace entre le +N et le portrait. | [Bande](../captures/corrections/avant/couronne-overwatch.png), [podium](../captures/corrections/avant/final.png) | [Bande](../captures/corrections/apres/couronne-overwatch.png), [podium](../captures/corrections/apres/final.png) |
| PFC | Le rejeu existe et reste géré par le serveur. La galerie ne le montrait pas ; deux scènes sont ajoutées. La TV annonce « Égalité ! On rejoue » comme les téléphones. Le badge de rejeu se fonde sur les duels actifs à égalité, y compris en plusieurs manches gagnantes. | Démonstration précédente sans égalité | [Égalité TV](../captures/corrections/apres/pfc-egalite-tv.png), [rejeu TV](../captures/corrections/apres/pfc-rejeu-tv.png), [téléphone](../captures/corrections/apres/pfc-rejeu-telephone.png) |
| Dessin raté, italique Overwatch | Réservation de l’encre en fin de ligne dans le CSS du skin pour ellipses, clamp et dégradés ; marge interne du libellé du dessin. | [Overwatch](../captures/corrections/avant/dessin-overwatch.png) | [Overwatch](../captures/corrections/apres/dessin-overwatch.png) |
| Dessin gagnant | La couronne était ancrée à toute la colonne, loin du carré réel. La décoration suit désormais le cadre du papier, hors de son masque, avec halo fixe et arrivée transform / opacity à 500 ms comme son et confettis. Durée couverte par `SETTLE_MS`. | [Base](../captures/corrections/avant/dessin-base.png) | [Base](../captures/corrections/apres/dessin-base.png) |

Fichiers visuels : `theme.css`, les quatre CSS de skins concernés, `PlayerAvatar.tsx`, `ResultsScreen.tsx`,
`FinalScreen.tsx`, vues Simon et Dessin raté, `drawing.tsx`. PFC : vues, galerie, README et tests unitaires / E2E.

## Vérification

- `bun run build:web` : validé, **31 fichiers Ogg embarqués**. La version Windows n’a pas été reconstruite dans ce lot.
- `bun run typecheck` : validé.
- `bun run test` : **539 tests, 0 échec**.
- Les neuf specs Chromium demandés : première exécution **26 réussis, 1 interrompu avant le test par EADDRINUSE**
  (port déjà occupé au démarrage du serveur de fixture). Rejeu du spec `sons.spec.ts` sur la version finale :
  **5 réussis**, dont le contrôle WebAudio réel (31 décodages, boucle unique, fondu).
- Spec exploratoire avec fixture `party` : captures avant / après à huit joueurs sous les six skins ;
  compléments de podium / dessin et tournoi PFC réel jusqu’aux résultats validés. Les captures ont été regardées.
  Le spec jetable a été supprimé. Une attente trop courte après la finale et une navigation par ancre sans
  rechargement ont été corrigées dans ce spec exploratoire ; la logique du jeu n’était pas en cause.
- `bun run apercu:sons` et `bun run apercu:animations` : régénérés. Ouverture `file://`, décodage réel des
  **31 fichiers**, **zéro erreur console et zéro requête réseau** vérifiés sous Chromium.
- Suite complète Chromium / Firefox / WebKit : **119 réussis, 42 ignorés, 0 échec** (30,6 min). La commande utilise deux workers
  et exclut uniquement les titres du spec exploratoire (supprimé depuis), sans exclure de scénario permanent.
  Les 42 ignorés sont les captures conditionnelles `skins-captures`, non activées dans la suite standard.

## Arbitrage PFC

Règle conservée : trois rejeux autorisés, puis tirage au sort à l’égalité suivante ; si personne ne choisit, le lancer
est tiré au sort immédiatement. Seuls les duels encore indécis rejouent. L’organisateur a confirmé le 12 novembre 2026 de conserver ces règles. Aucun changement de règle n’a été fait
dans cette correction de présentation.
