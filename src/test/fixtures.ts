import { buildDemoOffers } from "@/data/demo-offers";
import { buildSeedIngredients, ingredientId } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { indexIngredients } from "@/domain/catalog/types";
import { computeTargets, type MemberProfile } from "@/domain/nutrition/targets";
import type { PlanMember, PlannerInput, PlanSlot } from "@/domain/planning/types";
import { DEFAULT_WEIGHTS } from "@/domain/planning/types";
import { DEFAULT_RETAIL_PREFERENCES } from "@/domain/retail/types";

export const TODAY = new Date("2026-09-28T08:00:00Z");

export const ingredients = buildSeedIngredients();
export const ingredientIndex = indexIngredients(ingredients);
export const offers = buildDemoOffers(TODAY);

export const alex: MemberProfile = {
  id: "mem_alex",
  name: "Alex",
  mode: "detailed",
  sex: "male",
  birthYear: 1998,
  heightCm: 180,
  weightKg: 90,
  activity: "moderate",
  goal: "lose",
  targetWeightKg: null,
  goalWeeks: null,
  highProtein: true,
  appetite: "normal",
  specialSituations: [],
};

export const camille: MemberProfile = {
  id: "mem_camille",
  name: "Camille",
  mode: "detailed",
  sex: "female",
  birthYear: 1999,
  heightCm: 165,
  weightKg: 60,
  activity: "light",
  goal: "maintain",
  targetWeightKg: null,
  goalWeeks: null,
  highProtein: false,
  appetite: "normal",
  specialSituations: [],
};

export function member(profile: MemberProfile): PlanMember {
  return {
    profile,
    targets: computeTargets(profile, TODAY),
    constraints: { diets: [], allergies: [], excludedIngredientIds: [] },
    likedIngredientIds: [],
  };
}

/** Week starting Monday 2026-09-28: 7 dinners and 5 weekday lunches. */
export function demoSlots(eaterIds: string[]): PlanSlot[] {
  const slots: PlanSlot[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(Date.UTC(2026, 8, 28 + d)).toISOString().slice(0, 10);
    if (d < 5) slots.push({ key: `${date}:lunch`, date, dayIndex: d, mealType: "lunch", eaterIds });
    slots.push({ key: `${date}:dinner`, date, dayIndex: d, mealType: "dinner", eaterIds });
  }
  return slots;
}

export function demoInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  const members = [member(alex), member(camille)];
  return {
    slots: demoSlots(members.map((m) => m.profile.id)),
    members,
    recipes: RECIPES,
    ingredients: ingredientIndex,
    offers,
    pantry: ["huile-olive", "sel", "poivre", "curry-poudre", "cumin", "paprika"].map((slug) => ({
      ingredientId: ingredientId(slug),
      quantity: null,
    })),
    preferences: {
      budgetCents: 9000,
      budgetMode: "target",
      maxWeekdayMinutes: 40,
      maxWeekendMinutes: 75,
      skill: "intermediate",
      equipment: ["hob", "oven", "microwave"],
      maxDistinctRecipes: null,
      repetitionTolerance: "medium",
      useLeftovers: true,
      preferQuickMeals: false,
      retail: DEFAULT_RETAIL_PREFERENCES,
      recentlyEatenRecipeIds: [],
      dislikedRecipeIds: [],
    },
    weights: DEFAULT_WEIGHTS,
    locked: {},
    month: 9,
    seed: 42,
    iterations: 1800,
    ...overrides,
  };
}
