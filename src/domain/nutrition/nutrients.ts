import type { DataQuality } from "../common/data-quality";

/** Nutrient amounts. Per 100 g for compositions, absolute for portions and totals. */
export interface Nutrients {
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  sugarsG: number;
  saturatedFatG: number;
  sodiumMg: number;
}

export const NUTRIENT_KEYS = [
  "energyKcal",
  "proteinG",
  "fatG",
  "carbsG",
  "fiberG",
  "sugarsG",
  "saturatedFatG",
  "sodiumMg",
] as const satisfies readonly (keyof Nutrients)[];

export const ZERO_NUTRIENTS: Nutrients = {
  energyKcal: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  fiberG: 0,
  sugarsG: 0,
  saturatedFatG: 0,
  sodiumMg: 0,
};

/** Some reference tables leave a nutrient blank; we keep that distinction instead of writing 0. */
export type NutrientsPer100g = { [K in keyof Nutrients]: number | null };

export type CompositionSource = "CIQUAL" | "USDA_SR_LEGACY" | "USDA_FOUNDATION" | "OPEN_FOOD_FACTS";

export interface FoodComposition {
  per100g: NutrientsPer100g;
  source: CompositionSource;
  /** Identifier in the source (Ciqual alim_code, USDA FDC id, EAN...). */
  sourceRef: string;
  sourceLabel: string;
  sourceVersion: string;
  quality: DataQuality;
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    energyKcal: a.energyKcal + b.energyKcal,
    proteinG: a.proteinG + b.proteinG,
    fatG: a.fatG + b.fatG,
    carbsG: a.carbsG + b.carbsG,
    fiberG: a.fiberG + b.fiberG,
    sugarsG: a.sugarsG + b.sugarsG,
    saturatedFatG: a.saturatedFatG + b.saturatedFatG,
    sodiumMg: a.sodiumMg + b.sodiumMg,
  };
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  return {
    energyKcal: n.energyKcal * factor,
    proteinG: n.proteinG * factor,
    fatG: n.fatG * factor,
    carbsG: n.carbsG * factor,
    fiberG: n.fiberG * factor,
    sugarsG: n.sugarsG * factor,
    saturatedFatG: n.saturatedFatG * factor,
    sodiumMg: n.sodiumMg * factor,
  };
}

export interface NutrientsForGrams {
  nutrients: Nutrients;
  /** Nutrients the source does not report for this food; they are counted as 0 in totals. */
  missing: (keyof Nutrients)[];
}

export function nutrientsForGrams(composition: FoodComposition, grams: number): NutrientsForGrams {
  const factor = grams / 100;
  const missing: (keyof Nutrients)[] = [];
  const out = { ...ZERO_NUTRIENTS };
  for (const key of NUTRIENT_KEYS) {
    const v = composition.per100g[key];
    if (v === null) {
      missing.push(key);
    } else {
      out[key] = v * factor;
    }
  }
  return { nutrients: out, missing };
}

export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  return list.reduce(addNutrients, ZERO_NUTRIENTS);
}
