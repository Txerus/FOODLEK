import { z } from "zod";
import { DIETS } from "@/domain/catalog/diets";
import { ALLERGENS, EQUIPMENT } from "@/domain/catalog/types";
import { BUDGET_MODES } from "@/domain/budget/budget";
import { ACTIVITY_LEVELS, APPETITES, GOALS } from "@/domain/nutrition/config";
import { SEXES, SPECIAL_SITUATIONS } from "@/domain/nutrition/targets";

/**
 * Validation shared by the onboarding wizard (client) and the server actions
 * (authoritative). The server always re-validates.
 */

const currentYear = new Date().getFullYear();

export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;
export const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

const dayList = z.array(z.number().int().min(0).max(6)).max(7);

export const memberSchema = z
  .object({
    id: z.string().optional(),
    displayName: z.string().trim().min(1, "Indiquez un prénom ou un pseudonyme").max(40),
    isChild: z.boolean(),
    profileMode: z.enum(["detailed", "simplified"]),
    sex: z.enum(SEXES).nullable(),
    birthYear: z.number().int().min(currentYear - 110).max(currentYear).nullable(),
    heightCm: z.number().min(50).max(240).nullable(),
    weightKg: z.number().min(10).max(350).nullable(),
    activity: z.enum(ACTIVITY_LEVELS),
    goal: z.enum(GOALS),
    highProtein: z.boolean(),
    appetite: z.enum(APPETITES),
    specialSituations: z.array(z.enum(SPECIAL_SITUATIONS)),
    diets: z.array(z.enum(DIETS)),
    allergies: z.array(z.enum(ALLERGENS)),
    excludedIngredientIds: z.array(z.string()).max(100),
    likedIngredientIds: z.array(z.string()).max(100),
  })
  .superRefine((m, ctx) => {
    if (m.profileMode === "detailed") {
      if (m.sex === null) ctx.addIssue({ code: "custom", path: ["sex"], message: "Nécessaire au calcul détaillé" });
      if (m.birthYear === null) ctx.addIssue({ code: "custom", path: ["birthYear"], message: "Nécessaire au calcul détaillé" });
      if (m.heightCm === null) ctx.addIssue({ code: "custom", path: ["heightCm"], message: "Nécessaire au calcul détaillé" });
      if (m.weightKg === null) ctx.addIssue({ code: "custom", path: ["weightKg"], message: "Nécessaire au calcul détaillé" });
    }
    if (m.isChild && m.goal === "lose") {
      ctx.addIssue({ code: "custom", path: ["goal"], message: "Pas d'objectif de perte de poids pour un enfant" });
    }
  });

export type MemberInput = z.infer<typeof memberSchema>;

export const householdSetupSchema = z
  .object({
    householdName: z.string().trim().min(1).max(60),
    members: z.array(memberSchema).min(1, "Ajoutez au moins une personne").max(10),
    schedule: z.object({
      breakfast: dayList,
      lunch: dayList,
      dinner: dayList,
      snack: dayList,
    }),
    generalAppetite: z.enum(APPETITES),
    budgetEuros: z.number().min(10, "Budget minimum : 10 €").max(1000),
    budgetMode: z.enum(BUDGET_MODES),
    maxWeekdayMinutes: z.number().int().min(10).max(180),
    maxWeekendMinutes: z.number().int().min(10).max(240),
    skill: z.enum(["beginner", "intermediate", "advanced"]),
    equipment: z.array(z.enum(EQUIPMENT)).min(1, "Indiquez au moins un équipement"),
    batchCooking: z.boolean(),
    preferQuickMeals: z.boolean(),
    maxDistinctRecipes: z.number().int().min(1).max(21).nullable(),
    repetitionTolerance: z.enum(["low", "medium", "high"]),
    useLeftovers: z.boolean(),
    storeId: z.string().nullable(),
    organic: z.enum(["prefer", "indifferent"]),
    storeBrand: z.enum(["prefer", "indifferent", "avoid"]),
    acceptPromotions: z.boolean(),
    pantryIngredientIds: z.array(z.string()).max(200),
  })
  .superRefine((h, ctx) => {
    const total = h.schedule.breakfast.length + h.schedule.lunch.length + h.schedule.dinner.length + h.schedule.snack.length;
    if (total === 0) ctx.addIssue({ code: "custom", path: ["schedule"], message: "Choisissez au moins un repas à planifier" });
  });

export type HouseholdSetup = z.infer<typeof householdSetupSchema>;

export function defaultMember(index: number, isChild = false): MemberInput {
  return {
    displayName: isChild ? `Enfant ${index + 1}` : `Personne ${index + 1}`,
    isChild,
    profileMode: "simplified",
    sex: null,
    birthYear: null,
    heightCm: null,
    weightKg: null,
    activity: "light",
    goal: "none",
    highProtein: false,
    appetite: "normal",
    specialSituations: [],
    diets: [],
    allergies: [],
    excludedIngredientIds: [],
    likedIngredientIds: [],
  };
}

export const DEFAULT_SETUP: HouseholdSetup = {
  householdName: "Mon foyer",
  members: [defaultMember(0), defaultMember(1)],
  schedule: { breakfast: [], lunch: [0, 1, 2, 3, 4], dinner: [0, 1, 2, 3, 4, 5, 6], snack: [] },
  generalAppetite: "normal",
  budgetEuros: 90,
  budgetMode: "target",
  maxWeekdayMinutes: 40,
  maxWeekendMinutes: 75,
  skill: "intermediate",
  equipment: ["hob", "oven", "microwave"],
  batchCooking: false,
  preferQuickMeals: false,
  maxDistinctRecipes: null,
  repetitionTolerance: "medium",
  useLeftovers: true,
  storeId: null,
  organic: "indifferent",
  storeBrand: "indifferent",
  acceptPromotions: true,
  pantryIngredientIds: [],
};

/** Onboarding drafts are partial by nature; they are size-capped and re-validated at the end. */
export const onboardingDraftSchema = z.object({
  step: z.number().int().min(0).max(20),
  data: z.record(z.string(), z.unknown()),
});
