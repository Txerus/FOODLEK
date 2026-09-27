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
  // Sign-in methods and sessions, without secrets (password hash, tokens).
  const [logins, sessions] = await Promise.all([
    database
      .select({ providerId: t.account.providerId, createdAt: t.account.createdAt })
      .from(t.account)
      .where(eq(t.account.userId, userId)),
    database
      .select({ createdAt: t.session.createdAt, expiresAt: t.session.expiresAt, ipAddress: t.session.ipAddress, userAgent: t.session.userAgent })
      .from(t.session)
      .where(eq(t.session.userId, userId)),
  ]);
  const account = { ...u, logins, sessions };
  const memberships = await database.select().from(t.householdMemberships).where(eq(t.householdMemberships.userId, userId));
  const householdIds = memberships.map((m) => m.householdId);
  if (householdIds.length === 0) return { exportedAt: new Date().toISOString(), account, households: [] };
  const [households, settings, members, pantry, plans, feedback, manualProducts] = await Promise.all([
    database.select().from(t.households).where(inArray(t.households.id, householdIds)),
    database.select().from(t.householdSettings).where(inArray(t.householdSettings.householdId, householdIds)),
    database.select().from(t.householdMembers).where(inArray(t.householdMembers.householdId, householdIds)),
    database.select().from(t.pantryItems).where(inArray(t.pantryItems.householdId, householdIds)),
    database.select().from(t.mealPlans).where(inArray(t.mealPlans.householdId, householdIds)),
    database.select().from(t.recipeFeedback).where(inArray(t.recipeFeedback.householdId, householdIds)),
    database.select().from(t.retailProducts).where(inArray(t.retailProducts.householdId, householdIds)),
  ]);
  const planIds = plans.map((p) => p.id);
  const productIds = manualProducts.map((p) => p.id);
  const [slots, checked, manualPrices] = await Promise.all([
    planIds.length ? database.select().from(t.mealPlanSlots).where(inArray(t.mealPlanSlots.planId, planIds)) : [],
    planIds.length ? database.select().from(t.shoppingListItems).where(inArray(t.shoppingListItems.planId, planIds)) : [],
    productIds.length ? database.select().from(t.retailPrices).where(inArray(t.retailPrices.productId, productIds)) : [],
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account,
    households: households.map((h) => ({
      ...h,
      role: memberships.find((m) => m.householdId === h.id)?.role,
      settings: settings.find((s) => s.householdId === h.id) ?? null,
      members: members.filter((m) => m.householdId === h.id),
      pantry: pantry.filter((p) => p.householdId === h.id),
      plans: plans
        .filter((p) => p.householdId === h.id)
        .map((p) => ({ ...p, slots: slots.filter((s) => s.planId === p.id), checkedShoppingItems: checked.filter((c) => c.planId === p.id) })),
      recipeFeedback: feedback.filter((f) => f.householdId === h.id),
      pricesTypedIn: manualProducts
        .filter((p) => p.householdId === h.id)
        .map((p) => ({ ...p, prices: manualPrices.filter((price) => price.productId === p.id) })),
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
