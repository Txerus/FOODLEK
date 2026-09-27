import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { OBSERVED_PRICE_SPECS } from "@/data/open-prices-categories";
import { freshnessOf } from "@/domain/common/data-quality";
import type { IngredientMeasures, PurchaseUnit } from "@/domain/units/units";
import * as t from "../db/schema";
import { newId } from "../ids";
import {
  cityCentre,
  coordinatesOf,
  distanceKm,
  isRetailerLocation,
  locationSchema,
  looseOffer,
  normalizeText,
  OPEN_PRICES_API,
  pageOf,
  priceSchema,
  productOffers,
  type ObservedOffer,
  type OpenPricesLocation,
  type OpenPricesPrice,
} from "./observed-prices";
import { FRENCH_RETAILERS, type RetailerDefinition } from "./registry";

/**
 * Builds a FOODLEK "store" holding the real prices observed at a retailer
 * around a city (Open Prices, ODbL), then saves products, mappings and prices.
 * Used by `pnpm prix:enseigne` and by the "Magasins et prix" page.
 */

export interface ObservedSyncOptions {
  retailerSlug: string;
  city: string;
  radiusKm: number;
  /** Only observations newer than this many days. */
  maxAgeDays: number;
  userAgent: string;
  fetchImpl?: typeof fetch;
  /** Pause between API calls, to stay polite with a free service. */
  delayMs?: number;
  onProgress?: (message: string) => void;
  /** Use a price seen at another retailer when this one has none (default: true). */
  otherRetailersFallback?: boolean;
}

export interface IngredientForSync {
  id: string;
  slug: string;
  name: string;
  purchaseUnit: PurchaseUnit;
  measures: IngredientMeasures;
}

export interface ObservedSyncResult {
  storeId: string;
  storeName: string;
  nearbyStoreCount: number;
  priced: { ingredient: string; offers: number; nearby: boolean; scope: ObservedOffer["scope"] }[];
  missing: string[];
  priceCount: number;
}

export class ObservedSyncError extends Error {}

type Db = PostgresJsDatabase<typeof t>;

const MAX_OFFERS_PER_INGREDIENT = 6;
const ID_CHUNK = 120;

function slugify(s: string): string {
  return normalizeText(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createOpenPricesClient(options: Pick<ObservedSyncOptions, "userAgent" | "fetchImpl" | "delayMs">) {
  const doFetch = options.fetchImpl ?? fetch;
  const delay = options.delayMs ?? 400;
  return async function getJson(path: string): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await doFetch(`${OPEN_PRICES_API}${path}`, {
        headers: { "User-Agent": options.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new ObservedSyncError(`Open Prices a répondu ${res.status} pour ${path.split("?")[0]}.`);
      const json = await res.json();
      if (delay > 0) await sleep(delay);
      return json;
    }
    throw new ObservedSyncError("Open Prices ne répond pas (limite de requêtes ou service indisponible). Réessayez plus tard.");
  };
}

async function retailerLocations(getJson: (p: string) => Promise<unknown>, retailer: RetailerDefinition): Promise<OpenPricesLocation[]> {
  const all = new Map<number, OpenPricesLocation>();
  for (const word of retailer.brandWords) {
    for (let page = 1; page <= 20; page++) {
      const params = new URLSearchParams({ osm_name__like: word, size: "100", page: String(page), order_by: "-price_count" });
      const data = pageOf(locationSchema).parse(await getJson(`/locations?${params}`));
      for (const l of data.items) if (isRetailerLocation(l, retailer.brandWords)) all.set(l.id, l);
      if (page >= data.pages) break;
    }
  }
  return [...all.values()];
}

/** locationIds = null: every store in France (used as a last resort, other retailers included). */
async function pricesAt(getJson: (p: string) => Promise<unknown>, locationIds: number[] | null, filter: Record<string, string>, since: string): Promise<OpenPricesPrice[]> {
  if (locationIds === null) {
    const params = new URLSearchParams({ ...filter, date__gte: since, order_by: "-date", size: "100" });
    return pageOf(priceSchema)
      .parse(await getJson(`/prices?${params}`))
      .items.filter((p) => (p.location?.osm_address_country_code ?? "").toUpperCase() === "FR");
  }
  const out: OpenPricesPrice[] = [];
  for (let i = 0; i < locationIds.length; i += ID_CHUNK) {
    const params = new URLSearchParams({
      ...filter,
      location_id__in: locationIds.slice(i, i + ID_CHUNK).join(","),
      date__gte: since,
      order_by: "-date",
      size: "100",
    });
    out.push(...pageOf(priceSchema).parse(await getJson(`/prices?${params}`)).items);
  }
  return out;
}

async function offersFor(
  getJson: (p: string) => Promise<unknown>,
  ingredient: IngredientForSync,
  locationIds: number[] | null,
  since: string,
  nearby: boolean,
): Promise<ObservedOffer[]> {
  const spec = OBSERVED_PRICE_SPECS[ingredient.slug];
  if (!spec || (locationIds !== null && locationIds.length === 0)) return [];
  const products = await pricesAt(getJson, locationIds, { product__categories_tags__overlap: spec.productTags.join(",") }, since);
  const offers = productOffers(products, ingredient, spec, nearby).slice(0, MAX_OFFERS_PER_INGREDIENT);
  for (const tag of spec.looseTags ?? []) {
    const loose = looseOffer(await pricesAt(getJson, locationIds, { category_tag: tag }, since), ingredient, nearby);
    if (loose) {
      offers.push(loose);
      break;
    }
  }
  return offers;
}

export async function syncObservedPrices(database: Db, ingredients: IngredientForSync[], options: ObservedSyncOptions): Promise<ObservedSyncResult> {
  const retailer = FRENCH_RETAILERS.find((r) => r.slug === options.retailerSlug);
  if (!retailer) throw new ObservedSyncError(`Enseigne inconnue : ${options.retailerSlug}.`);
  const progress = options.onProgress ?? (() => {});
  const getJson = createOpenPricesClient(options);

  progress(`Recherche des magasins ${retailer.name} dans Open Prices…`);
  const locations = await retailerLocations(getJson, retailer);
  if (locations.length === 0) throw new ObservedSyncError(`Aucun magasin ${retailer.name} n'a de prix dans Open Prices.`);

  let centre = cityCentre(locations, options.city);
  if (!centre) {
    // No store of this retailer in the city itself: locate the city from any store there.
    const params = new URLSearchParams({ osm_address_city__like: options.city, size: "50" });
    const any = pageOf(locationSchema).parse(await getJson(`/locations?${params}`)).items;
    centre = cityCentre(any, options.city);
  }
  if (!centre) throw new ObservedSyncError(`Ville « ${options.city} » introuvable dans Open Prices. Essayez une grande ville proche.`);

  const nearbyIds = locations
    .filter((l) => {
      const c = coordinatesOf(l);
      return c !== null && distanceKm(centre, c) <= options.radiusKm;
    })
    .map((l) => l.id);
  const allIds = locations.map((l) => l.id);
  progress(`${nearbyIds.length} magasin(s) ${retailer.name} à moins de ${options.radiusKm} km, ${allIds.length} en France.`);

  const since = new Date(Date.now() - options.maxAgeDays * 86_400_000).toISOString().slice(0, 10);
  const found = new Map<string, ObservedOffer[]>();
  for (const ing of ingredients) {
    let offers = await offersFor(getJson, ing, nearbyIds, since, true);
    if (offers.length === 0) {
      const farIds = allIds.filter((id) => !nearbyIds.includes(id));
      offers = await offersFor(getJson, ing, farIds, since, false);
    }
    if (offers.length === 0 && options.otherRetailersFallback !== false) {
      // Last resort: a price seen at another retailer in France, clearly labelled.
      offers = (await offersFor(getJson, ing, null, since, false)).map((o) => ({ ...o, scope: "other_retailer" as const }));
    }
    found.set(ing.id, offers);
    const scopeLabel = offers[0]?.scope === "other_retailer" ? " (autre enseigne)" : offers[0]?.scope === "retailer" ? " (hors de votre zone)" : "";
    progress(`${ing.name} : ${offers.length > 0 ? `${offers.length} prix${scopeLabel}` : "aucun prix"}`);
  }

  // ---- Save --------------------------------------------------------------
  const storeId = `store_op_${retailer.slug}_${slugify(options.city)}_${options.radiusKm}`;
  const storeName = `${retailer.name} — prix observés autour de ${options.city} (${options.radiusKm} km)`;
  const storeRow = {
    retailerId: retailer.id,
    externalId: `area:${slugify(options.city)}:${options.radiusKm}`,
    name: storeName,
    city: options.city,
    postcode: null,
    latitude: centre.lat,
    longitude: centre.lon,
    isDrive: false,
    provider: "open-prices",
  };
  const logId = newId("sync");
  const now = new Date();
  let priceCount = 0;

  await database.transaction(async (tx) => {
    await tx.insert(t.stores).values({ id: storeId, ...storeRow }).onConflictDoUpdate({ target: t.stores.id, set: storeRow });
    await tx.insert(t.syncLogs).values({ id: logId, provider: "open-prices", retailerId: retailer.id, storeId, status: "running" });
    // The store's prices are replaced by the current observations.
    await tx.delete(t.retailPrices).where(eq(t.retailPrices.storeId, storeId));

    for (const ing of ingredients) {
      const spec = OBSERVED_PRICE_SPECS[ing.slug];
      for (const offer of found.get(ing.id) ?? []) {
        const productId = offer.ean ? `prd_op_${retailer.slug}_${offer.ean}` : `prd_op_${retailer.slug}_${ing.slug}_vrac_${offer.pack.unit}`;
        const productRow = {
          retailerId: retailer.id,
          externalId: offer.ean,
          ean: offer.ean,
          name: offer.name,
          brand: offer.brand,
          packLabel: offer.pack.label,
          packQuantity: offer.pack.quantity,
          packUnit: offer.pack.unit,
          isOrganic: offer.isOrganic,
          isStoreBrand: offer.brand !== null && retailer.brandWords.some((w) => normalizeText(offer.brand as string).includes(w)),
          sourceUrl: offer.ean ? `https://world.openfoodfacts.org/product/${offer.ean}` : null,
          imageUrl: offer.imageUrl,
          provider: "open-prices",
        };
        await tx.insert(t.retailProducts).values({ id: productId, ...productRow }).onConflictDoUpdate({ target: t.retailProducts.id, set: productRow });
        await tx
          .insert(t.productMappings)
          .values({ id: `map_${productId}_${ing.slug}`, ingredientId: ing.id, productId, priority: 0, substitutionNote: spec?.substitution ?? null, status: "active" })
          .onConflictDoNothing();
        const freshness = freshnessOf(offer.observedAt, now);
        await tx.insert(t.retailPrices).values({
          id: newId("price"),
          productId,
          storeId,
          priceCents: offer.priceCents,
          unitPriceCents: offer.unitPriceCents,
          promotionLabel: null,
          promotionValidUntil: null,
          availability: "unknown",
          fetchedAt: offer.observedAt,
          provider: "open-prices",
          // A price from another retailer is only an estimate for this one.
          quality: offer.scope === "other_retailer" || freshness === "OLD" ? "ESTIMATED" : freshness === "LIVE" ? "LIVE" : "RECENT",
          sourceUrl: offer.sourceUrl,
          observedWhere:
            offer.scope === "nearby" ? offer.observedWhere : offer.scope === "retailer" ? `${offer.observedWhere} (hors de votre zone)` : `${offer.observedWhere} (autre enseigne)`,
        });
        priceCount++;
      }
    }
    await tx.update(t.syncLogs).set({ status: "success", itemCount: priceCount, finishedAt: new Date() }).where(eq(t.syncLogs.id, logId));
  });

  return {
    storeId,
    storeName,
    nearbyStoreCount: nearbyIds.length,
    priced: ingredients
      .filter((i) => (found.get(i.id) ?? []).length > 0)
      .map((i) => ({ ingredient: i.name, offers: (found.get(i.id) ?? []).length, nearby: (found.get(i.id) ?? [])[0].nearby, scope: (found.get(i.id) ?? [])[0].scope })),
    missing: ingredients.filter((i) => (found.get(i.id) ?? []).length === 0).map((i) => i.name),
    priceCount,
  };
}

/** Stores built from observed prices, with their latest sync. */
export async function listObservedStores(database: Db) {
  const stores = await database
    .select({ id: t.stores.id, name: t.stores.name, retailerId: t.stores.retailerId, city: t.stores.city })
    .from(t.stores)
    .where(eq(t.stores.provider, "open-prices"));
  if (stores.length === 0) return [];
  const logs = await database
    .select()
    .from(t.syncLogs)
    .where(and(eq(t.syncLogs.provider, "open-prices"), inArray(t.syncLogs.storeId, stores.map((s) => s.id))));
  return stores.map((s) => {
    const last = logs.filter((l) => l.storeId === s.id && l.status === "success").sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
    return { ...s, lastSyncAt: last?.finishedAt ?? null, priceCount: last?.itemCount ?? 0 };
  });
}
