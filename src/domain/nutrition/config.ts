/**
 * Every nutritional parameter lives here, with its reference, so that it can be
 * reviewed and tuned without touching the algorithms. See docs/NUTRITION.md.
 */

import type { MealType } from "../catalog/types";

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary: { label: "Sédentaire", hint: "Travail assis, peu de marche, pas de sport" },
  light: { label: "Légère", hint: "Marche quotidienne ou sport 1 à 2 fois par semaine" },
  moderate: { label: "Modérée", hint: "Sport 3 à 4 fois par semaine ou métier debout" },
  active: { label: "Active", hint: "Sport 5 à 6 fois par semaine ou métier physique" },
  very_active: { label: "Très active", hint: "Entraînement quotidien intense ou métier très physique" },
};

export const GOALS = ["maintain", "lose", "gain", "performance", "none"] as const;
export type Goal = (typeof GOALS)[number];

export const GOAL_LABELS: Record<Goal, string> = {
  maintain: "Maintien",
  lose: "Perte de poids",
  gain: "Prise de masse",
  performance: "Performance sportive",
  none: "Pas d'objectif particulier",
};

export const APPETITES = ["small", "normal", "large"] as const;
export type Appetite = (typeof APPETITES)[number];

export const APPETITE_LABELS: Record<Appetite, string> = {
  small: "Petit appétit",
  normal: "Appétit normal",
  large: "Gros appétit",
};

export interface NutritionConfig {
  /** Physical activity multipliers applied to the resting energy expenditure. */
  activityFactors: Record<ActivityLevel, number>;
  loss: {
    /** Fraction of maintenance removed for a weight-loss goal. */
    deficitRatio: number;
    /** Never remove more than this many kcal per day. */
    maxDeficitKcal: number;
    /** Absolute floors, whichever is higher between this and resting expenditure. */
    minKcalMale: number;
    minKcalFemale: number;
    /** With a target date: never lose faster than this share of body weight per week… */
    maxWeeklyRatio: number;
    /** …nor more than this many kg per week… */
    maxWeeklyKg: number;
    /** …nor with a deficit above this many kcal per day. */
    maxDeficitWithTargetKcal: number;
  };
  gain: { surplusRatio: number; maxSurplusKcal: number; maxWeeklyRatio: number };
  /**
   * Energy stored in one kg of body weight change. 7 700 kcal/kg is the classic
   * approximation (Wishnofsky); real changes vary, so projections are shown as estimates.
   */
  kcalPerKg: number;
  protein: {
    /** g/kg/day */
    defaultPerKg: number;
    highPerKg: number;
    lossPerKg: number;
    performancePerKg: number;
    maxPerKg: number;
    /** Above this BMI, protein is computed on the weight corresponding to referenceBmi. */
    adjustAboveBmi: number;
    referenceBmi: number;
  };
  /** Share of energy from fat. */
  fatEnergyRatio: number;
  fiberGramsPerDay: number;
  /** Share of daily needs covered by each meal type. */
  mealShares: Record<MealType, number>;
  /**
   * Portion energy used when a person chose not to give body measurements.
   * Product convention, clearly flagged as ESTIMATED in the interface.
   */
  simplifiedMainMealKcal: Record<Appetite, number>;
}

export const DEFAULT_NUTRITION_CONFIG: NutritionConfig = {
  // Classic multipliers used with Mifflin-St Jeor (McArdle; Harris-Benedict activity scale).
  activityFactors: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  },
  loss: {
    deficitRatio: 0.15,
    maxDeficitKcal: 500,
    minKcalMale: 1500,
    minKcalFemale: 1200,
    maxWeeklyRatio: 0.01,
    maxWeeklyKg: 1,
    maxDeficitWithTargetKcal: 750,
  },
  gain: { surplusRatio: 0.1, maxSurplusKcal: 300, maxWeeklyRatio: 0.005 },
  kcalPerKg: 7700,
  protein: {
    // ANSES population reference intake for adults: 0.83 g/kg/day. We target a
    // slightly higher, still moderate default; higher targets only on request.
    defaultPerKg: 1.0,
    highPerKg: 1.6,
    lossPerKg: 1.2,
    performancePerKg: 1.6,
    maxPerKg: 2.0,
    adjustAboveBmi: 30,
    referenceBmi: 25,
  },
  // ANSES: lipids 35-40 % of energy intake for adults.
  fatEnergyRatio: 0.35,
  // ANSES: 30 g of fibre per day for adults.
  fiberGramsPerDay: 30,
  mealShares: { breakfast: 0.2, lunch: 0.35, dinner: 0.35, snack: 0.1 },
  simplifiedMainMealKcal: { small: 500, normal: 650, large: 800 },
};

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;
