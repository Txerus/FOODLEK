import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";
import { loadShoppingOffers } from "@/server/services/offers";

/**
 * Every shopping line gets a price when one exists somewhere, and says where
 * it comes from: the chosen store, another store (ESTIMATED), or the demo
 * catalogue (DEMO, fictitious).
 */

const days = (n: number) => new Date(Date.now() - n * 86_400_000);

async function storeWith(slug: string, prices: { ingredient: string; cents: number; fetchedAt: Date }[]) {
  const retailerId = `ret_test_${slug}`;
  const storeId = `store_test_${slug}`;
  await db()
    .insert(t.retailers)
    .values({ id: retailerId, slug: `test-${slug}`, name: `Test ${slug}`, isDemo: false, integrationStatus: "live" })
    .onConflictDoNothing();
  await db()
    .insert(t.stores)
    .values({ id: storeId, retailerId, name: `Magasin ${slug}`, city: "Lyon", provider: "open-prices" })
    .onConflictDoNothing();
  for (const p of prices) {
    const productId = `prd_test_${slug}_${p.ingredient}`;
    await db()
      .insert(t.retailProducts)
      .values({
        id: productId,
        retailerId,
        name: `Produit ${p.ingredient}`,
        packLabel: "500 g",
        packQuantity: 500,
        packUnit: "g",
        provider: "open-prices",
        imageUrl: null,
      })
      .onConflictDoNothing();
    await db()
      .insert(t.productMappings)
      .values({ id: `map_${productId}`, ingredientId: `ing_${p.ingredient}`, productId, priority: 0, status: "active" })
      .onConflictDoNothing();
    await db()
      .insert(t.retailPrices)
      .values({
        id: `price_${productId}_${p.cents}`,
        productId,
        storeId,
        priceCents: p.cents,
        unitPriceCents: p.cents * 2,
        availability: "unknown",
        fetchedAt: p.fetchedAt,
        provider: "open-prices",
        quality: "RECENT",
        observedWhere: `Magasin ${slug}, Lyon`,
      })
      .onConflictDoNothing();
  }
  return storeId;
}

let mine: string;

beforeAll(async () => {
  mine = await storeWith("mine", [{ ingredient: "boulgour", cents: 149, fetchedAt: days(2) }]);
  await storeWith("elsewhere", [
    { ingredient: "boulgour", cents: 999, fetchedAt: days(1) },
    { ingredient: "polenta", cents: 189, fetchedAt: days(30) },
  ]);
});

describe("shopping offers with fallbacks", () => {
  it("keeps the chosen store's own price", async () => {
    const offers = await loadShoppingOffers(mine);
    const boulgour = offers.get("ing_boulgour") ?? [];
    expect(boulgour.map((o) => o.priceCents)).toEqual([149]);
    expect(boulgour[0].fallback ?? null).toBeNull();
  });

  it("uses a price seen in another store, as an estimate, with its store", async () => {
    const polenta = (await loadShoppingOffers(mine)).get("ing_polenta") ?? [];
    expect(polenta.length).toBeGreaterThan(0);
    expect(polenta.every((o) => o.fallback === "other_store" && o.quality === "ESTIMATED")).toBe(true);
    expect(
      polenta.some(
        (o) =>
          o.priceCents === 189 &&
          (o.storeName ?? "").includes("Magasin elsewhere") &&
          (o.storeName ?? "").includes("autre magasin"),
      ),
    ).toBe(true);
  });

  it("falls back to the demo catalogue last, flagged as fictitious", async () => {
    const nutmeg = (await loadShoppingOffers(mine)).get("ing_muscade") ?? [];
    expect(nutmeg.length).toBeGreaterThan(0);
    expect(nutmeg.every((o) => o.fallback === "demo" && o.quality === "DEMO" && (o.storeName ?? "").includes("fictif"))).toBe(
      true,
    );
  });

  it("gives every ingredient a price, even without a chosen store", async () => {
    const offers = await loadShoppingOffers(null);
    const ingredients = await db().select({ id: t.ingredients.id }).from(t.ingredients);
    const unpriced = ingredients.filter((i) => !(offers.get(i.id) ?? []).some((o) => o.priceCents !== null));
    expect(unpriced.map((i) => i.id)).toEqual([]);
  });

  it("adds nothing to the demo store", async () => {
    const offers = await loadShoppingOffers("store_demo");
    expect([...offers.values()].flat().some((o) => o.fallback)).toBe(false);
  });
});
