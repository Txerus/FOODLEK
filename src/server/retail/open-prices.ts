import { z } from "zod";
import type { PurchaseUnit } from "@/domain/units/units";
import type { PriceRecord, ProviderResult, RetailProvider, StoreRecord } from "./provider";

/**
 * Open Prices (Open Food Facts) — crowd-sourced, dated prices observed in
 * physical stores, identified by OpenStreetMap location. Open data under ODbL:
 * attribution required. Read endpoints are public (no token).
 * API: https://prices.openfoodfacts.org/api/docs
 *
 * These are real observations, but they are not a retailer's live catalogue:
 * each price has the date it was seen, and the interface shows it.
 */

const BASE_URL = "https://prices.openfoodfacts.org/api/v1";

const locationSchema = z.object({
  id: z.number(),
  osm_id: z.number().nullable().optional(),
  osm_name: z.string().nullable().optional(),
  osm_brand: z.string().nullable().optional(),
  osm_address_city: z.string().nullable().optional(),
  osm_address_postcode: z.string().nullable().optional(),
  osm_lat: z.union([z.number(), z.string()]).nullable().optional(),
  osm_lon: z.union([z.number(), z.string()]).nullable().optional(),
});

const productSchema = z
  .object({
    code: z.string().nullable().optional(),
    product_name: z.string().nullable().optional(),
    brands: z.string().nullable().optional(),
    product_quantity: z.number().nullable().optional(),
    product_quantity_unit: z.string().nullable().optional(),
    quantity: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const priceSchema = z.object({
  id: z.number(),
  product_code: z.string().nullable().optional(),
  product_name: z.string().nullable().optional(),
  price: z.union([z.number(), z.string()]),
  price_is_discounted: z.boolean().optional(),
  discount_type: z.string().nullable().optional(),
  price_per: z.string().nullable().optional(),
  currency: z.string(),
  date: z.string().nullable().optional(),
  location_id: z.number().nullable().optional(),
  product: productSchema,
});

export const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), page: z.number(), pages: z.number(), size: z.number(), total: z.number() });

function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function packUnitOf(unit: string | null | undefined): PurchaseUnit | null {
  if (!unit) return null;
  const u = unit.toLowerCase();
  if (u === "g") return "g";
  if (u === "ml") return "ml";
  return null;
}

export function parseLocations(json: unknown): StoreRecord[] {
  const page = pageSchema(locationSchema).parse(json);
  return page.items.map((l) => ({
    externalId: String(l.id),
    name: l.osm_name ?? "Magasin sans nom",
    brand: l.osm_brand ?? null,
    city: l.osm_address_city ?? null,
    postcode: l.osm_address_postcode ?? null,
    latitude: toNumber(l.osm_lat),
    longitude: toNumber(l.osm_lon),
    isDrive: false,
  }));
}

export function parsePrices(json: unknown, storeExternalId: string): PriceRecord[] {
  const page = pageSchema(priceSchema).parse(json);
  const out: PriceRecord[] = [];
  for (const p of page.items) {
    if (p.currency !== "EUR") continue;
    const price = toNumber(p.price);
    if (price === null || !p.date) continue;
    // Category prices (per kg, loose produce) are not tied to a pack; we keep
    // only barcode prices, which map to a real product and pack size.
    if (!p.product_code) continue;
    const packQuantity = p.product?.product_quantity ?? null;
    const packUnit = packUnitOf(p.product?.product_quantity_unit);
    out.push({
      product: {
        externalId: p.product_code,
        ean: p.product_code,
        name: p.product?.product_name ?? p.product_name ?? p.product_code,
        brand: p.product?.brands ?? null,
        packQuantity: packUnit ? packQuantity : null,
        packUnit,
        packLabel: p.product?.quantity ?? null,
        sourceUrl: `https://world.openfoodfacts.org/product/${p.product_code}`,
      },
      storeExternalId,
      priceCents: Math.round(price * 100),
      unitPriceCents: null,
      promotionLabel: p.price_is_discounted ? (p.discount_type ?? "Prix réduit") : null,
      availability: "available",
      observedAt: new Date(`${p.date}T12:00:00Z`),
      sourceUrl: `https://prices.openfoodfacts.org/prices/${p.id}`,
    });
  }
  return out;
}

export interface OpenPricesOptions {
  userAgent: string;
  fetchImpl?: typeof fetch;
  enabled: boolean;
}

export function openPricesProvider(options: OpenPricesOptions): RetailProvider {
  const doFetch = options.fetchImpl ?? fetch;

  async function get(path: string): Promise<ProviderResult<unknown>> {
    if (!options.enabled) {
      return { ok: false, reason: "not_configured", message: "Open Prices est désactivé (OPEN_PRICES_ENABLED=false)." };
    }
    try {
      const response = await doFetch(`${BASE_URL}${path}`, {
        headers: { "User-Agent": options.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 429) return { ok: false, reason: "rate_limited", message: "Limite de requêtes Open Prices atteinte." };
      if (!response.ok) return { ok: false, reason: "error", message: `Open Prices a répondu ${response.status}.` };
      return { ok: true, data: await response.json(), fetchedAt: new Date() };
    } catch (error) {
      return { ok: false, reason: "error", message: error instanceof Error ? error.message : "Erreur réseau" };
    }
  }

  return {
    info: {
      id: "open-prices",
      label: "Open Prices (Open Food Facts)",
      access: "API publique en lecture, données ouvertes",
      license: "ODbL 1.0 — © contributeurs Open Food Facts / Open Prices",
      capabilities: { stores: true, products: true, prices: true },
    },
    async searchStores({ city, name }) {
      const params = new URLSearchParams({ size: "50", order_by: "-price_count" });
      if (city) params.set("osm_address_city__like", city);
      if (name) params.set("osm_name__like", name);
      const res = await get(`/locations?${params}`);
      if (!res.ok) return res;
      try {
        return { ok: true, data: parseLocations(res.data), fetchedAt: res.fetchedAt };
      } catch {
        return { ok: false, reason: "error", message: "Réponse Open Prices inattendue (lieux)." };
      }
    },
    async fetchPrices({ storeExternalId, eans }) {
      if (eans.length === 0) return { ok: true, data: [], fetchedAt: new Date() };
      const params = new URLSearchParams({
        location_id: storeExternalId,
        product_code__in: eans.join(","),
        order_by: "-date",
        size: "100",
      });
      const res = await get(`/prices?${params}`);
      if (!res.ok) return res;
      try {
        return { ok: true, data: parsePrices(res.data, storeExternalId), fetchedAt: res.fetchedAt };
      } catch {
        return { ok: false, reason: "error", message: "Réponse Open Prices inattendue (prix)." };
      }
    },
  };
}
