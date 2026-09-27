"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { householdSetupSchema } from "@/lib/validation/household";
import { AccessDeniedError, getCurrentUser, getHouseholdIdForUser, householdForAction } from "../auth/access";
import { getCatalog } from "../services/catalog";
import {
  ensureHouseholdForUser,
  markOnboardingComplete,
  saveHouseholdSetup,
  saveOnboardingDraft,
} from "../services/households";
import { planningWeekStart } from "@/lib/week";
import { generatePlan } from "../services/plans";
import { runAction, UserFacingError, type ActionResult } from "./result";

const MAX_DRAFT_BYTES = 64 * 1024;

async function ensureHousehold(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new AccessDeniedError("Connectez-vous pour continuer.");
  return (await getHouseholdIdForUser(user.id)) ?? (await ensureHouseholdForUser(user.id));
}

/** Autosave of the onboarding wizard. */
export async function saveDraftAction(draft: unknown): Promise<ActionResult> {
  return runAction("saveDraft", async () => {
    const parsed = z.object({ step: z.number().int().min(0).max(20), data: z.record(z.string(), z.unknown()) }).parse(draft);
    if (JSON.stringify(parsed).length > MAX_DRAFT_BYTES) throw new UserFacingError("Brouillon trop volumineux.");
    const householdId = await ensureHousehold();
    await saveOnboardingDraft(householdId, parsed);
    return { data: undefined };
  });
}

async function validateReferences(setup: z.infer<typeof householdSetupSchema>) {
  const catalog = await getCatalog();
  const known = new Set(catalog.ingredients.map((i) => i.id));
  const unknown = [
    ...setup.pantryIngredientIds,
    ...setup.members.flatMap((m) => [...m.excludedIngredientIds, ...m.likedIngredientIds]),
  ].filter((id) => !known.has(id));
  if (unknown.length) throw new UserFacingError("Certains ingrédients sélectionnés sont inconnus.");
}

/** Final step of the onboarding: saves everything and generates the first week. */
export async function completeOnboardingAction(input: unknown): Promise<ActionResult<{ planId: string }>> {
  return runAction("completeOnboarding", async () => {
    const setup = householdSetupSchema.parse(input);
    await validateReferences(setup);
    const householdId = await ensureHousehold();
    await saveHouseholdSetup(householdId, setup);
    await markOnboardingComplete(householdId);
    const { planId } = await generatePlan(householdId, planningWeekStart(new Date()));
    revalidatePath("/", "layout");
    return { data: { planId } };
  });
}

/** Editing the household after onboarding (same form, same validation). */
export async function updateHouseholdAction(input: unknown): Promise<ActionResult> {
  return runAction("updateHousehold", async () => {
    const setup = householdSetupSchema.parse(input);
    await validateReferences(setup);
    const { householdId } = await householdForAction();
    await saveHouseholdSetup(householdId, setup);
    revalidatePath("/", "layout");
    return { data: undefined, message: "Foyer mis à jour. Régénérez la semaine pour appliquer les changements au menu." };
  });
}
