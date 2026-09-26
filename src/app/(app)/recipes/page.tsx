import type { Metadata } from "next";
import { PageHeader } from "@/components/foodlek/page-header";
import { RecipeBrowser, type RecipeListItem } from "@/components/recipes/recipe-browser";
import { totalMinutes } from "@/domain/catalog/types";
import { requireHousehold } from "@/server/auth/access";
import { getCatalog } from "@/server/services/catalog";
import { listRecipesForHousehold } from "@/server/services/recipes";

export const metadata: Metadata = { title: "Recettes" };

export default async function RecipesPage() {
  const { householdId } = await requireHousehold();
  const [{ cards }, catalog] = await Promise.all([listRecipesForHousehold(householdId), getCatalog()]);
  const items: RecipeListItem[] = cards.map((c) => ({
    slug: c.recipe.slug,
    title: c.recipe.title,
    description: c.recipe.description,
    minutes: totalMinutes(c.recipe),
    kcal: c.nutrition.nutrients.energyKcal,
    protein: c.nutrition.nutrients.proteinG,
    costCents: c.cost.cents,
    costQuality: c.cost.quality,
    vegetarian: c.diets.includes("vegetarian"),
    fish: c.recipe.ingredients.some((ri) => catalog.ingredientIndex.get(ri.ingredientId)?.proteinFamily === "fish"),
    tags: c.recipe.tags,
    mealTypes: c.recipe.mealTypes,
    eligible: c.eligible,
    ineligibleReason: c.ineligibleReasons[0] ?? null,
  }));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Recettes"
        description="Des recettes maison, structurées pour être adaptées à chaque personne. Leurs valeurs nutritionnelles sont recalculées à partir des ingrédients."
      />
      <RecipeBrowser items={items} />
    </div>
  );
}
