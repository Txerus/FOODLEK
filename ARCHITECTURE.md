# Architecture

## Principes

1. **Tout est relié, rien n'est recopié.** Le planning ne stocke que _quelle recette pour quel repas_ (et les épingles). Portions, quantités, paquets, prix, budget, gaspillage et explications sont **recalculés** à chaque lecture par le moteur pur. Il est impossible que la liste de courses diverge des assiettes.
2. **Le moteur est pur.** `src/domain/` ne dépend ni de Next.js, ni de React, ni de la base : il est testé unitairement (117 tests) et réutilisable (jobs, API, mobile).
3. **La provenance est une donnée.** Chaque composition nutritionnelle et chaque prix porte sa source, sa version/date et un niveau de qualité (`VERIFIED`, `LIVE`, `RECENT`, `ESTIMATED`, `DEMO`, `MISSING`). L'interface l'affiche ; les agrégats prennent la pire qualité de leurs composantes.
4. **Dégradation honnête.** Pas de magasin, pas de prix, pas d'accès à une enseigne : le produit fonctionne et le dit (« Prix indisponible », total partiel) au lieu de combler les trous.

## Décisions

| Sujet                 | Choix                                                                                                     | Pourquoi                                                                                                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework             | Next.js 16 App Router, Server Components, server actions                                                  | SSR pour le SEO public, pages produit rendues côté serveur, mutations sans API REST dédiée.                                                                                                                                                                                                        |
| TypeScript            | 5.9 (version du template officiel Next 16)                                                                | TypeScript 7 (natif) est sorti trop récemment pour l'outillage Next/ESLint.                                                                                                                                                                                                                        |
| Base                  | PostgreSQL + Drizzle ORM 0.45                                                                             | SQL explicite, migrations versionnées (`drizzle/`), types inférés, léger à l'exécution.                                                                                                                                                                                                            |
| Auth                  | Better Auth 1.7 (e-mail/mot de passe)                                                                     | Sessions en base, reset, vérification e-mail, rate limiting en base, adaptateur Drizzle. OAuth ajoutable sans migration de modèle.                                                                                                                                                                 |
| UI                    | Tailwind 4 + shadcn/ui (Radix) vendorisé                                                                  | Composants accessibles possédés par le projet ; design tokens dans `globals.css`. Le registre shadcn n'étant pas joignable depuis l'environnement de build, les composants ont été copiés depuis le dépôt officiel `shadcn-ui/ui`.                                                                 |
| Polices               | Fraunces (titres) + Instrument Sans (texte), auto-hébergées (OFL)                                         | Identité chaleureuse et lisible, sans requête vers Google Fonts.                                                                                                                                                                                                                                   |
| Optimisation          | Construction gloutonne + recuit simulé déterministe (graine) ; portions par moindres carrés bornés exacts | Voir [docs/ALGORITHMS.md](docs/ALGORITHMS.md). Un MIP (HiGHS) a été évalué : coûts en paliers (paquets), portions non linéaires et variété séquentielle demandent une linéarisation lourde pour ~12 repas et ~30 recettes ; l'heuristique trouve une bonne semaine en ~0,3 s et reste explicable.  |
| Redis / file / search | Non ajoutés                                                                                               | Pas de besoin mesuré : le catalogue est mis en cache en mémoire (5 min), la génération est synchrone (< 0,5 s). Les synchronisations de prix sont des scripts idempotents à lancer par cron ; une file (ex. pg-boss sur PostgreSQL) sera justifiée quand plusieurs enseignes seront synchronisées. |
| Stockage objet        | Non ajouté                                                                                                | Pas d'images de recettes tant que leurs droits ne sont pas établis.                                                                                                                                                                                                                                |
| PWA                   | Manifest + icônes, installation écran d'accueil                                                           | Utile pour les courses et le mode cuisine. Pas de service worker hors-ligne pour l'instant (la liste doit refléter les prix du moment).                                                                                                                                                            |

## Modules

| Domaine demandé                                                              | Emplacement                                                                                                                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication, Users                                                        | `src/server/auth/`, tables `user/session/account/verification/rate_limit`                                                                            |
| Households, HouseholdMembers, Profiles, Goals, DietaryPreferences, Allergies | `households`, `household_memberships` (plusieurs comptes par foyer), `household_members`, `household_settings` ; `src/server/services/households.ts` |
| Nutrition, FoodComposition                                                   | `src/domain/nutrition/`, `food_compositions` (source, version, licence)                                                                              |
| Ingredients, Recipes, RecipeIngredients                                      | `src/domain/catalog/`, `src/domain/recipes/` (validation), tables `ingredients`, `recipes`, `recipe_ingredients`, `recipe_steps`                     |
| MealPlans, MealPlanDays, MealAssignments                                     | `meal_plans`, `meal_plan_slots` (jour + repas + recette + épingle + convives)                                                                        |
| Portions                                                                     | `src/domain/portions/` (calculées, jamais stockées)                                                                                                  |
| Optimization, Recommendations                                                | `src/domain/planning/` (optimiseur, remplacement, explications)                                                                                      |
| Retailers, Stores, RetailProducts, RetailPrices, ProductMappings             | `retailers`, `stores`, `retail_products`, `retail_prices` (historique), `product_mappings` ; `src/server/retail/` (interface `RetailProvider`)       |
| ShoppingLists, ShoppingListItems                                             | `src/domain/shopping/` (liste dérivée) + `shopping_list_items` (cases cochées)                                                                       |
| Pantry                                                                       | `pantry_items` (quantité optionnelle, date limite prévue)                                                                                            |
| Budgets                                                                      | `src/domain/budget/` + réglages du foyer                                                                                                             |
| Admin, Analytics, Notifications, Subscriptions                               | `/admin` (lecture), `feature_flags`, `analytics_events` (sans données personnelles), `sync_logs`, `mapping_issues`, `households.plan`                |

Notifications et abonnements payants ne sont pas encore implémentés : le modèle prévoit `households.plan` ; aucune table vide n'a été créée pour eux.

## Flux d'une page produit

```
page (Server Component)
  → requireHousehold()                  contrôle d'accès
  → loadPlanView(householdId, planId)   lit le planning, le foyer, le catalogue, les offres du magasin
      → evaluateAssignment()            moteur pur : portions → sessions → courses → budget → score
      → explainPlan()                   phrases construites à partir des chiffres
  → composants (serveur) + îlots client (actions, cases à cocher, minuteurs)
```

Mutation : îlot client → server action (Zod + `householdForAction` + `assertPlanInHousehold`) → service → `revalidatePath` → re-rendu serveur.

## Multi-utilisateurs

Un compte peut appartenir à un foyer via `household_memberships` (rôle `owner`/`editor`). Un foyer peut donc déjà être géré par deux comptes ; seule l'interface d'invitation manque (flag `household_invitations`).

## Observabilité

`src/server/observability/logger.ts` : logs JSON structurés avec masquage des clés sensibles. `sync_logs` trace chaque synchronisation de prix ; une erreur de fournisseur de prix est journalisée et le menu est généré sans prix plutôt que d'échouer. `mapping_issues` recense les problèmes de correspondance ingrédient → produit. Un service de suivi d'erreurs (Sentry…) se branche dans `instrumentation.ts` le jour où un compte existe.
