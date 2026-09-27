import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HouseholdWizard } from "@/components/onboarding/household-wizard";
import { requireHousehold } from "@/server/auth/access";
import { getCatalog } from "@/server/services/catalog";
import { contextToSetup, loadHouseholdContext } from "@/server/services/households";
import { listRetailers, listSelectableStores } from "@/server/services/stores";

export const metadata: Metadata = { title: "Mon foyer" };

const SECTIONS = ["household", "profiles", "preferences", "meals", "budget", "cooking", "store", "pantry"];

/** /household?section=budget opens that part directly. */
export default async function HouseholdPage({ searchParams }: PageProps<"/household">) {
  const { section } = await searchParams;
  const initialStep = Math.max(0, SECTIONS.indexOf(typeof section === "string" ? section : ""));
  const { householdId } = await requireHousehold();
  const [ctx, catalog, stores, retailers] = await Promise.all([
    loadHouseholdContext(householdId),
    getCatalog(),
    listSelectableStores(),
    listRetailers(),
  ]);
  const setup = contextToSetup(ctx);
  if (!setup) redirect("/onboarding");
  return (
    <HouseholdWizard
      mode="edit"
      initial={setup}
      initialStep={initialStep}
      catalog={{
        ingredients: catalog.ingredients.map((i) => ({ id: i.id, name: i.name, isStaple: i.isStaple })).sort((a, b) => a.name.localeCompare(b.name, "fr")),
        stores,
        retailers: retailers.filter((r) => !r.isDemo).map((r) => ({ name: r.name, status: r.status, notes: r.notes })),
      }}
    />
  );
}
