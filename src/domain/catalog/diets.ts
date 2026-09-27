import type { Allergen, Ingredient, IngredientIndex, ProteinFamily, Recipe } from "./types";

export const DIETS = [
  "vegetarian",
  "vegan",
  "pescetarian",
  "halal",
  "no_pork",
  "lactose_free",
  "gluten_free",
] as const;
export type Diet = (typeof DIETS)[number];

export const DIET_LABELS: Record<Diet, string> = {
  vegetarian: "Végétarien",
  vegan: "Végan",
  pescetarian: "Pescétarien",
  halal: "Halal",
  no_pork: "Sans porc",
  lactose_free: "Sans lactose",
  gluten_free: "Sans gluten",
};

export interface DietCheck {
  compatible: boolean;
  /** Human-readable reasons for incompatibility. */
  reasons: string[];
  /** Compatible, but something must be verified on the product (e.g. halal certification). */
  warnings: string[];
}

function ingredientDietIssue(ing: Ingredient, diet: Diet): { blocking?: string; warning?: string } {
  switch (diet) {
    case "vegetarian":
      if (["meat", "poultry", "fish", "seafood"].includes(ing.animalOrigin)) return { blocking: ing.name };
      return {};
    case "vegan":
      if (ing.animalOrigin !== "none") return { blocking: ing.name };
      return {};
    case "pescetarian":
      if (ing.animalOrigin === "meat" || ing.animalOrigin === "poultry") return { blocking: ing.name };
      return {};
    case "no_pork":
      if (ing.isPork) return { blocking: ing.name };
      return {};
    case "halal":
      if (ing.isPork || ing.containsAlcohol) return { blocking: ing.name };
      if (ing.animalOrigin === "meat" || ing.animalOrigin === "poultry") {
        return { warning: `${ing.name} : choisir un produit certifié halal` };
      }
      return {};
    case "lactose_free":
      if (ing.allergens.includes("milk")) return { blocking: ing.name };
      return {};
    case "gluten_free":
      if (ing.allergens.includes("gluten")) return { blocking: ing.name };
      return {};
  }
}

export function checkRecipeDiet(recipe: Recipe, ingredients: IngredientIndex, diet: Diet): DietCheck {
  const reasons: string[] = [];
  const warnings: string[] = [];
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) {
      reasons.push(`Ingrédient inconnu (${ri.ingredientId})`);
      continue;
    }
    const issue = ingredientDietIssue(ing, diet);
    if (issue.blocking) reasons.push(issue.blocking);
    if (issue.warning) warnings.push(issue.warning);
  }
  return { compatible: reasons.length === 0, reasons, warnings };
}

export function recipeAllergens(recipe: Recipe, ingredients: IngredientIndex): Allergen[] {
  const set = new Set<Allergen>();
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) continue;
    for (const a of ing.allergens) set.add(a);
  }
  return [...set].sort();
}

export function recipeProteinFamilies(recipe: Recipe, ingredients: IngredientIndex): ProteinFamily[] {
  const set = new Set<ProteinFamily>();
  for (const ri of recipe.ingredients) {
    if (ri.role !== "protein") continue;
    const fam = ingredients.get(ri.ingredientId)?.proteinFamily;
    if (fam) set.add(fam);
  }
  return [...set];
}

export function compatibleDiets(recipe: Recipe, ingredients: IngredientIndex): Diet[] {
  return DIETS.filter((d) => checkRecipeDiet(recipe, ingredients, d).compatible);
}

export interface EaterConstraints {
  diets: Diet[];
  allergies: Allergen[];
  /** Ingredient ids the person refuses to eat. */
  excludedIngredientIds: string[];
}

export interface RecipeEligibility {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
}

/**
 * A household recipe is cooked once for everyone at the table, so it must be
 * compatible with every eater's hard constraints.
 */
export function checkRecipeForEaters(
  recipe: Recipe,
  ingredients: IngredientIndex,
  eaters: readonly { name: string; constraints: EaterConstraints }[],
): RecipeEligibility {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const allergens = new Set(recipeAllergens(recipe, ingredients));
  const ingredientIds = new Set(recipe.ingredients.map((i) => i.ingredientId));
  // An ingredient we know nothing about could hide an allergen or a refused food.
  const unknown = recipe.ingredients.filter((i) => !ingredients.has(i.ingredientId)).map((i) => i.ingredientId);
  for (const eater of eaters) {
    const c = eater.constraints;
    if (unknown.length > 0 && (c.allergies.length > 0 || c.excludedIngredientIds.length > 0 || c.diets.length > 0)) {
      reasons.push(`${eater.name} : ingrédient non référencé (${unknown.join(", ")})`);
    }
    for (const diet of eater.constraints.diets) {
      const check = checkRecipeDiet(recipe, ingredients, diet);
      if (!check.compatible) reasons.push(`${eater.name} : ${DIET_LABELS[diet].toLowerCase()} (${check.reasons.join(", ")})`);
      warnings.push(...check.warnings);
    }
    for (const allergen of eater.constraints.allergies) {
      if (allergens.has(allergen)) reasons.push(`${eater.name} : allergie (${allergen})`);
    }
    for (const id of eater.constraints.excludedIngredientIds) {
      if (ingredientIds.has(id)) {
        reasons.push(`${eater.name} : n'aime pas ${ingredients.get(id)?.name ?? id}`);
      }
    }
  }
  return { eligible: reasons.length === 0, reasons, warnings: [...new Set(warnings)] };
}
