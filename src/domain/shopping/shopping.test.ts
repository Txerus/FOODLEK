import { describe, expect, it } from "vitest";
import type { Ingredient } from "../catalog/types";
import type { RetailOffer } from "../retail/types";
import { DEFAULT_RETAIL_PREFERENCES } from "../retail/types";
import { aggregateNeeds, buildShoppingList, type MealUsage } from "./aggregate";
import { selectPacks } from "./packaging";

const carrot: Ingredient = {
  id: "ing_carotte",
  slug: "carotte",
  name: "Carotte",
  aisle: "fruits_legumes",
  purchaseUnit: "g",
  measures: { gramsPerPiece: 61 },
  composition: null,
  allergens: [],
  animalOrigin: "none",
  isPork: false,
  containsAlcohol: false,
  isStaple: false,
  shelfLifeDays: 21,
  cookedYield: null,
  proteinFamily: null,
  pieceLabel: null,
};

const chicken: Ingredient = { ...carrot, id: "ing_poulet", slug: "poulet", name: "Poulet", aisle: "boucherie", shelfLifeDays: 3 };
const oil: Ingredient = { ...carrot, id: "ing_huile", slug: "huile", name: "Huile", aisle: "epicerie", purchaseUnit: "ml", measures: { gramsPerMl: 0.9 }, isStaple: true, shelfLifeDays: 540 };

function offer(id: string, qty: number, price: number, extra: Partial<RetailOffer> = {}): RetailOffer {
  return {
    productId: id,
    retailerId: "r",
    retailerName: "R",
    storeId: "s",
    storeName: "S",
    externalId: null,
    ean: null,
    name: id,
    brand: null,
    packLabel: `${qty} g`,
    packQuantity: qty,
    packUnit: "g",
    priceCents: price,
    unitPriceCents: null,
    isOrganic: false,
    isStoreBrand: false,
    promotion: null,
    availability: "available",
    fetchedAt: new Date("2026-09-28T10:00:00Z"),
    provider: "test",
    sourceUrl: null,
    quality: "RECENT",
    substitution: null,
    ...extra,
  };
}

const chickenOffers = [offer("p500", 500, 580), offer("p1000", 1000, 1020), offer("bio600", 600, 950, { isOrganic: true })];

describe("selectPacks", () => {
  it("covers the need at the lowest effective cost", () => {
    const s = selectPacks(600, chicken, chickenOffers, DEFAULT_RETAIL_PREFERENCES);
    expect(s).not.toBeNull();
    const total = s!.choices.reduce((q, c) => q + c.offer.packQuantity * c.count, 0);
    expect(total).toBeGreaterThanOrEqual(600);
    // 1 kg (10,20 €) leaves 400 g of perishable chicken; 2 × 500 g (11,60 €)
    // too. The 600 g tray (9,50 €) is cheaper in cash and leaves nothing.
    expect(s!.choices[0].offer.productId).toBe("bio600");
    expect(s!.leftover).toBe(0);
  });

  it("picks the exact small pack when the need is small", () => {
    const s = selectPacks(450, chicken, chickenOffers, DEFAULT_RETAIL_PREFERENCES);
    expect(s!.choices).toEqual([{ offer: chickenOffers[0], count: 1 }]);
    expect(s!.leftover).toBe(50);
  });

  it("combines several packs when needed", () => {
    const s = selectPacks(1400, chicken, chickenOffers, DEFAULT_RETAIL_PREFERENCES);
    const total = s!.choices.reduce((q, c) => q + c.offer.packQuantity * c.count, 0);
    expect(total).toBeGreaterThanOrEqual(1400);
    expect(s!.costCents).toBeLessThanOrEqual(1020 + 580);
  });

  it("does not penalise leftovers of staples", () => {
    const s = selectPacks(30, oil, [offer("o500", 500, 499), offer("o1000", 1000, 899)], DEFAULT_RETAIL_PREFERENCES);
    expect(s!.choices[0].offer.productId).toBe("o500");
  });

  it("ignores unavailable or unpriced offers and returns null when nothing is usable", () => {
    const s = selectPacks(100, chicken, [offer("x", 500, 500, { availability: "unavailable" }), offer("y", 500, 0, { priceCents: null })], DEFAULT_RETAIL_PREFERENCES);
    expect(s).toBeNull();
  });

  it("avoids promotions when the household refuses them", () => {
    const promo = offer("promo", 500, 300, { promotion: { label: "-40 %", validUntil: null } });
    const s = selectPacks(400, chicken, [promo, chickenOffers[0]], { ...DEFAULT_RETAIL_PREFERENCES, acceptPromotions: false });
    expect(s!.choices[0].offer.productId).toBe("p500");
  });
});

describe("buildShoppingList", () => {
  const ingredients = new Map([carrot, chicken, oil].map((i) => [i.id, i]));
  const meals: MealUsage[] = [
    { mealKey: "a", recipeId: "rA", recipeTitle: "A", quantities: [{ ingredientId: carrot.id, ingredientName: "Carotte", quantity: 250, unit: "g", grams: 250 }] },
    { mealKey: "b", recipeId: "rB", recipeTitle: "B", quantities: [{ ingredientId: carrot.id, ingredientName: "Carotte", quantity: 400, unit: "g", grams: 400 }] },
    {
      mealKey: "c",
      recipeId: "rC",
      recipeTitle: "C",
      quantities: [
        { ingredientId: carrot.id, ingredientName: "Carotte", quantity: 300, unit: "g", grams: 300 },
        { ingredientId: oil.id, ingredientName: "Huile", quantity: 1, unit: "tbsp", grams: 13.5 },
      ],
    },
  ];
  const offers = new Map<string, RetailOffer[]>([
    [carrot.id, [offer("c1kg", 1000, 129)]],
    [oil.id, [offer("oil", 500, 499, { packUnit: "ml" })]],
  ]);

  it("merges the same ingredient across recipes and reasons in packs", () => {
    const needs = aggregateNeeds(meals, ingredients);
    expect(needs.get(carrot.id)?.needed).toBe(950);
    const list = buildShoppingList(meals, ingredients, offers, [], DEFAULT_RETAIL_PREFERENCES);
    const line = list.lines.find((l) => l.ingredientId === carrot.id)!;
    expect(line.needed).toBe(950);
    expect(line.choices).toEqual([{ offer: offers.get(carrot.id)![0], count: 1 }]);
    expect(line.leftover).toBe(50);
    expect(line.usedIn).toHaveLength(3);
  });

  it("removes what the pantry already covers", () => {
    const list = buildShoppingList(meals, ingredients, offers, [{ ingredientId: oil.id, quantity: null }], DEFAULT_RETAIL_PREFERENCES);
    const oilLine = list.lines.find((l) => l.ingredientId === oil.id)!;
    expect(oilLine.toBuy).toBe(0);
    expect(oilLine.costCents).toBe(0);
    expect(list.totalCents).toBe(129);
  });

  it("subtracts partial pantry quantities", () => {
    const list = buildShoppingList(meals, ingredients, offers, [{ ingredientId: carrot.id, quantity: 200 }], DEFAULT_RETAIL_PREFERENCES);
    expect(list.lines.find((l) => l.ingredientId === carrot.id)!.toBuy).toBe(750);
  });

  it("flags missing prices instead of inventing them", () => {
    const list = buildShoppingList(meals, ingredients, new Map(), [], DEFAULT_RETAIL_PREFERENCES);
    expect(list.missingPriceCount).toBe(2);
    expect(list.totalCents).toBe(0);
    expect(list.quality).toBe("MISSING");
    expect(list.lines.every((l) => l.costCents === null)).toBe(true);
  });

  it("groups lines by aisle and computes the usage ratio", () => {
    const list = buildShoppingList(meals, ingredients, offers, [], DEFAULT_RETAIL_PREFERENCES);
    expect(list.byAisle.map((g) => g.aisle)).toEqual(["fruits_legumes", "epicerie"]);
    expect(list.usageRatio).toBeCloseTo(0.95);
  });
});
