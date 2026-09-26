/**
 * Money is always handled as integer euro cents to avoid floating point drift.
 */
export type Cents = number;

export function toCents(euros: number): Cents {
  return Math.round(euros * 100);
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEuros(cents: Cents): string {
  return euroFormatter.format(cents / 100);
}

/** Price per kilogram (or litre) in cents, from a pack price and pack size in grams (or ml). */
export function pricePerKiloCents(priceCents: Cents, packGramsOrMl: number): Cents | null {
  if (packGramsOrMl <= 0) return null;
  return Math.round((priceCents * 1000) / packGramsOrMl);
}
