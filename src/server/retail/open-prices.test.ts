import { describe, expect, it, vi } from "vitest";
import { openPricesProvider, parseLocations, parsePrices } from "./open-prices";
import { providerForRetailer } from "./registry";

// Response shapes follow the Open Prices API (paginated: items/page/pages/size/total).
const pricesPage = {
  items: [
    {
      id: 101,
      product_code: "3560070472888",
      product_name: null,
      price: "1.25",
      price_is_discounted: false,
      discount_type: null,
      price_per: null,
      currency: "EUR",
      date: "2026-09-20",
      location_id: 55,
      product: { code: "3560070472888", product_name: "Riz long grain", brands: "Marque X", product_quantity: 1000, product_quantity_unit: "g", quantity: "1 kg" },
    },
    { id: 102, product_code: null, category_tag: "en:apples", price: 2.4, price_per: "KILOGRAM", currency: "EUR", date: "2026-09-21", product: null },
    { id: 103, product_code: "123", price: 3, currency: "CHF", date: "2026-09-21", product: null },
  ],
  page: 1,
  pages: 1,
  size: 100,
  total: 3,
};

describe("Open Prices parsing", () => {
  it("keeps only barcode prices in euros, with their observation date", () => {
    const prices = parsePrices(pricesPage, "55");
    expect(prices).toHaveLength(1);
    const [p] = prices;
    expect(p.priceCents).toBe(125);
    expect(p.product.ean).toBe("3560070472888");
    expect(p.product.packQuantity).toBe(1000);
    expect(p.product.packUnit).toBe("g");
    expect(p.observedAt.toISOString().slice(0, 10)).toBe("2026-09-20");
    expect(p.sourceUrl).toContain("/prices/101");
  });

  it("parses locations", () => {
    const stores = parseLocations({
      items: [{ id: 55, osm_id: 1, osm_name: "Carrefour Market", osm_brand: "Carrefour", osm_address_city: "Annecy", osm_address_postcode: "74000", osm_lat: "45.9", osm_lon: 6.12 }],
      page: 1,
      pages: 1,
      size: 50,
      total: 1,
    });
    expect(stores[0]).toMatchObject({ externalId: "55", brand: "Carrefour", city: "Annecy", latitude: 45.9 });
  });
});

describe("openPricesProvider", () => {
  it("does nothing when disabled", async () => {
    const fetchImpl = vi.fn();
    const provider = openPricesProvider({ enabled: false, userAgent: "test", fetchImpl });
    const res = await provider.fetchPrices({ storeExternalId: "55", eans: ["1"] });
    expect(res.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends a User-Agent and reports HTTP errors without throwing", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 503 }));
    const provider = openPricesProvider({ enabled: true, userAgent: "FOODLEK/test (x)", fetchImpl });
    const res = await provider.searchStores({ city: "Annecy" });
    expect(res).toMatchObject({ ok: false, reason: "error" });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("FOODLEK/test (x)");
  });

  it("returns parsed prices on success", async () => {
    const fetchImpl = vi.fn(async () => Response.json(pricesPage));
    const provider = openPricesProvider({ enabled: true, userAgent: "t", fetchImpl });
    const res = await provider.fetchPrices({ storeExternalId: "55", eans: ["3560070472888"] });
    expect(res.ok && res.data).toHaveLength(1);
  });
});

describe("retailers without permitted access", () => {
  it("say so instead of returning data", async () => {
    const res = await providerForRetailer("carrefour").fetchPrices({ storeExternalId: "x", eans: [] });
    expect(res).toMatchObject({ ok: false, reason: "unavailable" });
  });
});
