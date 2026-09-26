"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { householdForAction } from "../auth/access";
import { getCatalog } from "../services/catalog";
import { removePantryItem, upsertPantryItem } from "../services/households";
import { runAction, UserFacingError, type ActionResult } from "./result";

const ingredientId = z.string().min(1).max(100);

export async function setPantryItemAction(input: unknown): Promise<ActionResult> {
  return runAction("setPantryItem", async () => {
    const data = z.object({ ingredientId, quantity: z.number().min(0).max(100000).nullable() }).parse(input);
    const catalog = await getCatalog();
    if (!catalog.ingredientIndex.has(data.ingredientId)) throw new UserFacingError("Ingrédient inconnu.");
    const { householdId } = await householdForAction();
    await upsertPantryItem(householdId, data.ingredientId, data.quantity);
    revalidatePath("/", "layout");
    return { data: undefined };
  });
}

export async function removePantryItemAction(input: unknown): Promise<ActionResult> {
  return runAction("removePantryItem", async () => {
    const data = z.object({ ingredientId }).parse(input);
    const { householdId } = await householdForAction();
    await removePantryItem(householdId, data.ingredientId);
    revalidatePath("/", "layout");
    return { data: undefined };
  });
}
