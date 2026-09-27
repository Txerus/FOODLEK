import { worstQuality, type DataQuality } from "../common/data-quality";
import type { Cents } from "../common/money";
import type { ShoppingLine } from "./aggregate";

/**
 * Cost of each dish of the week: the value of the ingredients it uses, at the
 * price paid for them (pack price ÷ quantity bought). What comes from the
 * pantry costs nothing this week. When an ingredient has no price, the dish
 * cost is a lower bound and says so.
 */

export interface MealCost {
  mealKey: string;
  cents: Cents;
  /** Some ingredients of this dish have no known price. */
  partial: boolean;
  missingIngredients: string[];
  quality: DataQuality;
}

export function mealCosts(lines: readonly ShoppingLine[]): Map<string, MealCost> {
  const out = new Map<string, MealCost>();
  const entry = (mealKey: string): MealCost => {
    let e = out.get(mealKey);
    if (!e) {
      e = { mealKey, cents: 0, partial: false, missingIngredients: [], quality: "VERIFIED" };
      out.set(mealKey, e);
    }
    return e;
  };

  for (const line of lines) {
    if (line.needed <= 0) continue;
    // Share of what the recipes use that has to be bought (the rest is in the pantry).
    const boughtShare = Math.max(0, Math.min(1, (line.needed - line.fromPantry) / line.needed));
    const unitPrice = line.costCents !== null && line.purchasedQuantity > 0 ? line.costCents / line.purchasedQuantity : null;
    for (const use of line.usedIn) {
      const e = entry(use.mealKey);
      if (boughtShare === 0) continue;
      if (unitPrice === null) {
        e.partial = true;
        if (!e.missingIngredients.includes(line.ingredientName)) e.missingIngredients.push(line.ingredientName);
        continue;
      }
      e.cents += use.quantity * boughtShare * unitPrice;
      e.quality = worstQuality([e.quality, line.quality]);
    }
  }
  for (const e of out.values()) {
    e.cents = Math.round(e.cents);
    if (e.partial) e.quality = worstQuality([e.quality, "MISSING"]);
  }
  return out;
}
