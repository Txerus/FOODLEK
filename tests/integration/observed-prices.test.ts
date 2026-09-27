import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { INGREDIENT_SEEDS, ingredientId } from "@/data/ingredients";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";
import { listObservedStores, syncObservedPrices } from "@/server/retail/observed-sync";
import { loadOffersForStore } from "@/server/services/offers";

/**
 * Observed prices end to end with a fake Open Prices API: stores of the
 * retailer around a city, products and loose produce, saved as a FOODLEK
 * store whose offers carry the real store and date.
 */

const annecy = {
  id: 1,
  osm_name: "Carrefour Market",
  osm_address_city: "Annecy",
  osm_address_country_code: "FR",
  osm_lat: 45.9,
  osm_lon: 6.12,
  price_count: 40,
};
const paris = {
  id: 2,
  osm_name: "Carrefour City",
  osm_address_city: "Paris",
  osm_address_country_code: "FR",
  osm_lat: 48.85,
  osm_lon: 2.35,
  price_count: 900,
};
const street = {
  id: 3,
  osm_name: "Tabac du Carrefour de la rue",
  osm_address_city: "Annecy",
  osm_address_country_code: "FR",
  osm_lat: 45.9,
  osm_lon: 6.12,
};

const recent = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

function page(items: unknown[]) {
  return { items, page: 1, pages: 1, size: 100, total: items.length };
}

function fakeFetch(url: string): unknown {
  const u = new URL(url);
  const q = u.searchParams;
  if (u.hostname === "world.openfoodfacts.org") {
    // Open Food Facts product API: the rice has a photo, the eggs do not.
    if (u.pathname.endsWith("/3560070000001"))
      return { product: { image_front_url: "https://images.openfoodfacts.org/images/products/356/riz/front_fr.400.jpg" } };
    if (u.pathname.endsWith("/3560070000002")) return { product: { image_front_url: "https://evil.example/eggs.jpg" } };
    return { status: 0 };
  }
  if (u.pathname.endsWith("/locations")) return page([annecy, paris, street]);
  const ids = (q.get("location_id__in") ?? "").split(",").map(Number);
  const tags = q.get("product__categories_tags__overlap") ?? "";
  const category = q.get("category_tag");
  const items: unknown[] = [];
  if (ids.includes(1) && tags.includes("en:long-grain-rices")) {
    items.push({
      id: 101,
      product_code: "3560070000001",
      price: "1.99",
      currency: "EUR",
      date: recent,
      location: annecy,
      product: {
        code: "3560070000001",
        product_name: "Riz long grain",
        brands: "Carrefour",
        product_quantity: 1000,
        product_quantity_unit: "g",
        categories_tags: ["en:long-grain-rices"],
      },
    });
  }
  if (ids.includes(1) && category === "en:zucchini") {
    items.push({
      id: 102,
      type: "CATEGORY",
      category_tag: "en:zucchini",
      price_per: "KILOGRAM",
      price: 2.49,
      currency: "EUR",
      date: recent,
      location: annecy,
      product: null,
    });
  }
  // Eggs only seen in Paris: used as a fallback, and labelled as such.
  if (ids.includes(2) && tags.includes("en:chicken-eggs")) {
    items.push({
      id: 103,
      product_code: "3560070000002",
      price: 2.3,
      currency: "EUR",
      date: recent,
      location: paris,
      product: { code: "3560070000002", product_name: "Œufs plein air", quantity: "6", categories_tags: ["en:chicken-eggs"] },
    });
  }
  // Last resort: any store in France (another retailer here), never abroad.
  if (!q.has("location_id__in") && tags.includes("en:feta")) {
    items.push({
      id: 104,
      product_code: "5200000000003",
      price: 2.1,
      currency: "EUR",
      date: recent,
      location: { id: 9, osm_name: "E.Leclerc", osm_address_city: "Lyon", osm_address_country_code: "FR" },
      product: {
        code: "5200000000003",
        product_name: "Feta AOP",
        product_quantity: 200,
        product_quantity_unit: "g",
        categories_tags: ["en:feta"],
        image_url: "https://images.openfoodfacts.org/images/products/520/feta.jpg",
      },
    });
    items.push({
      id: 105,
      product_code: "5200000000004",
      price: 1.5,
      currency: "EUR",
      date: recent,
      location: { id: 10, osm_name: "Aldi", osm_address_city: "Bruxelles", osm_address_country_code: "BE" },
      product: {
        code: "5200000000004",
        product_name: "Feta",
        product_quantity: 200,
        product_quantity_unit: "g",
        categories_tags: ["en:feta"],
      },
    });
  }
  return page(items);
}

const fetchImpl = (async (input: string | URL | Request) =>
  new Response(JSON.stringify(fakeFetch(String(input))), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })) as typeof fetch;

const ingredients = INGREDIENT_SEEDS.filter((s) => ["riz-long", "courgette", "oeuf", "feta"].includes(s.slug)).map((s) => ({
  id: ingredientId(s.slug),
  slug: s.slug,
  name: s.name,
  purchaseUnit: s.purchaseUnit,
  measures: s.measures,
}));

describe("observed retailer prices", () => {
  it("builds a store with real observed prices around a city", async () => {
    // The database outlives test runs: start without the photo looked up below.
    await db().update(t.retailProducts).set({ imageUrl: null }).where(eq(t.retailProducts.id, "prd_op_carrefour_3560070000001"));
    const result = await syncObservedPrices(db(), ingredients, {
      retailerSlug: "carrefour",
      city: "Annecy",
      radiusKm: 30,
      maxAgeDays: 180,
      userAgent: "FOODLEK tests",
      fetchImpl,
      delayMs: 0,
    });
    expect(result.nearbyStoreCount).toBe(1);
    expect(result.missing).toEqual([]);
    expect(result.priced.find((p) => p.ingredient === "Œuf")?.nearby).toBe(false);
    expect(result.imagesAdded).toBe(1);

    const offers = await loadOffersForStore(result.storeId);
    const rice = offers.get("ing_riz-long")?.[0];
    expect(rice).toMatchObject({
      priceCents: 199,
      packQuantity: 1000,
      retailerName: "Carrefour",
      storeName: "Carrefour Market, Annecy",
      provider: "open-prices",
    });
    expect(rice?.quality).toBe("RECENT");
    expect(rice?.imageUrl).toBe("https://images.openfoodfacts.org/images/products/356/riz/front_fr.400.jpg");
    // A photo hosted elsewhere is refused.
    expect(offers.get("ing_oeuf")?.[0].imageUrl).toBeNull();
    const zucchini = offers.get("ing_courgette")?.[0];
    expect(zucchini).toMatchObject({ priceCents: 25, packQuantity: 100 });
    expect(offers.get("ing_oeuf")?.[0].storeName).toBe("Carrefour City, Paris (hors de votre zone)");
    const feta = offers.get("ing_feta") ?? [];
    expect(feta).toHaveLength(1);
    expect(feta[0]).toMatchObject({
      storeName: "E.Leclerc, Lyon (autre enseigne)",
      quality: "ESTIMATED",
      imageUrl: "https://images.openfoodfacts.org/images/products/520/feta.jpg",
    });

    const stores = await listObservedStores(db());
    expect(stores.find((s) => s.id === result.storeId)?.priceCount).toBe(4);
  });

  it("replaces the store's prices on a new sync", async () => {
    const options = {
      retailerSlug: "carrefour",
      city: "Annecy",
      radiusKm: 30,
      maxAgeDays: 180,
      userAgent: "t",
      fetchImpl,
      delayMs: 0,
    };
    // A price typed in by a household for this store must survive the new sync.
    const storeId = "store_op_carrefour_annecy_30";
    await db()
      .insert(t.retailProducts)
      .values({ id: "prd_manual_test_quinoa", retailerId: "ret_carrefour", name: "Quinoa", packLabel: "500 g", packQuantity: 500, packUnit: "g", provider: "manual" })
      .onConflictDoNothing();
    await db().delete(t.retailPrices).where(eq(t.retailPrices.id, "price_manual_test_quinoa"));
    await db()
      .insert(t.retailPrices)
      .values({ id: "price_manual_test_quinoa", productId: "prd_manual_test_quinoa", storeId, priceCents: 349, unitPriceCents: 698, availability: "available", fetchedAt: new Date(), provider: "manual", quality: "RECENT" });
    const again = await syncObservedPrices(db(), ingredients, options);
    expect(await db().select().from(t.retailPrices).where(eq(t.retailPrices.id, "price_manual_test_quinoa"))).toHaveLength(1);
    const offers = await loadOffersForStore(again.storeId);
    expect(offers.get("ing_riz-long")).toHaveLength(1);
    // The photo found last time is kept without a new lookup.
    expect(again.imagesAdded).toBe(0);
    expect(offers.get("ing_riz-long")?.[0].imageUrl).toContain("openfoodfacts.org");
  });
});
