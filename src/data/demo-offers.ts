import { pricePerKiloCents } from "@/domain/common/money";
import type { OfferIndex, RetailOffer } from "@/domain/retail/types";
import { DEMO_PRODUCTS, DEMO_RETAILER, DEMO_STORE, type DemoProduct } from "./demo-catalog";
import { ingredientId } from "./ingredients";

export function demoProductId(p: DemoProduct): string {
  return `prd_demo_${p.ingredient}_${p.packQuantity}${p.packUnit}${p.isOrganic ? "_bio" : ""}`;
}

export function demoOffer(p: DemoProduct, fetchedAt: Date): RetailOffer {
  return {
    productId: demoProductId(p),
    retailerId: DEMO_RETAILER.id,
    retailerName: DEMO_RETAILER.name,
    storeId: DEMO_STORE.id,
    storeName: DEMO_STORE.name,
    externalId: null,
    ean: null,
    name: p.name,
    brand: p.brand,
    packLabel: p.packLabel,
    packQuantity: p.packQuantity,
    packUnit: p.packUnit,
    priceCents: p.priceCents,
    unitPriceCents: p.packUnit === "piece" ? Math.round(p.priceCents / p.packQuantity) : pricePerKiloCents(p.priceCents, p.packQuantity),
    isOrganic: p.isOrganic ?? false,
    isStoreBrand: p.isStoreBrand ?? false,
    promotion: null,
    availability: "available",
    fetchedAt,
    provider: "demo",
    sourceUrl: null,
    quality: "DEMO",
    substitution: p.substitution ?? null,
  };
}

export function buildDemoOffers(fetchedAt: Date): OfferIndex {
  const map = new Map<string, RetailOffer[]>();
  for (const p of DEMO_PRODUCTS) {
    const id = ingredientId(p.ingredient);
    const list = map.get(id) ?? [];
    list.push(demoOffer(p, fetchedAt));
    map.set(id, list);
  }
  return map;
}
