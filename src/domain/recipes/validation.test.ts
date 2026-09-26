import { describe, expect, it } from "vitest";
import { RECIPES } from "@/data/recipes";
import { ingredientIndex } from "@/test/fixtures";
import { recipeNutritionPerServing } from "./nutrition";
import { validateRecipe } from "./validation";

describe("seed recipes", () => {
  it.each(RECIPES.map((r) => [r.slug, r] as const))("%s passes validation", (_slug, recipe) => {
    const result = validateRecipe(recipe, ingredientIndex);
    expect(result.errors).toEqual([]);
  });

  it("have unique slugs", () => {
    expect(new Set(RECIPES.map((r) => r.slug)).size).toBe(RECIPES.length);
  });

  it("have plausible computed nutrition for main dishes", () => {
    for (const r of RECIPES.filter((x) => x.mealTypes.includes("dinner"))) {
      const n = recipeNutritionPerServing(r, ingredientIndex).nutrients;
      expect(n.energyKcal).toBeGreaterThan(300);
      expect(n.energyKcal).toBeLessThan(1100);
      expect(n.proteinG).toBeGreaterThan(10);
    }
  });
});

describe("validateRecipe", () => {
  const base = RECIPES[0];

  it("rejects unknown ingredients", () => {
    const r = { ...base, ingredients: [...base.ingredients, { ingredientId: "ing_licorne", quantity: 1, unit: "g" as const, role: "garnish" as const }] };
    expect(validateRecipe(r, ingredientIndex).errors.join()).toMatch(/inconnu/);
  });

  it("rejects quantities that cannot be converted", () => {
    const r = { ...base, ingredients: [{ ingredientId: "ing_riz-long", quantity: 2, unit: "piece" as const, role: "starch" as const }, ...base.ingredients] };
    expect(validateRecipe(r, ingredientIndex).errors.join()).toMatch(/poids unitaire inconnu/);
  });

  it("requires a protein source in main dishes", () => {
    const r = { ...base, ingredients: base.ingredients.filter((i) => i.role !== "protein") };
    expect(validateRecipe(r, ingredientIndex).valid).toBe(false);
  });
});
