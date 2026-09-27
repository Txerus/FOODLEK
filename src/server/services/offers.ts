import "server-only";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
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
  // A price the source itself marks as an estimate (another retailer…) stays one.
  if (stored === "ESTIMATED") return "ESTIMATED";
  const freshness = freshnessOf(fetchedAt, now);
  if (freshness === "LIVE") return stored === "LIVE" ? "LIVE" : "RECENT";
  if (freshness === "VERY_RECENT" || freshness === "RECENT") return "RECENT";
  // Older observations can still guide a choice but are not a current price.
  return "ESTIMATED";
}

/**
 * @param householdId prices typed in by this household are included; other
 *   households' manual prices never are.
 */
export async function loadOffersForStore(
  storeId: string,
  now = new Date(),
  householdId: string | null = null,
): Promise<OfferIndex> {
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
    .leftJoin(t.retailPrices, and(eq(t.retailPrices.productId, t.retailProducts.id), eq(t.retailPrices.storeId, storeId)))
    .where(
      and(
        eq(t.productMappings.status, "active"),
        eq(t.retailProducts.retailerId, store.retailerId),
        householdId
          ? or(isNull(t.retailProducts.householdId), eq(t.retailProducts.householdId, householdId))
          : isNull(t.retailProducts.householdId),
      ),
    )
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
      // Observed prices say in which store they were actually seen.
      storeName: price?.observedWhere ?? store.name,
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
      imageUrl: row.product.imageUrl,
      manual: row.product.provider === "manual",
    };
    const list = index.get(row.ingredientId) ?? [];
    list.push(offer);
    index.set(row.ingredientId, list);
  }
  return index;
}

const FALLBACK_PRODUCTS_PER_INGREDIENT = 3;

function hasPrice(offers: readonly RetailOffer[] | undefined): boolean {
  return (offers ?? []).some((o) => o.priceCents !== null);
}

/**
 * Offers used for planning and shopping: those of the chosen store first.
 * For an ingredient this store has no price for, so that every line still
 * carries a price, in this order:
 *   1. the latest price seen in another FOODLEK store (observed prices of
 *      another city or retailer, or a price the household typed in
 *      elsewhere) — quality ESTIMATED, the real store and date are shown;
 *   2. the price of the demo catalogue — fictitious, quality DEMO, flagged
 *      on the line and in the total.
 * Nothing else is ever filled in: without any of these the line stays
 * without a price and asks for one.
 */
export async function loadShoppingOffers(
  storeId: string | null,
  now = new Date(),
  householdId: string | null = null,
): Promise<OfferIndex> {
  const store = storeId ? await getStore(storeId) : null;
  const primary = store ? await loadOffersForStore(store.id, now, householdId) : new Map<string, RetailOffer[]>();
  if (store?.isDemo) return primary;

  const ingredientRows = await db().select({ id: t.ingredients.id }).from(t.ingredients);
  let missing = ingredientRows.map((r) => r.id).filter((id) => !hasPrice(primary.get(id)));
  if (missing.length === 0) return primary;
  const index = new Map<string, RetailOffer[]>(primary as Map<string, RetailOffer[]>);

  const rows = await db()
    .select({
      ingredientId: t.productMappings.ingredientId,
      substitutionNote: t.productMappings.substitutionNote,
      product: t.retailProducts,
      price: t.retailPrices,
      storeName: t.stores.name,
      retailerName: t.retailers.name,
      isDemo: t.retailers.isDemo,
    })
    .from(t.productMappings)
    .innerJoin(t.retailProducts, eq(t.retailProducts.id, t.productMappings.productId))
    .innerJoin(t.retailPrices, eq(t.retailPrices.productId, t.retailProducts.id))
    .innerJoin(t.stores, eq(t.stores.id, t.retailPrices.storeId))
    .innerJoin(t.retailers, eq(t.retailers.id, t.retailProducts.retailerId))
    .where(
      and(
        eq(t.productMappings.status, "active"),
        inArray(t.productMappings.ingredientId, missing),
        store ? ne(t.retailPrices.storeId, store.id) : undefined,
        householdId
          ? or(isNull(t.retailProducts.householdId), eq(t.retailProducts.householdId, householdId))
          : isNull(t.retailProducts.householdId),
      ),
    )
    .orderBy(desc(t.retailPrices.fetchedAt));

  const toOffer = (row: (typeof rows)[number], fallback: "other_store" | "demo"): RetailOffer => ({
    productId: row.product.id,
    retailerId: row.product.retailerId,
    retailerName: row.retailerName,
    storeId: row.price.storeId,
    storeName:
      fallback === "demo"
        ? "Prix fictif du catalogue de démonstration"
        : `${row.price.observedWhere ?? row.storeName} — relevé dans un autre magasin`,
    externalId: row.product.externalId,
    ean: row.product.ean,
    name: row.product.name,
    brand: row.product.brand,
    packLabel: row.product.packLabel,
    packQuantity: row.product.packQuantity,
    packUnit: row.product.packUnit as PurchaseUnit,
    priceCents: row.price.priceCents,
    unitPriceCents: row.price.unitPriceCents,
    isOrganic: row.product.isOrganic,
    isStoreBrand: false,
    // A past promotion elsewhere says nothing about this store.
    promotion: null,
    availability: "unknown",
    fetchedAt: row.price.fetchedAt,
    provider: row.price.provider,
    sourceUrl: row.price.sourceUrl ?? row.product.sourceUrl,
    quality: fallback === "demo" ? "DEMO" : "ESTIMATED",
    substitution: row.substitutionNote,
    imageUrl: row.product.imageUrl,
    manual: row.product.provider === "manual",
    fallback,
  });

  const fill = (candidates: typeof rows, fallback: "other_store" | "demo") => {
    const seen = new Set<string>();
    for (const row of candidates) {
      if (row.price.priceCents === null || !missing.includes(row.ingredientId)) continue;
      // Latest price per product (rows are sorted by date, newest first).
      if (seen.has(row.product.id)) continue;
      seen.add(row.product.id);
      const list = index.get(row.ingredientId)?.filter((o) => o.fallback) ?? [];
      if (list.length >= FALLBACK_PRODUCTS_PER_INGREDIENT) continue;
      list.push(toOffer(row, fallback));
      index.set(row.ingredientId, list);
    }
    missing = missing.filter((id) => !hasPrice(index.get(id)));
  };
  fill(
    rows.filter((r) => !r.isDemo),
    "other_store",
  );
  fill(
    rows.filter((r) => r.isDemo),
    "demo",
  );
  return index;
}

/**
 * A price typed in by the household for an ingredient ("I paid 2,35 € for
 * 200 g of feta"). Stored as the household's own product at its current
 * store: only this household sees it, and it is labelled as such.
 */
export async function setManualPrice(
  householdId: string,
  input: { ingredientId: string; priceCents: number; packQuantity: number; packUnit: PurchaseUnit; packLabel: string },
): Promise<void> {
  const settings = await db()
    .select({ storeId: t.householdSettings.storeId })
    .from(t.householdSettings)
    .where(eq(t.householdSettings.householdId, householdId))
    .limit(1);
  const storeId = settings[0]?.storeId;
  if (!storeId) throw new Error("NO_STORE");
  const store = await getStore(storeId);
  if (!store) throw new Error("NO_STORE");
  const ingredient = await db()
    .select({ name: t.ingredients.name })
    .from(t.ingredients)
    .where(eq(t.ingredients.id, input.ingredientId))
    .limit(1);
  if (!ingredient[0]) throw new Error("UNKNOWN_INGREDIENT");

  const productId = `prd_manual_${householdId}_${store.retailerId}_${input.ingredientId}`;
  const productRow = {
    retailerId: store.retailerId,
    externalId: null,
    ean: null,
    name: ingredient[0].name,
    brand: null,
    packLabel: input.packLabel,
    packQuantity: input.packQuantity,
    packUnit: input.packUnit,
    isOrganic: false,
    isStoreBrand: false,
    sourceUrl: null,
    imageUrl: null,
    provider: "manual",
    householdId,
  };
  const now = new Date();
  await db().transaction(async (tx) => {
    await tx
      .insert(t.retailProducts)
      .values({ id: productId, ...productRow })
      .onConflictDoUpdate({ target: t.retailProducts.id, set: productRow });
    await tx
      .insert(t.productMappings)
      .values({
        id: `map_${productId}`,
        ingredientId: input.ingredientId,
        productId,
        priority: 0,
        substitutionNote: null,
        status: "active",
      })
      .onConflictDoNothing();
    await tx.delete(t.retailPrices).where(and(eq(t.retailPrices.productId, productId), eq(t.retailPrices.storeId, storeId)));
    await tx.insert(t.retailPrices).values({
      id: `${productId}_${now.getTime()}`,
      productId,
      storeId,
      priceCents: input.priceCents,
      unitPriceCents:
        input.packUnit === "piece"
          ? Math.round(input.priceCents / input.packQuantity)
          : Math.round((input.priceCents * 1000) / input.packQuantity),
      promotionLabel: null,
      promotionValidUntil: null,
      availability: "available",
      fetchedAt: now,
      provider: "manual",
      quality: "RECENT",
      sourceUrl: null,
      observedWhere: `${store.name} (prix saisi par vous)`,
    });
  });
}
