# Décisions de contenu (validées par l'organisateur) — à appliquer aux yaml

Référence détaillée des propositions : /tmp/contenu-propositions.md (formats yaml prêts à coller).
Règle générale : pour les entrées AJOUTÉES, mettre `theme:` quand le schéma du jeu l'accepte (format objet). Ne pas convertir les entrées existantes gardées. Garder les commentaires d'en-tête et d'options des yaml intacts.

## ceci-ou-cela.yaml
- Retirer toutes les entrées marquées ❌ dans la référence (section 1 « Existant »).
- Garder les ✅ : Chat/Chien, ananas sur la pizza, résolution jusqu'à février, karaoké ce soir, {joueur} chante sous la douche, {joueur} a déjà raté un train ou un avion.
- Remplacer « Le réveillon idéal » et « {joueur} a déjà pleuré devant un film de Noël » par les 2 réécritures de la référence.
- Ajouter : « Le chien monte sur le canapé » (Autorisé/Interdit), « Un ami arrive avec une coupe de cheveux ratée » (Je lui dis/Je me tais), « Quelqu'un te spoile la fin de ta série » (Pardonnable/Impardonnable), « Dernière part de tiramisu, personne n'ose. {joueur}… » (La prend/La laisse), « Tu partirais vivre un an au Japon sans parler un mot de japonais ? » (Demain/Jamais).
- NE PAS ajouter : l'addition au resto, le vocal de 4 minutes, « {joueur} a déjà claqué plus de 100 € », « Quand tu perds en ligne ».

## comme-les-autres.yaml
- Garder les 9 ✅ de la référence + la réécriture « Un pays où tu n'irais jamais en vacances. »
- Garder AUSSI (contrairement à la référence) : « Une couleur », « Un fruit », « Un super-héros », « Un personnage de dessin animé ».
- Retirer les autres ❌.
- Ajouter : « Un mot qu'on crie quand on se fait mal. », « La pire excuse pour arriver en retard. », « Ce qu'on finit toujours par acheter dans un jeu gratuit. », « Ce qu'on mange à 4 h du matin en rentrant. », « Un dessert qu'on ne refuse jamais. », « Le pire cadeau de Noël. »
- NE PAS ajouter : « Ce que tu cries à ton écran », « Un truc qu'on fait semblant d'aimer », « Un animal sauvage ».

## culture-genante.yaml
- Garder les 10 ✅, appliquer la réécriture « espérance de vie », retirer les ❌.
- Ajouter : pets par jour (14), eau dans le corps (60 %), Dragon Ball 1984, corbeau (garder « Ta belle-mère » en 4e réponse), et :
  - wombat avec ces réponses : ["Le wombat", "Le koala", "Le capybara", "Le paresseux"] (pas de « cousin »)
  - remplacer la question chocolat/chien par :
    texte: "Lequel de ces aliments est toxique pour un chien ?"
    reponses: ["Le raisin", "La carotte", "Le concombre", "La pomme sans pépins"]
    commentaire: "Le raisin : même quelques grains peuvent lui abîmer les reins. Le chocolat, vous le saviez déjà."
    theme: animaux
- NE PAS ajouter : Zelda.

## dessin-rate.yaml
- facile : retirer les 9 ❌ de la référence ; ajouter « Un chou-fleur », « Un hérisson », « Un flamant rose », « Une manette de jeu », « Un tournesol », « Une raquette de ping-pong ».
- moyen : retirer les 3 ❌ ; ajouter « Un chat qui pousse un verre du bord de la table », « Un poulpe qui joue au ping-pong », « Un ostéopathe qui craque le dos d'un serpent », « Un cactus qui fait un câlin ».
- difficile : REMPLACER ENTIÈREMENT la liste (plus aucune action ni idée abstraite : des choses concrètes mais dures à dessiner) par exactement :
  Un ornithorynque, Un hippocampe, La tour Eiffel, Un sous-marin, Un dromadaire, Une montgolfière, Un caméléon, Un château fort, Un phare, Un kangourou, Un hélicoptère, Un paon, Un appareil à raclette, Un corbeau, La statue de la Liberté, Un yéti
- Mettre à jour la règle des niveaux dans src/minigames/dessin-rate/README.md (ligne « Test rapide… ») : facile = un objet simple ; moyen = un objet ou animal qui fait une chose simple ; difficile = une chose concrète mais compliquée à dessiner (jamais d'action ni d'idée abstraite : 20 secondes, c'est court). Adapter aussi l'exemple de yaml du README si il montre des difficiles abstraits.

## imposteur.yaml
- Retirer les 10 ❌ de la référence. Ajouter seulement : ["Tiramisu", "Panna cotta"], ["Mario Kart", "Mario Party"], ["Chou-fleur", "Brocoli"].

## le-bon-prix.yaml
- Retirer : Expresso, 6 œufs bio, Pizza surgelée, Montre de luxe, Vélo électrique, et Nutella.
- Corriger :
  - PS5 : prix 649.99, details "Modèle standard avec lecteur, prix conseillé 2026"
  - iPhone : nom "Un iPhone 17", prix 969, details "256 Go, prix Apple"
  - Tour Eiffel sommet : prix 36.70, details "Billet adulte, ascenseur jusqu'au sommet, tarif 2026"
  - Disneyland : nom "Un billet Disneyland Paris pour le 31 décembre 2026", prix 150, details "1 jour, 1 parc, adulte : le jour le plus cher de l'année"
- Ajouter (format de la référence, avec theme) :
  - Nintendo Switch 2 : prix 499.99, details "Console seule, prix conseillé depuis septembre 2026"
  - Le plus gros pack de gemmes d'un jeu gacha : 99.99 (details de la référence)
  - Un bol de ramen dans une chaîne au Japon : 6
  - Une séance chez l'ostéopathe : 60
  - 1 000 litres d'eau du robinet : 4.3
- NE PAS ajouter : amende téléphone, Smic, permis de conduire.

## qui-est-le-plus.yaml
- Garder les ✅, appliquer la réécriture « gourmand », retirer les 4 ❌.
- Ajouter : « Qui lance « on se fait un truc un de ces quatre » sans jamais rien organiser ? », « Qui serait le plus insupportable avec 1 million d'euros ? », « Qui mourrait en premier dans un k-drama, d'une maladie mystérieuse au dernier épisode ? », « Qui a déjà dépensé le plus d'argent dans un jeu « gratuit » ? », « Qui a le plus de captures d'écran « pour avis » dans son téléphone ? »
- NE PAS ajouter : vendre le groupe (film d'horreur), revendre son cadeau, préfère son chien, rage en premier.

## tier-list.yaml
- Garder les ✅, appliquer la réécriture (3 h du matin), retirer les ❌.
- Ajouter : « À qui prêterais-tu 500 € sans reçu ? », « Qui survit le plus longtemps dans un film d'horreur ? », « Qui ferait le meilleur président de la République ? », « Qui ferait le meilleur méchant de film Disney ? », « Qui se débrouillerait le mieux perdu à Tokyo, sans téléphone ? », « Qui contesterait un point au ping-pong jusqu'à la nuit ? »
- NE PAS ajouter : meilleur parent, meilleure coupe de cheveux, meilleur coéquipier en ligne.

## split-the-room.yaml
- Garder les ✅, retirer les ❌.
- Ajouter : « Ton chien se met à parler, mais… », « Tu es immunisé contre la gueule de bois à vie, mais… », « On te rembourse tout l'argent dépensé dans des jeux vidéo, mais… », « Une musique épique de film démarre dès que tu entres dans une pièce, mais… »
- NE PAS ajouter : recherches Google, invité qui t'obéit, Tokyo, clone.

## simon, pierre-feuille-ciseaux, compte-a-rebours : ne rien changer.
