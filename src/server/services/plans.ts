import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { MEAL_TYPE_LABELS, type MealType, type Recipe } from "@/domain/catalog/types";
import { computeTargets } from "@/domain/nutrition/targets";
import { explainPlan, type Explanation } from "@/domain/planning/explain";
import { eligibleRecipes } from "@/domain/planning/evaluate";
import {
  evaluateAssignment,
  optimizePlan,
  replaceSlot,
  type ReplacementReason,
} from "@/domain/planning/optimizer";
import {
  DEFAULT_WEIGHTS,
  type Assignment,
  type PlanEvaluation,
  type PlanMember,
  type PlannerInput,
  type PlanSlot,
} from "@/domain/planning/types";
import type { OfferIndex } from "@/domain/retail/types";
import { mealCosts, type MealCost } from "@/domain/shopping/meal-cost";
import { isUpcoming, parisNow } from "@/lib/time";
import { addDays, planningWeekStart, weekStartFor } from "@/lib/week";
import { db } from "../db/client";
import * as t from "../db/schema";
import { newId } from "../ids";
import { errorContext, logger } from "../observability/logger";
import { getCatalog, type Catalog } from "./catalog";
import { loadHouseholdContext, type HouseholdContext } from "./households";
import { getStore, loadOffersForStore, type StoreSummary } from "./offers";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
const ITERATIONS = 900;
const RECENT_DAYS = 14;

/** Meals of the week from the household schedule; meals already past are not planned. */
export function buildSlots(ctx: HouseholdContext, weekStart: string, now?: Date): PlanSlot[] {
  const schedule = ctx.settings?.mealSchedule;
  if (!schedule) return [];
  const eaterIds = ctx.members.map((m) => m.id);
  const paris = now ? parisNow(now) : null;
  const slots: PlanSlot[] = [];
  for (let day = 0; day < 7; day++) {
    const date = addDays(weekStart, day);
    for (const mealType of MEAL_ORDER) {
      if (paris && !isUpcoming(date, mealType, paris)) continue;
      if (schedule[mealType]?.includes(day)) {
        slots.push({ key: `${date}:${mealType}`, date, dayIndex: day, mealType, eaterIds });
      }
    }
  }
  return slots;
}

export function planMembers(ctx: HouseholdContext, today: Date): PlanMember[] {
  return ctx.members.map((m) => ({
    profile: m.profile,
    targets: computeTargets(m.profile, today),
    constraints: m.constraints,
    likedIngredientIds: m.likedIngredientIds,
  }));
}

async function feedbackFor(householdId: string) {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 3600 * 1000);
  const rows = await db()
    .select({ recipeId: t.recipeFeedback.recipeId, kind: t.recipeFeedback.kind, createdAt: t.recipeFeedback.createdAt })
    .from(t.recipeFeedback)
    .where(eq(t.recipeFeedback.householdId, householdId));
  return {
    disliked: [...new Set(rows.filter((r) => r.kind === "dislike").map((r) => r.recipeId))],
    recentlyEaten: [...new Set(rows.filter((r) => r.kind === "eaten" && r.createdAt >= since).map((r) => r.recipeId))],
  };
}

async function previousWeekRecipes(householdId: string, weekStart: string): Promise<string[]> {
  const previous = addDays(weekStart, -7);
  const plans = await db()
    .select({ id: t.mealPlans.id })
    .from(t.mealPlans)
    .where(and(eq(t.mealPlans.householdId, householdId), eq(t.mealPlans.weekStart, previous)));
  if (plans.length === 0) return [];
  const slots = await db()
    .select({ recipeId: t.mealPlanSlots.recipeId })
    .from(t.mealPlanSlots)
    .where(inArray(t.mealPlanSlots.planId, plans.map((p) => p.id)));
  return [...new Set(slots.map((s) => s.recipeId).filter((x): x is string => x !== null))];
}

export interface PlanningInputs {
  ctx: HouseholdContext;
  catalog: Catalog;
  offers: OfferIndex;
  store: StoreSummary | null;
  input: PlannerInput;
}

export async function buildPlanningInputs(
  householdId: string,
  weekStart: string,
  options: { locked?: Record<string, string>; seed?: number; today?: Date; skipPastMeals?: boolean } = {},
): Promise<PlanningInputs> {
  const today = options.today ?? new Date();
  const [ctx, catalog] = await Promise.all([loadHouseholdContext(householdId), getCatalog()]);
  const settings = ctx.settings;
  if (!settings) throw new Error("Le foyer n'est pas encore configuré.");

  // A failing price source must never prevent planning: we plan without prices.
  let offers: OfferIndex = new Map();
  let store: StoreSummary | null = null;
  if (settings.storeId) {
    try {
      [store, offers] = await Promise.all([getStore(settings.storeId), loadOffersForStore(settings.storeId, today, householdId)]);
    } catch (error) {
      logger.error("plan.offers_failed", { householdId, ...errorContext(error) });
    }
  }

  const [feedback, lastWeek] = await Promise.all([feedbackFor(householdId), previousWeekRecipes(householdId, weekStart)]);

  const input: PlannerInput = {
    slots: buildSlots(ctx, weekStart, options.skipPastMeals ? today : undefined),
    members: planMembers(ctx, today),
    recipes: catalog.recipes,
    ingredients: catalog.ingredientIndex,
    offers,
    pantry: ctx.pantry,
    preferences: {
      budgetCents: settings.budgetCents,
      budgetMode: settings.budgetMode,
      maxWeekdayMinutes: settings.maxWeekdayMinutes,
      maxWeekendMinutes: settings.maxWeekendMinutes,
      skill: settings.skill,
      equipment: settings.equipment,
      maxDistinctRecipes: settings.maxDistinctRecipes,
      repetitionTolerance: settings.repetitionTolerance,
      useLeftovers: settings.useLeftovers,
      preferQuickMeals: settings.preferQuickMeals,
      retail: { organic: settings.organic, storeBrand: settings.storeBrand, acceptPromotions: settings.acceptPromotions },
      recentlyEatenRecipeIds: [...new Set([...feedback.recentlyEaten, ...lastWeek])],
      dislikedRecipeIds: feedback.disliked,
    },
    weights: DEFAULT_WEIGHTS,
    locked: options.locked ?? {},
    month: today.getUTCMonth() + 1,
    seed: options.seed ?? Math.floor(Math.random() * 2 ** 31),
    iterations: ITERATIONS,
  };
  return { ctx, catalog, offers, store, input };
}

async function writePlanSlots(planId: string, slots: PlanSlot[], assignment: Assignment, locked: Record<string, string>) {
  await db()
    .delete(t.mealPlanSlots)
    .where(eq(t.mealPlanSlots.planId, planId));
  if (slots.length === 0) return;
  await db()
    .insert(t.mealPlanSlots)
    .values(
      slots.map((s) => ({
        id: newId("slot"),
        planId,
        date: s.date,
        dayIndex: s.dayIndex,
        mealType: s.mealType,
        recipeId: assignment[s.key] ?? null,
        locked: Boolean(locked[s.key]),
        eaterIds: s.eaterIds,
      })),
    );
}

export async function generatePlan(householdId: string, weekStart: string): Promise<string> {
  // Keep pinned meals of an existing plan for the same week.
  const existing = await getPlanRow(householdId, weekStart);
  const locked: Record<string, string> = {};
  if (existing) {
    for (const s of await slotRows(existing.id)) {
      if (s.locked && s.recipeId) locked[`${s.date}:${s.mealType}`] = s.recipeId;
    }
  }
  const inputs = await buildPlanningInputs(householdId, weekStart, { locked, skipPastMeals: true });
  const { input } = inputs;
  const settings = inputs.ctx.settings;
  const started = Date.now();
  const result = optimizePlan(input);
  logger.info("plan.generated", {
    householdId,
    evaluations: result.evaluations,
    durationMs: Date.now() - started,
    unfillable: result.unfillable.length,
  });

  const planId = existing?.id ?? newId("plan");
  await db().transaction(async (tx) => {
    if (existing) {
      await tx
        .update(t.mealPlans)
        .set({ seed: input.seed, generatedAt: new Date(), storeId: settings?.storeId ?? null, overBudgetAcceptedAt: null })
        .where(eq(t.mealPlans.id, planId));
      await tx.delete(t.shoppingListItems).where(eq(t.shoppingListItems.planId, planId));
    } else {
      await tx.insert(t.mealPlans).values({
        id: planId,
        householdId,
        weekStart,
        seed: input.seed,
        storeId: settings?.storeId ?? null,
      });
    }
  });
  await writePlanSlots(planId, input.slots, result.best.assignment, locked);
  return planId;
}

async function getPlanRow(householdId: string, weekStart: string) {
  const rows = await db()
    .select()
    .from(t.mealPlans)
    .where(and(eq(t.mealPlans.householdId, householdId), eq(t.mealPlans.weekStart, weekStart), eq(t.mealPlans.status, "active")))
    .orderBy(desc(t.mealPlans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

async function slotRows(planId: string) {
  return db().select().from(t.mealPlanSlots).where(eq(t.mealPlanSlots.planId, planId));
}

/** The plan to show: the week being planned if it exists, otherwise the current week's. */
export async function findCurrentPlanId(householdId: string, today = new Date()): Promise<string | null> {
  const planned = await getPlanRow(householdId, planningWeekStart(today));
  if (planned) return planned.id;
  const current = await getPlanRow(householdId, weekStartFor(today));
  return current?.id ?? null;
}

export interface PlanView {
  planId: string;
  weekStart: string;
  generatedAt: Date;
  overBudgetAcceptedAt: Date | null;
  slots: PlanSlot[];
  lockedKeys: Set<string>;
  evaluation: PlanEvaluation;
  explanations: Explanation[];
  recipes: Map<string, Recipe>;
  ctx: HouseholdContext;
  catalog: Catalog;
  store: StoreSummary | null;
  checkedIngredientIds: Set<string>;
  /** Slots with no compatible recipe, with a human reason. */
  emptySlots: { key: string; label: string }[];
  input: PlannerInput;
  /** Cost of each cooking session (key = its first slot), leftovers included. */
  mealCosts: Map<string, MealCost>;
}

export async function loadPlanView(householdId: string, planId: string, today = new Date()): Promise<PlanView> {
  const planRows = await db()
    .select()
    .from(t.mealPlans)
    .where(and(eq(t.mealPlans.id, planId), eq(t.mealPlans.householdId, householdId)))
    .limit(1);
  const plan = planRows[0];
  if (!plan) throw new Error("Planning introuvable");
  const [rows, checks] = await Promise.all([
    slotRows(planId),
    db().select().from(t.shoppingListItems).where(eq(t.shoppingListItems.planId, planId)),
  ]);

  const locked: Record<string, string> = {};
  const assignment: Assignment = {};
  for (const r of rows) {
    const key = `${r.date}:${r.mealType}`;
    assignment[key] = r.recipeId;
    if (r.locked && r.recipeId) locked[key] = r.recipeId;
  }
  const inputs = await buildPlanningInputs(householdId, plan.weekStart, { locked, seed: plan.seed, today });
  // Slots come from the stored plan (the schedule may have changed since).
  const slots: PlanSlot[] = rows
    .map((r) => ({
      key: `${r.date}:${r.mealType}`,
      date: r.date,
      dayIndex: r.dayIndex,
      mealType: r.mealType as MealType,
      eaterIds: r.eaterIds.filter((id) => inputs.ctx.members.some((m) => m.id === id)),
    }))
    .sort((a, b) => a.dayIndex - b.dayIndex || MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
  const input: PlannerInput = { ...inputs.input, slots };
  // Recipes removed from the catalogue since generation are shown as empty slots.
  for (const key of Object.keys(assignment)) {
    const id = assignment[key];
    if (id && !inputs.catalog.recipesById.has(id)) assignment[key] = null;
  }
  const evaluation = evaluateAssignment(input, assignment);
  const explanations = explainPlan(
    evaluation,
    slots,
    inputs.catalog.recipesById,
    inputs.catalog.ingredientIndex,
    inputs.offers,
    input.preferences.retail,
  );
  const emptySlots = slots
    .filter((s) => !assignment[s.key])
    .map((s) => ({
      key: s.key,
      label:
        s.mealType === "snack"
          ? "Pas encore de recettes de collation dans le catalogue."
          : `Aucune recette compatible pour ce ${MEAL_TYPE_LABELS[s.mealType].toLowerCase()} avec vos contraintes.`,
    }));
  return {
    planId,
    weekStart: plan.weekStart,
    generatedAt: plan.generatedAt,
    overBudgetAcceptedAt: plan.overBudgetAcceptedAt,
    slots,
    lockedKeys: new Set(Object.keys(locked)),
    evaluation,
    explanations,
    recipes: inputs.catalog.recipesById,
    ctx: inputs.ctx,
    catalog: inputs.catalog,
    store: inputs.store,
    checkedIngredientIds: new Set(checks.filter((c) => c.checked).map((c) => c.ingredientId)),
    emptySlots,
    input,
    mealCosts: mealCosts(evaluation.shopping.lines),
  };
}

function parseSlotKey(slotKey: string): { date: string; mealType: MealType } {
  const [date, mealType] = slotKey.split(":");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !MEAL_ORDER.includes(mealType as MealType)) {
    throw new Error("Repas invalide");
  }
  return { date, mealType: mealType as MealType };
}

async function updateSlotRecipe(planId: string, slotKey: string, recipeId: string | null) {
  const { date, mealType } = parseSlotKey(slotKey);
  await db()
    .update(t.mealPlanSlots)
    .set({ recipeId })
    .where(and(eq(t.mealPlanSlots.planId, planId), eq(t.mealPlanSlots.date, date), eq(t.mealPlanSlots.mealType, mealType)));
  await db().update(t.mealPlans).set({ overBudgetAcceptedAt: null }).where(eq(t.mealPlans.id, planId));
}

export async function replaceMeal(
  householdId: string,
  planId: string,
  slotKey: string,
  reason: ReplacementReason,
): Promise<{ message: string | null; recipeTitle: string | null }> {
  const view = await loadPlanView(householdId, planId);
  const currentId = view.evaluation.assignment[slotKey];
  if (currentId && (reason === "dislike" || reason === "recently_eaten")) {
    await db()
      .insert(t.recipeFeedback)
      .values({ id: newId("fb"), householdId, recipeId: currentId, kind: reason === "dislike" ? "dislike" : "eaten" });
  }
  const input: PlannerInput =
    reason === "dislike" && currentId
      ? { ...view.input, preferences: { ...view.input.preferences, dislikedRecipeIds: [...view.input.preferences.dislikedRecipeIds, currentId] } }
      : view.input;
  const result = replaceSlot(input, view.evaluation.assignment, slotKey, reason);
  if (!result.evaluation) return { message: result.message, recipeTitle: null };
  const newRecipeId = result.evaluation.assignment[slotKey] ?? null;
  await updateSlotRecipe(planId, slotKey, newRecipeId);
  return {
    message: result.message,
    recipeTitle: newRecipeId ? (view.recipes.get(newRecipeId)?.title ?? null) : null,
  };
}

export async function chooseRecipeForSlot(householdId: string, planId: string, slotKey: string, recipeId: string): Promise<void> {
  const view = await loadPlanView(householdId, planId);
  const slot = view.slots.find((s) => s.key === slotKey);
  if (!slot) throw new Error("Repas introuvable dans ce planning.");
  const allowed = eligibleRecipes(view.input, slot).some((c) => c.recipe.id === recipeId);
  if (!allowed) throw new Error("Cette recette n'est pas compatible avec les contraintes du foyer.");
  await updateSlotRecipe(planId, slotKey, recipeId);
}

export async function setSlotLocked(planId: string, slotKey: string, locked: boolean): Promise<void> {
  const { date, mealType } = parseSlotKey(slotKey);
  await db()
    .update(t.mealPlanSlots)
    .set({ locked })
    .where(and(eq(t.mealPlanSlots.planId, planId), eq(t.mealPlanSlots.date, date), eq(t.mealPlanSlots.mealType, mealType)));
}

export async function setShoppingChecked(planId: string, ingredientId: string, checked: boolean): Promise<void> {
  await db()
    .insert(t.shoppingListItems)
    .values({ id: newId("sli"), planId, ingredientId, checked, checkedAt: checked ? new Date() : null })
    .onConflictDoUpdate({
      target: [t.shoppingListItems.planId, t.shoppingListItems.ingredientId],
      set: { checked, checkedAt: checked ? new Date() : null },
    });
}

export async function acceptOverBudget(planId: string): Promise<void> {
  await db().update(t.mealPlans).set({ overBudgetAcceptedAt: new Date() }).where(eq(t.mealPlans.id, planId));
}
