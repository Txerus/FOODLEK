import "server-only";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as t from "../db/schema";

export async function adminOverview() {
  const database = db();
  const [recipes, ingredientsWithout, unmapped, retailers, syncs, issues, flags, users, households] = await Promise.all([
    database.select({ status: t.recipes.reviewStatus, n: count() }).from(t.recipes).groupBy(t.recipes.reviewStatus),
    database.select({ n: count() }).from(t.ingredients).where(sql`${t.ingredients.compositionId} is null`),
    database
      .select({ id: t.ingredients.id, name: t.ingredients.name })
      .from(t.ingredients)
      .where(sql`not exists (select 1 from ${t.productMappings} where ${t.productMappings.ingredientId} = ${t.ingredients.id} and ${t.productMappings.status} = 'active')`),
    database.select().from(t.retailers).orderBy(t.retailers.name),
    database.select().from(t.syncLogs).orderBy(desc(t.syncLogs.startedAt)).limit(10),
    database.select().from(t.mappingIssues).where(eq(t.mappingIssues.status, "open")).limit(20),
    database.select().from(t.featureFlags).orderBy(t.featureFlags.key),
    database.select({ n: count() }).from(t.user),
    database.select({ n: count() }).from(t.households),
  ]);
  return {
    recipes,
    ingredientsWithoutComposition: ingredientsWithout[0]?.n ?? 0,
    unmappedIngredients: unmapped,
    retailers,
    syncs,
    issues,
    flags,
    users: users[0]?.n ?? 0,
    households: households[0]?.n ?? 0,
  };
}
