import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SETUP, defaultMember, householdSetupSchema, type HouseholdSetup } from "@/lib/validation/household";
import { planningWeekStart } from "@/lib/week";
import { AccessDeniedError, assertPlanInHousehold } from "@/server/auth/access";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";
import { newId } from "@/server/ids";
import { deleteAccount, exportAccountData } from "@/server/services/account";
import { createHouseholdForUser, loadHouseholdContext, markOnboardingComplete, saveHouseholdSetup } from "@/server/services/households";
import { generatePlan, loadPlanView, replaceMeal, setShoppingChecked } from "@/server/services/plans";

async function createUser(name: string) {
  const id = newId("usr");
  await db().insert(t.user).values({ id, name, email: `${id}@example.com` });
  return id;
}

function setup(overrides: Partial<HouseholdSetup> = {}): HouseholdSetup {
  return householdSetupSchema.parse({
    ...DEFAULT_SETUP,
    members: [
      { ...defaultMember(0), displayName: "Alex", profileMode: "detailed", sex: "male", birthYear: 1998, heightCm: 180, weightKg: 90, activity: "moderate", goal: "lose", highProtein: true },
      { ...defaultMember(1), displayName: "Camille", profileMode: "detailed", sex: "female", birthYear: 1999, heightCm: 165, weightKg: 60, goal: "maintain" },
    ],
    storeId: "store_demo",
    pantryIngredientIds: ["ing_huile-olive", "ing_sel"],
    ...overrides,
  });
}

let userA: string;
let userB: string;
let householdA: string;
let householdB: string;
let planA: string;

beforeAll(async () => {
  userA = await createUser("A");
  userB = await createUser("B");
  householdA = await createHouseholdForUser(userA);
  householdB = await createHouseholdForUser(userB);
  await saveHouseholdSetup(householdA, setup());
  await saveHouseholdSetup(householdB, setup({ members: [{ ...defaultMember(0), displayName: "Solo" }] }));
  await markOnboardingComplete(householdA);
  await markOnboardingComplete(householdB);
  planA = await generatePlan(householdA, planningWeekStart(new Date()));
});

describe("household data", () => {
  it("persists members, settings and pantry", async () => {
    const ctx = await loadHouseholdContext(householdA);
    expect(ctx.members.map((m) => m.displayName)).toEqual(["Alex", "Camille"]);
    expect(ctx.settings?.budgetCents).toBe(9000);
    expect(ctx.pantry.map((p) => p.ingredientId).sort()).toEqual(["ing_huile-olive", "ing_sel"]);
  });

  it("drops body measurements of simplified profiles (data minimisation)", async () => {
    await saveHouseholdSetup(householdB, setup({ members: [{ ...defaultMember(0), displayName: "Solo", heightCm: 170, weightKg: 70 }] }));
    const rows = await db().select().from(t.householdMembers).where(eq(t.householdMembers.householdId, householdB));
    expect(rows[0].weightKg).toBeNull();
    expect(rows[0].heightCm).toBeNull();
  });
});

describe("plan workflow", () => {
  it("generates a plan whose basket matches its shopping lines", async () => {
    const view = await loadPlanView(householdA, planA);
    expect(view.slots.length).toBeGreaterThan(0);
    const sum = view.evaluation.shopping.lines.reduce((s, l) => s + (l.costCents ?? 0), 0);
    expect(view.evaluation.budget.basketCents).toBe(sum);
    expect(view.evaluation.shopping.quality).toBe("DEMO");
    for (const l of view.evaluation.shopping.lines.filter((x) => x.ingredientId === "ing_sel")) expect(l.toBuy).toBe(0);
  });

  it("replaces a meal and persists the change", async () => {
    const before = await loadPlanView(householdA, planA);
    const slot = before.slots.find((s) => before.evaluation.assignment[s.key]);
    if (!slot) throw new Error("no meal");
    const previous = before.evaluation.assignment[slot.key];
    await replaceMeal(householdA, planA, slot.key, "dislike");
    const after = await loadPlanView(householdA, planA);
    expect(after.evaluation.assignment[slot.key]).not.toBe(previous);
    const feedback = await db().select().from(t.recipeFeedback).where(eq(t.recipeFeedback.householdId, householdA));
    expect(feedback.some((f) => f.recipeId === previous && f.kind === "dislike")).toBe(true);
  });

  it("stores shopping check-offs", async () => {
    await setShoppingChecked(planA, "ing_riz-long", true);
    const view = await loadPlanView(householdA, planA);
    expect(view.checkedIngredientIds.has("ing_riz-long")).toBe(true);
  });
});

describe("authorisation", () => {
  it("refuses access to another household's plan (IDOR)", async () => {
    await expect(assertPlanInHousehold(planA, householdB)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(assertPlanInHousehold(planA, householdA)).resolves.toBeUndefined();
    await expect(loadPlanView(householdB, planA)).rejects.toThrow();
  });

  it("exports only the account's own data", async () => {
    const data = await exportAccountData(userB);
    expect(data.households).toHaveLength(1);
    expect(data.households[0].id).toBe(householdB);
    expect(JSON.stringify(data)).not.toContain("Camille");
  });

  it("deletes an account with its unshared household", async () => {
    await deleteAccount(userB);
    expect(await db().select().from(t.households).where(eq(t.households.id, householdB))).toHaveLength(0);
    expect(await db().select().from(t.user).where(eq(t.user.id, userB))).toHaveLength(0);
    expect(await db().select().from(t.households).where(eq(t.households.id, householdA))).toHaveLength(1);
  });
});
