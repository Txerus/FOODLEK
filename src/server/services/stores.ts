import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import * as t from "../db/schema";

export interface SelectableStore {
  id: string;
  name: string;
  city: string | null;
  retailerName: string;
  isDemo: boolean;
}

/** Stores the household can pick: those with at least a data source (demo or live). */
export async function listSelectableStores(): Promise<SelectableStore[]> {
  return db()
    .select({
      id: t.stores.id,
      name: t.stores.name,
      city: t.stores.city,
      retailerName: t.retailers.name,
      isDemo: t.retailers.isDemo,
    })
    .from(t.stores)
    .innerJoin(t.retailers, eq(t.retailers.id, t.stores.retailerId))
    .orderBy(asc(t.retailers.isDemo), asc(t.retailers.name), asc(t.stores.name));
}

export async function listRetailers() {
  return db()
    .select({
      id: t.retailers.id,
      name: t.retailers.name,
      status: t.retailers.integrationStatus,
      notes: t.retailers.integrationNotes,
      isDemo: t.retailers.isDemo,
      website: t.retailers.website,
    })
    .from(t.retailers)
    .orderBy(asc(t.retailers.name));
}
