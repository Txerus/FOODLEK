import type { Cents } from "../common/money";
import type { Ingredient } from "../catalog/types";
import type { RetailOffer, RetailPreferences } from "../retail/types";

/**
 * Choosing which packs to buy for a given need.
 *
 * A recipe needs 600 g of chicken; the store sells 500 g, 1 kg and an organic
 * 600 g tray. We pick the combination of packs that covers the need at the
 * lowest "effective cost": cash price, plus the value of what would be left
 * over and probably thrown away, plus small penalties for products that go
 * against the household's preferences.
 */

export interface PackagingConfig {
  /** Weight of wasted value for perishable leftovers. */
  wastePenaltyPerishable: number;
  /** Leftovers of long-life products are mostly stock, only lightly penalised. */
  wastePenaltyLongLife: number;
  /** Shelf life above which a product is considered long-life. */
  longLifeDays: number;
  /** Relative penalty applied to offers that go against preferences. */
  preferencePenalty: number;
  /** Relative penalty applied to substitution products. */
  substitutionPenalty: number;
  /** Safety cap on packs of a single product (the smallest pack is never capped). */
  maxPacksPerOffer: number;
}

export const DEFAULT_PACKAGING_CONFIG: PackagingConfig = {
  wastePenaltyPerishable: 1,
  wastePenaltyLongLife: 0.15,
  longLifeDays: 60,
  preferencePenalty: 0.12,
  substitutionPenalty: 0.1,
  maxPacksPerOffer: 12,
};

export interface PackChoice {
  offer: RetailOffer;
  count: number;
}

export interface PackSelection {
  choices: PackChoice[];
  purchasedQuantity: number;
  leftover: number;
  costCents: Cents;
  /** Cash value of the leftover, at the chosen packs' unit price. */
  leftoverValueCents: Cents;
}

export function wasteWeight(ingredient: Ingredient, config: PackagingConfig): number {
  if (ingredient.isStaple) return 0;
  return ingredient.shelfLifeDays > config.longLifeDays ? config.wastePenaltyLongLife : config.wastePenaltyPerishable;
}

function offerPenaltyFactor(offer: RetailOffer, prefs: RetailPreferences, config: PackagingConfig): number {
  let f = 1;
  if (prefs.organic === "prefer" && !offer.isOrganic) f += config.preferencePenalty;
  if (prefs.storeBrand === "prefer" && !offer.isStoreBrand) f += config.preferencePenalty;
  if (prefs.storeBrand === "avoid" && offer.isStoreBrand) f += config.preferencePenalty;
  if (offer.substitution) f += config.substitutionPenalty;
  return f;
}

export function usableOffers(offers: readonly RetailOffer[], prefs: RetailPreferences): RetailOffer[] {
  return offers.filter(
    (o) =>
      o.availability !== "unavailable" &&
      o.priceCents !== null &&
      o.packQuantity > 0 &&
      (prefs.acceptPromotions || !o.promotion),
  );
}

/**
 * Exhaustive search over pack counts. Offers per ingredient are few (typically
 * 2–5), so this stays small, and results are cached by the caller.
 */
export function selectPacks(
  need: number,
  ingredient: Ingredient,
  offers: readonly RetailOffer[],
  prefs: RetailPreferences,
  config: PackagingConfig = DEFAULT_PACKAGING_CONFIG,
): PackSelection | null {
  const candidates = usableOffers(offers, prefs)
    .slice()
    // Largest packs first: the smallest pack is searched last and simply fills
    // what remains, without a count cap (loose produce sold per 100 g, eggs by
    // the unit…), so a large need can always be covered.
    .sort((a, b) => b.packQuantity - a.packQuantity || a.productId.localeCompare(b.productId));
  if (candidates.length === 0) return null;
  if (need <= 0) return { choices: [], purchasedQuantity: 0, leftover: 0, costCents: 0, leftoverValueCents: 0 };

  const ww = wasteWeight(ingredient, config);
  // Without a cap the search stays small for usual needs; only a huge search
  // space (many offers × very large need) falls back to the safety cap.
  const searchSize = candidates.slice(0, -1).reduce((n, o) => n * (Math.ceil(need / o.packQuantity) + 1), 1);
  const uncapped = searchSize <= 200_000;
  let bestScore = Infinity;
  let best: number[] | null = null;
  const counts = new Array<number>(candidates.length).fill(0);

  const evaluate = () => {
    let qty = 0;
    let cost = 0;
    let penalised = 0;
    for (let i = 0; i < candidates.length; i++) {
      if (counts[i] === 0) continue;
      const o = candidates[i];
      qty += o.packQuantity * counts[i];
      cost += (o.priceCents as number) * counts[i];
      penalised += (o.priceCents as number) * counts[i] * offerPenaltyFactor(o, prefs, config);
    }
    if (qty + 1e-9 < need) return;
    const leftover = qty - need;
    const avgUnit = cost / qty;
    const score = penalised + ww * leftover * avgUnit;
    // Tie-break: fewer packs, then smaller leftover.
    const packs = counts.reduce((s, c) => s + c, 0);
    const tieScore = score + packs * 1e-6 + leftover * 1e-9;
    if (tieScore < bestScore) {
      bestScore = tieScore;
      best = counts.slice();
    }
  };

  const recurse = (i: number, covered: number) => {
    if (i === candidates.length) {
      evaluate();
      return;
    }
    const remaining = Math.max(0, need - covered);
    const exact = Math.ceil(remaining / candidates[i].packQuantity - 1e-9);
    if (i === candidates.length - 1) {
      // Last (smallest) pack: buying exactly what covers the rest is optimal.
      counts[i] = exact;
      evaluate();
      counts[i] = 0;
      return;
    }
    const maxCount = uncapped ? exact : Math.min(config.maxPacksPerOffer, exact);
    for (let c = 0; c <= maxCount; c++) {
      counts[i] = c;
      recurse(i + 1, covered + c * candidates[i].packQuantity);
    }
    counts[i] = 0;
  };
  recurse(0, 0);

  if (!best) return null;
  const chosen: number[] = best;
  const choices: PackChoice[] = [];
  let purchased = 0;
  let cost = 0;
  chosen.forEach((count, i) => {
    if (count > 0) {
      choices.push({ offer: candidates[i], count });
      purchased += candidates[i].packQuantity * count;
      cost += (candidates[i].priceCents as number) * count;
    }
  });
  const leftover = purchased - need;
  return {
    choices,
    purchasedQuantity: purchased,
    leftover,
    costCents: cost,
    leftoverValueCents: purchased > 0 ? Math.round((leftover * cost) / purchased) : 0,
  };
}
