import { describe, expect, it } from "vitest";
import { RECIPES } from "@/data/recipes";
import { demoInput, ingredientIndex, offers } from "@/test/fixtures";
import { checkRecipeDiet } from "../catalog/diets";
import { explainPlan } from "./explain";
import { evaluateAssignment, optimizePlan, replaceSlot } from "./optimizer";

describe("optimizePlan", () => {
  const input = demoInput();
  const result = optimizePlan(input);
  const plan = result.best;

  it("fills every requested meal", () => {
    expect(result.unfillable).toHaveLength(0);
    for (const slot of input.slots) expect(plan.assignment[slot.key]).toBeTruthy();
  });

  it("uses several different recipes", () => {
    expect(new Set(Object.values(plan.assignment)).size).toBeGreaterThanOrEqual(5);
  });

  it("gives each person a portion at every meal", () => {
    for (const slot of input.slots) {
      const portions = plan.portions[slot.key];
      expect(portions).toHaveLength(2);
      const [a, c] = portions;
      expect(a.memberId).toBe("mem_alex");
      expect(c.memberId).toBe("mem_camille");
    }
  });

  it("shopping totals equal the sum of every plate", () => {
    const needed = new Map<string, number>();
    for (const portions of Object.values(plan.portions)) {
      for (const p of portions) {
        for (const item of p.items) needed.set(item.ingredientId, (needed.get(item.ingredientId) ?? 0) + item.grams);
      }
    }
    for (const line of plan.shopping.lines) {
      const ing = ingredientIndex.get(line.ingredientId)!;
      const grams = needed.get(line.ingredientId) ?? 0;
      const expected = ing.purchaseUnit === "g" ? grams : ing.purchaseUnit === "ml" ? grams / ing.measures.gramsPerMl! : grams / ing.measures.gramsPerPiece!;
      expect(line.needed).toBeCloseTo(expected, 5);
    }
  });

  it("keeps the basket consistent with the pack choices", () => {
    const sum = plan.shopping.lines.reduce((s, l) => s + (l.costCents ?? 0), 0);
    expect(plan.shopping.totalCents).toBe(sum);
    expect(plan.budget.basketCents).toBe(sum);
    for (const l of plan.shopping.lines) {
      if (l.toBuy > 0) expect(l.purchasedQuantity).toBeGreaterThanOrEqual(l.toBuy);
    }
  });

  it("labels demo prices as DEMO", () => {
    expect(plan.shopping.quality).toBe("DEMO");
    expect(plan.budget.quality).toBe("DEMO");
  });

  it("stays within the target budget on the demo catalogue", () => {
    expect(plan.budget.basketCents).toBeLessThanOrEqual(Math.round(9000 * 1.05));
  });

  it("is deterministic for a given seed", () => {
    const again = optimizePlan(demoInput());
    expect(again.best.assignment).toEqual(plan.assignment);
    expect(again.best.shopping.totalCents).toBe(plan.shopping.totalCents);
  });

  it("explains its decisions from computed figures", () => {
    const explanations = explainPlan(plan, input.slots, new Map(RECIPES.map((r) => [r.id, r])), ingredientIndex, offers, input.preferences.retail);
    expect(explanations.some((e) => e.kind === "budget")).toBe(true);
    expect(explanations.some((e) => e.kind === "portions")).toBe(true);
    for (const e of explanations) expect(e.text.length).toBeGreaterThan(10);
  });
});

describe("hard constraints", () => {
  it("only proposes vegetarian dishes to a vegetarian household member", () => {
    const input = demoInput({ iterations: 150 });
    input.members[1] = { ...input.members[1], constraints: { diets: ["vegetarian"], allergies: [], excludedIngredientIds: [] } };
    const plan = optimizePlan(input).best;
    for (const recipeId of Object.values(plan.assignment)) {
      const recipe = RECIPES.find((r) => r.id === recipeId)!;
      expect(checkRecipeDiet(recipe, ingredientIndex, "vegetarian").compatible).toBe(true);
    }
  });

  it("excludes allergens", () => {
    const input = demoInput({ iterations: 150 });
    input.members[0] = { ...input.members[0], constraints: { diets: [], allergies: ["fish", "milk"], excludedIngredientIds: [] } };
    const plan = optimizePlan(input).best;
    for (const recipeId of Object.values(plan.assignment)) {
      const recipe = RECIPES.find((r) => r.id === recipeId)!;
      for (const ri of recipe.ingredients) {
        const allergens = ingredientIndex.get(ri.ingredientId)!.allergens;
        expect(allergens).not.toContain("fish");
        expect(allergens).not.toContain("milk");
      }
    }
  });

  it("respects locked slots", () => {
    const input = demoInput({ iterations: 150 });
    const key = input.slots[0].key;
    input.locked = { [key]: "rec_poulet-curry-coco" };
    expect(optimizePlan(input).best.assignment[key]).toBe("rec_poulet-curry-coco");
  });

  it("reports slots that no recipe can fill", () => {
    const input = demoInput({ iterations: 50 });
    input.preferences = { ...input.preferences, equipment: [] };
    const result = optimizePlan(input);
    expect(result.unfillable.length).toBeGreaterThan(0);
  });
});

describe("replaceSlot", () => {
  const input = demoInput({ iterations: 300 });
  const plan = optimizePlan(input).best;
  const slotKey = input.slots[3].key;

  it("replaces the recipe and recalculates everything", () => {
    const res = replaceSlot(input, plan.assignment, slotKey, "any");
    expect(res.evaluation).not.toBeNull();
    const next = res.evaluation!;
    expect(next.assignment[slotKey]).not.toBe(plan.assignment[slotKey]);
    // All other meals unchanged.
    for (const s of input.slots) if (s.key !== slotKey) expect(next.assignment[s.key]).toBe(plan.assignment[s.key]);
    const recomputed = evaluateAssignment(input, next.assignment);
    expect(recomputed.shopping.totalCents).toBe(next.shopping.totalCents);
    expect(next.budget.basketCents).toBe(next.shopping.totalCents);
  });

  it("honours 'je veux du poisson'", () => {
    const res = replaceSlot(input, plan.assignment, slotKey, "want_fish");
    const recipe = RECIPES.find((r) => r.id === res.evaluation!.assignment[slotKey])!;
    const hasFish = recipe.ingredients.some((ri) => ingredientIndex.get(ri.ingredientId)!.proteinFamily === "fish");
    expect(hasFish).toBe(true);
  });

  it("honours 'repas végétarien'", () => {
    const res = replaceSlot(input, plan.assignment, slotKey, "vegetarian");
    const recipe = RECIPES.find((r) => r.id === res.evaluation!.assignment[slotKey])!;
    expect(checkRecipeDiet(recipe, ingredientIndex, "vegetarian").compatible).toBe(true);
  });

  it("'trop cher' never increases the basket when a cheaper option exists", () => {
    const res = replaceSlot(input, plan.assignment, slotKey, "too_expensive");
    if (res.message === null) expect(res.evaluation!.shopping.totalCents).toBeLessThan(plan.shopping.totalCents);
  });
});
