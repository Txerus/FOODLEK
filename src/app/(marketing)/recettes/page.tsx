import type { Metadata } from "next";
import Link from "next/link";
import { totalMinutes } from "@/domain/catalog/types";
import { recipeNutritionPerServing } from "@/domain/recipes/nutrition";
import { formatMinutes } from "@/lib/format";
import { getCatalog } from "@/server/services/catalog";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Recettes maison pour la semaine",
  description: "Recettes simples et équilibrées, avec valeurs nutritionnelles calculées à partir des ingrédients et portions adaptables à chaque personne.",
  alternates: { canonical: "/recettes" },
};

export default async function PublicRecipesPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Recettes</li>
        </ol>
      </nav>
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Recettes de la semaine</h1>
        <p className="text-lg text-muted-foreground">
          Des recettes maison originales. Leurs valeurs nutritionnelles sont recalculées à partir des ingrédients, et FOODLEK adapte chaque portion à la personne qui la mange.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.recipes.map((r) => {
          const n = recipeNutritionPerServing(r, catalog.ingredientIndex).nutrients;
          return (
            <li key={r.slug}>
              <Link href={`/recettes/${r.slug}`} className="surface group flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-lift">
                <span className="text-xs text-muted-foreground">
                  {formatMinutes(totalMinutes(r))} · {Math.round(n.energyKcal)} kcal · {Math.round(n.proteinG)} g de protéines
                </span>
                <h2 className="font-semibold text-balance group-hover:underline group-hover:underline-offset-4">{r.title}</h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
