import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Diet, EaterConstraints } from "@/domain/catalog/diets";
import type { Allergen, Equipment, MealType } from "@/domain/catalog/types";
import type { BudgetMode } from "@/domain/budget/budget";
import type { ActivityLevel, Appetite, Goal } from "@/domain/nutrition/config";
import type { MemberProfile, Sex, SpecialSituation } from "@/domain/nutrition/targets";
import type { CookingSkill, RepetitionTolerance } from "@/domain/planning/types";
import type { PantryItem } from "@/domain/shopping/aggregate";
import type { HouseholdSetup, MemberInput } from "@/lib/validation/household";
import { db, type Transaction } from "../db/client";
import * as t from "../db/schema";
import { newId } from "../ids";

export interface HouseholdMemberRecord {
  id: string;
  displayName: string;
  isChild: boolean;
  profile: MemberProfile;
  constraints: EaterConstraints;
  likedIngredientIds: string[];
  position: number;
  userId: string | null;
}

export interface HouseholdSettingsRecord {
  adults: number;
  children: number;
  mealSchedule: Record<MealType, number[]>;
  generalAppetite: Appetite;
  budgetCents: number;
  budgetMode: BudgetMode;
  maxWeekdayMinutes: number;
  maxWeekendMinutes: number;
  skill: CookingSkill;
  equipment: Equipment[];
  batchCooking: boolean;
  preferQuickMeals: boolean;
  maxDistinctRecipes: number | null;
  organic: "prefer" | "indifferent";
  storeBrand: "prefer" | "indifferent" | "avoid";
  acceptPromotions: boolean;
  repetitionTolerance: RepetitionTolerance;
  useLeftovers: boolean;
  storeId: string | null;
}

export interface HouseholdContext {
  id: string;
  name: string;
  onboardingCompleted: boolean;
  settings: HouseholdSettingsRecord | null;
  members: HouseholdMemberRecord[];
  pantry: PantryItem[];
}

function toMember(row: typeof t.householdMembers.$inferSelect): HouseholdMemberRecord {
  return {
    id: row.id,
    displayName: row.displayName,
    isChild: row.isChild,
    position: row.position,
    userId: row.userId,
    profile: {
      id: row.id,
      name: row.displayName,
      mode: row.profileMode === "detailed" ? "detailed" : "simplified",
      sex: (row.sex as Sex | null) ?? null,
      birthYear: row.birthYear,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      activity: row.activity as ActivityLevel,
      goal: row.goal as Goal,
      highProtein: row.highProtein,
      appetite: row.appetite as Appetite,
      specialSituations: row.specialSituations as SpecialSituation[],
    },
    constraints: {
      diets: row.diets as Diet[],
      allergies: row.allergies as Allergen[],
      excludedIngredientIds: row.excludedIngredientIds,
    },
    likedIngredientIds: row.likedIngredientIds,
  };
}

function toSettings(row: typeof t.householdSettings.$inferSelect): HouseholdSettingsRecord {
  const schedule = row.mealSchedule;
  return {
    adults: row.adults,
    children: row.children,
    mealSchedule: {
      breakfast: schedule.breakfast ?? [],
      lunch: schedule.lunch ?? [],
      dinner: schedule.dinner ?? [],
      snack: schedule.snack ?? [],
    },
    generalAppetite: row.generalAppetite as Appetite,
    budgetCents: row.budgetCents,
    budgetMode: row.budgetMode as BudgetMode,
    maxWeekdayMinutes: row.maxWeekdayMinutes,
    maxWeekendMinutes: row.maxWeekendMinutes,
    skill: row.skill as CookingSkill,
    equipment: row.equipment as Equipment[],
    batchCooking: row.batchCooking,
    preferQuickMeals: row.preferQuickMeals,
    maxDistinctRecipes: row.maxDistinctRecipes,
    organic: row.organic as HouseholdSettingsRecord["organic"],
    storeBrand: row.storeBrand as HouseholdSettingsRecord["storeBrand"],
    acceptPromotions: row.acceptPromotions,
    repetitionTolerance: row.repetitionTolerance as RepetitionTolerance,
    useLeftovers: row.useLeftovers,
    storeId: row.storeId,
  };
}

export async function loadHouseholdContext(householdId: string): Promise<HouseholdContext> {
  const database = db();
  const [households, settings, members, pantry] = await Promise.all([
    database.select().from(t.households).where(eq(t.households.id, householdId)).limit(1),
    database.select().from(t.householdSettings).where(eq(t.householdSettings.householdId, householdId)).limit(1),
    database
      .select()
      .from(t.householdMembers)
      .where(eq(t.householdMembers.householdId, householdId))
      .orderBy(asc(t.householdMembers.position)),
    database.select().from(t.pantryItems).where(eq(t.pantryItems.householdId, householdId)),
  ]);
  const household = households[0];
  if (!household) throw new Error("Foyer introuvable");
  return {
    id: household.id,
    name: household.name,
    onboardingCompleted: household.onboardingCompletedAt !== null,
    settings: settings[0] ? toSettings(settings[0]) : null,
    members: members.map(toMember),
    pantry: pantry.map((p) => ({ ingredientId: p.ingredientId, quantity: p.quantity })),
  };
}

export async function createHouseholdForUser(userId: string, name = "Mon foyer"): Promise<string> {
  const id = newId("hh");
  await db().transaction(async (tx) => {
    await tx.insert(t.households).values({ id, name });
    await tx.insert(t.householdMemberships).values({ id: newId("hm"), householdId: id, userId, role: "owner" });
  });
  return id;
}

function memberValues(householdId: string, m: MemberInput, position: number) {
  const detailed = m.profileMode === "detailed";
  return {
    householdId,
    displayName: m.displayName,
    position,
    isChild: m.isChild,
    profileMode: m.profileMode,
    // Data minimisation: body measurements are only kept for detailed profiles.
    sex: detailed ? m.sex : null,
    birthYear: m.birthYear,
    heightCm: detailed ? m.heightCm : null,
    weightKg: detailed ? m.weightKg : null,
    activity: m.activity,
    goal: m.isChild && m.goal === "lose" ? "none" : m.goal,
    highProtein: m.highProtein,
    appetite: m.appetite,
    specialSituations: m.specialSituations,
    diets: m.diets,
    allergies: m.allergies,
    excludedIngredientIds: m.excludedIngredientIds,
    likedIngredientIds: m.likedIngredientIds,
  };
}

async function writeMembers(tx: Transaction, householdId: string, members: MemberInput[]) {
  const existing = await tx
    .select({ id: t.householdMembers.id })
    .from(t.householdMembers)
    .where(eq(t.householdMembers.householdId, householdId));
  const existingIds = new Set(existing.map((e) => e.id));
  const keep = new Set<string>();
  for (const [i, m] of members.entries()) {
    if (m.id && existingIds.has(m.id)) {
      keep.add(m.id);
      await tx.update(t.householdMembers).set(memberValues(householdId, m, i)).where(eq(t.householdMembers.id, m.id));
    } else {
      await tx.insert(t.householdMembers).values({ id: newId("mem"), ...memberValues(householdId, m, i) });
    }
  }
  for (const id of existingIds) {
    if (!keep.has(id)) await tx.delete(t.householdMembers).where(eq(t.householdMembers.id, id));
  }
}

export async function saveHouseholdSetup(householdId: string, setup: HouseholdSetup): Promise<void> {
  await db().transaction(async (tx) => {
    await tx.update(t.households).set({ name: setup.householdName }).where(eq(t.households.id, householdId));
    const settings = {
      adults: setup.members.filter((m) => !m.isChild).length,
      children: setup.members.filter((m) => m.isChild).length,
      mealSchedule: setup.schedule,
      generalAppetite: setup.generalAppetite,
      budgetCents: Math.round(setup.budgetEuros * 100),
      budgetMode: setup.budgetMode,
      maxWeekdayMinutes: setup.maxWeekdayMinutes,
      maxWeekendMinutes: setup.maxWeekendMinutes,
      skill: setup.skill,
      equipment: setup.equipment,
      batchCooking: setup.batchCooking,
      preferQuickMeals: setup.preferQuickMeals,
      maxDistinctRecipes: setup.maxDistinctRecipes,
      organic: setup.organic,
      storeBrand: setup.storeBrand,
      acceptPromotions: setup.acceptPromotions,
      repetitionTolerance: setup.repetitionTolerance,
      useLeftovers: setup.useLeftovers || setup.batchCooking,
      storeId: setup.storeId,
    };
    await tx
      .insert(t.householdSettings)
      .values({ householdId, ...settings })
      .onConflictDoUpdate({ target: t.householdSettings.householdId, set: settings });
    await writeMembers(tx, householdId, setup.members);
    await tx.delete(t.pantryItems).where(eq(t.pantryItems.householdId, householdId));
    if (setup.pantryIngredientIds.length) {
      await tx
        .insert(t.pantryItems)
        .values(setup.pantryIngredientIds.map((ingredientId) => ({ id: newId("pan"), householdId, ingredientId, quantity: null })));
    }
  });
}

export async function markOnboardingComplete(householdId: string): Promise<void> {
  await db()
    .update(t.households)
    .set({ onboardingCompletedAt: new Date(), onboardingDraft: null })
    .where(eq(t.households.id, householdId));
}

export async function saveOnboardingDraft(householdId: string, draft: Record<string, unknown>): Promise<void> {
  await db().update(t.households).set({ onboardingDraft: draft }).where(eq(t.households.id, householdId));
}

export async function getOnboardingDraft(householdId: string): Promise<Record<string, unknown> | null> {
  const rows = await db()
    .select({ draft: t.households.onboardingDraft })
    .from(t.households)
    .where(eq(t.households.id, householdId))
    .limit(1);
  return rows[0]?.draft ?? null;
}

/** Rebuilds the wizard state from saved data, for editing after onboarding. */
export function contextToSetup(ctx: HouseholdContext): HouseholdSetup | null {
  if (!ctx.settings) return null;
  const s = ctx.settings;
  return {
    householdName: ctx.name,
    members: ctx.members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      isChild: m.isChild,
      profileMode: m.profile.mode,
      sex: m.profile.sex,
      birthYear: m.profile.birthYear,
      heightCm: m.profile.heightCm,
      weightKg: m.profile.weightKg,
      activity: m.profile.activity,
      goal: m.profile.goal,
      highProtein: m.profile.highProtein,
      appetite: m.profile.appetite,
      specialSituations: m.profile.specialSituations,
      diets: m.constraints.diets,
      allergies: m.constraints.allergies,
      excludedIngredientIds: m.constraints.excludedIngredientIds,
      likedIngredientIds: m.likedIngredientIds,
    })),
    schedule: s.mealSchedule,
    generalAppetite: s.generalAppetite,
    budgetEuros: s.budgetCents / 100,
    budgetMode: s.budgetMode,
    maxWeekdayMinutes: s.maxWeekdayMinutes,
    maxWeekendMinutes: s.maxWeekendMinutes,
    skill: s.skill,
    equipment: s.equipment,
    batchCooking: s.batchCooking,
    preferQuickMeals: s.preferQuickMeals,
    maxDistinctRecipes: s.maxDistinctRecipes,
    repetitionTolerance: s.repetitionTolerance,
    useLeftovers: s.useLeftovers,
    storeId: s.storeId,
    organic: s.organic,
    storeBrand: s.storeBrand,
    acceptPromotions: s.acceptPromotions,
    pantryIngredientIds: ctx.pantry.map((p) => p.ingredientId),
  };
}
