import { z } from "zod";
import type { ObservedPriceSpec } from "@/data/open-prices-categories";
import type { IngredientMeasures, PurchaseUnit } from "@/domain/units/units";

/**
 * Real prices observed in a retailer's stores, from Open Prices (Open Food
 * Facts, ODbL). Pure functions: parsing the API responses, keeping only the
 * products that really are the ingredient, reading the pack size from the
 * label, and turning loose produce prices (per kg / per unit) into buyable
 * quantities. Nothing is guessed: a product whose pack size cannot be read is
 * dropped, and a missing ingredient stays without price.
 */

export const OPEN_PRICES_API = "https://prices.openfoodfacts.org/api/v1";

// ---------------------------------------------------------------------------
// API shapes (only the fields we use; everything else is ignored)
// ---------------------------------------------------------------------------

const num = z.union([z.number(), z.string()]).nullable().optional();

export const locationSchema = z.object({
  id: z.number(),
  osm_name: z.string().nullable().optional(),
  osm_brand: z.string().nullable().optional(),
  osm_address_city: z.string().nullable().optional(),
  osm_address_postcode: z.string().nullable().optional(),
  osm_address_country_code: z.string().nullable().optional(),
  osm_lat: num,
  osm_lon: num,
  price_count: z.number().nullable().optional(),
});
export type OpenPricesLocation = z.infer<typeof locationSchema>;

const productSchema = z
  .object({
    code: z.string().nullable().optional(),
    product_name: z.string().nullable().optional(),
    brands: z.string().nullable().optional(),
    product_quantity: num,
    product_quantity_unit: z.string().nullable().optional(),
    quantity: z.string().nullable().optional(),
    categories_tags: z.array(z.string()).nullable().optional(),
    labels_tags: z.array(z.string()).nullable().optional(),
    image_url: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

export const priceSchema = z.object({
  id: z.number(),
  type: z.string().nullable().optional(),
  product_code: z.string().nullable().optional(),
  product_name: z.string().nullable().optional(),
  category_tag: z.string().nullable().optional(),
  labels_tags: z.array(z.string()).nullable().optional(),
  price: num,
  price_is_discounted: z.boolean().nullable().optional(),
  price_without_discount: num,
  price_per: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  location_id: z.number().nullable().optional(),
  location: locationSchema.nullable().optional(),
  product: productSchema,
});
export type OpenPricesPrice = z.infer<typeof priceSchema>;

export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), page: z.number(), pages: z.number(), size: z.number(), total: z.number() });

export function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Lowercase, no accents: for comparing names. */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Stores of a retailer around a place
// ---------------------------------------------------------------------------

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function coordinatesOf(l: OpenPricesLocation): { lat: number; lon: number } | null {
  const lat = toNumber(l.osm_lat);
  const lon = toNumber(l.osm_lon);
  return lat === null || lon === null ? null : { lat, lon };
}

/** Keeps the locations whose name really is the retailer ("Carrefour Market", not "Rue du Carrefour"). */
export function isRetailerLocation(l: OpenPricesLocation, brandWords: string[]): boolean {
  const name = normalizeText(`${l.osm_brand ?? ""} ${l.osm_name ?? ""}`);
  if (l.osm_address_country_code && l.osm_address_country_code.toUpperCase() !== "FR") return false;
  return brandWords.some((w) => new RegExp(`(^|[^a-z])${normalizeText(w)}([^a-z]|$)`).test(name)) && !/\b(rue|place|avenue|rond-point)\b/.test(name);
}

/** Average position of the locations in a city: the centre used for the radius. */
export function cityCentre(locations: OpenPricesLocation[], city: string): { lat: number; lon: number } | null {
  const target = normalizeText(city);
  const points = locations
    .filter((l) => l.osm_address_city && normalizeText(l.osm_address_city) === target)
    .map(coordinatesOf)
    .filter((p): p is { lat: number; lon: number } => p !== null);
  if (points.length === 0) return null;
  return { lat: points.reduce((s, p) => s + p.lat, 0) / points.length, lon: points.reduce((s, p) => s + p.lon, 0) / points.length };
}

// ---------------------------------------------------------------------------
// Pack sizes read from the label
// ---------------------------------------------------------------------------

export interface Pack {
  quantity: number;
  unit: PurchaseUnit;
  label: string;
}

const UNIT_FACTORS: Record<string, { unit: "g" | "ml"; factor: number }> = {
  g: { unit: "g", factor: 1 },
  gr: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  cl: { unit: "ml", factor: 10 },
  l: { unit: "ml", factor: 1000 },
};

const UNIT_RE = "(kg|gr|g|cl|ml|l)\\b";
const NUM_RE = "(\\d+(?:[.,]\\d+)?)";
const decimal = (s: string) => Number.parseFloat(s.replace(",", "."));

/**
 * Total quantity of a pack label, in g or ml: "500g", "1,5 kg", "75 cl",
 * "4 x 125 g", "2 x 3 x 100 g", "250 g x 2", "2 paquets de 500 g", "1/2 kg".
 */
export function parseQuantityText(text: string): { quantity: number; unit: "g" | "ml" } | null {
  const t = normalizeText(text).replace(/\s+/g, " ");
  const result = (quantity: number, unitKey: string) => {
    const u = UNIT_FACTORS[unitKey];
    return quantity > 0 && Number.isFinite(quantity) ? { quantity: quantity * u.factor, unit: u.unit } : null;
  };
  // "1/2 kg": a fraction, not "2 kg".
  const fraction = t.match(new RegExp(`(\\d+)\\s*/\\s*(\\d+)\\s*${UNIT_RE}`));
  if (fraction) return Number(fraction[2]) > 0 ? result(Number(fraction[1]) / Number(fraction[2]), fraction[3]) : null;
  // "4 x 125 g", "2 x 3 x 100 g": every count multiplies.
  const chain = t.match(new RegExp(`((?:\\d+\\s*[x×*]\\s*)+)${NUM_RE}\\s*${UNIT_RE}`));
  if (chain) {
    const counts = chain[1].match(/\d+/g)?.map(Number) ?? [];
    return result(counts.reduce((a, b) => a * b, 1) * decimal(chain[2]), chain[3]);
  }
  // "250 g x 2".
  const after = t.match(new RegExp(`${NUM_RE}\\s*${UNIT_RE}\\s*[x×*]\\s*(\\d{1,2})\\b(?!\\s*(?:[.,]\\d)?\\s*${UNIT_RE})`));
  if (after) return result(decimal(after[1]) * Number(after[3]), after[2]);
  // "2 paquets de 500 g", "4 tranches de 40 g".
  const containers = t.match(
    new RegExp(`(\\d{1,2})\\s*(?:paquets?|sachets?|pots?|boites?|briques?|bouteilles?|barquettes?|tranches?|portions?|canettes?|flacons?)\\s+de\\s+${NUM_RE}\\s*${UNIT_RE}`),
  );
  if (containers) return result(Number(containers[1]) * decimal(containers[2]), containers[3]);
  const single = t.match(new RegExp(`${NUM_RE}\\s*${UNIT_RE}`));
  return single ? result(decimal(single[1]), single[2]) : null;
}

/** Drained weight stated on a can: "400 g (265 g égoutté)", "Poids net égoutté : 140 g". */
export function parseDrainedWeight(text: string): number | null {
  const t = normalizeText(text);
  // "3 x 104 g égoutté": the lot's drained weight is 3 × 104 g.
  const after = t.match(/(?:(\d{1,2})\s*[x×*]\s*)?(\d+(?:[.,]\d+)?)\s*g\s*(?:net\s*)?egoutt/);
  if (after) return (after[1] ? Number(after[1]) : 1) * Number.parseFloat(after[2].replace(",", "."));
  const before = t.match(/egoutt[a-z]*\s*:?\s*(?:(\d{1,2})\s*[x×*]\s*)?(\d+(?:[.,]\d+)?)\s*g\b/);
  return before ? (before[1] ? Number(before[1]) : 1) * Number.parseFloat(before[2].replace(",", ".")) : null;
}

/** "boîte de 6", "x12", "6 œufs", "8 tortillas", or a bare "6". */
export function parsePieceCount(text: string): number | null {
  const t = normalizeText(text).trim();
  if (/^\d{1,2}$/.test(t)) return Number(t);
  // "2 x 6 oeufs", "lot de 2 x 6": lots of boxes.
  const boxes = t.match(/(?:^|lot de\s+)(\d)\s*[x×*]\s*(\d{1,2})\b(?!\s*(?:[.,]\d)?\s*(?:kg|gr|g|cl|ml|l)\b)/);
  if (boxes) return Number(boxes[1]) * Number(boxes[2]);
  // "12 x 53 g": 12 pieces of 53 g (the number after "x" is a weight, not a count).
  const lot = t.match(/^(\d{1,3})\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:kg|gr|g|cl|ml|l)\b/);
  if (lot) return Number(lot[1]);
  const m =
    t.match(/(?:boite|lot|paquet|sachet|filet|barquette)\s+de\s+(\d{1,2})\b/) ??
    t.match(/(?:^|\s)[x×]\s*(\d{1,2})\b(?!\s*(?:[.,]\d)?\s*(?:kg|gr|g|cl|ml|l)\b)/) ??
    t.match(/\b(\d{1,2})\s*(?:(?:gros|moyens?|petits?|frais|extra-frais)\s+)?(?:oeufs?|œufs?|pieces?|pcs?|tortillas?|wraps?|galettes?|unites?|fruits?|avocats?|citrons?)\b/);
  return m ? Number(m[1]) : null;
}

type Product = NonNullable<OpenPricesPrice["product"]>;

/**
 * Pack size of a barcode product expressed in the ingredient's purchase unit.
 * Returns null when the label does not say it clearly.
 */
export function packFor(product: Product, purchaseUnit: PurchaseUnit, measures: IngredientMeasures, spec: ObservedPriceSpec): Pack | null {
  const text = [product.quantity, product.product_name].filter(Boolean).join(" ");
  const label = product.quantity?.trim() || null;

  if (purchaseUnit === "piece") {
    const count = parsePieceCount(product.quantity ?? "") ?? parsePieceCount(product.product_name ?? "");
    return count && count > 0 ? { quantity: count, unit: "piece", label: label ?? `${count} pièces` } : null;
  }

  if (spec.drained) {
    const drained = parseDrainedWeight(text);
    return drained ? { quantity: drained, unit: "g", label: label ?? `${drained} g égoutté` } : null;
  }

  let amount: { quantity: number; unit: "g" | "ml" } | null = null;
  const q = toNumber(product.product_quantity);
  const u = product.product_quantity_unit ? UNIT_FACTORS[product.product_quantity_unit.toLowerCase()] : undefined;
  if (q !== null && q > 0 && u) amount = { quantity: q * u.factor, unit: u.unit };
  amount ??= product.quantity ? parseQuantityText(product.quantity) : null;
  if (!amount) return null;

  const pretty = label ?? `${amount.quantity} ${amount.unit}`;
  if (amount.unit === purchaseUnit) return { quantity: amount.quantity, unit: purchaseUnit, label: pretty };
  // g ↔ ml only with a sourced density for the ingredient.
  if (measures.gramsPerMl) {
    if (amount.unit === "g" && purchaseUnit === "ml") return { quantity: Math.round(amount.quantity / measures.gramsPerMl), unit: "ml", label: pretty };
    if (amount.unit === "ml" && purchaseUnit === "g") return { quantity: Math.round(amount.quantity * measures.gramsPerMl), unit: "g", label: pretty };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Matching and aggregation
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whether a label contains a word (or word start: "denoyaut" matches
 * "dénoyautées"), never inside another word or number: "fume" is not in
 * "parfumé", "0%" is not in "10%" or "3,0%". A word negated just before
 * ("non sucré", "sans sucres ajoutés") does not count, unless the filter
 * itself is the negation ("sans sucre").
 */
export function hasWord(label: string, word: string): boolean {
  const w = normalizeText(word);
  const re = new RegExp(`(?<![a-z0-9]|\\d[.,])${escapeRegExp(w)}`, "g");
  const negatable = !/^(non|sans)\b/.test(w);
  for (const m of label.matchAll(re)) {
    const before = label.slice(0, m.index);
    if (negatable && /(?:^|[^a-z])(?:non|sans)\s+$/.test(before)) continue;
    return true;
  }
  return false;
}

export function matchesSpec(product: Product, spec: ObservedPriceSpec): boolean {
  const tags = new Set(product.categories_tags ?? []);
  if (!spec.productTags.some((t) => tags.has(t))) return false;
  if (spec.excludeTags?.some((t) => tags.has(t))) return false;
  const name = normalizeText(`${product.product_name ?? ""} ${product.quantity ?? ""}`);
  if (spec.excludeWords?.some((w) => hasWord(name, w))) return false;
  if (spec.requireWords && !spec.requireWords.some((w) => hasWord(name, w))) return false;
  return true;
}

/** Regular price of an observation, in cents: the undiscounted price when a promotion was applied. */
export function regularPriceCents(p: OpenPricesPrice): { cents: number; wasPromotion: boolean } | null {
  if (p.currency && p.currency !== "EUR") return null;
  const paid = toNumber(p.price);
  if (paid === null || paid <= 0) return null;
  if (p.price_is_discounted) {
    const regular = toNumber(p.price_without_discount);
    if (regular !== null && regular > 0) return { cents: Math.round(regular * 100), wasPromotion: true };
    // A promotional price without the regular one would understate the basket: skip it.
    return null;
  }
  return { cents: Math.round(paid * 100), wasPromotion: false };
}

/**
 * Drops offers whose price per kg / l / piece is more than 3 times away from
 * the median of the others: almost always a misread label (a "1/2 kg"
 * read as 2 kg) or a mismatched product, which would otherwise come first.
 */
export function withoutOutliers<T extends { unitPriceCents: number }>(offers: T[]): T[] {
  if (offers.length < 3) return offers;
  const m = median(offers.map((o) => o.unitPriceCents));
  if (m <= 0) return offers;
  return offers.filter((o) => o.unitPriceCents >= m / 3 && o.unitPriceCents <= m * 3);
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export interface ObservedOffer {
  /** EAN for a barcode product, null for loose produce. */
  ean: string | null;
  name: string;
  brand: string | null;
  pack: Pack;
  priceCents: number;
  /** Price per kg, per litre or per piece, in cents. */
  unitPriceCents: number;
  observedAt: Date;
  /** Where it was seen: "Carrefour Market, Annecy" or "médiane de 5 relevés". */
  observedWhere: string;
  observationCount: number;
  sourceUrl: string;
  isOrganic: boolean;
  /** Where the price comes from relative to the chosen area. */
  scope: "nearby" | "retailer" | "other_retailer";
  nearby: boolean;
  /** Open Food Facts product photo (CC BY-SA). */
  imageUrl: string | null;
}

/** Only Open Food Facts image hosts are accepted (they are allowed by next/image). */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)openfoodfacts\.org$/.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

function whereLabel(l: OpenPricesLocation | null | undefined): string {
  if (!l) return "magasin non précisé";
  return [l.osm_name, l.osm_address_city].filter(Boolean).join(", ") || "magasin non précisé";
}

function unitPrice(priceCents: number, pack: Pack): number {
  return pack.unit === "piece" ? Math.round(priceCents / pack.quantity) : Math.round((priceCents * 1000) / pack.quantity);
}

/**
 * Barcode products for one ingredient: the most recent regular price of each
 * product whose category and pack size match.
 */
export function productOffers(
  prices: OpenPricesPrice[],
  ingredient: { purchaseUnit: PurchaseUnit; measures: IngredientMeasures },
  spec: ObservedPriceSpec,
  nearby: boolean,
): ObservedOffer[] {
  const latest = new Map<string, { p: OpenPricesPrice; cents: number; count: number }>();
  for (const p of prices) {
    if (!p.product_code || !p.product || !p.date) continue;
    if (!matchesSpec(p.product, spec)) continue;
    const regular = regularPriceCents(p);
    if (!regular) continue;
    const current = latest.get(p.product_code);
    if (!current) latest.set(p.product_code, { p, cents: regular.cents, count: 1 });
    else {
      current.count++;
      if ((p.date ?? "") > (current.p.date ?? "")) {
        current.p = p;
        current.cents = regular.cents;
      }
    }
  }
  const out: ObservedOffer[] = [];
  for (const [code, { p, cents, count }] of latest) {
    const product = p.product as Product;
    const pack = packFor(product, ingredient.purchaseUnit, ingredient.measures, spec);
    if (!pack || pack.quantity <= 0) continue;
    out.push({
      ean: code,
      name: product.product_name?.trim() || p.product_name?.trim() || code,
      brand: product.brands?.split(",")[0]?.trim() || null,
      pack,
      priceCents: cents,
      unitPriceCents: unitPrice(cents, pack),
      observedAt: new Date(`${p.date}T12:00:00Z`),
      observedWhere: whereLabel(p.location),
      observationCount: count,
      sourceUrl: `https://prices.openfoodfacts.org/prices/${p.id}`,
      isOrganic: (product.labels_tags ?? []).some((t) => t === "en:organic" || t === "fr:ab-agriculture-biologique"),
      scope: nearby ? "nearby" : "retailer",
      nearby,
      imageUrl: safeImageUrl(product.image_url),
    });
  }
  return withoutOutliers(out).sort((a, b) => a.unitPriceCents - b.unitPriceCents);
}

/**
 * Loose produce ("Courgettes, 2,49 €/kg"): median of the recent observations,
 * turned into a buyable step — 100 g for goods sold by weight, one piece for
 * goods sold by unit. Converting between weight and pieces uses the
 * ingredient's sourced average piece weight, and the label says "≈".
 */
export function looseOffer(
  prices: OpenPricesPrice[],
  ingredient: { name: string; purchaseUnit: PurchaseUnit; measures: IngredientMeasures },
  nearby: boolean,
): ObservedOffer | null {
  const byPer = new Map<string, { cents: number; p: OpenPricesPrice }[]>();
  for (const p of prices) {
    if (p.product_code || !p.category_tag || !p.date) continue;
    const per = (p.price_per ?? "KILOGRAM").toUpperCase();
    const regular = regularPriceCents(p);
    if (!regular) continue;
    const list = byPer.get(per) ?? [];
    list.push({ cents: regular.cents, p });
    byPer.set(per, list);
  }
  const gramsPerPiece = ingredient.measures.gramsPerPiece ?? null;
  // Prefer the pricing mode that needs no conversion.
  const order = ingredient.purchaseUnit === "piece" ? ["UNIT", "KILOGRAM"] : ["KILOGRAM", "UNIT"];
  for (const per of order) {
    const all = byPer.get(per);
    if (!all || all.length === 0) continue;
    // Organic and conventional produce are not the same price: the median
    // uses conventional observations when there are any.
    const conventional = all.filter((o) => !(o.p.labels_tags ?? []).includes("en:organic"));
    const obs = conventional.length > 0 ? conventional : all;
    const m = median(obs.map((o) => o.cents));
    const last = obs.reduce((a, b) => ((a.p.date ?? "") >= (b.p.date ?? "") ? a : b));
    const isOrganic = obs.every((o) => (o.p.labels_tags ?? []).includes("en:organic"));
    const where = obs.length === 1 ? whereLabel(last.p.location) : `médiane de ${obs.length} relevés`;
    let pack: Pack | null = null;
    let priceCents = 0;
    if (per === "KILOGRAM" && ingredient.purchaseUnit === "g") {
      // Loose produce is weighed: 100 g steps keep the bought quantity close to
      // the need (a coarser step would buy far too much). The step price is
      // rounded to the cent; the €/kg shown stays the observed one.
      pack = { quantity: 100, unit: "g", label: `vrac, ${formatEurosPlain(m)}/kg (par 100 g)` };
      priceCents = Math.max(1, Math.round(m / 10));
    } else if (per === "UNIT" && ingredient.purchaseUnit === "piece") {
      pack = { quantity: 1, unit: "piece", label: `à la pièce, ${formatEurosPlain(m)}` };
      priceCents = m;
    } else if (per === "UNIT" && ingredient.purchaseUnit === "g" && gramsPerPiece) {
      pack = { quantity: gramsPerPiece, unit: "g", label: `à la pièce, ${formatEurosPlain(m)} (≈ ${gramsPerPiece} g)` };
      priceCents = m;
    } else if (per === "KILOGRAM" && ingredient.purchaseUnit === "piece" && gramsPerPiece) {
      pack = { quantity: 1, unit: "piece", label: `vrac, ${formatEurosPlain(m)}/kg (≈ ${gramsPerPiece} g la pièce)` };
      priceCents = Math.round((m * gramsPerPiece) / 1000);
    }
    if (!pack || priceCents <= 0) continue;
    return {
      ean: null,
      name: `${ingredient.name} (vrac)`,
      brand: null,
      pack,
      priceCents,
      // The unit price shown is the observed one, not the rounded step price.
      unitPriceCents: per === "KILOGRAM" && pack.unit === "g" ? m : unitPrice(priceCents, pack),
      observedAt: new Date(`${last.p.date}T12:00:00Z`),
      observedWhere: where,
      observationCount: obs.length,
      sourceUrl: `https://prices.openfoodfacts.org/prices/${last.p.id}`,
      isOrganic,
      scope: nearby ? "nearby" : "retailer",
      nearby,
      imageUrl: null,
    };
  }
  return null;
}

function formatEurosPlain(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}
