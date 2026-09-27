"use server";

import { and, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildSeedIngredients } from "@/data/ingredients";
import { householdForAction } from "../auth/access";
import { db } from "../db/client";
import * as t from "../db/schema";
import { env } from "../env";
import { logger } from "../observability/logger";
import { ObservedSyncError, syncObservedPrices } from "../retail/observed-sync";
import { FRENCH_RETAILERS } from "../retail/registry";
import { runAction, UserFacingError, type ActionResult } from "./result";

const syncInput = z.object({
  retailerSlug: z.enum(FRENCH_RETAILERS.map((r) => r.slug) as [string, ...string[]]),
  city: z.string().trim().min(2, "Indiquez une ville").max(80),
  radiusKm: z.number().int().min(5).max(100),
});

// One sync at a time per server process (the API is free and shared).
let syncing = false;

export interface ObservedSyncSummary {
  storeId: string;
  storeName: string;
  pricedCount: number;
  missing: string[];
  priceCount: number;
  nearbyStoreCount: number;
}

/**
 * Loads the prices really paid at a retailer around a city (Open Prices) and
 * selects that store for the household. Takes one to two minutes: the free
 * API is queried ingredient by ingredient, politely.
 */
export async function syncObservedPricesAction(input: unknown): Promise<ActionResult<ObservedSyncSummary>> {
  return runAction("syncObservedPrices", async () => {
    const data = syncInput.parse(input);
    const { householdId } = await householdForAction();

    const running = await db()
      .select({ id: t.syncLogs.id })
      .from(t.syncLogs)
      .where(and(eq(t.syncLogs.provider, "open-prices"), eq(t.syncLogs.status, "running"), gte(t.syncLogs.startedAt, new Date(Date.now() - 10 * 60_000))))
      .limit(1);
    if (running.length > 0) throw new UserFacingError("Une mise à jour des prix est déjà en cours. Réessayez dans quelques minutes.");

    if (syncing) throw new UserFacingError("Une mise à jour des prix est déjà en cours. Réessayez dans quelques minutes.");
    syncing = true;
    let result;
    try {
      result = await syncObservedPrices(
        db(),
        buildSeedIngredients().map((i) => ({ id: i.id, slug: i.slug, name: i.name, purchaseUnit: i.purchaseUnit, measures: i.measures })),
        {
          retailerSlug: data.retailerSlug,
          city: data.city,
          radiusKm: data.radiusKm,
          maxAgeDays: 180,
          userAgent: `FOODLEK/0.1 (${env().OPEN_DATA_CONTACT || "usage personnel"})`,
        },
      );
    } catch (error) {
      if (error instanceof ObservedSyncError) throw new UserFacingError(error.message);
      if (error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError")) {
        throw new UserFacingError("Impossible de joindre Open Prices. Vérifiez la connexion internet de la machine qui fait tourner FOODLEK.");
      }
      throw error;
    } finally {
      syncing = false;
    }

    await db().update(t.householdSettings).set({ storeId: result.storeId }).where(eq(t.householdSettings.householdId, householdId));
    logger.info("prices.observed.synced", { storeId: result.storeId, priceCount: result.priceCount });
    revalidatePath("/", "layout");
    return {
      data: {
        storeId: result.storeId,
        storeName: result.storeName,
        pricedCount: result.priced.length,
        missing: result.missing,
        priceCount: result.priceCount,
        nearbyStoreCount: result.nearbyStoreCount,
      },
      message: `${result.priced.length} ingrédients ont un prix réel.`,
    };
  });
}

/** Chooses the store whose prices the menu and the shopping list use. */
export async function selectStoreAction(input: unknown): Promise<ActionResult> {
  return runAction("selectStore", async () => {
    const { storeId } = z.object({ storeId: z.string().min(1).max(200) }).parse(input);
    const { householdId } = await householdForAction();
    const exists = await db().select({ id: t.stores.id }).from(t.stores).where(eq(t.stores.id, storeId)).limit(1);
    if (exists.length === 0) throw new UserFacingError("Magasin inconnu.");
    await db().update(t.householdSettings).set({ storeId }).where(eq(t.householdSettings.householdId, householdId));
    revalidatePath("/", "layout");
    return { data: undefined, message: "Magasin choisi. Régénérez la semaine pour recalculer le menu avec ces prix." };
  });
}
