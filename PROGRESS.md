# État du projet

_Dernière mise à jour : 27 septembre 2026._

## Fonctionne de bout en bout

- Inscription, connexion, mot de passe oublié / réinitialisation, changement de mot de passe, déconnexion.
- Onboarding en 9 étapes avec sauvegarde automatique serveur et reprise : foyer, profils (simplifié/détaillé, situations particulières), régimes/allergies/aliments refusés et favoris, repas par jour, budget et mode, cuisine (temps, niveau, matériel, restes, batch, répétition), magasin et préférences d'achat, placard.
- Besoins nutritionnels avec garde-fous (grossesse, allaitement, TCA, mineurs, régime médical) et explications.
- Génération de la semaine : optimisation multi-objectifs, portions individuelles, restes du lendemain, repas passés ignorés, semaine suivante à partir du samedi.
- Planning : épingler, remplacer (11 raisons), régénérer en gardant les épingles, validation d'un dépassement de budget strict ; « Mettre au menu » depuis une recette.
- Recette : tableau des quantités par personne et à cuisiner, nutrition par assiette, allergènes, coût approximatif ; mode cuisine avec minuteurs et écran toujours actif.
- Liste de courses par rayon, en paquets réels, avec prix, provenance, fraîcheur, restes, cases cochées persistées.
- Placard avec quantités optionnelles. Tableau de bord. Pages Nutrition, Magasins et prix, Compte (export JSON, suppression).
- Site public : landing, recettes indexables (schema.org Recipe), guides, sources, confidentialité, sitemap, robots, manifest PWA.
- Back-office en lecture.

## Tests

- 117 tests unitaires, 8 tests d'intégration PostgreSQL, 3 tests Playwright (parcours complet desktop, redirection, 8 pages mobiles sans débordement + courses).
- `pnpm build` passe.

## Limites connues

- **Prix réels** : aucune enseigne française n'offre d'accès public ; seul Open Prices (prix observés, ODbL) est intégré, désactivé par défaut, et nécessite des produits avec code-barres reliés aux ingrédients (à saisir). Le magasin utilisable aujourd'hui est la démonstration.
- **Ciqual** : importeur prêt mais non exécuté (téléchargement impossible depuis l'environnement de développement) ; les correspondances ingrédient → code Ciqual sont à vérifier et saisir.
- Catalogue de 26 recettes : pas de collations, 3 petits-déjeuners. Relecture culinaire humaine recommandée.
- Qui mange à quel repas : tout le foyer pour l'instant (le modèle stocke les convives par repas).
- Back-office en lecture seule ; pas d'édition de recettes ni de mappings via l'interface.
- Pas encore d'assistant conversationnel, d'invitation d'un second compte, de notifications, de mode hors-ligne.
- Mode sombre non fait (design clair uniquement).

## Prochaines étapes logiques

1. Lancer l'import Ciqual et vérifier les correspondances des 63 ingrédients.
2. Back-office d'édition : recettes (avec validation), ingrédients, mappings produits (EAN), enseignes/magasins.
3. Prix réels : relier des magasins Open Prices et des produits par EAN ; démarcher une enseigne pour un accès partenaire.
4. Choix des convives par repas, invitation du/de la partenaire dans le foyer.
5. Assistant : traduction de demandes (« passe sous 75 € », « pas de saumon mardi ») en actions du moteur déjà existantes.
6. Placard : dates limites, prise en compte dans le choix des recettes (« utiliser ce que j'ai »), scan de code-barres (Open Food Facts).
