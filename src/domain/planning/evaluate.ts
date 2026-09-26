import { checkRecipeForEaters, recipeProteinFamilies } from "../catalog/diets";
import { totalMinutes, type Difficulty, type Recipe } from "../catalog/types";
import { budgetLimitCents, summarizeBudget } from "../budget/budget";
import { addNutrients, ZERO_NUTRIENTS } from "../nutrition/nutrients";
import { mealTarget } from "../nutrition/targets";
import { computeMemberPortion, cookingQuantities, type MemberPortion } from "../portions/portions";
import { buildShoppingList, type MealUsage, type PackCache } from "../shopping/aggregate";
import type {
  Assignment,
  CookingSession,
  CookingSkill,
  MemberWeekNutrition,
  PlanEvaluation,
  PlannerInput,
  PlanSlot,
  RepetitionTolerance,
  ScoreBreakdown,
} from "./types";

/** Scoring constants. Weights between objectives are in OptimizerWeights. */
export const SCORING = {
  nutritionScale: 10,
  strictOverflowPenalty: 20,
  strictOverflowStep: 1,
  targetOverflowPenalty: 10,
  missingPricePenalty: 0.05,
  wasteScale: 5,
  extraRepeatPenalty: 0.5,
  consecutiveProteinPenalty: 0.15,
  /** Same starch (rice, pasta...) in more than this many sessions starts to feel repetitive. */
  starchRepeatThreshold: 3,
  starchRepeatPenalty: 0.1,
  extraDistinctPenalty: 0.5,
  minutesOverScale: 30,
  quickMealScale: 120,
  quickMealWeight: 0.2,
  recentlyEatenPenalty: 0.4,
  likedIngredientBonus: 0.05,
  outOfSeasonPenalty: 0.1,
  costWeightNutritionFirst: 0.3,
  /**
   * How many meals of the same recipe are fine in a week. A dinner eaten again
   * as the next day's leftovers counts as one: it was chosen for that.
   */
  maxServingsPerRecipe: { low: 1, medium: 2, high: 3 } satisfies Record<RepetitionTolerance, number>,
  sameDayRepeatPenalty: 1,
  closeRepeatPenalty: 0.3,
  closeRepeatDays: 2,
  hardTimeMultiplier: 2,
} as const;

const DIFFICULTY_FOR_SKILL: Record<CookingSkill, Difficulty[]> = {
  beginner: ["easy"],
  intermediate: ["easy", "medium"],
  advanced: ["easy", "medium", "hard"],
};

export function isWeekend(date: string): boolean {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
}

export function timeLimitFor(slot: PlanSlot, input: PlannerInput): number {
  return isWeekend(slot.date) ? input.preferences.maxWeekendMinutes : input.preferences.maxWeekdayMinutes;
}

export interface Candidate {
  recipe: Recipe;
  warnings: string[];
}

/** Hard constraints: meal type, diets, allergies, refused foods, equipment, skill, disliked recipes. */
export function eligibleRecipes(input: PlannerInput, slot: PlanSlot): Candidate[] {
  const eaters = input.members
    .filter((m) => slot.eaterIds.includes(m.profile.id))
    .map((m) => ({ name: m.profile.name, constraints: m.constraints }));
  const equipment = new Set(input.preferences.equipment);
  const difficulties = DIFFICULTY_FOR_SKILL[input.preferences.skill];
  const disliked = new Set(input.preferences.dislikedRecipeIds);
  const hardTime = timeLimitFor(slot, input) * SCORING.hardTimeMultiplier;
  const out: Candidate[] = [];
  for (const recipe of input.recipes) {
    if (!recipe.mealTypes.includes(slot.mealType)) continue;
    if (disliked.has(recipe.id)) continue;
    if (!recipe.equipment.every((e) => equipment.has(e))) continue;
    if (!difficulties.includes(recipe.difficulty)) continue;
    if (totalMinutes(recipe) > hardTime) continue;
    const check = checkRecipeForEaters(recipe, input.ingredients, eaters);
    if (!check.eligible) continue;
    out.push({ recipe, warnings: check.warnings });
  }
  return out;
}

export class PortionCache {
  private readonly cache = new Map<string, MemberPortion>();
  get(key: string, compute: () => MemberPortion): MemberPortion {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const value = compute();
    this.cache.set(key, value);
    return value;
  }
}

export interface EvalContext {
  recipesById: Map<string, Recipe>;
  portionCache: PortionCache;
  packCache: PackCache;
  slotsByKey: Map<string, PlanSlot>;
  orderedSlots: PlanSlot[];
}

export function createContext(input: PlannerInput): EvalContext {
  const orderedSlots = [...input.slots].sort(
    (a, b) => a.dayIndex - b.dayIndex || mealOrder(a.mealType) - mealOrder(b.mealType),
  );
  return {
    recipesById: new Map(input.recipes.map((r) => [r.id, r])),
    portionCache: new PortionCache(),
    packCache: new Map(),
    slotsByKey: new Map(input.slots.map((s) => [s.key, s])),
    orderedSlots,
  };
}

function mealOrder(meal: PlanSlot["mealType"]): number {
  return { breakfast: 0, lunch: 1, snack: 2, dinner: 3 }[meal];
}

export function portionsForSlot(
  input: PlannerInput,
  ctx: EvalContext,
  slot: PlanSlot,
  recipe: Recipe,
): MemberPortion[] {
  return input.members
    .filter((m) => slot.eaterIds.includes(m.profile.id))
    .map((m) =>
      ctx.portionCache.get(`${recipe.id}|${m.profile.id}|${slot.mealType}`, () =>
        computeMemberPortion(recipe, input.ingredients, {
          memberId: m.profile.id,
          name: m.profile.name,
          target: mealTarget(m.profile, m.targets, slot.mealType),
          favourVegetables: m.targets.effectiveGoal === "lose",
        }),
      ),
    );
}

/**
 * Groups slots into cooking sessions. With leftovers enabled, a dinner can be
 * cooked in a larger quantity and eaten again at the next day's lunch.
 */
export function buildSessions(input: PlannerInput, ctx: EvalContext, assignment: Assignment): CookingSession[] {
  const sessions: CookingSession[] = [];
  let previous: { slot: PlanSlot; session: CookingSession } | null = null;
  for (const slot of ctx.orderedSlots) {
    const recipeId = assignment[slot.key];
    if (!recipeId) {
      previous = null;
      continue;
    }
    const recipe = ctx.recipesById.get(recipeId);
    if (!recipe) continue;
    const canReuse =
      input.preferences.useLeftovers &&
      previous !== null &&
      previous.session.recipeId === recipeId &&
      recipe.keepsWell &&
      previous.slot.mealType === "dinner" &&
      slot.mealType === "lunch" &&
      slot.dayIndex === previous.slot.dayIndex + 1 &&
      previous.session.servesSlotKeys.length === 1;
    if (canReuse && previous) {
      previous.session.servesSlotKeys.push(slot.key);
      previous = { slot, session: previous.session };
      continue;
    }
    const session: CookingSession = {
      slotKey: slot.key,
      recipeId,
      servesSlotKeys: [slot.key],
      activeMinutes: totalMinutes(recipe),
    };
    sessions.push(session);
    previous = { slot, session };
  }
  return sessions;
}

function inSeason(recipe: Recipe, month: number): boolean {
  return recipe.seasonMonths.length === 0 || recipe.seasonMonths.includes(month);
}

export function evaluate(input: PlannerInput, ctx: EvalContext, assignment: Assignment): PlanEvaluation {
  const portions: Record<string, MemberPortion[]> = {};
  let nutritionPenalty = 0;
  let personMeals = 0;
  const weekly = new Map<string, MemberWeekNutrition>();
  for (const m of input.members) {
    weekly.set(m.profile.id, {
      memberId: m.profile.id,
      name: m.profile.name,
      planned: ZERO_NUTRIENTS,
      targetEnergyKcal: 0,
      targetProteinG: m.targets.proteinG === null ? null : 0,
      mealCount: 0,
      estimated: m.targets.energyKcal === null,
      showNumbers: m.targets.showNumbers,
    });
  }

  for (const slot of ctx.orderedSlots) {
    const recipeId = assignment[slot.key];
    if (!recipeId) continue;
    const recipe = ctx.recipesById.get(recipeId);
    if (!recipe) continue;
    const slotPortions = portionsForSlot(input, ctx, slot, recipe);
    portions[slot.key] = slotPortions;
    for (const p of slotPortions) {
      const t = p.target;
      const e = (p.nutrients.energyKcal - t.energyKcal) / t.energyKcal;
      const shortfall = t.proteinG ? Math.max(0, (t.proteinG - p.nutrients.proteinG) / t.proteinG) : 0;
      nutritionPenalty += e * e + shortfall * shortfall;
      personMeals += 1;
      const w = weekly.get(p.memberId);
      if (w) {
        w.planned = addNutrients(w.planned, p.nutrients);
        w.targetEnergyKcal += t.energyKcal;
        if (w.targetProteinG !== null && t.proteinG !== null) w.targetProteinG += t.proteinG;
        w.mealCount += 1;
      }
    }
  }

  const sessions = buildSessions(input, ctx, assignment);
  const meals: MealUsage[] = sessions.map((s) => {
    const recipe = ctx.recipesById.get(s.recipeId) as Recipe;
    return {
      mealKey: s.slotKey,
      recipeId: s.recipeId,
      recipeTitle: recipe.title,
      quantities: cookingQuantities(s.servesSlotKeys.flatMap((k) => portions[k] ?? [])),
    };
  });
  const shopping = buildShoppingList(
    meals,
    input.ingredients,
    input.offers,
    input.pantry,
    input.preferences.retail,
    undefined,
    ctx.packCache,
  );

  const filledSlots = ctx.orderedSlots.filter((s) => assignment[s.key]);
  const budget = summarizeBudget({
    budgetCents: input.preferences.budgetCents,
    mode: input.preferences.budgetMode,
    basketCents: shopping.totalCents,
    mealCount: filledSlots.length,
    personMealCount: personMeals,
    dayCount: new Set(filledSlots.map((s) => s.date)).size,
    missingPriceCount: shopping.missingPriceCount,
    quality: shopping.quality,
  });

  const score = scorePlan(input, ctx, sessions, {
    nutritionPenalty,
    personMeals,
    basketCents: shopping.totalCents,
    wasteCents: shopping.wasteValueCents,
    missingPrices: shopping.missingPriceCount,
  });

  return {
    assignment,
    portions,
    sessions,
    shopping,
    budget,
    nutrition: [...weekly.values()],
    score,
  };
}

interface RawMetrics {
  nutritionPenalty: number;
  personMeals: number;
  basketCents: number;
  wasteCents: number;
  missingPrices: number;
}

export function scorePlan(
  input: PlannerInput,
  ctx: EvalContext,
  sessions: CookingSession[],
  m: RawMetrics,
): ScoreBreakdown {
  const prefs = input.preferences;
  const w = input.weights;
  const budgetRef = Math.max(prefs.budgetCents, 1);

  const nutrition = m.personMeals > 0 ? (SCORING.nutritionScale * m.nutritionPenalty) / m.personMeals : 0;

  const limit = budgetLimitCents(prefs.budgetCents, prefs.budgetMode);
  const overflow = Number.isFinite(limit) ? Math.max(0, m.basketCents - limit) / budgetRef : 0;
  let budget = SCORING.missingPricePenalty * m.missingPrices;
  if (prefs.budgetMode === "strict" && overflow > 0) budget += SCORING.strictOverflowPenalty * overflow + SCORING.strictOverflowStep;
  if (prefs.budgetMode === "target" && overflow > 0) budget += SCORING.targetOverflowPenalty * overflow;

  const costWeight = prefs.budgetMode === "nutrition_first" ? SCORING.costWeightNutritionFirst : 1;
  const cost = (costWeight * m.basketCents) / budgetRef;
  const waste = (SCORING.wasteScale * m.wasteCents) / budgetRef;

  // Variety
  let variety = 0;
  const sessionsPerRecipe = new Map<string, CookingSession[]>();
  for (const s of sessions) sessionsPerRecipe.set(s.recipeId, [...(sessionsPerRecipe.get(s.recipeId) ?? []), s]);
  const maxServings = SCORING.maxServingsPerRecipe[prefs.repetitionTolerance];
  for (const list of sessionsPerRecipe.values()) {
    // Each session counts once, plus its non-leftover repeats.
    const servings = list.length;
    if (servings > maxServings) variety += SCORING.extraRepeatPenalty * (servings - maxServings);
    const days = list.map((s) => ctx.slotsByKey.get(s.slotKey)?.dayIndex ?? 0).sort((a, b) => a - b);
    for (let i = 1; i < days.length; i++) {
      const gap = days[i] - days[i - 1];
      if (gap === 0) variety += SCORING.sameDayRepeatPenalty;
      else if (gap <= SCORING.closeRepeatDays) variety += SCORING.closeRepeatPenalty;
    }
  }
  if (prefs.maxDistinctRecipes !== null && sessionsPerRecipe.size > prefs.maxDistinctRecipes) {
    variety += SCORING.extraDistinctPenalty * (sessionsPerRecipe.size - prefs.maxDistinctRecipes);
  }
  for (let i = 1; i < sessions.length; i++) {
    const a = ctx.recipesById.get(sessions[i - 1].recipeId);
    const b = ctx.recipesById.get(sessions[i].recipeId);
    if (!a || !b || a.id === b.id) continue;
    const fa = recipeProteinFamilies(a, input.ingredients);
    const fb = new Set(recipeProteinFamilies(b, input.ingredients));
    if (fa.some((f) => fb.has(f))) variety += SCORING.consecutiveProteinPenalty;
  }

  const starchSessions = new Map<string, number>();
  for (const s of sessions) {
    const recipe = ctx.recipesById.get(s.recipeId);
    if (!recipe) continue;
    for (const id of new Set(recipe.ingredients.filter((ri) => ri.role === "starch").map((ri) => ri.ingredientId))) {
      starchSessions.set(id, (starchSessions.get(id) ?? 0) + 1);
    }
  }
  for (const count of starchSessions.values()) {
    if (count > SCORING.starchRepeatThreshold) variety += SCORING.starchRepeatPenalty * (count - SCORING.starchRepeatThreshold);
  }

  // Time
  let time = 0;
  for (const s of sessions) {
    const slot = ctx.slotsByKey.get(s.slotKey);
    if (!slot) continue;
    const over = Math.max(0, s.activeMinutes - timeLimitFor(slot, input));
    time += over / SCORING.minutesOverScale;
    if (prefs.preferQuickMeals) time += (SCORING.quickMealWeight * s.activeMinutes) / SCORING.quickMealScale;
  }

  // Preferences
  let preferences = 0;
  const recent = new Set(prefs.recentlyEatenRecipeIds);
  const liked = new Set(input.members.flatMap((mem) => mem.likedIngredientIds));
  for (const s of sessions) {
    const recipe = ctx.recipesById.get(s.recipeId);
    if (!recipe) continue;
    if (recent.has(recipe.id)) preferences += SCORING.recentlyEatenPenalty;
    if (!inSeason(recipe, input.month)) preferences += SCORING.outOfSeasonPenalty;
    for (const ri of recipe.ingredients) if (liked.has(ri.ingredientId)) preferences -= SCORING.likedIngredientBonus;
  }

  const total =
    w.nutrition * nutrition +
    w.budget * budget +
    w.cost * cost +
    w.variety * variety +
    w.time * time +
    w.waste * waste +
    w.preferences * preferences;

  return { total, nutrition, budget, cost, variety, time, waste, preferences };
}

export function emptyAssignment(input: PlannerInput): Assignment {
  const a: Assignment = {};
  for (const s of input.slots) a[s.key] = input.locked[s.key] ?? null;
  return a;
}
