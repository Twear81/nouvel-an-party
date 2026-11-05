# Tier list

Une question s'affiche (« Qui est le meilleur cuisinier ? »). Sur son téléphone, chacun range **tous les invités** (lui compris, par défaut) dans des étages **S / A / B / C**. À la fin, la TV remplit la tier list : chaque invité tombe dans l'étage que la tablée lui a donné en moyenne. Le fichier à modifier : `config/minijeux/tier-list.yaml`.

## Déroulé d'une manche
1. **TV** : annonce du jeu, puis la question, le tableau vide (une rangée colorée par étage) et les invités en bas, avec une petite barre qui se remplit au fur et à mesure de leurs notes (✓ quand ils ont fini). Personne ne voit les notes des autres.
2. **Téléphone** : une ligne par invité (avatar + pseudo) avec un bouton par étage. Un toucher place l'invité ; on peut changer tant que le chrono tourne. La barre en haut montre combien d'invités il reste à noter.
3. La manche se termine quand **tout le monde a noté tout le monde**, ou quand le chrono arrive à zéro (les notes déjà données comptent).
4. **Résultats** : les avatars tombent un par un dans leur étage, du bas vers le haut (le S arrive en dernier, avec confettis). Sous chaque avatar : sa moyenne en % (100 % = tout le monde l'a mis tout en haut). Chaque téléphone montre l'étage obtenu et les invités qu'on a « bien placés ».

## Calcul de l'étage
Chaque note vaut des points d'étage : avec S/A/B/C, S = 3, A = 2, B = 1, C = 0. L'étage d'un invité est la **moyenne** de ses notes, arrondie à l'entier le plus proche. Une moyenne pile entre deux étages (ex. 2,5) va à l'étage **du dessus**. Un invité que personne n'a noté n'apparaît pas.

## Points
Chaque votant gagne `points.consensus` (25) **pour chaque invité qu'il a placé dans son étage final**. Ne pas noter = 0.

**Exemple** : 3 joueurs (Léa, Tom, Zoé), étages S/A/B/C. Tout le monde met Léa et Zoé en S. Tom est mis en S par Tom et Zoé, en C par Léa : 3 + 3 + 0 = 6, moyenne 2 → **A**. Léa et Zoé finissent en S.
- Léa a bien placé Léa et Zoé (Tom : C au lieu de A) → 2 × 25 = **50**.
- Tom et Zoé aussi (ils avaient mis Tom en S) → **50** chacun.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Tier list` | Titre affiché |
| `description` | `Rangez chaque invité…` | Phrase d'explication à l'annonce |
| `duree` | `60` | Secondes pour noter (peut être surchargé par question). Comptez ~6 s par invité |
| `temps_resultats` | `30` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `noter_soi_meme` | `true` | `false` : on ne note que les autres |
| `tiers` | `[S, A, B, C]` | Les étages, du plus haut au plus bas : 2 à 6, 6 caractères max, tous différents |
| `points.consensus` | `25` | Points par invité placé dans son étage final |
| `questions` | (obligatoire) | Liste des questions, au moins une |

Exemples d'étages : `[S, A, B, C]`, `[Top, Moyen, Nul]`, `[A, B, C, D, E]`. Avec 5 ou 6 étages, les boutons des téléphones sont plus serrés et les pseudos plus coupés : 4 étages est le meilleur choix pour 8 invités.

## Écrire des questions
Sous `questions:`, une question par ligne, commençant par `- ` (tiret + espace).

```yaml
questions:
  # forme simple
  - "Qui est le meilleur cuisinier ?"
  # forme objet : durée spéciale (en secondes) pour cette question seulement
  - texte: "Qui est le meilleur ami de toute la bande ?"
    duree: 75
```

La question doit pouvoir se « classer » : « Qui est le meilleur… », « Qui danse le mieux ? », « Qui ferait le meilleur président ? ». S est toujours le haut du classement. Gardez-les **courtes** : une ligne sur la TV, deux sur un téléphone.

## Conseils
- Une vingtaine de questions (25 au maximum) suffisent : elles sont tirées au hasard.
- Durée : une manche dure environ `duree` + 15 s de révélation, souvent moins car elle s'arrête quand tout le monde a fini.

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations.
- Mettez la question **entre guillemets** `"…"` dès qu'elle contient `: ` (deux-points + espace) ou ` #`, ou si elle commence par un caractère spécial.
- Les étages s'écrivent entre crochets séparés par des virgules : `tiers: [S, A, B, C]`.
- Enregistrez en **UTF-8**. En cas d'erreur, le message de démarrage indique le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe** : le fichier n'est lu qu'au démarrage.
