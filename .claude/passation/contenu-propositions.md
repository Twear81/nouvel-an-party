# Propositions de contenu (par mini-jeu)

Légende : ✅ garder · ✏️ réécrire · ❌ retirer · 🎯 clin d'œil à un invité.
Les nouveautés sont au format yaml exact de chaque jeu, prêtes à coller. Limite de rédaction : clins d'œil dosés (en général moins de la moitié des entrées d'un jeu), jamais d'invité nommé.
Ordre de grandeur des durées : sauf mention, on garde la durée par défaut du jeu.

Points de vigilance généraux :
- Les entrées « ❌ » sont retirées pour cause de « généralité » (aucun enjeu, aucune situation) ; l'organisateur peut les garder en bouche-trou, ce ne sont pas des erreurs.
- Éviter que le même clin d'œil revienne trop : « chou-fleur » apparaît en Dessin raté, Imposteur et Le bon prix (si ajouté). Je l'ai limité à Dessin raté et Imposteur.

---

## 1. Ceci ou Cela

Schéma : chaîne simple (Oui/Non) ou objet `{ texte, choix: [a, b], duree, theme }`. `{joueur}` = mode « devine l'invité ». Choix 14 caractères max.

### Existant
| Entrée | Verdict |
|---|---|
| Plutôt… Mer / Montagne | ❌ aucun enjeu |
| Pour trinquer : Champagne / Mojito | ❌ aucun enjeu |
| Le réveillon idéal : À la maison / En boîte | ✏️ voir ci-dessous |
| Plutôt… Lève-tôt / Couche-tard | ❌ aucun enjeu |
| Les voeux de minuit : Sincères / Pour rire | ❌ trop mou |
| Dessert : Bûche / Galette | ❌ aucun enjeu |
| Plutôt… Chat / Chien | ✅ la tablée va s'engueuler |
| En soirée : Danser / Discuter | ❌ aucun enjeu |
| Plutôt… Sucré / Salé | ❌ aucun enjeu |
| Soirée pyjama : Film / Jeux de société | ❌ aucun enjeu |
| Pour 2027 : Planifier / Improviser | ❌ réponse évidente |
| L'ananas sur la pizza ? | ✅ classique qui divise |
| Tu as déjà embrassé quelqu'un à minuit ? | ❌ peu de suspense, faux enjeu |
| Tu tiendras ta résolution jusqu'à février ? | ✅ auto-dérision |
| Tu serais capable de chanter au karaoké ce soir ? | ✅ chantage social sain |
| {joueur} : meilleur moment (Repas / Minuit) | ❌ réponse arbitraire |
| {joueur} préfère Mer / Montagne | ❌ aucun enjeu |
| {joueur} est plutôt Lève-tôt / Couche-tard | ❌ aucun enjeu |
| {joueur} boirait plutôt Champagne / Bière | ❌ aucun enjeu |
| {joueur} meilleure part Bûche / Galette | ❌ aucun enjeu |
| {joueur} aime l'ananas sur la pizza ? | ❌ doublon, sans surprise |
| {joueur} a déjà pleuré devant un film de Noël ? | ✏️ voir ci-dessous |
| {joueur} fait des résolutions chaque année ? | ❌ aucun enjeu |
| {joueur} chante sous la douche ? | ✅ image drôle, guess ouvert |
| {joueur} a déjà raté un train ou un avion ? | ✅ anecdote qui fait parler |

Réécritures :
```yaml
  - texte: "À 2 h du matin, tu es plutôt :"
    choix: [Au lit, Dernier debout]
    theme: soiree
  - texte: "Est-ce que {joueur} a déjà pleuré devant un anime, un dessin animé ou un k-drama ?"   # 🎯 K-dramas, Japon
    theme: emotions
```

### Nouveautés
```yaml
  # Dilemme d'amis, chacun a une position tranchée
  - texte: "Au resto entre amis, l'addition :"
    choix: [On divise, Chacun son dû]
    theme: argent

  # 🎯 chien adoré
  - texte: "Le chien monte sur le canapé :"
    choix: [Autorisé, Interdit]
    theme: animaux

  # 🎯 chou-fleur (coupe frisée) : l'enjeu est la loyauté entre amis
  - texte: "Un ami arrive avec une coupe de cheveux ratée :"
    choix: [Je lui dis, Je me tais]
    theme: amitie

  - texte: "Quelqu'un te spoile la fin de ta série :"
    choix: [Pardonnable, Impardonnable]
    theme: amitie

  - texte: "Un vocal de 4 minutes d'un pote :"
    choix: [J'écoute tout, J'accélère x2]
    theme: telephone

  # 🎯 tiramisu : le mode {joueur} rend ça très drôle (on devine qui est poli)
  - texte: "Dernière part de tiramisu, personne n'ose. {joueur}…"
    choix: [La prend, La laisse]
    theme: bouffe

  # 🎯 jeux gacha / skins
  - "Est-ce que {joueur} a déjà claqué plus de 100 € dans un jeu à gacha ou à skins ?"

  # 🎯 Japon, auto-dérision
  - texte: "Tu partirais vivre un an au Japon sans parler un mot de japonais ?"
    choix: [Demain, Jamais]
    theme: voyage

  # 🎯 Rocket League / Overwatch / Valorant
  - texte: "Quand tu perds en ligne, c'est d'abord la faute :"
    choix: [De l'équipe, Du ping]
    theme: jeu-video
```
Auto-critique : « l'addition » et « tiramisu {joueur} » sont les plus sûrs ; « vocal » est le plus faible (à retirer si besoin).

---

## 2. Comme les autres

Schéma : chaîne simple ou objet `{ texte, duree, theme }`. Une bonne consigne a quelques réponses évidentes, et les gens se trahissent en convergeant.

### Existant
| Entrée | Verdict |
|---|---|
| Un truc dans un frigo | ❌ neutre |
| Une résolution classique du 1er janvier | ✅ tout le monde converge, rire garanti |
| Une chanson qu'on entend dans toutes les soirées | ✅ débats sur la playlist |
| Un prénom de chien | ✅ chien adoré |
| Un pays où partir en vacances | ✏️ « Un pays où tu n'irais jamais en vacances. » (conflit, plus de choix) |
| Un plat de réveillon | ✅ foie gras vs saumon, enjeu |
| Une boisson qu'on boit à minuit | ❌ réponse évidente (champagne) |
| Un truc dans une trousse | ❌ neutre |
| Un fruit | ❌ aucun enjeu |
| Une couleur | ❌ aucun enjeu |
| Un animal de la ferme | ❌ aucun enjeu |
| Un super-héros | ❌ aucun enjeu |
| Un film de Noël | ✅ unanimité à prévoir (Maman j'ai raté l'avion), fun |
| Un métier que tout enfant rêve de faire | ✅ nostalgie |
| Une ville française | ❌ aucun enjeu |
| Un légume qu'on n'aime pas | ✅ chou-fleur ou brocoli, clin d'œil involontaire |
| Un truc qu'on oublie souvent chez soi | ✅ clés/téléphone collisions |
| Un personnage de dessin animé | ❌ aucun enjeu |
| Un cocktail | ❌ aucun enjeu |
| Un accessoire de fête | ❌ aucun enjeu |
| Un truc qu'on dit à minuit | ✅ « Bonne année » vs autres |
| Une marque de voiture | ❌ aucun enjeu |
| Un instrument de musique | ❌ aucun enjeu |
| Un cadeau qu'on aime recevoir | ❌ aucun enjeu |
| Un sport d'hiver | ❌ aucun enjeu |

(Bilan : 9 ✅, 1 ✏️, 15 ❌.)

### Nouveautés
```yaml
  - texte: "Un mot qu'on crie quand on se fait mal."
    theme: reflexes

  - texte: "La pire excuse pour arriver en retard."
    theme: excuses

  - texte: "Un truc qu'on fait semblant d'aimer en soirée."
    theme: soiree

  # 🎯 jeux, skins, gacha
  - texte: "Ce qu'on finit toujours par acheter dans un jeu gratuit."
    theme: jeu-video

  # 🎯 rage en ligne (Rocket League, Overwatch…)
  - texte: "Ce que tu cries à ton écran quand tu perds une partie."
    theme: jeu-video

  - texte: "Ce qu'on mange à 4 h du matin en rentrant."
    theme: bouffe

  # 🎯 tiramisu
  - texte: "Un dessert qu'on ne refuse jamais."
    theme: bouffe

  - texte: "Le pire cadeau de Noël."
    theme: noel

  - texte: "Un animal sauvage qu'on rêverait d'adopter."
    theme: animaux
```
Auto-critique : « Ce que tu cries à ton écran » et « le pire cadeau » sont les plus drôles à voir converger/diverger. « Un animal sauvage » est le plus faible (garder seulement si besoin de quantité).

---

## 3. Culture gênante

Schéma : `{ texte, reponses: [BONNE EN PREMIER, ...] (2 à 4, 40 car. max chacune), commentaire, theme, duree }` ou `{ texte, estimation: nombre entier, unite, commentaire, theme }`.
Principe : question que tout le monde croit connaître et qui pique, ou mauvaise réponse qui tire un rire.

### Existant
| Entrée | Verdict |
|---|---|
| Capitale de l'Australie | ✅ piège classique |
| Capitale du Brésil | ❌ 5 capitales redondantes |
| Capitale de la Suisse | ❌ idem |
| Capitale du Canada | ❌ idem |
| Capitale de la Turquie | ❌ idem |
| Capitale de la Nouvelle-Zélande | ❌ idem |
| Plus grand pays d'Afrique | ✅ (Algérie) surprend |
| Plus petit pays du monde | ❌ aucun piège |
| Pays le plus peuplé | ✅ Inde, tout le monde se plante |
| Plus long fleuve de France | ❌ question d'école |
| Plus grand désert chaud | ❌ question d'école |
| Plus grande planète | ❌ trop facile |
| Symbole chimique de l'or | ❌ trop scolaire |
| Qui a peint la Joconde | ❌ trop facile |
| Les Misérables | ❌ trop facile |
| Gaz de la photosynthèse | ❌ scolaire |
| Animal terrestre le plus rapide | ❌ trop facile |
| Lumière du Soleil | ❌ scolaire |
| Monnaie du Japon | ❌ trop facile |
| Quel animal dort le plus (Toi le 1er janvier) | ✅ super réponse piège |
| Lune 1969 | ❌ trop facile |
| Révolution 1789 | ❌ trop facile |
| Os du corps | ❌ scolaire |
| Dents d'un adulte | ❌ scolaire |
| Pays de l'UE | ❌ trop facile |
| Altitude de l'Everest | ❌ trop pointu sans enjeu |
| Planètes du système solaire (Pluton) | ✅ drôle, commentaire sympa |
| Animal qui tue le plus d'humains (Tonton) | ✅ meilleur de la liste |
| Première cause de mortalité (Gluten) | ✅ réponses absurdes |
| Survie sans boire | ❌ scolaire |
| Durée de vie d'un hamster | ✅ « c'est court » touche |
| Espérance de vie en France | ✏️ commentaire à remplacer (voir ci-dessous) |
| Humains sur Terre, en milliards | ✅ commentaire drôle |
| Qui a inventé le feu d'artifice (beau-frère) | ✅ réponse piège réussie |

Réécriture :
```yaml
  - texte: "Quelle est l'espérance de vie à la naissance en France, en années ?"
    estimation: 83
    unite: "ans"
    commentaire: "Environ 83 ans. Ce qui laisse à certains d'entre vous le temps de rappeler leurs amis."
    theme: sante
```
(Bilan : 10 ✅, 1 ✏️, 23 ❌.)

### Nouveautés
```yaml
  - texte: "Combien de fois par jour un adulte pète-t-il en moyenne ?"
    estimation: 14
    unite: "fois"
    commentaire: "Entre 10 et 20. Vous en avez forcément retenu un ce soir."
    theme: corps

  - texte: "Quel pourcentage du corps adulte est de l'eau ?"
    estimation: 60
    unite: "%"
    commentaire: "Environ 60 %. Ce soir, plutôt 40 % d'eau et 20 % de champagne."
    theme: corps

  - texte: "Quel animal fait des crottes en forme de cube ?"
    reponses: ["Le wombat", "Le koala", "Le capybara", "Ton cousin à 3 h du matin"]
    commentaire: "Le wombat : ça évite que ses crottes roulent, il les utilise pour marquer son territoire."
    theme: animaux

  # 🎯 corbeau
  - texte: "Quel oiseau reconnaît un visage humain et transmet sa rancune à ses petits ?"
    reponses: ["Le corbeau", "Le pigeon", "Le perroquet", "Ta belle-mère"]
    commentaire: "Les corvidés reconnaissent les visages, et leurs petits héritent des rancunes. Soyez gentils avec eux."
    theme: animaux

  # 🎯 chien adoré. Sert vraiment (toxique)
  - texte: "Que ne faut-il surtout pas donner à un chien ?"
    reponses: ["Du chocolat", "Des carottes cuites", "Du riz nature"]
    commentaire: "Théobromine. Ta part de bûche au chocolat aussi : à mettre hors de portée."
    theme: animaux

  # 🎯 jeu vidéo (Mario, Zelda…)
  - texte: "Dans « The Legend of Zelda », qui est le héros ?"
    reponses: ["Link", "Zelda", "Epona", "Navi, qui te dit « Hey ! Listen ! »"]
    commentaire: "Zelda, c'est la princesse. Link, c'est celui qui fait tout le boulot."
    theme: jeu-video

  # 🎯 Dragon Ball
  - texte: "En quelle année a démarré le manga Dragon Ball ?"
    estimation: 1984
    commentaire: "Goku a plus de 40 ans de carrière et n'a toujours pas de fiche de paie."
    theme: manga
```
Faits vérifiés : wombat (crottes cubiques, étude 2018), corvidés (Marzluff, Université de Washington), théobromine du chocolat toxique pour le chien, Dragon Ball démarre dans le Weekly Shōnen Jump en décembre 1984, eau 60 % (adulte), flatulences 10 à 20 par jour.
Auto-critique : « Tonton »-style (cousin à 3 h, belle-mère) fonctionne ; Zelda et Dragon Ball sont plus sûrs pour les gamers que pour tous : à tester en soirée.

---

## 4. Dessin raté

Schéma : trois listes de chaînes (`facile`, `moyen`, `difficile`). Rappel : 8 mots minimum par liste pour être jouée ; 16 mots minimum pour avoir 2 manches du même niveau, 24 pour 3. Dessinable au doigt en 20 s.

### Existant
**Facile** (30) : retirer 9, garder 21.
- ❌ trop facile, dessins identiques : Une voiture, Une maison, La lune, Un soleil, Une étoile, Un ballon, Une chaise, Un avion, Une horloge (doublon avec « Une montre »).
- ✅ le reste (Une banane, Un sapin de Noël, Une bouteille de champagne, Une montre, Un chapeau de fête, Une guirlande, Un gâteau d'anniversaire, Une pizza, Un téléphone, Un parapluie, Des lunettes, Une clé, Une fourchette, Un cadeau, Une bougie, Un morceau de fromage, Un poisson, Un vélo, Une tasse de café, Une glace, Un bonnet).

**Moyen** (30) : retirer 3, garder 27.
- ❌ Deux personnes qui trinquent (pas absurde), Un hamster dans sa roue (trop simple), Un escargot en retard (le « retard » est abstrait).
- ✅ le reste, notamment : Un pirate qui cherche ses clés, Un zèbre qui se maquille, Un crocodile chez le dentiste, Un fantôme qui prend l'apéro.

**Difficile** (30) : garder 18, retirer 12.
- ❌ trop abstrait pour 20 s : Les bonnes résolutions, Un lendemain de soirée (doublon avec « La gueule de bois »), Une promesse en l'air, La belle-famille qui s'incruste, Un vœu qui ne se réalisera jamais, Un cadeau revendu, Un ami qui raconte sa vie, L'ambiance qui retombe, Le regret du dernier verre, Un secret mal gardé, L'année qui passe trop vite, Arrêter de fumer demain.
- ✅ La gueule de bois, Le réveil du 1er janvier, Le compte à rebours, Le dernier métro, Le dimanche soir, Le régime de janvier, La flemme, Le karaoké qui tourne mal, La bise de minuit, Le plat qui a brûlé, Le voisin qui râle à cause du bruit, Le slow de fin de soirée, Un fou rire incontrôlable, Chercher ses clés en pleine nuit, Un mauvais danseur, Un copain endormi sur le canapé, La peur de la balance en janvier, Les 12 coups de minuit.

Après retraits : facile 21, moyen 27, difficile 18. Le total reste jouable (au moins 16 par liste → 2 manches par niveau).

### Nouveautés (13 mots)
```yaml
mots:
  facile:
    - "Un chou-fleur"                    # 🎯
    - "Un hérisson"
    - "Un flamant rose"
    - "Une manette de jeu"
  moyen:
    - "Un chat qui pousse un verre du bord de la table"
    - "Un poulpe qui joue au ping-pong"   # 🎯
    - "Un ostéopathe qui craque le dos d'un serpent"   # 🎯
    - "Un cactus qui fait un câlin"
  difficile:
    - "Le wifi qui coupe"
    - "Le chien qui te regarde manger"     # 🎯
    - "Une dispute pour la dernière part de gâteau"
    - "La fin du mois"
    - "Le rage quit"                       # 🎯 (une manette qui vole par la fenêtre)
```
Auto-critique : « poulpe + ping-pong » et « ostéopathe + serpent » sont les plus visuels (dessins complètement ratés). « Le wifi qui coupe » reste dessinable (symbole barré) : à tester.

---

## 5. Imposteur

Schéma : liste de paires `["Mot A", "Mot B"]`. Une bonne paire : les mêmes indices « marchent » pour les deux mots, mais au moins un indice ne colle qu'à l'un.

### Existant
✅ à garder (27) : Champagne/Crémant, Raclette/Fondue, Tinder/Speed dating, Père Noël/Saint Nicolas, Feu d'artifice/Pétard, Bûche de Noël/Galette des rois, Huîtres/Moules, Foie gras/Rillettes, Karaoké/Blind test, Boîte de nuit/Bar, Chaussettes de Noël/Pantoufles, Guirlande/Boule disco, Pizza/Tarte flambée, Chips/Cacahuètes, Whisky/Cognac, Bière/Cidre, Mojito/Caïpirinha, Tequila/Vodka, Uber/Taxi, Netflix/Cinéma, Selfie/Photo de groupe, Pyjama/Jogging, Réveillon/Anniversaire, Playlist/Radio, Gaufre/Crêpe, Chocolat chaud/Vin chaud, Cadeau/Pochette surprise.

❌ à retirer (10) :
- Gueule de bois / Fatigue (trop abstrait)
- Résolution / Bonne habitude (trop proche)
- Vœux / Cartes postales (trop différent, pas de piège)
- Canapé / Fauteuil (aucun indice qui distingue)
- Bisou / Câlin (trop proche)
- Cotillons / Confettis (trop proche)
- Dernière danse / Slow (trop proche)
- Régime / Détox (trop proche)
- Minuit / Midi (trop différent)
- Application de rencontre / Agence matrimoniale (trop proche de Tinder/Speed dating)

### Nouveautés
```yaml
paires:
  - ["Tiramisu", "Panna cotta"]               # 🎯
  - ["Mario Kart", "Mario Party"]             # 🎯 (amitiés qui se brisent)
  - ["Chien", "Loup"]                          # 🎯
  - ["Ostéopathe", "Kinésithérapeute"]        # 🎯 (à vérifier : ça peut vexer l'ostéo, ou le faire rire)
  - ["Japon", "Corée du Sud"]                 # 🎯
  - ["Chou-fleur", "Brocoli"]                 # 🎯
  - ["Ghosting", "Poser un lapin"]
  - ["Message vocal de 4 minutes", "Pavé de texto"]
```
Auto-critique : « Mario Kart / Mario Party » et « Ghosting / Poser un lapin » donnent des indices drôles (carapace bleue, « tu m'as laissé en vu »). « Chou-fleur / Brocoli » : à ne garder que si le chou-fleur n'est pas déjà trop repris ailleurs.

---

## 6. Le bon prix

Schéma : `{ nom, prix (euros, point décimal), emoji, details, theme, duree, image }`. Maximum conseillé 25 objets.

### Existant
| Entrée | Verdict |
|---|---|
| Baguette tradition 1,40 | ✅ nostalgie, ça se discute |
| Expresso au comptoir 2,00 | ❌ trop variable (1,50 à 2,80) |
| 6 œufs bio 3,30 | ❌ aucun enjeu |
| Nutella 750 g 4,90 | ✏️ prix constaté plutôt entre 5,20 et 6,50 en 2025 : repasser à 5,60 avec « Supermarché, prix moyen constaté » |
| Pizza surgelée 4,50 | ❌ aucun enjeu |
| Cinéma 12,50 | ✅ (« tarif plein, en ville » reste vague mais ça marche) |
| Ticket de métro parisien 2,50 | ✅ (2,50 € le ticket t+ depuis janvier 2025 ; à re-vérifier pour 2026) |
| Big Mac seul 6,20 | ✅ surprend toujours |
| Plein d'essence 85 | ✅ choc et débat (50 L à ≈ 1,70 €) |
| Champagne brut 38 | ✅ |
| Bûche de pâtissier 42 | ✅ surprend à la hausse |
| Monopoly 32 | ✅ |
| Sapin Nordmann 1,50 m 55 | ✅ |
| Tour Eiffel (sommet) 36,10 | ✏️ tarif à re-vérifier sur le site officiel (hausse 2025) |
| Disneyland Paris 94 | ✏️ prix variable selon la date : préciser « tarif affiché, week-end, 1 jour 1 parc » et re-vérifier |
| Converse 80 | ✅ |
| PS5 480 | ✏️ prix revu à la hausse en 2025 (≈ 550 € pour le modèle disque) : re-vérifier |
| iPhone 969 | ✏️ iPhone de base à 969 € = iPhone 17 en 256 Go (pas 128) : corriger le détail |
| MacBook Air 13 1199 | ✅ (M4, 16 Go/256 Go) |
| Montre de luxe d'entrée de gamme 6500 | ❌ trop vague (« luxe » ne se vérifie pas) |
| Aller-retour Paris–New York 620 | ✅ |
| Kilo de truffe noire 1100 | ✅ surprenant |
| Vélo électrique 1800 | ❌ trop variable |
| Twingo neuve 20 000 | ✅ (annonce Renault : sous 20 000 €) |

(Bilan : 14 ✅, 5 ✏️, 5 ❌.)

### Nouveautés
Sources : prix publics ou ordres de grandeur très cités. Les entrées marquées « ≈ » sont des moyennes à re-vérifier avant la soirée (le but du jeu est la surprise, pas le centime).
```yaml
objets:
  # 🎯 Mario Kart World, Zelda… : prix de lancement officiel Nintendo Europe (2025)
  - { nom: "Une Nintendo Switch 2", prix: 469.99, emoji: "🎮", details: "Console seule, prix de lancement 2025", theme: jeu-video }

  # 🎯 jeux gacha : pack à 6 480 cristaux, le plus gros de la boutique (≈ 40 tirages)
  - { nom: "Le plus gros pack de gemmes d'un jeu gacha", prix: 99.99, emoji: "💎", details: "6 480 cristaux dans Genshin Impact, environ 40 tirages", theme: jeu-video }

  # 🎯 Japon : ≈ 1 000 yens, 170 yens pour 1 € en 2025
  - { nom: "Un bol de ramen dans une chaîne au Japon", prix: 6, emoji: "🍜", details: "Environ 1 000 yens, à Tokyo", theme: voyage }

  # 🎯 ostéopathe : tarif libre, non remboursé, ≈ 60 € en moyenne en France
  - { nom: "Une séance chez l'ostéopathe", prix: 60, emoji: "🦴", details: "Tarif moyen en France, non remboursé", theme: sante }

  # Amende forfaitaire : contravention de 4e classe, 135 €
  - { nom: "L'amende pour téléphone tenu en main au volant", prix: 135, emoji: "📵", details: "Amende forfaitaire, 3 points en moins", theme: argent }

  # Insee : Smic net à temps plein 2026 ≈ 1 443 € (2025 : 1 426 €)
  - { nom: "Le Smic net mensuel", prix: 1443, emoji: "💶", details: "Temps plein, en 2026 (≈ 1 443 €, à re-vérifier)", theme: argent }

  # SISPEA 2024 : 4,34 €/m³ eau + assainissement en moyenne
  - { nom: "1 000 litres d'eau du robinet", prix: 4.3, emoji: "🚰", details: "Eau et assainissement, prix moyen en France", theme: argent }

  # Fourchette 1 700 à 2 000 € pour le permis B en auto-école
  - { nom: "Le permis de conduire en auto-école", prix: 1800, emoji: "🚦", details: "Tout compris, moyenne nationale (≈ 1 800 €)", theme: argent }
```
Auto-critique : « gemmes gacha », « ramen au Japon » et « permis de conduire » sont les plus susceptibles de faire hurler. « Eau du robinet » est surprenant par la minuscule valeur. Le Smic est sérieux mais lance un débat.

---

## 7. Qui est le plus…

Schéma : chaîne simple ou objet `{ texte, duree, theme }`. Qui = invités présents ; pas de `{joueur}` ici.

### Existant
| Entrée | Verdict |
|---|---|
| Qui est le plus gourmand ? | ✏️ « Qui finirait le plat entier en disant « j'en reprends juste un peu » ? » |
| Premier à s'endormir | ✅ |
| Dernier debout | ✅ |
| Pleurer aux voeux de minuit | ✅ |
| Oublier sa résolution avant le 3 janvier | ✅ |
| Monter sur la table pour danser | ✅ |
| Embrasser n'importe qui à minuit | ✅ |
| Ouvrir le champagne en arrosant tout le monde | ✅ |
| Arriver en retard à son propre mariage | ✅ |
| Pire sens de l'orientation | ❌ générique |
| Plus mauvais en cuisine | ❌ générique |
| « J'arrive dans 5 minutes » en étant encore chez soi | ✅ très bon |
| Plus drôle quand il a bu | ✅ |
| Danse le plus mal | ✅ |
| Chante au karaoké sans qu'on lui demande | ✅ |
| Ronfle le plus | ✅ |
| Passe le plus de temps sur son téléphone | ✅ |
| Premier à envoyer un message qu'il regrettera | ✅ |
| Garde mal un secret | ✅ |
| Premier à paniquer dans un film d'horreur | ✅ |
| Manger les restes à 4 h du matin | ✅ |
| Gagnerait au loto et disparaîtrait | ✅ très bon |
| Survivre sur une île déserte | ❌ vague |
| Meilleur ami de l'année | ❌ mièvre |
| Plus grande surprise de 2027 | ✅ |

(Bilan : 20 ✅, 1 ✏️, 4 ❌.)

### Nouveautés
```yaml
questions:
  - texte: "Qui vendrait le groupe en premier pour sauver sa peau, dans un film d'horreur ?"
    theme: trahison

  - texte: "Qui revendrait son cadeau de Noël le 26 décembre ?"
    theme: argent

  - texte: "Qui a le plus de captures d'écran « pour avis » dans son téléphone ?"
    theme: telephone

  # 🎯 gacha / skins
  - texte: "Qui a déjà dépensé le plus d'argent dans un jeu « gratuit » ?"
    theme: jeu-video

  # 🎯 rage en ligne
  - texte: "Qui rage en premier quand il perd, et le nie ?"
    theme: jeu-video

  # 🎯 K-dramas
  - texte: "Qui mourrait en premier dans un k-drama, d'une maladie mystérieuse au dernier épisode ?"
    theme: fiction

  # 🎯 chien adoré
  - texte: "Qui préfère secrètement son chien (ou son chat) à la moitié de la bande ?"
    theme: animaux

  - texte: "Qui lance « on se fait un truc un de ces quatre » sans jamais rien organiser ?"
    theme: amitie

  - texte: "Qui serait le plus insupportable avec 1 million d'euros ?"
    theme: argent
```
Auto-critique : les meilleures : « un de ces quatre », « jeu gratuit », « chien », « k-drama ». « Vendrait le groupe » et « captures d'écran » sont solides. « Rage en premier » peut paraître évident (choisir si besoin).

---

## 8. Tier list

Schéma : chaîne simple ou objet `{ texte, duree, theme }`. On classe les invités de S à C : une question « Qui… » qui fait débattre.

### Existant
| Entrée | Verdict |
|---|---|
| Meilleur cuisinier | ✅ |
| Meilleur danseur | ✅ |
| Meilleur conducteur | ✅ |
| Meilleur au karaoké | ✅ |
| Meilleur public pour une blague nulle | ✅ très bon |
| Meilleur pour garder un secret | ✅ |
| Meilleur pour remonter le moral | ❌ mièvre |
| Meilleur pour organiser un voyage | ❌ aucun enjeu |
| Meilleur pour retenir les anniversaires | ❌ aucun enjeu |
| Meilleur joueur de société | ❌ trop sage |
| Meilleur perdant | ✅ |
| Meilleur pour mettre l'ambiance | ❌ générique |
| Meilleur pour improviser un discours | ❌ générique |
| Meilleur pour réparer n'importe quoi | ❌ générique |
| Meilleur pour se réveiller tôt | ❌ aucun enjeu |
| Meilleur pour tenir l'alcool | ✅ |
| Meilleur menteur | ✅ |
| Meilleur pour s'habiller | ✅ débat garanti |
| Meilleur à Mario Kart | ✅ |
| Meilleur pour écouter | ❌ mièvre |
| Meilleur coloc | ✅ |
| Meilleur pour faire la fête jusqu'au bout | ✅ |
| Meilleur ami de toute la bande | ✏️ « Qui serait là à 3 h du matin si ça va mal ? » |

(Bilan : 13 ✅, 1 ✏️, 9 ❌.)

### Nouveautés
```yaml
questions:
  - texte: "À qui prêterais-tu 500 € sans reçu ?"
    theme: argent

  # 🎯 Rocket League / Overwatch
  - texte: "Qui est le meilleur coéquipier en ligne (ni rage, ni AFK) ?"
    theme: jeu-video

  - texte: "Qui survit le plus longtemps dans un film d'horreur ?"
    theme: fiction

  - texte: "Qui ferait le meilleur parent ?"
    theme: vie

  - texte: "Qui ferait le meilleur président de la République ?"
    theme: vie

  - texte: "Qui ferait le meilleur méchant de film Disney ?"
    theme: fiction

  # 🎯 chou-fleur (coupe frisée)
  - texte: "Qui a la meilleure coupe de cheveux ?"
    theme: apparence

  # 🎯 Japon
  - texte: "Qui se débrouillerait le mieux perdu à Tokyo, sans téléphone ?"
    theme: voyage

  # 🎯 ping-pong / tennis
  - texte: "Qui contesterait un point au ping-pong jusqu'à la nuit ?"
    theme: jeu
```
Auto-critique : « méchant Disney », « coupe de cheveux » et « président » sont les plus légers ; « prêter 500 € » est le plus intense (garder pour un groupe très soudé).

---

## 9. Split the Room

Schéma : chaîne qui finit par « mais… ». Les meilleures sont séduisantes avec un piège à inventer.

### Existant
| Entrée | Verdict |
|---|---|
| Tu gagnes 1 million d'euros, mais… | ✅ |
| Tu peux voler, mais… | ✅ |
| Tu ne vieillis plus jamais, mais… | ✅ |
| Un an de vacances payées, mais… | ❌ piège faible |
| Lire dans les pensées, mais… | ✅ |
| Tu rencontres l'amour de ta vie, mais… | ✅ |
| Célèbre dans le monde entier, mais… | ✅ |
| Remonter dans le temps, mais… | ✅ |
| Physique de tes rêves, mais… | ✅ |
| Plus jamais besoin de dormir, mais… | ✅ |
| Villa en bord de mer, mais… | ❌ piège faible |
| Toujours à l'heure et jamais malade, mais… | ❌ piège faible |
| Te téléporter, mais… | ❌ trop proche de « voler » |
| Invisible quand tu veux, mais… | ✅ |
| Augmentation de 50 %, mais… | ❌ trop concret |
| Toutes les langues, mais… | ❌ piège faible |
| Plus jamais payer un resto, mais… | ❌ piège faible |
| Jour de congé en plus, mais… | ❌ piège faible |
| Retrouver tes 20 ans, mais… | ❌ trop proche de « vieillir » |
| Effacer un souvenir, mais… | ❌ mièvre |
| Voyage de tes rêves avec un invité de ce soir, mais… | ✅ très bon |
| Gagner à tous les jeux de société, mais… | ✅ |
| Annuler un message envoyé, mais… | ✅ |
| Meilleur du monde dans ton domaine, mais… | ❌ trop vague |
| Des amis fidèles pour toujours, mais… | ❌ piège faible |

(Bilan : 13 ✅, 0 ✏️, 12 ❌.)

### Nouveautés
```yaml
situations:
  # 🎯 chien adoré
  - "Ton chien se met à parler, mais…"
  - "Tu es immunisé contre la gueule de bois à vie, mais…"
  - "On te donne 10 000 € pour laisser le groupe lire tes 50 dernières recherches Google, mais…"
  - "Tu peux cloner ton double pour aller au travail à ta place, mais…"
  - "Pendant une journée, un invité de ce soir t'obéit en tout, mais…"
  # 🎯 Japon
  - "Tu pars vivre à Tokyo, tout frais payé, mais…"
  # 🎯 gacha / jeux vidéo
  - "On te rembourse tout l'argent dépensé dans des jeux vidéo, mais…"
  - "Une musique épique de film démarre dès que tu entres dans une pièce, mais…"
```
Auto-critique : « recherches Google » et « musique épique » promettent les fins les plus drôles. « Un invité t'obéit » est risqué mais très vivant.

---

## Jeux sans contenu textuel

- **Simon** : variantes à renommer pour plus de punch :
  ```yaml
  variantes:
    - "Classique"
    - nom: "Turbo du réveillon"
      vitesse_ms: 420
      temps_par_note: 0.9
    - nom: "Mémoire d'éléphant"
      longueur_depart: 5
  ```
- **Pierre-feuille-ciseaux** : renommer pour le ton :
  ```yaml
  variantes:
    - nom: "Tournoi classique"
    - nom: "Tournoi des mauvais perdants (2 manches gagnantes)"
      manches_gagnantes: 2
  ```
- **Compte à rebours chaotique** : rien à faire (pas de contenu textuel).

---

## Résumé par jeu
- Ceci ou Cela : 6 ✅, 2 ✏️, 17 ❌ ; 9 nouveautés.
- Comme les autres : 9 ✅, 1 ✏️, 15 ❌ ; 9 nouveautés.
- Culture gênante : 10 ✅, 1 ✏️, 23 ❌ ; 7 nouveautés.
- Dessin raté : 66 ✅ (21 facile, 27 moyen, 18 difficile), 24 ❌ ; 13 mots nouveaux.
- Imposteur : 27 ✅, 10 ❌ ; 8 nouvelles paires.
- Le bon prix : 14 ✅, 5 ✏️, 5 ❌ ; 8 nouveautés.
- Qui est le plus… : 20 ✅, 1 ✏️, 4 ❌ ; 9 nouveautés.
- Tier list : 13 ✅, 1 ✏️, 9 ❌ ; 9 nouveautés.
- Split the Room : 13 ✅, 12 ❌ ; 8 nouveautés.
