import type { PurchaseUnit } from "@/domain/units/units";

/**
 * Common interface for every retail data source. Each retailer (or open data
 * source) is an adapter; the rest of the application never knows which one
 * produced a price, only its provenance fields.
 *
 * Rules every adapter must follow:
 *  - use an official or explicitly permitted access (API, partner feed, open data);
 *  - never bypass anti-bot protections, never scrape against terms of use;
 *  - when access is impossible, return `unavailable` with a reason instead of data.
 */

export interface StoreRecord {
  externalId: string;
  name: string;
  brand: string | null;
  city: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  isDrive: boolean;
}

export interface ProductRecord {
  externalId: string | null;
  ean: string | null;
  name: string;
  brand: string | null;
  packQuantity: number | null;
  packUnit: PurchaseUnit | null;
  packLabel: string | null;
  sourceUrl: string | null;
}

export interface PriceRecord {
  product: ProductRecord;
  storeExternalId: string;
  priceCents: number | null;
  /** Price per kg / l / piece when the source reports it. */
  unitPriceCents: number | null;
  promotionLabel: string | null;
  availability: "available" | "unavailable" | "unknown";
  /** When the price was observed at the source (not when we fetched it). */
  observedAt: Date;
  sourceUrl: string | null;
}

export type ProviderFailure = {
  ok: false;
  reason: "unavailable" | "error" | "rate_limited" | "not_configured";
  message: string;
};

export type ProviderResult<T> = { ok: true; data: T; fetchedAt: Date } | ProviderFailure;

export interface ProviderInfo {
  id: string;
  label: string;
  /** Legal basis / access mode, shown in the back-office. */
  access: string;
  license: string | null;
  capabilities: { stores: boolean; products: boolean; prices: boolean };
}

export interface RetailProvider {
  info: ProviderInfo;
  searchStores(query: { city?: string; name?: string }): Promise<ProviderResult<StoreRecord[]>>;
  fetchPrices(query: { storeExternalId: string; eans: string[] }): Promise<ProviderResult<PriceRecord[]>>;
}

/** Adapter for a retailer with no permitted access yet: it always says so. */
export function unavailableProvider(info: Omit<ProviderInfo, "capabilities">, reason: string): RetailProvider {
  const failure: ProviderFailure = { ok: false, reason: "unavailable", message: reason };
  return {
    info: { ...info, capabilities: { stores: false, products: false, prices: false } },
    searchStores: async () => failure,
    fetchPrices: async () => failure,
  };
}
