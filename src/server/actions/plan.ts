"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { REPLACEMENT_REASONS } from "@/domain/planning/optimizer";
import { planningWeekStart } from "@/lib/week";
import { assertPlanInHousehold, householdForAction } from "../auth/access";
import {
  acceptOverBudget,
  chooseRecipeForSlot,
  generatePlan,
  replaceMeal,
  setShoppingChecked,
  setSlotLocked,
} from "../services/plans";
import { runAction, type ActionResult } from "./result";

const slotKey = z.string().regex(/^\d{4}-\d{2}-\d{2}:(breakfast|lunch|dinner|snack)$/);
const id = z.string().min(1).max(100);

function revalidateApp() {
  revalidatePath("/", "layout");
}

export async function regeneratePlanAction(): Promise<ActionResult<{ planId: string }>> {
  return runAction("regeneratePlan", async () => {
    const { householdId } = await householdForAction();
    const { planId, droppedLocks } = await generatePlan(householdId, planningWeekStart(new Date()));
    revalidateApp();
    const message =
      droppedLocks > 0
        ? `Nouvelle semaine générée. ${droppedLocks} repas épinglé(s) ne convenant plus à votre foyer (régime, allergie ou aliment refusé) ont été remplacé(s).`
        : "Nouvelle semaine générée. Les repas épinglés ont été conservés.";
    return { data: { planId }, message };
  });
}

export async function replaceMealAction(input: unknown): Promise<ActionResult<{ recipeTitle: string | null }>> {
  return runAction("replaceMeal", async () => {
    const data = z.object({ planId: id, slotKey, reason: z.enum(REPLACEMENT_REASONS) }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    const result = await replaceMeal(householdId, data.planId, data.slotKey, data.reason);
    revalidateApp();
    return {
      data: { recipeTitle: result.recipeTitle },
      message: result.message ?? (result.recipeTitle ? `Remplacé par : ${result.recipeTitle}` : null),
    };
  });
}

export async function chooseRecipeAction(input: unknown): Promise<ActionResult> {
  return runAction("chooseRecipe", async () => {
    const data = z.object({ planId: id, slotKey, recipeId: id }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    await chooseRecipeForSlot(householdId, data.planId, data.slotKey, data.recipeId);
    revalidateApp();
    return { data: undefined, message: "Repas mis à jour." };
  });
}

export async function toggleLockAction(input: unknown): Promise<ActionResult> {
  return runAction("toggleLock", async () => {
    const data = z.object({ planId: id, slotKey, locked: z.boolean() }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    await setSlotLocked(data.planId, data.slotKey, data.locked);
    revalidateApp();
    return { data: undefined };
  });
}

export async function toggleShoppingItemAction(input: unknown): Promise<ActionResult> {
  return runAction("toggleShoppingItem", async () => {
    const data = z.object({ planId: id, ingredientId: id, checked: z.boolean() }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    await setShoppingChecked(data.planId, data.ingredientId, data.checked);
    revalidatePath("/shopping");
    return { data: undefined };
  });
}

export async function acceptOverBudgetAction(input: unknown): Promise<ActionResult> {
  return runAction("acceptOverBudget", async () => {
    const data = z.object({ planId: id }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    await acceptOverBudget(data.planId);
    revalidateApp();
    return { data: undefined, message: "Dépassement validé pour cette semaine." };
  });
}
