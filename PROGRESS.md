# État du projet

_Dernière mise à jour : 27 septembre 2026._

## Fonctionne de bout en bout

- Inscription, connexion, mot de passe oublié / réinitialisation, changement de mot de passe, déconnexion.
- Onboarding en 9 étapes avec sauvegarde automatique serveur et reprise : foyer, profils (simplifié/détaillé, situations particulières), régimes/allergies/aliments refusés et favoris, repas par jour, budget et mode, cuisine (temps, niveau, matériel, restes, batch, répétition), magasin et préférences d'achat, placard.
- Objectif de poids : poids souhaité et délai (2 mois à 1 an ou « pas de délai ») pour les profils détaillés en perte ou prise de poids. Le déficit/surplus en découle (7 700 kcal/kg), plafonné à un rythme sûr (perte ≤ 1 % du poids et ≤ 1 kg/semaine, déficit ≤ 750 kcal/j, jamais sous le plancher ; prise ≤ 0,5 %/semaine) ; cible ramenée à un IMC de 18,5 au minimum. Projection affichée en direct dans l'onboarding et sur la page Nutrition ; les portions de chaque plat suivent ces besoins.
- Visuels des recettes : illustration originale générée à partir des ingrédients de chaque recette (cartes, fiche, tableau de bord, site public), remplacée automatiquement par une photo déclarée dans `data/recipe-images.json`.
- **Prix réels par enseigne** : « Magasins et prix » → enseigne + ville + rayon → prix réellement payés dans les magasins de l'enseigne autour de la ville (Open Prices, ODbL), produits à code-barres et vrac, magasin créé et sélectionné ; chaque prix indique le magasin et la date du relevé. Aussi en ligne de commande : `pnpm prix:enseigne`.
- Liste de courses : **toujours une image** (photo du produit Open Food Facts, recherchée aussi par code-barres ; sinon photo d'illustration de l'ingrédient ; sinon icône du rayon) et **toujours un prix** quand il en existe un quelque part (magasin choisi → prix saisi par le foyer → prix relevé dans un autre magasin, « autre magasin » → prix fictif de démonstration, « prix fictif »), avec le montant de chaque repli en haut de la liste et un bouton « Indiquer le prix » sur chaque ligne estimée.
- **Catalogue élargi** : 159 recettes originales (plats volaille, bœuf, porc, poisson, fruits de mer, végétarien ; petits-déjeuners ; desserts ; goûters), 117 ingrédients avec composition USDA, produits de démonstration et catégories Open Prices ; filtres Plats / Desserts / Goûters ; le repas « Dessert ou goûter » se planifie comme les autres.
- **Audit des calculs (27/09/2026)** : vérification indépendante des prix, kcal, portions et coûts par plat. Corrigés : arrondi des portions par assiette qui gonflait certaines quantités (½ œuf minimum par part…), vrac plafonné à 1,2 kg, lecture des étiquettes « 12 x 53 g » et « 3 x 104 g égoutté », prix promotionnels sans prix de référence, objectif de perte de poids au-dessus de la maintenance, coût des cartes recette ignorant les préférences, beurre doux et crème 30 % (entrées USDA), fibres marquées « ≥ » quand une valeur manque.
- **Revue complète (27/09/2026)** : restes « dîner → déjeuner » qui ne se regroupaient plus dès qu'un petit-déjeuner était planifié ; repas épinglés qui pouvaient contourner un régime ou une allergie ajoutés ensuite (désormais désépinglés et remplacés, avec message) ; profil de 17 ans pouvant recevoir un déficit calorique (âge prudent : seule l'année de naissance est connue) ; sauce soja sans gluten déclaré (shoyu = blé) ; moutarde de Dijon (sulfites), pâte feuilletée et pain de mie (lait) ; lecture des étiquettes « 1/2 kg », « 250 g x 2 », « 2 paquets de 500 g », « 2 x 3 x 100 g » ; filtres de mots (« parfumé » n'est plus « fumé », « 10 % » n'est plus « 0 % », cacao « non sucré » accepté) ; lentilles en conserve exclues des lentilles sèches ; poids unitaires USDA pour salade, mangue, poireau, radis ; étiquettes « léger », « rapide », « protéiné », « vegan », « végétarien » vérifiées par le calcul ; budget strict sans tolérance ; prix daté dans le futur non considéré comme frais ; qualité DEMO jamais remontée en ESTIMATED. Côté serveur : suppression de compte avec mot de passe et suppression réelle des données du foyer (l'ancien point d'accès Better Auth laissait le foyer), export RGPD complété (prix saisis, cases cochées, sessions), prix saisis par un foyer conservés lors d'une synchronisation, génération de semaine atomique et sérialisée, création de foyer sans doublon, verrou de synchronisation en base, erreurs SQL journalisées sans leurs valeurs, bornes de saisie. Interface : pages 404 et erreur en français, formulaire d'inscription corrigé, validation de la ville en français, placard (valeur invalide restaurée, recherche « ri » → Riz d'abord), recettes affichées par 24, index des guides, titre de la page cuisine.
- **Améliorations (27/09/2026)** : « Mon foyer » modifiable par partie (menu des sections, `/household?section=budget`, bouton Enregistrer toujours disponible) ; « Régénérer la semaine » demande confirmation et peut être annulé (semaine, épingles et cases cochées rétablies) ; liste de courses avec barre collante (progression, total) et « Tout décocher » ; remplacement d'un repas : raisons groupées, aperçu de la recette proposée avec son effet sur le panier, « Autre proposition », puis « Annuler » après application ; œufs et tortillas comptés en pièces entières dans les quantités à cuisiner ; mois de naissance facultatif (âge exact) ; recherche et filtre des recettes conservés dans l'adresse ; limites d'usage par foyer sur les actions coûteuses (génération, remplacement, synchronisation, prix saisis, suppression de compte) ; nettoyage automatique des anciens prix (`pnpm prix:nettoyage`) ; Ciqual : `pnpm data:ciqual --suggest` propose les correspondances à valider, jamais appliquées sans nom vérifié ; poids unitaires USDA du concombre et du kiwi.
- Prix de chaque plat dans la semaine et sur l'accueil : valeur des ingrédients utilisés au prix payé (placard exclu), prix par assiette ; les restes renvoient au plat d'origine.
- Photos des recettes : `pnpm photos:recettes` (clé Pexels gratuite) propose 8 photos professionnelles par recette ; choix dans Admin → Photos des recettes (`pnpm admin:grant <e-mail>` pour devenir administrateur). Sans photo : illustration.
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

- 305 tests unitaires, 21 tests d'intégration PostgreSQL, 4 tests Playwright (parcours complet desktop, redirection, 8 pages mobiles sans débordement + courses).
- `pnpm build` passe.

## Limites connues

- **Prix réels** : ce sont les prix observés en magasin (Open Prices), pas le catalogue en ligne des enseignes (CGU). Couverture variable selon la ville et l'ingrédient ; pas de test en conditions réelles depuis l'environnement de développement (réseau fermé) : à vérifier au premier lancement.
- **Ciqual** : importeur prêt mais non exécuté (téléchargement impossible depuis l'environnement de développement). Sur une machine connectée : `pnpm data:ciqual --suggest`, vérifier `data/reference/ciqual-suggestions.json`, reporter les bonnes correspondances (code + nom exact) dans `data/reference/ciqual-mapping.json`, relancer `pnpm data:ciqual`.
- Poids unitaire manquant (source USDA non trouvée pour la variété vendue en France) : chou-fleur entier, tête d'ail.
- **Panier drive automatique (type Jow)** : non disponible. Jow remplit le panier grâce à des partenariats commerciaux avec les enseignes ; FOODLEK n'en a pas. En attendant : liens de recherche par enseigne (formats d'URL à revérifier dans un navigateur, ils peuvent changer) et copie de la liste.
- Photos de recettes : aucune fournie (droits nécessaires) ; illustrations générées à la place.
- Catalogue de 159 recettes (100 plats, 20 petits-déjeuners, 27 desserts, 13 goûters) : relecture culinaire humaine recommandée. Pas de recette à la levure chimique (composition absente de la table USDA utilisée).
- Qui mange à quel repas : tout le foyer pour l'instant (le modèle stocke les convives par repas).
- Back-office en lecture seule ; pas d'édition de recettes ni de mappings via l'interface.
- Pas encore d'assistant conversationnel, d'invitation d'un second compte, de notifications, de mode hors-ligne.
- Mode sombre non fait (design clair uniquement).

## Prochaines étapes logiques

1. Lancer l'import Ciqual et vérifier les correspondances des 63 ingrédients.
2. Back-office d'édition : recettes (avec validation), ingrédients, mappings produits (EAN), enseignes/magasins.
3. Panier drive : contacter les enseignes (programmes partenaires / affiliation) pour obtenir une API d'ajout au panier ; brancher un adaptateur par enseigne.
4. Photos : lancer `pnpm photos:recettes` puis vérifier chaque photo dans le back-office.
5. Prix réels : relier des magasins Open Prices et des produits par EAN ; démarcher une enseigne pour un accès partenaire.
6. Choix des convives par repas, invitation du/de la partenaire dans le foyer.
7. Assistant : traduction de demandes (« passe sous 75 € », « pas de saumon mardi ») en actions du moteur déjà existantes.
8. Placard : dates limites, prise en compte dans le choix des recettes (« utiliser ce que j'ai »), scan de code-barres (Open Food Facts).
