import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db/client";
import * as t from "../db/schema";
import { getAuth } from "./better-auth";

/**
 * Data access layer for authorisation. Every server action and server
 * component that touches household data goes through these helpers, so that a
 * resource id coming from the client is always checked against the current
 * user's household (IDOR protection).
 */

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export class AccessDeniedError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string };
  return { id: u.id, name: u.name, email: u.email, role: u.role ?? "user" };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const getHouseholdIdForUser = cache(async (userId: string): Promise<string | null> => {
  const rows = await db()
    .select({ householdId: t.householdMemberships.householdId })
    .from(t.householdMemberships)
    .where(eq(t.householdMemberships.userId, userId))
    .orderBy(asc(t.householdMemberships.createdAt))
    .limit(1);
  return rows[0]?.householdId ?? null;
});

export interface HouseholdAccess {
  user: CurrentUser;
  householdId: string;
}

/** For pages behind onboarding: user + household, otherwise redirect. */
export async function requireHousehold(): Promise<HouseholdAccess> {
  const user = await requireUser();
  const householdId = await getHouseholdIdForUser(user.id);
  if (!householdId) redirect("/onboarding");
  const rows = await db()
    .select({ completed: t.households.onboardingCompletedAt })
    .from(t.households)
    .where(eq(t.households.id, householdId))
    .limit(1);
  if (!rows[0]?.completed) redirect("/onboarding");
  return { user, householdId };
}

/** For server actions: never redirects, throws instead. */
export async function householdForAction(): Promise<HouseholdAccess> {
  const user = await getCurrentUser();
  if (!user) throw new AccessDeniedError("Connectez-vous pour continuer.");
  const householdId = await getHouseholdIdForUser(user.id);
  if (!householdId) throw new AccessDeniedError("Aucun foyer associé à ce compte.");
  return { user, householdId };
}

export async function assertPlanInHousehold(planId: string, householdId: string): Promise<void> {
  const rows = await db()
    .select({ id: t.mealPlans.id })
    .from(t.mealPlans)
    .where(and(eq(t.mealPlans.id, planId), eq(t.mealPlans.householdId, householdId)))
    .limit(1);
  if (rows.length === 0) throw new AccessDeniedError("Ce planning n'appartient pas à votre foyer.");
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
