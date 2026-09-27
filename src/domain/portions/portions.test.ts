import { describe, expect, it } from "vitest";
import { RECIPES } from "@/data/recipes";
import { alex, camille, ingredientIndex, TODAY } from "@/test/fixtures";
import { computeTargets, mealTarget } from "../nutrition/targets";
import { recipeNutritionPerServing } from "../recipes/nutrition";
import { computeMemberPortion, cookingQuantities } from "./portions";
import { objective, solveBoundedLsq } from "./solver";

const curry = RECIPES.find((r) => r.slug === "poulet-curry-coco");
if (!curry) throw new Error("fixture recipe missing");

function portionFor(profile: typeof alex) {
  const targets = computeTargets(profile, TODAY);
  return computeMemberPortion(curry!, ingredientIndex, {
    memberId: profile.id,
    name: profile.name,
    target: mealTarget(profile, targets, "dinner"),
    favourVegetables: targets.effectiveGoal === "lose",
  });
}

describe("solveBoundedLsq", () => {
  it("finds the unconstrained optimum when inside the bounds", () => {
    const x = solveBoundedLsq({ a: [[1, 0], [0, 1]], b: [0.5, 0.7], lower: [0, 0], upper: [1, 1] });
    expect(x[0]).toBeCloseTo(0.5);
    expect(x[1]).toBeCloseTo(0.7);
  });

  it("respects bounds", () => {
    const p = { a: [[1, 1]], b: [10], lower: [0, 0], upper: [2, 3] };
    const x = solveBoundedLsq(p);
    expect(x).toEqual([2, 3]);
    expect(objective(p, x)).toBeCloseTo(25);
  });
});

describe("computeMemberPortion", () => {
  const a = portionFor(alex);
  const c = portionFor(camille);

  it("gives two different plates from the same recipe", () => {
    const chickenA = a.items.find((i) => i.role === "protein");
    const chickenC = c.items.find((i) => i.role === "protein");
    expect(chickenA?.ingredientId).toBe(chickenC?.ingredientId);
    expect(chickenA!.grams).toBeGreaterThan(chickenC!.grams);
  });

  it("reaches the protein target of the high-protein profile", () => {
    expect(a.target.proteinG).not.toBeNull();
    expect(a.nutrients.proteinG).toBeGreaterThanOrEqual(a.target.proteinG! * 0.9);
  });

  it("approaches each person's energy target", () => {
    expect(Math.abs(a.nutrients.energyKcal - a.target.energyKcal) / a.target.energyKcal).toBeLessThan(0.12);
    expect(Math.abs(c.nutrients.energyKcal - c.target.energyKcal) / c.target.energyKcal).toBeLessThan(0.12);
  });

  it("favours vegetables for the weight-loss profile", () => {
    expect(a.factors.vegetable).toBeGreaterThan(c.factors.vegetable);
  });

  it("keeps factors within bounds", () => {
    for (const p of [a, c]) {
      expect(p.factors.protein).toBeGreaterThanOrEqual(0.6);
      expect(p.factors.protein).toBeLessThanOrEqual(2.0);
      expect(p.factors.starch).toBeGreaterThanOrEqual(0.3);
    }
  });

  it("reports an approximate cooked weight for rice", () => {
    const rice = a.items.find((i) => i.ingredientId === "ing_riz-long");
    expect(rice?.cookedGrams).toBeGreaterThan(rice!.grams * 2);
  });

  it("recomputes nutrition from ingredients", () => {
    const perServing = recipeNutritionPerServing(curry!, ingredientIndex);
    expect(perServing.nutrients.energyKcal).toBeGreaterThan(400);
    expect(perServing.quality).toBe("VERIFIED");
    expect(perServing.sources[0]).toMatch(/USDA/);
  });
});

describe("cookingQuantities", () => {
  it("sums exactly the individual portions", () => {
    const a = portionFor(alex);
    const c = portionFor(camille);
    const total = cookingQuantities([a, c]);
    const chicken = total.find((q) => q.ingredientId === "ing_blanc-de-poulet");
    const expected =
      a.items.find((i) => i.ingredientId === "ing_blanc-de-poulet")!.grams +
      c.items.find((i) => i.ingredientId === "ing_blanc-de-poulet")!.grams;
    expect(chicken?.grams).toBeCloseTo(expected);
  });

  it("does not inflate small piece or spoon amounts by rounding each plate", () => {
    // Cookies: 1 egg for 12 servings. Each plate holds ≈ 1/12 egg, not ½ egg.
    const cookies = RECIPES.find((r) => r.slug === "cookies-pepites-chocolat")!;
    const target = mealTarget(camille, computeTargets(camille, TODAY), "snack");
    const plates = Array.from({ length: 12 }, (_, i) =>
      computeMemberPortion(cookies, ingredientIndex, { memberId: `m${i}`, name: "x", target, favourVegetables: false }),
    );
    const egg = cookingQuantities(plates).find((q) => q.ingredientId === "ing_oeuf")!;
    const perPlate = plates[0].items.find((i) => i.ingredientId === "ing_oeuf")!;
    expect(perPlate.grams).toBeLessThan(10);
    expect(egg.grams).toBeCloseTo(plates.reduce((s, p) => s + p.items.find((i) => i.ingredientId === "ing_oeuf")!.grams, 0));
    // The cook reads a rounded total (about one egg at most, never six).
    expect(egg.quantity).toBeLessThanOrEqual(1.5);
  });
});
