import "server-only";
import { usableOffers } from "@/domain/shopping/packaging";
import { DEFAULT_RETAIL_PREFERENCES, type RetailPreferences } from "@/domain/retail/types";
import { worstQuality, type DataQuality } from "@/domain/common/data-quality";
import { checkRecipeForEaters, compatibleDiets, recipeAllergens, type Diet } from "@/domain/catalog/diets";
import type { Allergen, IngredientIndex, MealType, Recipe } from "@/domain/catalog/types";
import { mealTarget } from "@/domain/nutrition/targets";
import { computeMemberPortion, cookingQuantities, type CookingQuantity, type MemberPortion } from "@/domain/portions/portions";
import { recipeIngredientGrams, recipeNutritionPerServing, type ComputedNutrition } from "@/domain/recipes/nutrition";
import type { OfferIndex } from "@/domain/retail/types";
import { gramsToPurchaseUnit } from "@/domain/units/units";
import { getCatalog, type Catalog } from "./catalog";
import { loadHouseholdContext, type HouseholdContext } from "./households";
import { loadShoppingOffers } from "./offers";
import { findCurrentPlanId, loadPlanView, planMembers } from "./plans";

export interface ServingCost {
  /** Cents for one standard serving, from unit prices; null if any ingredient has no price. */
  cents: number | null;
  quality: DataQuality;
  missing: string[];
}

/**
 * Approximate cost of one standard serving: each ingredient is valued at the
 * cheapest unit price of its mapped products. This is an estimate — the real
 * cost comes from the packs chosen in the shopping list.
 */
export function estimateServingCost(
  recipe: Recipe,
  ingredients: IngredientIndex,
  offers: OfferIndex,
  prefs: RetailPreferences = DEFAULT_RETAIL_PREFERENCES,
): ServingCost {
  let total = 0;
  const missing: string[] = [];
  const qualities: DataQuality[] = [];
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) continue;
    const grams = recipeIngredientGrams(ri, ing, 1 / recipe.servings);
    const qty = gramsToPurchaseUnit(grams, ing.purchaseUnit, ing.measures);
    // Same filters as the shopping list (availability, promotions accepted or not).
    const priced = usableOffers(offers.get(ing.id) ?? [], prefs);
    if (priced.length === 0) {
      missing.push(ing.name);
      continue;
    }
    const best = priced.reduce((a, b) =>
      (a.priceCents as number) / a.packQuantity <= (b.priceCents as number) / b.packQuantity ? a : b,
    );
    total += (qty * (best.priceCents as number)) / best.packQuantity;
    qualities.push(best.quality);
  }
  const base = worstQuality(qualities);
  return {
    cents: missing.length ? null : Math.round(total),
    quality: missing.length ? "MISSING" : base === "DEMO" ? "DEMO" : "ESTIMATED",
    missing,
  };
}

function retailPrefsOf(ctx: HouseholdContext): RetailPreferences {
  const s = ctx.settings;
  return s ? { organic: s.organic, storeBrand: s.storeBrand, acceptPromotions: s.acceptPromotions } : DEFAULT_RETAIL_PREFERENCES;
}

export interface RecipeCardData {
  recipe: Recipe;
  nutrition: ComputedNutrition;
  cost: ServingCost;
  allergens: Allergen[];
  diets: Diet[];
  eligible: boolean;
  ineligibleReasons: string[];
}

export async function listRecipesForHousehold(householdId: string): Promise<{ cards: RecipeCardData[]; ctx: HouseholdContext }> {
  const [catalog, ctx] = await Promise.all([getCatalog(), loadHouseholdContext(householdId)]);
  const offers = await loadShoppingOffers(ctx.settings?.storeId ?? null, new Date(), householdId);
  const eaters = ctx.members.map((m) => ({ name: m.displayName, constraints: m.constraints }));
  const cards = catalog.recipes.map((recipe) => {
    const check = checkRecipeForEaters(recipe, catalog.ingredientIndex, eaters);
    return {
      recipe,
      nutrition: recipeNutritionPerServing(recipe, catalog.ingredientIndex),
      cost: estimateServingCost(recipe, catalog.ingredientIndex, offers, retailPrefsOf(ctx)),
      allergens: recipeAllergens(recipe, catalog.ingredientIndex),
      diets: compatibleDiets(recipe, catalog.ingredientIndex),
      eligible: check.eligible,
      ineligibleReasons: check.reasons,
    };
  });
  return { cards, ctx };
}

export interface RecipeDetail extends RecipeCardData {
  catalog: Catalog;
  ctx: HouseholdContext;
  portions: MemberPortion[];
  cooking: CookingQuantity[];
  /** When opened from a meal of the plan. */
  slot: { key: string; date: string; mealType: MealType; servesSlotKeys: string[]; planId: string } | null;
  /** Current plan's meals where this recipe could be placed. */
  placement: { planId: string; slots: { key: string; date: string; mealType: MealType }[] } | null;
}

export async function getRecipeDetail(householdId: string, slug: string, slotKey: string | null): Promise<RecipeDetail | null> {
  const catalog = await getCatalog();
  const recipe = catalog.recipesBySlug.get(slug);
  if (!recipe) return null;
  const ctx = await loadHouseholdContext(householdId);
  const offers = await loadShoppingOffers(ctx.settings?.storeId ?? null, new Date(), householdId);
  const eaters = ctx.members.map((m) => ({ name: m.displayName, constraints: m.constraints }));
  const check = checkRecipeForEaters(recipe, catalog.ingredientIndex, eaters);
  const base = {
    recipe,
    nutrition: recipeNutritionPerServing(recipe, catalog.ingredientIndex),
    cost: estimateServingCost(recipe, catalog.ingredientIndex, offers, retailPrefsOf(ctx)),
    allergens: recipeAllergens(recipe, catalog.ingredientIndex),
    diets: compatibleDiets(recipe, catalog.ingredientIndex),
    eligible: check.eligible,
    ineligibleReasons: check.reasons,
    catalog,
    ctx,
  };

  const planId = await findCurrentPlanId(householdId);
  const view = planId ? await loadPlanView(householdId, planId) : null;
  const placement =
    planId && view && check.eligible
      ? {
          planId,
          slots: view.slots
            .filter((s) => recipe.mealTypes.includes(s.mealType) && view.evaluation.assignment[s.key] !== recipe.id)
            .map((s) => ({ key: s.key, date: s.date, mealType: s.mealType })),
        }
      : null;

  // Opened from the plan: use the exact portions of that meal (and its leftovers).
  if (slotKey && planId && view && view.evaluation.assignment[slotKey] === recipe.id) {
    const session = view.evaluation.sessions.find((s) => s.servesSlotKeys.includes(slotKey));
    const keys = session?.servesSlotKeys ?? [slotKey];
    const slot = view.slots.find((s) => s.key === slotKey);
    if (slot) {
      return {
        ...base,
        portions: view.evaluation.portions[slotKey] ?? [],
        cooking: cookingQuantities(keys.flatMap((k) => view.evaluation.portions[k] ?? [])),
        slot: { key: slotKey, date: slot.date, mealType: slot.mealType, servesSlotKeys: keys, planId },
        placement,
      };
    }
  }

  // Otherwise: what a dinner of this recipe would look like for the household.
  const today = new Date();
  const mealType: MealType = recipe.mealTypes.includes("dinner") ? "dinner" : recipe.mealTypes[0];
  const portions = planMembers(ctx, today).map((m) =>
    computeMemberPortion(recipe, catalog.ingredientIndex, {
      memberId: m.profile.id,
      name: m.profile.name,
      target: mealTarget(m.profile, m.targets, mealType),
      favourVegetables: m.targets.effectiveGoal === "lose",
    }),
  );
  return { ...base, portions, cooking: cookingQuantities(portions), slot: null, placement };
}
