import { worstQuality, type DataQuality } from "../common/data-quality";
import type { Ingredient, IngredientIndex, Recipe, RecipeIngredient } from "../catalog/types";
import { nutrientsForGrams, sumNutrients, ZERO_NUTRIENTS, type Nutrients } from "../nutrition/nutrients";
import { toGrams } from "../units/units";

export function recipeIngredientGrams(ri: RecipeIngredient, ing: Ingredient, factor = 1): number {
  return toGrams(ri.quantity * factor, ri.unit, ing.measures);
}

export interface ComputedNutrition {
  nutrients: Nutrients;
  quality: DataQuality;
  /** Ingredient names without composition data; their nutrients are not counted. */
  missingComposition: string[];
  /** Composition sources used, for provenance display. */
  sources: string[];
  /**
   * Nutrients some ingredients have no value for (e.g. fibre of strawberries
   * in USDA Foundation Foods): the total is then a lower bound, never a guess.
   */
  partialNutrients: { nutrient: keyof Nutrients; ingredients: string[] }[];
}

export function nutritionOfItems(
  items: readonly { ingredient: Ingredient; grams: number }[],
): ComputedNutrition {
  const parts: Nutrients[] = [];
  const qualities: DataQuality[] = [];
  const missing: string[] = [];
  const sources = new Set<string>();
  const partial = new Map<keyof Nutrients, Set<string>>();
  for (const { ingredient, grams } of items) {
    if (!ingredient.composition) {
      missing.push(ingredient.name);
      qualities.push("MISSING");
      continue;
    }
    const n = nutrientsForGrams(ingredient.composition, grams);
    parts.push(n.nutrients);
    if (grams > 0) {
      for (const key of n.missing) {
        const set = partial.get(key) ?? new Set<string>();
        set.add(ingredient.name);
        partial.set(key, set);
      }
    }
    qualities.push(ingredient.composition.quality);
    sources.add(`${ingredient.composition.sourceLabel} ${ingredient.composition.sourceVersion}`);
  }
  const quality = missing.length > 0 ? "ESTIMATED" : worstQuality(qualities);
  return {
    nutrients: parts.length ? sumNutrients(parts) : ZERO_NUTRIENTS,
    quality,
    missingComposition: missing,
    sources: [...sources].sort(),
    partialNutrients: [...partial.entries()].map(([nutrient, names]) => ({ nutrient, ingredients: [...names].sort() })),
  };
}

/** Nutrition of one standard serving, recomputed from the ingredients (never typed in by hand). */
export function recipeNutritionPerServing(recipe: Recipe, ingredients: IngredientIndex): ComputedNutrition {
  const items = recipe.ingredients.flatMap((ri) => {
    const ingredient = ingredients.get(ri.ingredientId);
    if (!ingredient) return [];
    return [{ ingredient, grams: recipeIngredientGrams(ri, ingredient, 1 / recipe.servings) }];
  });
  return nutritionOfItems(items);
}
