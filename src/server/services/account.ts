import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import * as t from "../db/schema";

/** GDPR export: everything stored about the account and its households. */
export async function exportAccountData(userId: string) {
  const database = db();
  const [u] = await database
    .select({ id: t.user.id, name: t.user.name, email: t.user.email, createdAt: t.user.createdAt })
    .from(t.user)
    .where(eq(t.user.id, userId));
  const memberships = await database.select().from(t.householdMemberships).where(eq(t.householdMemberships.userId, userId));
  const householdIds = memberships.map((m) => m.householdId);
  if (householdIds.length === 0) return { exportedAt: new Date().toISOString(), account: u, households: [] };
  const [households, settings, members, pantry, plans, feedback] = await Promise.all([
    database.select().from(t.households).where(inArray(t.households.id, householdIds)),
    database.select().from(t.householdSettings).where(inArray(t.householdSettings.householdId, householdIds)),
    database.select().from(t.householdMembers).where(inArray(t.householdMembers.householdId, householdIds)),
    database.select().from(t.pantryItems).where(inArray(t.pantryItems.householdId, householdIds)),
    database.select().from(t.mealPlans).where(inArray(t.mealPlans.householdId, householdIds)),
    database.select().from(t.recipeFeedback).where(inArray(t.recipeFeedback.householdId, householdIds)),
  ]);
  const planIds = plans.map((p) => p.id);
  const slots = planIds.length ? await database.select().from(t.mealPlanSlots).where(inArray(t.mealPlanSlots.planId, planIds)) : [];
  return {
    exportedAt: new Date().toISOString(),
    account: u,
    households: households.map((h) => ({
      ...h,
      role: memberships.find((m) => m.householdId === h.id)?.role,
      settings: settings.find((s) => s.householdId === h.id) ?? null,
      members: members.filter((m) => m.householdId === h.id),
      pantry: pantry.filter((p) => p.householdId === h.id),
      plans: plans.filter((p) => p.householdId === h.id).map((p) => ({ ...p, slots: slots.filter((s) => s.planId === p.id) })),
      recipeFeedback: feedback.filter((f) => f.householdId === h.id),
    })),
  };
}

/**
 * Deletes the account. Households where the user is the only manager are
 * deleted with all their data; shared households are kept for the others.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await db().transaction(async (tx) => {
    const memberships = await tx.select().from(t.householdMemberships).where(eq(t.householdMemberships.userId, userId));
    for (const m of memberships) {
      const others = await tx
        .select({ id: t.householdMemberships.id })
        .from(t.householdMemberships)
        .where(eq(t.householdMemberships.householdId, m.householdId));
      if (others.length <= 1) await tx.delete(t.households).where(eq(t.households.id, m.householdId));
    }
    await tx.delete(t.user).where(eq(t.user.id, userId));
  });
}
