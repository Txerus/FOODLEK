import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { planningWeekStart } from "@/lib/week";
import { DEFAULT_SETUP, defaultMember, householdSetupSchema } from "@/lib/validation/household";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";
import { newId } from "@/server/ids";
import { createHouseholdForUser, ensureHouseholdForUser, saveHouseholdSetup } from "@/server/services/households";
import { generatePlan, setShoppingChecked, uncheckAllShopping, undoRegeneration } from "@/server/services/plans";

async function household() {
  const userId = newId("usr");
  await db().insert(t.user).values({ id: userId, name: "U", email: `${userId}@example.com` });
  const householdId = await createHouseholdForUser(userId);
  await saveHouseholdSetup(householdId, householdSetupSchema.parse({ ...DEFAULT_SETUP, members: [defaultMember(0)], storeId: "store_demo" }));
  return { userId, householdId };
}

const slotsOf = async (planId: string) =>
  (await db().select().from(t.mealPlanSlots).where(eq(t.mealPlanSlots.planId, planId)))
    .map((s) => `${s.date}:${s.mealType}:${s.recipeId}`)
    .sort();

describe("regenerating a week", () => {
  it("can be undone, ticked items included", async () => {
    const { householdId } = await household();
    const week = planningWeekStart(new Date());
    const { planId } = await generatePlan(householdId, week);
    const before = await slotsOf(planId);
    await setShoppingChecked(planId, "ing_oeuf", true);

    const again = await generatePlan(householdId, week);
    expect(again.planId).toBe(planId);
    expect(await undoRegeneration(planId)).toBe(true);
    expect(await slotsOf(planId)).toEqual(before);
    const checked = await db().select().from(t.shoppingListItems).where(eq(t.shoppingListItems.planId, planId));
    expect(checked.filter((c) => c.checked).map((c) => c.ingredientId)).toEqual(["ing_oeuf"]);
    // Only once.
    expect(await undoRegeneration(planId)).toBe(false);

    await uncheckAllShopping(planId);
    const after = await db().select().from(t.shoppingListItems).where(eq(t.shoppingListItems.planId, planId));
    expect(after.some((c) => c.checked)).toBe(false);
  });

  it("never creates two households for concurrent first saves", async () => {
    const userId = newId("usr");
    await db().insert(t.user).values({ id: userId, name: "U", email: `${userId}@example.com` });
    const ids = await Promise.all([ensureHouseholdForUser(userId), ensureHouseholdForUser(userId), ensureHouseholdForUser(userId)]);
    expect(new Set(ids).size).toBe(1);
  });
});
