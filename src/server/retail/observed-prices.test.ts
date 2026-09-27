import { describe, expect, it } from "vitest";
import { OBSERVED_PRICE_SPECS } from "@/data/open-prices-categories";
import {
  cityCentre,
  isRetailerLocation,
  looseOffer,
  packFor,
  pageOf,
  parseDrainedWeight,
  parsePieceCount,
  parseQuantityText,
  priceSchema,
  productOffers,
  type OpenPricesPrice,
} from "./observed-prices";

const carrefour = { id: 12, osm_name: "Carrefour Market", osm_address_city: "Annecy", osm_address_country_code: "FR", osm_lat: "45.9", osm_lon: "6.12" };

function price(over: Partial<OpenPricesPrice> & { product?: OpenPricesPrice["product"] }): OpenPricesPrice {
  return priceSchema.parse({ id: 1, currency: "EUR", date: "2026-09-20", location_id: 12, location: carrefour, ...over });
}

describe("reading labels", () => {
  it("reads quantities, multipacks and litres", () => {
    expect(parseQuantityText("500 g")).toEqual({ quantity: 500, unit: "g" });
    expect(parseQuantityText("4 x 125 g")).toEqual({ quantity: 500, unit: "g" });
    expect(parseQuantityText("1,5 kg")).toEqual({ quantity: 1500, unit: "g" });
    expect(parseQuantityText("75 cl")).toEqual({ quantity: 750, unit: "ml" });
    expect(parseQuantityText("sans poids")).toBeNull();
  });

  it("reads a drained weight only when it is written", () => {
    expect(parseDrainedWeight("400 g (265 g égoutté)")).toBe(265);
    expect(parseDrainedWeight("Poids net égoutté : 140 g")).toBe(140);
    expect(parseDrainedWeight("400 g")).toBeNull();
  });

  it("reads piece counts", () => {
    expect(parsePieceCount("6")).toBe(6);
    expect(parsePieceCount("boîte de 12")).toBe(12);
    expect(parsePieceCount("x6")).toBe(6);
    expect(parsePieceCount("8 tortillas")).toBe(8);
    expect(parsePieceCount("370 g")).toBeNull();
  });

  it("converts g ↔ ml only with a known density", () => {
    const spec = OBSERVED_PRICE_SPECS["lait-de-coco"];
    const product = { product_quantity: 400, product_quantity_unit: "g", quantity: "400 g" };
    expect(packFor(product, "ml", { gramsPerMl: 1.0 }, spec)?.quantity).toBe(400);
    expect(packFor(product, "ml", {}, spec)).toBeNull();
  });
});

describe("stores of a retailer", () => {
  it("keeps real stores of the brand, in France", () => {
    expect(isRetailerLocation(carrefour, ["carrefour"])).toBe(true);
    expect(isRetailerLocation({ id: 2, osm_name: "Boulangerie du Carrefour de la rue", osm_address_country_code: "FR" }, ["carrefour"])).toBe(false);
    expect(isRetailerLocation({ id: 3, osm_name: "Carrefour", osm_address_country_code: "BE" }, ["carrefour"])).toBe(false);
    expect(isRetailerLocation({ id: 4, osm_name: "Carrefourchette" }, ["carrefour"])).toBe(false);
  });

  it("locates a city from its stores", () => {
    const centre = cityCentre([carrefour, { ...carrefour, id: 13, osm_lat: 45.92, osm_lon: 6.14 }], "annecy");
    expect(centre?.lat).toBeCloseTo(45.91);
    expect(cityCentre([carrefour], "Lyon")).toBeNull();
  });
});

describe("offers from observed prices", () => {
  const ingredient = { purchaseUnit: "g" as const, measures: {} };

  it("keeps matching products with their latest regular price", () => {
    const prices = [
      price({ id: 1, product_code: "3560070", price: 1.89, date: "2026-08-01", product: { code: "3560070", product_name: "Riz long grain", product_quantity: 1000, product_quantity_unit: "g", categories_tags: ["en:rices", "en:long-grain-rices"] } }),
      price({ id: 2, product_code: "3560070", price: 1.99, date: "2026-09-10", product: { code: "3560070", product_name: "Riz long grain", product_quantity: 1000, product_quantity_unit: "g", categories_tags: ["en:long-grain-rices"] } }),
      price({ id: 3, product_code: "3560071", price: 2.5, price_is_discounted: true, price_without_discount: 3.1, product: { code: "3560071", product_name: "Riz long cuisson rapide", product_quantity: 500, product_quantity_unit: "g", categories_tags: ["en:long-grain-rices"] } }),
      price({ id: 4, product_code: "3560072", price: 1.2, product: { code: "3560072", product_name: "Riz rond", product_quantity: 1000, product_quantity_unit: "g", categories_tags: ["en:round-rices"] } }),
    ];
    const offers = productOffers(prices, ingredient, OBSERVED_PRICE_SPECS["riz-long"], true);
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ ean: "3560070", priceCents: 199, unitPriceCents: 199, observationCount: 2, observedWhere: "Carrefour Market, Annecy" });
    expect(offers[0].pack).toMatchObject({ quantity: 1000, unit: "g" });
  });

  it("uses the regular price when the observation was a promotion", () => {
    const prices = [
      price({ id: 5, product_code: "1", price: 2, price_is_discounted: true, price_without_discount: 2.8, product: { code: "1", product_name: "Pâtes penne", product_quantity: 500, product_quantity_unit: "g", categories_tags: ["en:dry-durum-wheat-pasta"] } }),
    ];
    expect(productOffers(prices, ingredient, OBSERVED_PRICE_SPECS.pates, true)[0].priceCents).toBe(280);
  });

  it("drops canned goods without a written drained weight", () => {
    const can = (quantity: string) =>
      price({ id: 6, product_code: "2", price: 0.99, product: { code: "2", product_name: "Pois chiches", quantity, product_quantity: 400, product_quantity_unit: "g", categories_tags: ["en:chickpeas", "en:canned-chickpeas"] } });
    expect(productOffers([can("400 g")], ingredient, OBSERVED_PRICE_SPECS["pois-chiches"], true)).toHaveLength(0);
    expect(productOffers([can("400 g (265 g égoutté)")], ingredient, OBSERVED_PRICE_SPECS["pois-chiches"], true)[0].pack.quantity).toBe(265);
  });

  it("sells eggs by count", () => {
    const prices = [price({ id: 7, product_code: "3", price: 2.19, product: { code: "3", product_name: "Œufs plein air", quantity: "6", categories_tags: ["en:chicken-eggs"] } })];
    const offer = productOffers(prices, { purchaseUnit: "piece", measures: { gramsPerPiece: 50 } }, OBSERVED_PRICE_SPECS.oeuf, true)[0];
    expect(offer.pack).toMatchObject({ quantity: 6, unit: "piece" });
    expect(offer.unitPriceCents).toBe(37);
  });

  it("turns loose produce into 100 g steps from the median price per kg", () => {
    const loose = [2.49, 2.99, 2.29].map((p, i) => price({ id: 10 + i, type: "CATEGORY", category_tag: "en:zucchini", price_per: "KILOGRAM", price: p, date: `2026-09-1${i}` }));
    const offer = looseOffer(loose, { name: "Courgette", purchaseUnit: "g", measures: { gramsPerPiece: 196 } }, true);
    expect(offer).toMatchObject({ ean: null, priceCents: 25, observationCount: 3, observedWhere: "médiane de 3 relevés" });
    expect(offer?.pack).toMatchObject({ quantity: 100, unit: "g" });
  });

  it("prices a piece from a per-kg price with the sourced piece weight", () => {
    const loose = [price({ id: 20, type: "CATEGORY", category_tag: "en:lemons", price_per: "KILOGRAM", price: 3 })];
    const offer = looseOffer(loose, { name: "Citron", purchaseUnit: "piece", measures: { gramsPerPiece: 58 } }, false);
    expect(offer?.priceCents).toBe(17);
    expect(offer?.pack.label).toContain("≈ 58 g");
    expect(looseOffer(loose, { name: "Citron", purchaseUnit: "piece", measures: {} }, false)).toBeNull();
  });

  it("parses an API page", () => {
    const page = pageOf(priceSchema).parse({ items: [{ id: 1, price: "1.5", currency: "EUR", product: null }], page: 1, pages: 1, size: 100, total: 1 });
    expect(page.items[0].price).toBe("1.5");
  });
});
