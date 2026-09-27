import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeVisual } from "@/components/recipes/recipe-visual";
import { Button } from "@/components/ui/button";
import { recipeAllergens } from "@/domain/catalog/diets";
import { formatIngredientAmount } from "@/domain/catalog/format";
import { ALLERGEN_LABELS, totalMinutes } from "@/domain/catalog/types";
import { recipeNutritionPerServing } from "@/domain/recipes/nutrition";
import { formatMinutes } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { getCatalog } from "@/server/services/catalog";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    return (await getCatalog()).recipes.map((r) => ({ slug: r.slug }));
  } catch {
    // No database at build time: pages are rendered on first request, then cached.
    return [];
  }
}

const isoDuration = (min: number) => `PT${min}M`;

export async function generateMetadata({ params }: PageProps<"/recettes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const recipe = (await getCatalog()).recipesBySlug.get(slug);
  if (!recipe) return {};
  return {
    title: recipe.title,
    description: recipe.description,
    alternates: { canonical: `/recettes/${recipe.slug}` },
    openGraph: { type: "article", title: recipe.title, description: recipe.description, url: `/recettes/${recipe.slug}` },
  };
}

export default async function PublicRecipePage({ params }: PageProps<"/recettes/[slug]">) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const recipe = catalog.recipesBySlug.get(slug);
  if (!recipe) notFound();
  const nutrition = recipeNutritionPerServing(recipe, catalog.ingredientIndex).nutrients;
  const allergens = recipeAllergens(recipe, catalog.ingredientIndex);
  const lines = recipe.ingredients.flatMap((ri) => {
    const ing = catalog.ingredientIndex.get(ri.ingredientId);
    return ing ? [{ text: formatIngredientAmount(ri.quantity, ri.unit, ing), note: ri.note }] : [];
  });
  const url = `${siteConfig.url}/recettes/${recipe.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: recipe.title,
      description: recipe.description,
      url,
      prepTime: isoDuration(recipe.prepMinutes),
      cookTime: isoDuration(recipe.cookMinutes),
      totalTime: isoDuration(totalMinutes(recipe)),
      recipeYield: `${recipe.servings} portions`,
      recipeCuisine: recipe.cuisine,
      keywords: recipe.tags.join(", "),
      recipeIngredient: lines.map((l) => l.text),
      recipeInstructions: recipe.steps.map((s) => ({ "@type": "HowToStep", position: s.order, text: s.text })),
      nutrition: {
        "@type": "NutritionInformation",
        servingSize: "1 portion",
        calories: `${Math.round(nutrition.energyKcal)} kcal`,
        proteinContent: `${Math.round(nutrition.proteinG)} g`,
        fatContent: `${Math.round(nutrition.fatG)} g`,
        carbohydrateContent: `${Math.round(nutrition.carbsG)} g`,
        fiberContent: `${Math.round(nutrition.fiberG)} g`,
      },
      author: { "@type": "Organization", name: siteConfig.name },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Recettes", item: `${siteConfig.url}/recettes` },
        { "@type": "ListItem", position: 3, name: recipe.title, item: url },
      ],
    },
  ];

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/recettes" className="hover:underline">
              Recettes
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {recipe.title}
          </li>
        </ol>
      </nav>
      <RecipeVisual recipe={recipe} priority className="aspect-[16/8]" />
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-semibold text-balance sm:text-5xl">{recipe.title}</h1>
        <p className="text-lg text-muted-foreground">{recipe.description}</p>
        <p className="text-sm text-muted-foreground">
          {formatMinutes(totalMinutes(recipe))} · {recipe.servings} portions · {Math.round(nutrition.energyKcal)} kcal et {Math.round(nutrition.proteinG)} g de protéines par portion
        </p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">Ingrédients ({recipe.servings} portions)</h2>
        <ul className="surface divide-y">
          {lines.map((l) => (
            <li key={l.text} className="px-5 py-2.5">
              {l.text}
              {l.note ? <span className="text-muted-foreground"> — {l.note}</span> : null}
            </li>
          ))}
        </ul>
        {allergens.length ? <p className="text-sm text-muted-foreground">Allergènes : {allergens.map((a) => ALLERGEN_LABELS[a].toLowerCase()).join(", ")}.</p> : null}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">Préparation</h2>
        <ol className="flex flex-col gap-4">
          {recipe.steps.map((s) => (
            <li key={s.order} className="grid grid-cols-[2rem_1fr] gap-3">
              <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                {s.order}
              </span>
              <p className="pt-1">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <aside className="surface flex flex-col items-start gap-3 p-6">
        <p className="font-semibold">Des portions adaptées à chaque personne du foyer</p>
        <p className="text-sm text-muted-foreground">
          FOODLEK calcule la part de chacun selon ses besoins, l'intègre à votre semaine et à votre liste de courses.
        </p>
        <Button asChild>
          <Link href="/signup">Créer ma semaine</Link>
        </Button>
      </aside>
      <p className="text-xs text-muted-foreground">
        Valeurs nutritionnelles calculées à partir des ingrédients (USDA FoodData Central). Estimations générales, qui ne remplacent pas l'avis d'un professionnel de santé.
      </p>
    </article>
  );
}
