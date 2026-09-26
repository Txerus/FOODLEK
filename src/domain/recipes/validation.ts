import { z } from "zod";
import { EQUIPMENT, INGREDIENT_ROLES, type IngredientIndex, type Recipe } from "../catalog/types";
import { toGrams, UNITS } from "../units/units";

/**
 * A recipe is only used by the planner once it passes this validation: a
 * well-formed structure, known ingredients, convertible quantities and a
 * protein source for main dishes. AI-assisted drafts go through the same gate.
 */

export const recipeSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(400),
  servings: z.number().int().min(1).max(12),
  prepMinutes: z.number().int().min(0).max(240),
  cookMinutes: z.number().int().min(0).max(480),
  difficulty: z.enum(["easy", "medium", "hard"]),
  equipment: z.array(z.enum(EQUIPMENT)),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.enum(UNITS),
        role: z.enum(INGREDIENT_ROLES),
        note: z.string().max(80).optional(),
      }),
    )
    .min(2),
  steps: z
    .array(
      z.object({
        order: z.number().int().min(1),
        text: z.string().min(5).max(500),
        timerSeconds: z.number().int().positive().max(6 * 3600).optional(),
      }),
    )
    .min(2),
  tags: z.array(z.string()),
  cuisine: z.string().min(2),
  seasonMonths: z.array(z.number().int().min(1).max(12)),
  mealTypes: z.array(z.enum(["breakfast", "lunch", "dinner", "snack"])).min(1),
  keepsWell: z.boolean(),
  origin: z.enum(["ORIGINAL_AI_ASSISTED", "ORIGINAL", "LICENSED"]),
  imageUrl: z.string().url().nullable(),
  imageCredit: z.string().nullable(),
});

export interface RecipeValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRecipe(recipe: Recipe, ingredients: IngredientIndex): RecipeValidationResult {
  const errors: string[] = [];
  const parsed = recipeSchema.safeParse(recipe);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${issue.path.join(".")} : ${issue.message}`);
  }
  recipe.steps.forEach((s, i) => {
    if (s.order !== i + 1) errors.push(`Étape ${i + 1} : ordre ${s.order} inattendu`);
  });
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) {
      errors.push(`Ingrédient inconnu : ${ri.ingredientId}`);
      continue;
    }
    try {
      toGrams(ri.quantity, ri.unit, ing.measures);
    } catch (e) {
      errors.push(`${ing.name} : ${e instanceof Error ? e.message : "conversion impossible"}`);
    }
    if (!ing.composition) errors.push(`${ing.name} : composition nutritionnelle manquante`);
  }
  const isMain = recipe.mealTypes.includes("lunch") || recipe.mealTypes.includes("dinner");
  if (isMain && !recipe.ingredients.some((ri) => ri.role === "protein")) {
    errors.push("Un plat principal doit contenir une source de protéines");
  }
  return { valid: errors.length === 0, errors };
}
