import { and, lt, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as t from "../db/schema";

type Db = PostgresJsDatabase<typeof t>;

/** Observed prices older than this are no longer useful, even as a fallback. */
export const PRICE_RETENTION_DAYS = 730;
const SYNC_LOG_RETENTION_DAYS = 90;

/**
 * Keeps the price tables small so the fallback lookups stay fast:
 *  - for each product and store, only the latest price is kept;
 *  - observed prices older than two years are removed.
 * Prices typed in by households and the demo catalogue are never touched.
 */
export async function pruneOldPrices(database: Db, now = new Date()): Promise<{ superseded: number; expired: number; logs: number }> {
  const demoStores = database
    .select({ id: t.stores.id })
    .from(t.stores)
    .innerJoin(t.retailers, sql`${t.retailers.id} = ${t.stores.retailerId}`)
    .where(sql`${t.retailers.isDemo} = true`);

  const superseded = await database.execute(sql`
    delete from retail_prices p
    using retail_prices newer
    where newer.product_id = p.product_id
      and newer.store_id = p.store_id
      and (newer.fetched_at > p.fetched_at or (newer.fetched_at = p.fetched_at and newer.id > p.id))
      and p.provider <> 'manual'
  `);
  const expired = await database
    .delete(t.retailPrices)
    .where(
      and(
        lt(t.retailPrices.fetchedAt, new Date(now.getTime() - PRICE_RETENTION_DAYS * 86_400_000)),
        ne(t.retailPrices.provider, "manual"),
        sql`${t.retailPrices.storeId} not in (${demoStores})`,
      ),
    )
    .returning({ id: t.retailPrices.id });
  const logs = await database
    .delete(t.syncLogs)
    .where(lt(t.syncLogs.startedAt, new Date(now.getTime() - SYNC_LOG_RETENTION_DAYS * 86_400_000)))
    .returning({ id: t.syncLogs.id });
  return { superseded: superseded.count ?? 0, expired: expired.length, logs: logs.length };
}

