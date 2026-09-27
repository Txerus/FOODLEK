import type { DataQuality } from "../common/data-quality";
import type { Ingredient, IngredientIndex, IngredientRole, Recipe } from "../catalog/types";
import { nutrientsForGrams, type Nutrients } from "../nutrition/nutrients";
import type { MealTarget } from "../nutrition/targets";
import { nutritionOfItems } from "../recipes/nutrition";
import { roundForKitchen, toGrams, type Unit } from "../units/units";
import { solveBoundedLsq } from "./solver";

/**
 * Personalised portions of a shared recipe.
 *
 * One dish is cooked for the table, but each person receives different
 * amounts of its components. The recipe's ingredients are grouped by role:
 *  - protein, starch and vegetable amounts are scaled independently per person;
 *  - everything else (fat, sauce, aromatics) follows the overall portion size.
 *
 * The scaling factors are the solution of a small bounded least-squares
 * problem that brings the portion close to the person's per-meal energy
 * target, reaches their protein target, and stays close to the recipe's
 * intended proportions. See docs/ALGORITHMS.md.
 */

export type ScaledGroup = "protein" | "starch" | "vegetable";
const SCALED_GROUPS: readonly ScaledGroup[] = ["protein", "starch", "vegetable"];

export function groupOfRole(role: IngredientRole): ScaledGroup | "rest" {
  if (role === "protein" || role === "starch" || role === "vegetable") return role;
  return "rest";
}

export interface PortionConfig {
  bounds: Record<ScaledGroup, { min: number; max: number }>;
  /** Preferred factor when nothing else matters. Vegetables are favoured for weight-loss goals. */
  prior: Record<ScaledGroup, number>;
  vegetablePriorForLoss: number;
  weights: { energy: number; protein: number; proportions: number };
  restBounds: { min: number; max: number };
}

export const DEFAULT_PORTION_CONFIG: PortionConfig = {
  bounds: {
    protein: { min: 0.6, max: 2.0 },
    starch: { min: 0.3, max: 2.2 },
    vegetable: { min: 0.8, max: 2.0 },
  },
  prior: { protein: 1, starch: 1, vegetable: 1 },
  vegetablePriorForLoss: 1.4,
  weights: { energy: 1, protein: 0.8, proportions: 0.03 },
  restBounds: { min: 0.75, max: 1.3 },
};

export interface EaterForPortion {
  memberId: string;
  name: string;
  target: MealTarget;
  /** Weight-loss profiles get more vegetables for satiety. */
  favourVegetables: boolean;
}

export interface PortionItem {
  ingredientId: string;
  ingredientName: string;
  role: IngredientRole;
  /** Rounded for display ("½ œuf", "85 g"). */
  quantity: number;
  /** Exact amount on this plate, in `unit`: nutrition and shopping use it, never the rounded one. */
  exactQuantity: number;
  unit: Unit;
  /** Exact weight on this plate. */
  grams: number;
  /** For starches with a known cooking yield: approximate cooked weight. */
  cookedGrams: number | null;
}

export interface MemberPortion {
  memberId: string;
  name: string;
  factors: Record<ScaledGroup | "rest", number>;
  items: PortionItem[];
  nutrients: Nutrients;
  nutritionQuality: DataQuality;
  target: MealTarget;
}

interface GroupTotals {
  kcal: number;
  protein: number;
}

function perServingGroupTotals(recipe: Recipe, ingredients: IngredientIndex): Record<ScaledGroup | "rest", GroupTotals> {
  const totals: Record<ScaledGroup | "rest", GroupTotals> = {
    protein: { kcal: 0, protein: 0 },
    starch: { kcal: 0, protein: 0 },
    vegetable: { kcal: 0, protein: 0 },
    rest: { kcal: 0, protein: 0 },
  };
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing?.composition) continue;
    const grams = toGrams(ri.quantity / recipe.servings, ri.unit, ing.measures);
    const n = nutrientsForGrams(ing.composition, grams).nutrients;
    const g = groupOfRole(ri.role);
    totals[g].kcal += n.energyKcal;
    totals[g].protein += n.proteinG;
  }
  return totals;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function solvePortionFactors(
  totals: Record<ScaledGroup | "rest", GroupTotals>,
  eater: EaterForPortion,
  config: PortionConfig = DEFAULT_PORTION_CONFIG,
): Record<ScaledGroup | "rest", number> {
  const baseKcal = totals.protein.kcal + totals.starch.kcal + totals.vegetable.kcal + totals.rest.kcal;
  const targetKcal = eater.target.energyKcal;
  // Sauces and fats follow the overall size of the plate, dampened.
  const rest = baseKcal > 0 ? clamp(Math.sqrt(targetKcal / baseKcal), config.restBounds.min, config.restBounds.max) : 1;

  const prior: Record<ScaledGroup, number> = {
    ...config.prior,
    vegetable: eater.favourVegetables ? config.vegetablePriorForLoss : config.prior.vegetable,
  };

  const lower = SCALED_GROUPS.map((g) => config.bounds[g].min);
  const upper = SCALED_GROUPS.map((g) => config.bounds[g].max);

  const build = (withProtein: boolean) => {
    const a: number[][] = [];
    const b: number[] = [];
    const we = Math.sqrt(config.weights.energy);
    a.push(SCALED_GROUPS.map((g) => (we * totals[g].kcal) / targetKcal));
    b.push(we * (targetKcal - rest * totals.rest.kcal) / targetKcal);
    const proteinTarget = eater.target.proteinG;
    if (withProtein && proteinTarget !== null && proteinTarget > 0) {
      const wp = Math.sqrt(config.weights.protein);
      a.push(SCALED_GROUPS.map((g) => (wp * totals[g].protein) / proteinTarget));
      b.push(wp * (proteinTarget - rest * totals.rest.protein) / proteinTarget);
    }
    const wr = Math.sqrt(config.weights.proportions);
    SCALED_GROUPS.forEach((g, i) => {
      const row = [0, 0, 0];
      row[i] = wr;
      a.push(row);
      b.push(wr * prior[g]);
    });
    return { a, b, lower, upper };
  };

  // Protein is a floor, not a ceiling: first solve without it; only pull
  // protein up if the energy-only solution falls short of the target.
  let x = solveBoundedLsq(build(false));
  const proteinTarget = eater.target.proteinG;
  if (proteinTarget !== null) {
    const protein = SCALED_GROUPS.reduce((s, g, i) => s + x[i] * totals[g].protein, rest * totals.rest.protein);
    if (protein < proteinTarget) x = solveBoundedLsq(build(true));
  }

  return { protein: x[0], starch: x[1], vegetable: x[2], rest };
}

function portionItemsFor(
  recipe: Recipe,
  ingredients: IngredientIndex,
  factors: Record<ScaledGroup | "rest", number>,
): { items: PortionItem[]; weighted: { ingredient: Ingredient; grams: number }[] } {
  const items: PortionItem[] = [];
  const weighted: { ingredient: Ingredient; grams: number }[] = [];
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) continue;
    const raw = (ri.quantity / recipe.servings) * factors[groupOfRole(ri.role)];
    // Rounding each plate (½ egg minimum…) would add up to phantom quantities
    // on the shopping list: plates keep the exact amount, and only what is
    // shown is rounded (the cooking total is rounded once, on the sum).
    const grams = toGrams(raw, ri.unit, ing.measures);
    items.push({
      ingredientId: ing.id,
      ingredientName: ing.name,
      role: ri.role,
      quantity: roundForKitchen(raw, ri.unit),
      exactQuantity: raw,
      unit: ri.unit,
      grams,
      cookedGrams: ing.cookedYield ? Math.round((grams * ing.cookedYield) / 5) * 5 : null,
    });
    weighted.push({ ingredient: ing, grams });
  }
  return { items, weighted };
}

export function computeMemberPortion(
  recipe: Recipe,
  ingredients: IngredientIndex,
  eater: EaterForPortion,
  config: PortionConfig = DEFAULT_PORTION_CONFIG,
): MemberPortion {
  const totals = perServingGroupTotals(recipe, ingredients);
  const factors = solvePortionFactors(totals, eater, config);
  const { items, weighted } = portionItemsFor(recipe, ingredients, factors);
  const nutrition = nutritionOfItems(weighted);
  const quality: DataQuality = eater.target.estimated && nutrition.quality !== "MISSING" ? "ESTIMATED" : nutrition.quality;
  return {
    memberId: eater.memberId,
    name: eater.name,
    factors,
    items,
    nutrients: nutrition.nutrients,
    nutritionQuality: quality,
    target: eater.target,
  };
}

export interface CookingQuantity {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: Unit;
  grams: number;
}

/**
 * What to actually weigh for the cooking session: the exact sum of every
 * person's portion (so the shopping list and the plates always add up),
 * rounded once for the cook.
 */
export function cookingQuantities(portions: readonly MemberPortion[]): CookingQuantity[] {
  const byIngredient = new Map<string, CookingQuantity>();
  for (const p of portions) {
    for (const item of p.items) {
      const key = `${item.ingredientId}:${item.unit}`;
      const existing = byIngredient.get(key);
      if (existing) {
        existing.quantity += item.exactQuantity;
        existing.grams += item.grams;
      } else {
        byIngredient.set(key, {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          quantity: item.exactQuantity,
          unit: item.unit,
          grams: item.grams,
        });
      }
    }
  }
  return [...byIngredient.values()].map((q) => ({ ...q, quantity: roundForKitchen(q.quantity, q.unit) }));
}
