import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { freshnessOf, type DataQuality } from "@/domain/common/data-quality";
import type { OfferIndex, RetailOffer } from "@/domain/retail/types";
import type { PurchaseUnit } from "@/domain/units/units";
import { db } from "../db/client";
import * as t from "../db/schema";

/**
 * Loads, for one store, every active ingredient → product mapping with the
 * latest known price at that store. Quality reflects where the price comes
 * from and how old it is; nothing is filled in when a price is missing.
 */

export interface StoreSummary {
  id: string;
  name: string;
  city: string | null;
  retailerId: string;
  retailerName: string;
  isDemo: boolean;
}

export async function getStore(storeId: string): Promise<StoreSummary | null> {
  const rows = await db()
    .select({
      id: t.stores.id,
      name: t.stores.name,
      city: t.stores.city,
      retailerId: t.retailers.id,
      retailerName: t.retailers.name,
      isDemo: t.retailers.isDemo,
    })
    .from(t.stores)
    .innerJoin(t.retailers, eq(t.retailers.id, t.stores.retailerId))
    .where(eq(t.stores.id, storeId))
    .limit(1);
  return rows[0] ?? null;
}

export function priceQuality(isDemo: boolean, fetchedAt: Date | null, stored: string, now: Date): DataQuality {
  if (isDemo) return "DEMO";
  if (!fetchedAt) return "MISSING";
  const freshness = freshnessOf(fetchedAt, now);
  if (freshness === "LIVE") return stored === "LIVE" ? "LIVE" : "RECENT";
  if (freshness === "VERY_RECENT" || freshness === "RECENT") return "RECENT";
  // Older observations can still guide a choice but are not a current price.
  return "ESTIMATED";
}

export async function loadOffersForStore(storeId: string, now = new Date()): Promise<OfferIndex> {
  const store = await getStore(storeId);
  if (!store) return new Map();

  const rows = await db()
    .select({
      ingredientId: t.productMappings.ingredientId,
      substitutionNote: t.productMappings.substitutionNote,
      product: t.retailProducts,
      price: t.retailPrices,
    })
    .from(t.productMappings)
    .innerJoin(t.retailProducts, eq(t.retailProducts.id, t.productMappings.productId))
    .leftJoin(
      t.retailPrices,
      and(eq(t.retailPrices.productId, t.retailProducts.id), eq(t.retailPrices.storeId, storeId)),
    )
    .where(and(eq(t.productMappings.status, "active"), eq(t.retailProducts.retailerId, store.retailerId)))
    .orderBy(desc(t.retailPrices.fetchedAt));

  // Keep only the latest price per product (rows are sorted by fetchedAt desc).
  const seen = new Set<string>();
  const index = new Map<string, RetailOffer[]>();
  for (const row of rows) {
    const key = `${row.ingredientId}:${row.product.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const price = row.price;
    const offer: RetailOffer = {
      productId: row.product.id,
      retailerId: store.retailerId,
      retailerName: store.retailerName,
      storeId: store.id,
      storeName: store.name,
      externalId: row.product.externalId,
      ean: row.product.ean,
      name: row.product.name,
      brand: row.product.brand,
      packLabel: row.product.packLabel,
      packQuantity: row.product.packQuantity,
      packUnit: row.product.packUnit as PurchaseUnit,
      priceCents: price?.priceCents ?? null,
      unitPriceCents: price?.unitPriceCents ?? null,
      isOrganic: row.product.isOrganic,
      isStoreBrand: row.product.isStoreBrand,
      promotion: price?.promotionLabel ? { label: price.promotionLabel, validUntil: price.promotionValidUntil } : null,
      availability: (price?.availability as RetailOffer["availability"]) ?? "unknown",
      fetchedAt: price?.fetchedAt ?? null,
      provider: price?.provider ?? row.product.provider,
      sourceUrl: price?.sourceUrl ?? row.product.sourceUrl,
      quality: priceQuality(store.isDemo, price?.fetchedAt ?? null, price?.quality ?? "MISSING", now),
      substitution: row.substitutionNote,
    };
    const list = index.get(row.ingredientId) ?? [];
    list.push(offer);
    index.set(row.ingredientId, list);
  }
  return index;
}
