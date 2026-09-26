# FOODLEK

Application web française qui planifie la semaine alimentaire d'un foyer en conciliant **les besoins de chaque personne**, **le budget**, **les conditionnements réellement vendus** et **la réduction du gaspillage**.

Un seul plat cuisiné pour le foyer, une portion adaptée à chacun, une liste de courses en vrais paquets, un budget tenu — et chaque chiffre avec sa source.

```
Utilisateur → Foyer → Profils → Objectifs → Besoins → Budget → Menu optimisé
→ Recettes → Portions individuelles → Produits → Magasin → Liste de courses → Prix → Panier
```

## Démarrage

Prérequis : Node 22+, pnpm 10, PostgreSQL 16+.

```bash
pnpm install
cp .env.example .env          # scripts (migrations, seed)
cp .env.example .env.local    # Next.js
# renseigner DATABASE_URL et BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:setup                 # migrations + données de référence + compte démo
pnpm dev
```

### Windows

Les scripts fonctionnent sous PowerShell et cmd (`cross-env`). Si une erreur serveur apparaît après avoir modifié `.env.local` ou changé de branche, arrête `pnpm dev`, supprime le dossier `.next` et relance. Vérifie que PostgreSQL tourne et que `DATABASE_URL` et `BETTER_AUTH_SECRET` sont bien renseignés dans `.env` **et** `.env.local`.

Compte de démonstration (développement uniquement) : `demo@foodlek.local` / `demo-foodlek-2026` — foyer Alex (perte de poids, protéines élevées) + Camille (maintien), 90 €/semaine, 7 dîners et 5 déjeuners, magasin de démonstration.

> Les prix du magasin de démonstration sont **fictifs** et affichés partout avec l'étiquette « Démo ».

## Scripts

| Commande                                                | Rôle                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev` / `pnpm build` / `pnpm start`                | Application Next.js                                                                  |
| `pnpm typecheck` · `pnpm lint` · `pnpm format`          | Qualité                                                                              |
| `pnpm test`                                             | Tests unitaires (moteur, nutrition, portions, courses, budget, optimiseur, parseurs) |
| `pnpm test:integration`                                 | Tests avec PostgreSQL (`foodlek_test`) : workflow, permissions, export, suppression  |
| `pnpm test:e2e`                                         | Playwright : parcours complet desktop + pages mobiles                                |
| `pnpm check`                                            | Tout ce qui précède + build                                                          |
| `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:seed` | Migrations Drizzle et seed                                                           |
| `pnpm data:usda <foods-FR.db>`                          | Régénère `data/reference/usda-subset.json`                                           |
| `pnpm data:ciqual [--local DIR]`                        | Importe la table ANSES-Ciqual 2025                                                   |
| `pnpm retail:sync [--find-stores Ville]`                | Synchronise les prix observés Open Prices                                            |

Pour Playwright avec un Chromium déjà installé : `PLAYWRIGHT_CHROMIUM_PATH=/chemin/chrome pnpm test:e2e`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui (Radix) · Lucide · PostgreSQL · Drizzle ORM · Better Auth · Zod 4 · React Hook Form · Vitest · Playwright.

## Organisation

```
src/domain/     moteur pur et testable (aucune dépendance à Next ni à la base)
  units/ nutrition/ portions/ recipes/ catalog/ shopping/ budget/ planning/ retail/ common/
src/data/       ingrédients (compositions USDA), recettes originales, catalogue DÉMO
src/server/     base (Drizzle), auth, contrôle d'accès, services, actions, fournisseurs de prix
src/app/        pages : (marketing) public/SEO, (auth), onboarding, (app) produit, (cook) mode cuisine
src/components/ design system et composants métier
scripts/        migrations, seed, imports de données, synchronisation des prix
e2e/ tests/     tests Playwright et d'intégration
```

Documentation : [ARCHITECTURE.md](ARCHITECTURE.md) · [DATA_SOURCES.md](DATA_SOURCES.md) · [PROGRESS.md](PROGRESS.md) · [docs/NUTRITION.md](docs/NUTRITION.md) · [docs/ALGORITHMS.md](docs/ALGORITHMS.md) · [docs/SECURITY.md](docs/SECURITY.md).

## Avertissement

Les estimations nutritionnelles sont générales et ne remplacent pas l'avis d'un professionnel de santé. FOODLEK n'est pas un outil de diagnostic.
