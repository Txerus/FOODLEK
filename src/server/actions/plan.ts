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
  applyReplacement,
  proposeReplacement,
  replaceMeal,
  restoreSlotRecipe,
  type ReplacementProposal,
  setShoppingChecked,
  setSlotLocked,
  uncheckAllShopping,
  undoRegeneration,
} from "../services/plans";
import { assertWithinLimit } from "../rate-limit";
import { runAction, UserFacingError, type ActionResult } from "./result";

const slotKey = z.string().regex(/^\d{4}-\d{2}-\d{2}:(breakfast|lunch|dinner|snack)$/);
const id = z.string().min(1).max(100);

function revalidateApp() {
  revalidatePath("/", "layout");
}

export async function regeneratePlanAction(): Promise<ActionResult<{ planId: string }>> {
  return runAction("regeneratePlan", async () => {
    const { householdId } = await householdForAction();
    await assertWithinLimit("regeneratePlan", householdId);
    const { planId, droppedLocks } = await generatePlan(householdId, planningWeekStart(new Date()));
    revalidateApp();
    const message =
      droppedLocks > 0
        ? `Nouvelle semaine générée. ${droppedLocks} repas épinglé(s) ne convenant plus à votre foyer (régime, allergie ou aliment refusé) ont été remplacé(s).`
        : "Nouvelle semaine générée. Les repas épinglés ont été conservés.";
    return { data: { planId }, message };
  });
}

/** Puts back the week as it was before the last regeneration. */
export async function undoRegenerationAction(input: unknown): Promise<ActionResult> {
  return runAction("undoRegeneration", async () => {
    const { planId } = z.object({ planId: id }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(planId, householdId);
    if (!(await undoRegeneration(planId))) throw new UserFacingError("Il n'y a rien à annuler.");
    revalidateApp();
    return { data: undefined, message: "Semaine précédente rétablie." };
  });
}

export async function uncheckAllShoppingAction(input: unknown): Promise<ActionResult> {
  return runAction("uncheckAllShopping", async () => {
    const { planId } = z.object({ planId: id }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(planId, householdId);
    await uncheckAllShopping(planId);
    revalidatePath("/shopping");
    return { data: undefined, message: "Tous les produits sont décochés." };
  });
}

export async function replaceMealAction(input: unknown): Promise<ActionResult<{ recipeTitle: string | null }>> {
  return runAction("replaceMeal", async () => {
    const data = z.object({ planId: id, slotKey, reason: z.enum(REPLACEMENT_REASONS) }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    await assertWithinLimit("replaceMeal", householdId);
    const result = await replaceMeal(householdId, data.planId, data.slotKey, data.reason);
    revalidateApp();
    return {
      data: { recipeTitle: result.recipeTitle },
      message: result.message ?? (result.recipeTitle ? `Remplacé par : ${result.recipeTitle}` : null),
    };
  });
}

/** Shows what a replacement would give, without saving anything. */
export async function previewReplacementAction(input: unknown): Promise<ActionResult<ReplacementProposal>> {
  return runAction("previewReplacement", async () => {
    const data = z
      .object({ planId: id, slotKey, reason: z.enum(REPLACEMENT_REASONS), exclude: z.array(id).max(30).default([]) })
      .parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    await assertWithinLimit("replaceMeal", householdId);
    const proposal = await proposeReplacement(householdId, data.planId, data.slotKey, data.reason, data.exclude);
    return { data: proposal };
  });
}

export async function applyReplacementAction(input: unknown): Promise<ActionResult<{ previousRecipeId: string | null }>> {
  return runAction("applyReplacement", async () => {
    const data = z.object({ planId: id, slotKey, reason: z.enum(REPLACEMENT_REASONS), recipeId: id }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    const result = await applyReplacement(householdId, data.planId, data.slotKey, data.reason, data.recipeId);
    revalidateApp();
    return { data: result, message: "Repas remplacé." };
  });
}

/** Undo of a replacement: puts the previous recipe (or an empty slot) back. */
export async function restoreMealAction(input: unknown): Promise<ActionResult> {
  return runAction("restoreMeal", async () => {
    const data = z.object({ planId: id, slotKey, recipeId: id.nullable() }).parse(input);
    const { householdId } = await householdForAction();
    await assertPlanInHousehold(data.planId, householdId);
    if (data.recipeId) await chooseRecipeForSlot(householdId, data.planId, data.slotKey, data.recipeId);
    else await restoreSlotRecipe(data.planId, data.slotKey, null);
    revalidateApp();
    return { data: undefined, message: "Repas précédent rétabli." };
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
