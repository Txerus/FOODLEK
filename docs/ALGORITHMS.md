# Algorithmes

## 1. Portions personnalisées — `src/domain/portions/`

Une recette est cuisinée une fois ; chaque personne reçoit des quantités différentes. Les ingrédients sont groupés par rôle :

- **protéine**, **féculent**, **légumes** : un facteur d'échelle par groupe et par personne (`fP`, `fS`, `fV`) ;
- **reste** (matières grasses, sauce, aromates) : suit la taille globale de l'assiette, amortie (`√(cible / base)`, bornée 0,75–1,3).

Les facteurs minimisent

```
wE·((E(f) − E*)/E*)² + wP·((P(f) − P*)/P*)² + λ·Σ(f − prior)²
```

sous bornes (protéine 0,6–2,0 ; féculent 0,3–2,2 ; légumes 0,8–2,0). `E` et `P` sont linéaires en `f`, c'est donc un **moindres carrés borné** à 3 variables, résolu exactement par énumération des ensembles actifs (3³ combinaisons, système normal par pivot de Gauss) — déterministe et testé.

La protéine est un **plancher** : on résout d'abord sans le terme protéique ; on ne l'ajoute que si la solution n'atteint pas la cible. Le prior légumes vaut 1,4 pour un objectif de perte de poids (satiété).

Les quantités sont ensuite arrondies à des valeurs mesurables (5 ou 10 g, demi-pièce, demi-cuillère). **La quantité à cuisiner est la somme exacte des assiettes arrondies**, et c'est elle qui alimente la liste de courses.

## 2. Choix des conditionnements — `src/domain/shopping/packaging.ts`

Pour un besoin `N` et les offres d'un magasin, on énumère les combinaisons de paquets (quelques offres, quelques unités chacune) couvrant `N` et on minimise :

```
Σ prix × pénalité_préférence  +  poids_gaspillage × reste × prix_moyen
```

Le poids de gaspillage vaut 1 pour un produit frais, 0,15 pour un produit de longue conservation (le reste est du stock), 0 pour les basiques (huile, sel, épices). Pénalités : non-bio si bio préféré, marque distributeur selon la préférence, substitution. Les promotions sont exclues si le foyer les refuse. Résultats mis en cache par (ingrédient, besoin).

## 3. Liste de courses — `src/domain/shopping/aggregate.ts`

Somme des quantités de toutes les sessions de cuisine, conversion dans l'unité de vente, déduction du placard (quantité connue ou « assez »), choix des paquets, regroupement par rayon. Indicateurs : total (hors articles sans prix, signalés), valeur consommée, **taux d'utilisation des produits frais**, valeur estimée des restes frais.

## 4. Optimisation de la semaine — `src/domain/planning/`

Variables : une recette par repas. Contraintes dures (filtre des candidats) : type de repas, régimes, allergies et aliments refusés de **tous** les convives, matériel, niveau, recettes rejetées, durée ≤ 2 × temps disponible.

Score (plus bas = meilleur), pondérations configurables (`OptimizerWeights`) :

| Terme       | Calcul                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nutrition   | moyenne des écarts relatifs² d'énergie + manque relatif² de protéines, par personne et par repas                                                                                       |
| budget      | selon le mode : strict (forte pénalité au-delà), cible (+5 % tolérés), nutrition prioritaire (aucune) ; pénalité par article sans prix                                                 |
| coût        | panier / budget (atténué en mode nutrition prioritaire)                                                                                                                                |
| gaspillage  | valeur des restes frais / budget                                                                                                                                                       |
| variété     | repas au-delà de la tolérance, même recette le même jour ou à ≤ 2 jours, même famille de protéines consécutive, même féculent dans plus de 3 sessions, plafond de recettes différentes |
| temps       | minutes au-delà du temps disponible (semaine / week-end), préférence repas rapides                                                                                                     |
| préférences | recettes mangées récemment, hors saison, bonus aliments favoris                                                                                                                        |

**Restes** : un dîner d'une recette qui se conserve, suivi le lendemain midi de la même recette, forme une seule session de cuisine (temps compté une fois, quantités cumulées).

Recherche : construction gloutonne repas par repas, puis recuit simulé (900 itérations, graine enregistrée avec le planning → reproductible) avec trois mouvements : changer un repas, échanger deux repas, transformer un déjeuner en restes du dîner de la veille. Les repas épinglés sont fixes.

**Remplacement** (« Trop cher », « Je veux du poisson »…) : filtre des candidats selon la raison, évaluation de chacun avec le reste de la semaine inchangé, choix du meilleur (du moins cher pour les raisons de coût). Tout est recalculé.

## 5. Explications — `src/domain/planning/explain.ts`

Phrases construites uniquement à partir des chiffres calculés : budget, paquets partagés (comparaison avec un achat recette par recette), taux d'utilisation, restes, différence de portions, placard, articles sans prix.
