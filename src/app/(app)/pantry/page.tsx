import type { Metadata } from "next";
import { PageHeader } from "@/components/foodlek/page-header";
import { PantryManager, type PantryRow } from "@/components/pantry/pantry-manager";
import { requireHousehold } from "@/server/auth/access";
import { getCatalog } from "@/server/services/catalog";
import { loadHouseholdContext } from "@/server/services/households";

export const metadata: Metadata = { title: "Mon placard" };

const UNIT_LABEL = { g: "g", ml: "ml", piece: "pièce(s)" } as const;

export default async function PantryPage() {
  const { householdId } = await requireHousehold();
  const [catalog, ctx] = await Promise.all([getCatalog(), loadHouseholdContext(householdId)]);
  const rows: PantryRow[] = ctx.pantry
    .flatMap((p) => {
      const ing = catalog.ingredientIndex.get(p.ingredientId);
      return ing ? [{ ingredientId: ing.id, name: ing.name, unitLabel: UNIT_LABEL[ing.purchaseUnit], quantity: p.quantity }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Mon placard" description="Ce que vous avez déjà à la maison. Le panier est recalculé automatiquement." />
      <PantryManager rows={rows} ingredients={catalog.ingredients.map((i) => ({ id: i.id, name: i.name })).sort((a, b) => a.name.localeCompare(b.name, "fr"))} />
    </div>
  );
}
