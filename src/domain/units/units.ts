/**
 * Unit conversions.
 *
 * Nutrition is always computed on grams. Shopping is computed in the unit in
 * which an ingredient is sold (grams, millilitres or pieces). Converting
 * between them requires ingredient-specific measures (density, piece weight),
 * which come from sourced reference data, never from guesses.
 */

export const UNITS = ["g", "kg", "ml", "cl", "l", "piece", "tbsp", "tsp", "pinch"] as const;
export type Unit = (typeof UNITS)[number];

export const PURCHASE_UNITS = ["g", "ml", "piece"] as const;
export type PurchaseUnit = (typeof PURCHASE_UNITS)[number];

/** Standard kitchen volumes used in French recipes. */
export const ML_PER_TBSP = 15;
export const ML_PER_TSP = 5;
/** A pinch is a convention, not a measurement; its nutritional impact is negligible. */
export const GRAMS_PER_PINCH = 0.5;

export interface IngredientMeasures {
  /** Average edible weight of one piece (egg, onion, tortilla...). */
  gramsPerPiece?: number;
  /** Density, for liquids and anything measured by volume. */
  gramsPerMl?: number;
  /** Direct weight of a level tablespoon when it differs from density × 15 ml (powders). */
  gramsPerTbsp?: number;
  /** Direct weight of a level teaspoon. */
  gramsPerTsp?: number;
}

export class UnitConversionError extends Error {
  constructor(
    public readonly unit: Unit,
    public readonly reason: string,
  ) {
    super(`Conversion impossible depuis « ${unit} » : ${reason}`);
    this.name = "UnitConversionError";
  }
}

function volumeToGrams(ml: number, m: IngredientMeasures, unit: Unit): number {
  if (m.gramsPerMl === undefined) {
    throw new UnitConversionError(unit, "densité inconnue pour cet ingrédient");
  }
  return ml * m.gramsPerMl;
}

export function toGrams(quantity: number, unit: Unit, m: IngredientMeasures): number {
  switch (unit) {
    case "g":
      return quantity;
    case "kg":
      return quantity * 1000;
    case "ml":
      return volumeToGrams(quantity, m, unit);
    case "cl":
      return volumeToGrams(quantity * 10, m, unit);
    case "l":
      return volumeToGrams(quantity * 1000, m, unit);
    case "piece":
      if (m.gramsPerPiece === undefined) {
        throw new UnitConversionError(unit, "poids unitaire inconnu pour cet ingrédient");
      }
      return quantity * m.gramsPerPiece;
    case "tbsp":
      if (m.gramsPerTbsp !== undefined) return quantity * m.gramsPerTbsp;
      return volumeToGrams(quantity * ML_PER_TBSP, m, unit);
    case "tsp":
      if (m.gramsPerTsp !== undefined) return quantity * m.gramsPerTsp;
      if (m.gramsPerTbsp !== undefined) return (quantity * m.gramsPerTbsp * ML_PER_TSP) / ML_PER_TBSP;
      return volumeToGrams(quantity * ML_PER_TSP, m, unit);
    case "pinch":
      return quantity * GRAMS_PER_PINCH;
  }
}

/** Convert grams into the unit an ingredient is sold in. */
export function gramsToPurchaseUnit(grams: number, unit: PurchaseUnit, m: IngredientMeasures): number {
  switch (unit) {
    case "g":
      return grams;
    case "ml":
      if (m.gramsPerMl === undefined) throw new UnitConversionError("ml", "densité inconnue");
      return grams / m.gramsPerMl;
    case "piece":
      if (m.gramsPerPiece === undefined) throw new UnitConversionError("piece", "poids unitaire inconnu");
      return grams / m.gramsPerPiece;
  }
}

export function purchaseUnitToGrams(quantity: number, unit: PurchaseUnit, m: IngredientMeasures): number {
  return toGrams(quantity, unit, m);
}

/** Rounds a quantity to something a person can actually measure in a kitchen. */
export function roundForKitchen(quantity: number, unit: Unit): number {
  if (quantity <= 0) return 0;
  switch (unit) {
    case "g":
    case "ml":
      if (quantity < 20) return Math.max(1, Math.round(quantity));
      if (quantity < 100) return Math.round(quantity / 5) * 5;
      return Math.round(quantity / 10) * 10;
    case "piece":
    case "tbsp":
    case "tsp":
      // Quarters below 1 (¼ citron, ¼ c. à café), halves above.
      if (quantity < 1) return Math.max(0.25, Math.round(quantity * 4) / 4);
      return Math.round(quantity * 2) / 2;
    case "kg":
    case "l":
      return Math.round(quantity * 100) / 100;
    case "cl":
      return Math.round(quantity);
    case "pinch":
      return Math.max(1, Math.round(quantity));
  }
}

const UNIT_LABELS: Record<Unit, { one: string; many: string }> = {
  g: { one: "g", many: "g" },
  kg: { one: "kg", many: "kg" },
  ml: { one: "ml", many: "ml" },
  cl: { one: "cl", many: "cl" },
  l: { one: "l", many: "l" },
  piece: { one: "", many: "" },
  tbsp: { one: "c. à soupe", many: "c. à soupe" },
  tsp: { one: "c. à café", many: "c. à café" },
  pinch: { one: "pincée", many: "pincées" },
};

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formatQuantity(quantity: number, unit: Unit): string {
  // French plural starts at 2: « 1,5 pincée », « 2 pincées ».
  const label = quantity >= 2 ? UNIT_LABELS[unit].many : UNIT_LABELS[unit].one;
  if (unit === "g" && quantity >= 1000) return `${numberFormatter.format(quantity / 1000)} kg`;
  if (unit === "ml" && quantity >= 1000) return `${numberFormatter.format(quantity / 1000)} l`;
  const n = numberFormatter.format(quantity);
  if (unit === "piece") return n;
  return `${n} ${label}`;
}
