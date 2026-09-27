/** Helpers shared by the recipe files: compact ingredient lines and step timers. */
import { ingredientId } from "@/data/ingredients";
import type { IngredientRole, Recipe, RecipeIngredient, RecipeStep } from "@/domain/catalog/types";
import type { Unit } from "@/domain/units/units";

export function ing(slug: string, quantity: number, unit: Unit, role: IngredientRole, note?: string): RecipeIngredient {
  return note === undefined
    ? { ingredientId: ingredientId(slug), quantity, unit, role }
    : { ingredientId: ingredientId(slug), quantity, unit, role, note };
}

type StepDraft = string | [text: string, timerSeconds: number];

type RecipeDraft = Omit<Recipe, "id" | "steps" | "origin" | "imageUrl" | "imageCredit"> & {
  steps: StepDraft[];
};

export function recipe(draft: RecipeDraft): Recipe {
  const steps: RecipeStep[] = draft.steps.map((s, i) =>
    typeof s === "string" ? { order: i + 1, text: s } : { order: i + 1, text: s[0], timerSeconds: s[1] },
  );
  return {
    ...draft,
    id: `rec_${draft.slug}`,
    steps,
    origin: "ORIGINAL_AI_ASSISTED",
    imageUrl: null,
    imageCredit: null,
  };
}

