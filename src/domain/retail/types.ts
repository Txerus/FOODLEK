import type { DataQuality } from "../common/data-quality";
import type { Cents } from "../common/money";
import type { PurchaseUnit } from "../units/units";

/**
 * A product as sold by a given store at a given moment. Every field that comes
 * from a retailer keeps its provenance, so a price is never shown without the
 * store and the time it was retrieved.
 */
export interface RetailOffer {
  productId: string;
  retailerId: string;
  retailerName: string;
  storeId: string | null;
  storeName: string | null;
  /** Retailer-side product identifier. */
  externalId: string | null;
  ean: string | null;
  name: string;
  brand: string | null;
  /** Human label of the pack as sold ("barquette 500 g"). */
  packLabel: string;
  /** Pack size expressed in the ingredient's purchase unit. */
  packQuantity: number;
  packUnit: PurchaseUnit;
  priceCents: Cents | null;
  /** Price per kg, per litre or per piece, in cents. */
  unitPriceCents: Cents | null;
  isOrganic: boolean;
  isStoreBrand: boolean;
  promotion: { label: string; validUntil: Date | null } | null;
  availability: "available" | "unavailable" | "unknown";
  fetchedAt: Date | null;
  provider: string;
  sourceUrl: string | null;
  quality: DataQuality;
  /** Set when this product is an equivalent, not the exact ingredient. */
  substitution: string | null;
}

export type OfferIndex = ReadonlyMap<string, readonly RetailOffer[]>;

export interface RetailPreferences {
  organic: "prefer" | "indifferent";
  storeBrand: "prefer" | "indifferent" | "avoid";
  acceptPromotions: boolean;
}

export const DEFAULT_RETAIL_PREFERENCES: RetailPreferences = {
  organic: "indifferent",
  storeBrand: "indifferent",
  acceptPromotions: true,
};
