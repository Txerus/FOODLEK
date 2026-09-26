# Moteur nutritionnel

Code : `src/domain/nutrition/` — paramètres dans `config.ts`, calculs dans `targets.ts`, tests dans `targets.test.ts`. Aucun LLM n'intervient.

## Besoins journaliers (profil détaillé)

1. **Dépense de repos** — Mifflin-St Jeor : `10 × poids + 6,25 × taille − 5 × âge + 5` (homme) ou `− 161` (femme). Sexe « non précisé » : moyenne des deux (`− 78`), avec avertissement.
2. **Maintien** — dépense de repos × facteur d'activité (1,2 / 1,375 / 1,55 / 1,725 / 1,9).
3. **Objectif**
   - Perte de poids : déficit de 15 % du maintien, **plafonné à 500 kcal/j**, jamais sous la dépense de repos ni sous 1 200 kcal (femme) / 1 500 kcal (homme). Refusé si IMC < 18,5.
   - Prise de masse : + 10 %, plafonné à 300 kcal/j.
4. **Protéines** — 1,0 g/kg par défaut (ANSES : 0,83), 1,2 g/kg en perte de poids, 1,6 g/kg sur demande ou en performance, plafond 2,0 g/kg. Au-delà d'un IMC de 30, calcul sur le poids correspondant à un IMC de 25.
5. **Lipides** 35 % de l'énergie ; **glucides** = reste ; **fibres** 30 g/j.

## Garde-fous

| Situation                           | Comportement                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grossesse, allaitement              | Profil protégé : aucun objectif calorique, aucune restriction, portions à l'appétit, message renvoyant vers un professionnel.                      |
| Trouble du comportement alimentaire | Idem, et **aucun chiffre affiché** (calories, objectifs).                                                                                          |
| Régime médical, suivi médical       | Profil protégé.                                                                                                                                    |
| Moins de 18 ans                     | Profil protégé ; objectif de perte de poids interdit (validation serveur).                                                                         |
| Profil simplifié                    | Pas de mensurations ; énergie par repas selon l'appétit (500 / 650 / 800 kcal pour un repas principal — convention produit, étiquetée « estimé »). |

## Par repas

Chaque repas planifié vise sa part de la journée : petit-déjeuner 20 %, déjeuner 35 %, dîner 35 %, collation 10 %. Les repas non planifiés restent libres.
