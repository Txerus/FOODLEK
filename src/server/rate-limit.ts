import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db/client";
import { newId } from "./ids";
import { UserFacingError } from "./actions/result";

/**
 * Per-household (or per-user) limits on costly actions: plan generation, price
 * sync… A fixed window counted in the database, so it holds across server
 * processes. Keys are prefixed "action:" to stay apart from Better Auth's.
 */
export interface Limit {
  windowMs: number;
  max: number;
}

export const LIMITS = {
  regeneratePlan: { windowMs: 10 * 60_000, max: 20 },
  replaceMeal: { windowMs: 10 * 60_000, max: 80 },
  syncPrices: { windowMs: 60 * 60_000, max: 3 },
  manualPrice: { windowMs: 10 * 60_000, max: 60 },
  deleteAccount: { windowMs: 15 * 60_000, max: 5 },
} satisfies Record<string, Limit>;

export async function assertWithinLimit(scope: keyof typeof LIMITS, subject: string): Promise<void> {
  const limit = LIMITS[scope];
  const now = Date.now();
  const key = `action:${scope}:${subject}`;
  const rows = await db().execute<{ count: number; last_request: number }>(sql`
    insert into rate_limit (id, key, count, last_request)
    values (${newId("rl")}, ${key}, 1, ${now})
    on conflict (key) do update set
      count = case when rate_limit.last_request < ${now - limit.windowMs} then 1 else rate_limit.count + 1 end,
      last_request = case when rate_limit.last_request < ${now - limit.windowMs} then ${now} else rate_limit.last_request end
    returning count, last_request
  `);
  const row = rows[0];
  if (row && Number(row.count) > limit.max) {
    const waitMin = Math.max(1, Math.ceil((Number(row.last_request) + limit.windowMs - now) / 60_000));
    throw new UserFacingError(`Trop de demandes rapprochées. Réessayez dans ${waitMin} minute${waitMin > 1 ? "s" : ""}.`);
  }
}
