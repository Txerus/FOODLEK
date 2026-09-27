import { buildSeedIngredients } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { indexIngredients } from "@/domain/catalog/types";
import { computeTargets, mealTarget, type MemberProfile } from "@/domain/nutrition/targets";
import { computeMemberPortion } from "@/domain/portions/portions";

/**
 * The landing page example is computed by the real engine from the example
 * profiles of the product brief, at build time — no hand-written numbers.
 */
const REFERENCE_DATE = new Date("2026-09-01T12:00:00Z");

export const EXAMPLE_PROFILES: MemberProfile[] = [
  { id: "a", name: "Alex", mode: "detailed", sex: "male", birthYear: 1998, heightCm: 180, weightKg: 90, activity: "moderate", goal: "lose", targetWeightKg: null, goalWeeks: null, highProtein: true, appetite: "normal", specialSituations: [] },
  { id: "c", name: "Camille", mode: "detailed", sex: "female", birthYear: 1999, heightCm: 165, weightKg: 60, activity: "light", goal: "maintain", targetWeightKg: null, goalWeeks: null, highProtein: false, appetite: "normal", specialSituations: [] },
];

export function landingExample() {
  const ingredients = indexIngredients(buildSeedIngredients());
  const recipe = RECIPES.find((r) => r.slug === "poulet-curry-coco") ?? RECIPES[0];
  const plates = EXAMPLE_PROFILES.map((p) => {
    const targets = computeTargets(p, REFERENCE_DATE);
    const portion = computeMemberPortion(recipe, ingredients, {
      memberId: p.id,
      name: p.name,
      target: mealTarget(p, targets, "dinner"),
      favourVegetables: targets.effectiveGoal === "lose",
    });
    const pick = (role: string) => portion.items.find((i) => i.role === role);
    return {
      name: p.name,
      goal: p.goal === "lose" ? "Perte de poids, protéines élevées" : "Maintien",
      protein: pick("protein"),
      starch: pick("starch"),
      vegetables: portion.items.filter((i) => i.role === "vegetable").reduce((s, i) => s + i.grams, 0),
      kcal: portion.nutrients.energyKcal,
      proteinG: portion.nutrients.proteinG,
    };
  });
  return { recipe, plates };
}
