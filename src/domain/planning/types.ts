import type { Cents } from "../common/money";
import type { EaterConstraints } from "../catalog/diets";
import type { Equipment, IngredientIndex, MealType, Recipe } from "../catalog/types";
import type { BudgetMode, BudgetSummary } from "../budget/budget";
import type { Nutrients } from "../nutrition/nutrients";
import type { MemberProfile, NutritionTargets } from "../nutrition/targets";
import type { MemberPortion } from "../portions/portions";
import type { OfferIndex, RetailPreferences } from "../retail/types";
import type { PantryItem, ShoppingList } from "../shopping/aggregate";

export interface PlanSlot {
  /** Stable key, e.g. "2026-09-28:dinner". */
  key: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  dayIndex: number;
  mealType: MealType;
  /** Members eating this meal. */
  eaterIds: string[];
}

export interface PlanMember {
  profile: MemberProfile;
  targets: NutritionTargets;
  constraints: EaterConstraints;
  likedIngredientIds: string[];
}

export type RepetitionTolerance = "low" | "medium" | "high";
export type CookingSkill = "beginner" | "intermediate" | "advanced";

export interface HouseholdPlanningPreferences {
  budgetCents: Cents;
  budgetMode: BudgetMode;
  /** Maximum active cooking time for one meal, on weekdays and weekends. */
  maxWeekdayMinutes: number;
  maxWeekendMinutes: number;
  skill: CookingSkill;
  equipment: Equipment[];
  /** Limit on the number of different recipes in the week. */
  maxDistinctRecipes: number | null;
  repetitionTolerance: RepetitionTolerance;
  /** Cook once, eat twice: a dinner can become the next day's lunch. */
  useLeftovers: boolean;
  preferQuickMeals: boolean;
  retail: RetailPreferences;
  recentlyEatenRecipeIds: string[];
  dislikedRecipeIds: string[];
}

export interface OptimizerWeights {
  nutrition: number;
  budget: number;
  cost: number;
  variety: number;
  time: number;
  waste: number;
  preferences: number;
}

export const DEFAULT_WEIGHTS: OptimizerWeights = {
  nutrition: 1,
  budget: 1,
  cost: 0.6,
  variety: 0.8,
  time: 0.5,
  waste: 0.7,
  preferences: 0.5,
};

export interface PlannerInput {
  slots: PlanSlot[];
  members: PlanMember[];
  recipes: Recipe[];
  ingredients: IngredientIndex;
  offers: OfferIndex;
  pantry: PantryItem[];
  preferences: HouseholdPlanningPreferences;
  weights: OptimizerWeights;
  /** Slots whose recipe the user pinned. */
  locked: Record<string, string>;
  /** Month (1-12) used for seasonality. */
  month: number;
  seed: number;
  iterations: number;
}

/** slot key → recipe id (null for an empty slot). */
export type Assignment = Record<string, string | null>;

export interface ScoreBreakdown {
  total: number;
  nutrition: number;
  budget: number;
  cost: number;
  variety: number;
  time: number;
  waste: number;
  preferences: number;
}

export interface CookingSession {
  /** First slot of the session; leftovers are eaten at the following slots. */
  slotKey: string;
  recipeId: string;
  servesSlotKeys: string[];
  activeMinutes: number;
}

export interface MemberWeekNutrition {
  memberId: string;
  name: string;
  planned: Nutrients;
  /** Sum of per-meal targets over the planned meals only. */
  targetEnergyKcal: number;
  targetProteinG: number | null;
  mealCount: number;
  estimated: boolean;
  showNumbers: boolean;
}

export interface PlanEvaluation {
  assignment: Assignment;
  portions: Record<string, MemberPortion[]>;
  sessions: CookingSession[];
  shopping: ShoppingList;
  budget: BudgetSummary;
  nutrition: MemberWeekNutrition[];
  score: ScoreBreakdown;
}
