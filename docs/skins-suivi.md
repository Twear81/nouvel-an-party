# Skins : bilan du chantier

Chantier validé par l'utilisateur le **10 novembre 2026**, après les retouches des croix Overwatch / LoL et du chrono
Overwatch. Le contrat technique et les commandes de captures sont dans [skins.md](skins.md) ; l'historique Git
conserve le suivi détaillé des corrections.

## Références conservées
- **Maquette validée** : copie locale [maquettes/skins.html](maquettes/skins.html), référence pour les couleurs,
  polices, formes et détails ; flèches ← → pour changer de skin dans le navigateur.
  Original : https://claude.ai/code/artifact/63f8e7a3-35e1-4279-886f-feffba7ec5bc.
- **Captures des jeux fournies par l'utilisateur** : [maquettes/references/](maquettes/references/), un dossier par
  skin. Usage privé pour l'inspiration ; aucun logo ni élément officiel dans l'application.

## Résultat retenu
- Six skins : Dofus, Overwatch, League of Legends, Rocket League, Mario Odyssey et A Plague Tale.
  Tous sont utilisés, dans un ordre aléatoire, sans option de configuration ; le changement intervient uniquement
  à l'annonce d'une manche, avec un rideau neutre. Le serveur synchronise TV, téléphones et sauvegarde.
- Cadres de jeu, choix, résultats, classements, chronos et animations propres aux skins ; thème de base bleu Karmine
  Corp. Le mode sérieux de Culture gênante garde sa rupture sombre, avec des textes et accents éclaircis.
- Avatars : portraits prédéfinis et aperçus du profil réutilisent le même composant ; six cadres SVG qui suivent la silhouette
  du skin. Les identifiants de profil restent inchangés. Voir le contrat dans [skins.md](skins.md#avatars-et-cadres--contrat-commun).
- Croix de retrait unies : rouge vif Overwatch, rouge sombre LoL ; chrono Overwatch centré dans le bandeau et chiffres
  recentrés dans l'hexagone. Les bandes des cartes de camp restent distinctes des boutons d'action.
- Polices et emojis embarqués, sans dépendance à une police système ni à internet pendant la soirée.
- Les couleurs de contenu restent propres au contenu : Simon, étages de tier list, feutres et papier du dessin.

Le **10 novembre 2026**, GunZ et les portraits photo ont été retirés, avec leurs composants, API et dépendances
spécifiques. La maquette active suit les six skins restants. Les anciennes captures restent des preuves historiques.

## Validation locale du chantier initial (avant ce retrait)
- Les captures de revue couvrent les sept skins, le lobby à huit joueurs, le profil, les manches, les résultats,
  la pause et le classement final. Captures WebKit ciblées pour Overwatch et Mario ; 21 combinaisons skin/moteur
  pour les six cadres, photos, rechargement, petits écrans et réduction des animations.
- Retouches du 9 novembre : TypeScript et 498 unitaires verts ; deux E2E ciblés verts et quatre parcours de capture
  verts pour les croix, le chrono et les camps Overwatch / LoL.
- Contrôle avant fusion du **10 novembre** : TypeScript et **498 unitaires** verts ; E2E complets avec deux workers :
  **116 réussis, 44 ignorés, un échec**, en 17 min. L'échec venait du test qui lisait tout le tableau du chrono
  Rocket League comme un nombre. Sa lecture cible maintenant `countdown-num` et accepte les secondes ou `m:ss`.
  Les contrôles de pause et de « +10 s » forcent ce skin et passent tous les deux après correction (19,1 s).
  Bilan : **117 scénarios distincts validés**. Les ignorés sont l'outil de captures sans skin demandé et la caméra
  factice indisponible sous WebKit ; le parcours galerie photo est testé sur les trois moteurs.
- Ces preuves sont locales. Elles ne constituent pas un essai sur les vrais téléphones et la TV de la soirée.

## Validation locale du retrait et de la révélation finale (10 novembre 2026)

- TypeScript et **502 tests unitaires** verts, dont la migration des anciens portraits et ordres de skins sauvegardés.
- Suite E2E complète à deux workers : **109 réussis, 42 ignorés, aucun échec**, en 18,6 min. Les ignorés sont
  les scénarios de l'outil de captures sans skin demandé (14 par moteur).
- Profil, six cadres et conservation après rechargement validés dans les six skins sur Chromium, Firefox et WebKit.
- Final sans rang sur téléphone avant la fin de la révélation TV, y compris après rechargement avec une horloge
  avancée d'une heure. Un invité qui crée son profil pendant le final reste spectateur et ne modifie pas le podium.
- Captures relues : téléphone en attente, final TV, cadres et profil Dofus 360×640, dans `test-results/`.
- La future pièce commune, la rotation après Culture gênante, les souvenirs et le son restent le chantier décrit
  dans [mise-en-scene.md](mise-en-scene.md) ; cette validation porte sur le premier lot.

## Preuves et entretien
- Galerie locale : `captures/revue-finition/index.html`, avec les maquettes et les captures par navigateur.
  Avant/après des dernières retouches : `captures/retouche-croix-chrono/index.html`.
- Journaux du contrôle avant fusion : `captures/validation-merge-2026-11-10/`. Les preuves antérieures restent dans
  `captures/validation-finale/` et `captures/retouche-croix-chrono/validation/`.
- `captures/` est ignoré par Git. Les anciens dossiers de captures peuvent être périmés : régénérer les écrans
  concernés avec l'outil décrit dans [skins.md](skins.md), un skin à la fois, avec un worker sur machine chargée.
- Pour une évolution visuelle, modifier le fichier CSS du skin ; si une nouvelle partie doit être habillable,
  l'ajouter au contrat commun `data-ui`, sans introduire de connaissance des skins dans les mini-jeux.

## Avant la soirée
Tester le thème de base, le rideau de transition, les profils et la connexion sur les vrais appareils et le wifi prévu,
sans accès à internet. Les tests locaux et la validation visuelle ne remplacent pas cet essai en conditions réelles.
