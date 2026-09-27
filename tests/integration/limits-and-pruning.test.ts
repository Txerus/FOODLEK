import { eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";
import { newId } from "@/server/ids";
import { assertWithinLimit, LIMITS } from "@/server/rate-limit";
import { pruneOldPrices } from "@/server/retail/maintenance";

describe("limits on costly actions", () => {
  it("refuses beyond the limit, per subject", async () => {
    const subject = newId("hh");
    for (let i = 0; i < LIMITS.syncPrices.max; i++) await assertWithinLimit("syncPrices", subject);
    await expect(assertWithinLimit("syncPrices", subject)).rejects.toThrow(/Trop de demandes/);
    // Another household is not affected.
    await expect(assertWithinLimit("syncPrices", newId("hh"))).resolves.toBeUndefined();
  });
});

describe("price housekeeping", () => {
  it("keeps the latest price per product and store, drops very old ones, never manual prices", async () => {
    const retailerId = "ret_test_prune";
    const storeId = "store_test_prune";
    await db().insert(t.retailers).values({ id: retailerId, slug: "test-prune", name: "Prune", isDemo: false, integrationStatus: "live" }).onConflictDoNothing();
    await db().insert(t.stores).values({ id: storeId, retailerId, name: "Prune", provider: "open-prices" }).onConflictDoNothing();
    await db().delete(t.retailPrices).where(like(t.retailPrices.id, "price_prune_%"));
    for (const id of ["prd_prune_a", "prd_prune_old", "prd_prune_manual"]) {
      await db()
        .insert(t.retailProducts)
        .values({ id, retailerId, name: id, packLabel: "1 kg", packQuantity: 1000, packUnit: "g", provider: id.endsWith("manual") ? "manual" : "open-prices" })
        .onConflictDoNothing();
    }
    const day = 86_400_000;
    const now = new Date();
    const price = (id: string, productId: string, ageDays: number, provider = "open-prices") => ({
      id,
      productId,
      storeId,
      priceCents: 100,
      unitPriceCents: 100,
      availability: "unknown",
      fetchedAt: new Date(now.getTime() - ageDays * day),
      provider,
      quality: "RECENT",
    });
    await db()
      .insert(t.retailPrices)
      .values([
        price("price_prune_a_old", "prd_prune_a", 30),
        price("price_prune_a_new", "prd_prune_a", 1),
        price("price_prune_old", "prd_prune_old", 900),
        price("price_prune_manual", "prd_prune_manual", 900, "manual"),
      ]);
    await pruneOldPrices(db(), now);
    const left = (await db().select({ id: t.retailPrices.id }).from(t.retailPrices).where(eq(t.retailPrices.storeId, storeId))).map((r) => r.id).sort();
    expect(left).toEqual(["price_prune_a_new", "price_prune_manual"]);
  });
});
