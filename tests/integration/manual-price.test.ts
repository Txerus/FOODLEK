import { describe, expect, it } from "vitest";
import { DEFAULT_SETUP, defaultMember, householdSetupSchema } from "@/lib/validation/household";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";
import { newId } from "@/server/ids";
import { createHouseholdForUser, saveHouseholdSetup } from "@/server/services/households";
import { loadOffersForStore, setManualPrice } from "@/server/services/offers";

async function household(name: string) {
  const userId = newId("usr");
  await db().insert(t.user).values({ id: userId, name, email: `${userId}@example.com` });
  const householdId = await createHouseholdForUser(userId);
  await saveHouseholdSetup(householdId, householdSetupSchema.parse({ ...DEFAULT_SETUP, members: [{ ...defaultMember(0), displayName: name }], storeId: "store_demo" }));
  return householdId;
}

describe("prices typed in by a household", () => {
  it("are used for that household only, and labelled", async () => {
    const mine = await household("A");
    const other = await household("B");
    await setManualPrice(mine, { ingredientId: "ing_feta", priceCents: 235, packQuantity: 200, packUnit: "g", packLabel: "200 g" });

    const myOffers = (await loadOffersForStore("store_demo", new Date(), mine)).get("ing_feta") ?? [];
    const manual = myOffers.find((o) => o.manual);
    expect(manual).toMatchObject({ priceCents: 235, packQuantity: 200, unitPriceCents: 1175 });
    expect(manual?.storeName).toContain("prix saisi par vous");

    const theirOffers = (await loadOffersForStore("store_demo", new Date(), other)).get("ing_feta") ?? [];
    expect(theirOffers.some((o) => o.manual)).toBe(false);
    const anonymous = (await loadOffersForStore("store_demo")).get("ing_feta") ?? [];
    expect(anonymous.some((o) => o.manual)).toBe(false);
  });

  it("replaces the previous typed price", async () => {
    const mine = await household("C");
    await setManualPrice(mine, { ingredientId: "ing_feta", priceCents: 235, packQuantity: 200, packUnit: "g", packLabel: "200 g" });
    await setManualPrice(mine, { ingredientId: "ing_feta", priceCents: 199, packQuantity: 200, packUnit: "g", packLabel: "200 g" });
    const offers = ((await loadOffersForStore("store_demo", new Date(), mine)).get("ing_feta") ?? []).filter((o) => o.manual);
    expect(offers).toHaveLength(1);
    expect(offers[0].priceCents).toBe(199);
  });
});
