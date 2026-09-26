/**
 * Synchronises observed prices from Open Prices (ODbL) for stores linked to
 * an Open Prices location (stores.provider = 'open-prices', externalId = location id).
 *
 *   pnpm retail:sync                      # sync prices for linked stores
 *   pnpm retail:sync --find-stores Annecy # list Open Prices locations in a city
 *
 * Requires OPEN_PRICES_ENABLED=true and OPEN_DATA_CONTACT (User-Agent contact).
 * A failure is logged in sync_logs and never touches existing prices.
 */
import "dotenv/config";
import { and, eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { freshnessOf } from "../../src/domain/common/data-quality";
import * as t from "../../src/server/db/schema";
import { newId } from "../../src/server/ids";
import { openPrices } from "../../src/server/retail/registry";

async function main() {
  const provider = openPrices({ enabled: process.env.OPEN_PRICES_ENABLED === "true", contact: process.env.OPEN_DATA_CONTACT });
  const findIndex = process.argv.indexOf("--find-stores");
  if (findIndex > 0) {
    const res = await provider.searchStores({ city: process.argv[findIndex + 1] });
    if (!res.ok) throw new Error(res.message);
    for (const s of res.data) process.stdout.write(`${s.externalId}\t${s.brand ?? "?"}\t${s.name}\t${s.postcode ?? ""} ${s.city ?? ""}\n`);
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const client = postgres(url, { max: 1 });
  const database = drizzle(client, { schema: t, casing: "snake_case" });
  const stores = await database.select().from(t.stores).where(and(eq(t.stores.provider, "open-prices"), isNotNull(t.stores.externalId)));
  for (const store of stores) {
    const logId = newId("sync");
    await database.insert(t.syncLogs).values({ id: logId, provider: "open-prices", retailerId: store.retailerId, storeId: store.id, status: "running" });
    const products = await database
      .select({ id: t.retailProducts.id, ean: t.retailProducts.ean })
      .from(t.retailProducts)
      .where(and(eq(t.retailProducts.retailerId, store.retailerId), isNotNull(t.retailProducts.ean)));
    const byEan = new Map(products.map((p) => [p.ean as string, p.id]));
    const res = await provider.fetchPrices({ storeExternalId: store.externalId as string, eans: [...byEan.keys()] });
    if (!res.ok) {
      await database.update(t.syncLogs).set({ status: res.reason === "not_configured" ? "unavailable" : "failed", message: res.message, finishedAt: new Date() }).where(eq(t.syncLogs.id, logId));
      process.stderr.write(`${store.name} : ${res.message}\n`);
      continue;
    }
    let inserted = 0;
    const now = new Date();
    for (const price of res.data) {
      const productId = price.product.ean ? byEan.get(price.product.ean) : undefined;
      if (!productId) continue;
      const freshness = freshnessOf(price.observedAt, now);
      await database.insert(t.retailPrices).values({
        id: newId("price"),
        productId,
        storeId: store.id,
        priceCents: price.priceCents,
        unitPriceCents: price.unitPriceCents,
        promotionLabel: price.promotionLabel,
        promotionValidUntil: null,
        availability: price.availability,
        // The observation date is what matters: a price seen 3 weeks ago is 3 weeks old.
        fetchedAt: price.observedAt,
        provider: "open-prices",
        quality: freshness === "LIVE" ? "LIVE" : freshness === "OLD" ? "ESTIMATED" : "RECENT",
        sourceUrl: price.sourceUrl,
      });
      inserted++;
    }
    await database.update(t.syncLogs).set({ status: "success", itemCount: inserted, finishedAt: new Date() }).where(eq(t.syncLogs.id, logId));
    process.stdout.write(`${store.name} : ${inserted} prix\n`);
  }
  await client.end();
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
