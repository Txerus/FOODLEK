# État du projet

_Dernière mise à jour : 27 septembre 2026._

## Fonctionne de bout en bout

- Inscription, connexion, mot de passe oublié / réinitialisation, changement de mot de passe, déconnexion.
- Onboarding en 9 étapes avec sauvegarde automatique serveur et reprise : foyer, profils (simplifié/détaillé, situations particulières), régimes/allergies/aliments refusés et favoris, repas par jour, budget et mode, cuisine (temps, niveau, matériel, restes, batch, répétition), magasin et préférences d'achat, placard.
- Objectif de poids : poids souhaité et délai (2 mois à 1 an ou « pas de délai ») pour les profils détaillés en perte ou prise de poids. Le déficit/surplus en découle (7 700 kcal/kg), plafonné à un rythme sûr (perte ≤ 1 % du poids et ≤ 1 kg/semaine, déficit ≤ 750 kcal/j, jamais sous le plancher ; prise ≤ 0,5 %/semaine) ; cible ramenée à un IMC de 18,5 au minimum. Projection affichée en direct dans l'onboarding et sur la page Nutrition ; les portions de chaque plat suivent ces besoins.
- Visuels des recettes : illustration originale générée à partir des ingrédients de chaque recette (cartes, fiche, tableau de bord, site public), remplacée automatiquement par une photo déclarée dans `data/recipe-images.json`.
- **Prix réels par enseigne** : « Magasins et prix » → enseigne + ville + rayon → prix réellement payés dans les magasins de l'enseigne autour de la ville (Open Prices, ODbL), produits à code-barres et vrac, magasin créé et sélectionné ; chaque prix indique le magasin et la date du relevé. Aussi en ligne de commande : `pnpm prix:enseigne`.
- Courses → drive : choix d'une enseigne (Carrefour, E.Leclerc, Intermarché, Auchan, Courses U, Monoprix), lien « Chercher sur … » par produit, copie de la liste dans le presse-papiers.
- Besoins nutritionnels avec garde-fous (grossesse, allaitement, TCA, mineurs, régime médical) et explications.
- Génération de la semaine : optimisation multi-objectifs, portions individuelles, restes du lendemain, repas passés ignorés, semaine suivante à partir du samedi.
- Planning : épingler, remplacer (11 raisons), régénérer en gardant les épingles, validation d'un dépassement de budget strict ; « Mettre au menu » depuis une recette.
- Recette : tableau des quantités par personne et à cuisiner, nutrition par assiette, allergènes, coût approximatif ; mode cuisine avec minuteurs et écran toujours actif.
- Liste de courses par rayon, en paquets réels, avec prix, provenance, fraîcheur, restes, cases cochées persistées.
- Placard avec quantités optionnelles. Tableau de bord. Pages Nutrition, Magasins et prix, Compte (export JSON, suppression).
- Site public : landing, recettes indexables (schema.org Recipe), guides, sources, confidentialité, sitemap, robots, manifest PWA.
- Back-office en lecture.

## Tests

- 137 tests unitaires, 10 tests d'intégration PostgreSQL, 4 tests Playwright (parcours complet desktop, redirection, 8 pages mobiles sans débordement + courses).
- `pnpm build` passe.

## Limites connues

- **Prix réels** : ce sont les prix observés en magasin (Open Prices), pas le catalogue en ligne des enseignes (CGU). Couverture variable selon la ville et l'ingrédient ; pas de test en conditions réelles depuis l'environnement de développement (réseau fermé) : à vérifier au premier lancement.
- **Ciqual** : importeur prêt mais non exécuté (téléchargement impossible depuis l'environnement de développement) ; les correspondances ingrédient → code Ciqual sont à vérifier et saisir.
- **Panier drive automatique (type Jow)** : non disponible. Jow remplit le panier grâce à des partenariats commerciaux avec les enseignes ; FOODLEK n'en a pas. En attendant : liens de recherche par enseigne (formats d'URL à revérifier dans un navigateur, ils peuvent changer) et copie de la liste.
- Photos de recettes : aucune fournie (droits nécessaires) ; illustrations générées à la place.
- Catalogue de 26 recettes : pas de collations, 3 petits-déjeuners. Relecture culinaire humaine recommandée.
- Qui mange à quel repas : tout le foyer pour l'instant (le modèle stocke les convives par repas).
- Back-office en lecture seule ; pas d'édition de recettes ni de mappings via l'interface.
- Pas encore d'assistant conversationnel, d'invitation d'un second compte, de notifications, de mode hors-ligne.
- Mode sombre non fait (design clair uniquement).

## Prochaines étapes logiques

1. Lancer l'import Ciqual et vérifier les correspondances des 63 ingrédients.
2. Back-office d'édition : recettes (avec validation), ingrédients, mappings produits (EAN), enseignes/magasins.
3. Panier drive : contacter les enseignes (programmes partenaires / affiliation) pour obtenir une API d'ajout au panier ; brancher un adaptateur par enseigne.
4. Photos : prendre ou acquérir des photos des 26 recettes et les déclarer dans `data/recipe-images.json`.
5. Prix réels : relier des magasins Open Prices et des produits par EAN ; démarcher une enseigne pour un accès partenaire.
6. Choix des convives par repas, invitation du/de la partenaire dans le foyer.
7. Assistant : traduction de demandes (« passe sous 75 € », « pas de saumon mardi ») en actions du moteur déjà existantes.
8. Placard : dates limites, prise en compte dans le choix des recettes (« utiliser ce que j'ai »), scan de code-barres (Open Food Facts).
