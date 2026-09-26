import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CookingMode } from "@/components/recipes/cooking-mode";
import { formatAmountOnly } from "@/domain/catalog/format";
import { recipeHref } from "@/lib/routes";
import { requireHousehold } from "@/server/auth/access";
import { getRecipeDetail } from "@/server/services/recipes";

export const metadata: Metadata = { title: "Mode cuisine", robots: { index: false } };

export default async function CookingPage({ params, searchParams }: PageProps<"/recipes/[slug]/cuisine">) {
  const { householdId } = await requireHousehold();
  const { slug } = await params;
  const sp = await searchParams;
  const slotKey = typeof sp.repas === "string" ? sp.repas : null;
  const detail = await getRecipeDetail(householdId, slug, slotKey);
  if (!detail) notFound();
  const { recipe, cooking, catalog } = detail;
  const ingredients = recipe.ingredients.flatMap((ri) => {
    const ing = catalog.ingredientIndex.get(ri.ingredientId);
    const total = cooking.find((c) => c.ingredientId === ri.ingredientId && c.unit === ri.unit);
    if (!ing || !total) return [];
    return [{ name: ing.name, amount: formatAmountOnly(Math.round(total.quantity * 100) / 100, total.unit, ing), note: ri.note ?? null }];
  });
  return (
    <CookingMode
      title={recipe.title}
      steps={recipe.steps.map((s) => ({ order: s.order, text: s.text, timerSeconds: s.timerSeconds ?? null }))}
      ingredients={ingredients}
      exitHref={recipeHref(recipe.slug, detail.slot?.key)}
    />
  );
}
