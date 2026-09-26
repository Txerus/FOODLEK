import { worstQuality, type DataQuality } from "../common/data-quality";
import type { Cents } from "../common/money";
import { AISLES, type Aisle, type Ingredient, type IngredientIndex } from "../catalog/types";
import type { CookingQuantity } from "../portions/portions";
import type { OfferIndex, RetailPreferences } from "../retail/types";
import { gramsToPurchaseUnit, type PurchaseUnit } from "../units/units";
import { DEFAULT_PACKAGING_CONFIG, selectPacks, wasteWeight, type PackagingConfig, type PackChoice } from "./packaging";

/**
 * From the cooking quantities of every meal of the week to a shopping list
 * that reasons in commercial packs.
 */

export interface MealUsage {
  mealKey: string;
  recipeId: string;
  recipeTitle: string;
  quantities: readonly CookingQuantity[];
}

export interface PantryItem {
  ingredientId: string;
  /** Amount in the ingredient's purchase unit, or null for "I have enough". */
  quantity: number | null;
}

export interface ShoppingLine {
  ingredientId: string;
  ingredientName: string;
  aisle: Aisle;
  unit: PurchaseUnit;
  /** Total amount the recipes of the week use. */
  needed: number;
  /** Covered by what the household already has. */
  fromPantry: number;
  toBuy: number;
  choices: PackChoice[];
  purchasedQuantity: number;
  /** What remains after the week, from purchased packs only. */
  leftover: number;
  leftoverIsWaste: boolean;
  costCents: Cents | null;
  leftoverValueCents: Cents;
  quality: DataQuality;
  /** No usable price for this ingredient at the selected store. */
  priceMissing: boolean;
  usedIn: { mealKey: string; recipeId: string; recipeTitle: string; quantity: number }[];
  isStaple: boolean;
}

export interface ShoppingList {
  lines: ShoppingLine[];
  byAisle: { aisle: Aisle; lines: ShoppingLine[] }[];
  totalCents: Cents;
  pricedLineCount: number;
  missingPriceCount: number;
  quality: DataQuality;
  /** Value of the food actually eaten this week (purchased lines only). */
  consumedValueCents: Cents;
  /** Share of perishable purchases that the menu actually uses. */
  usageRatio: number | null;
  /** Estimated wasted value (perishable leftovers). */
  wasteValueCents: Cents;
}

export function aggregateNeeds(
  meals: readonly MealUsage[],
  ingredients: IngredientIndex,
): Map<string, { ingredient: Ingredient; needed: number; usedIn: ShoppingLine["usedIn"] }> {
  const needs = new Map<string, { ingredient: Ingredient; needed: number; usedIn: ShoppingLine["usedIn"] }>();
  for (const meal of meals) {
    for (const q of meal.quantities) {
      const ingredient = ingredients.get(q.ingredientId);
      if (!ingredient) continue;
      const amount = gramsToPurchaseUnit(q.grams, ingredient.purchaseUnit, ingredient.measures);
      const entry = needs.get(ingredient.id) ?? { ingredient, needed: 0, usedIn: [] };
      entry.needed += amount;
      entry.usedIn.push({ mealKey: meal.mealKey, recipeId: meal.recipeId, recipeTitle: meal.recipeTitle, quantity: amount });
      needs.set(ingredient.id, entry);
    }
  }
  return needs;
}

export type PackCache = Map<string, ReturnType<typeof selectPacks>>;

/**
 * Needs are rounded up to a whole gram, millilitre or piece before pack
 * selection: nobody buys 0.3 egg, and it lets cached choices be reused.
 */
function roundNeed(need: number): number {
  const rounded = Math.ceil(need - 1e-9);
  return rounded > 0 ? rounded : 0;
}

export function buildShoppingList(
  meals: readonly MealUsage[],
  ingredients: IngredientIndex,
  offers: OfferIndex,
  pantry: readonly PantryItem[],
  prefs: RetailPreferences,
  config: PackagingConfig = DEFAULT_PACKAGING_CONFIG,
  cache?: PackCache,
): ShoppingList {
  const needs = aggregateNeeds(meals, ingredients);
  const pantryById = new Map(pantry.map((p) => [p.ingredientId, p]));
  const lines: ShoppingLine[] = [];

  for (const { ingredient, needed, usedIn } of needs.values()) {
    const pantryItem = pantryById.get(ingredient.id);
    const fromPantry = pantryItem ? (pantryItem.quantity === null ? needed : Math.min(needed, pantryItem.quantity)) : 0;
    const toBuy = roundNeed(Math.max(0, needed - fromPantry));
    const ingredientOffers = offers.get(ingredient.id) ?? [];

    let selection: ReturnType<typeof selectPacks>;
    if (toBuy <= 0) {
      selection = { choices: [], purchasedQuantity: 0, leftover: 0, costCents: 0, leftoverValueCents: 0 };
    } else {
      const key = `${ingredient.id}:${toBuy}`;
      if (cache?.has(key)) {
        selection = cache.get(key) ?? null;
      } else {
        selection = selectPacks(toBuy, ingredient, ingredientOffers, prefs, config);
        cache?.set(key, selection);
      }
    }

    const priceMissing = toBuy > 0 && selection === null;
    const qualities = selection?.choices.map((c) => c.offer.quality) ?? [];
    lines.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      aisle: ingredient.aisle,
      unit: ingredient.purchaseUnit,
      needed,
      fromPantry,
      toBuy,
      choices: selection?.choices ?? [],
      purchasedQuantity: selection?.purchasedQuantity ?? 0,
      leftover: selection ? selection.purchasedQuantity - toBuy : 0,
      leftoverIsWaste: wasteWeight(ingredient, config) >= config.wastePenaltyPerishable,
      costCents: priceMissing ? null : (selection?.costCents ?? 0),
      leftoverValueCents: selection?.leftoverValueCents ?? 0,
      quality: priceMissing ? "MISSING" : toBuy === 0 ? "VERIFIED" : worstQuality(qualities),
      priceMissing,
      usedIn,
      isStaple: ingredient.isStaple,
    });
  }

  lines.sort((a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.ingredientName.localeCompare(b.ingredientName, "fr"));

  const byAisle = AISLES.map((aisle) => ({ aisle, lines: lines.filter((l) => l.aisle === aisle) })).filter(
    (g) => g.lines.length > 0,
  );

  const bought = lines.filter((l) => l.toBuy > 0);
  const totalCents = bought.reduce((s, l) => s + (l.costCents ?? 0), 0);
  const missingPriceCount = bought.filter((l) => l.priceMissing).length;

  let perishablePurchased = 0;
  let perishableUsed = 0;
  let wasteValue = 0;
  let consumed = 0;
  for (const l of bought) {
    if (l.costCents === null || l.purchasedQuantity <= 0) continue;
    const usedShare = Math.min(1, l.toBuy / l.purchasedQuantity);
    consumed += Math.round(l.costCents * usedShare);
    if (l.leftoverIsWaste) {
      perishablePurchased += l.costCents;
      perishableUsed += l.costCents * usedShare;
      wasteValue += l.leftoverValueCents;
    }
  }

  const pricedQualities = bought.map((l) => l.quality);
  return {
    lines,
    byAisle,
    totalCents,
    pricedLineCount: bought.length - missingPriceCount,
    missingPriceCount,
    quality: bought.length === 0 ? "VERIFIED" : worstQuality(pricedQualities),
    consumedValueCents: consumed,
    usageRatio: perishablePurchased > 0 ? perishableUsed / perishablePurchased : null,
    wasteValueCents: Math.round(wasteValue),
  };
}
