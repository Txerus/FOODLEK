import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/foodlek/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireHousehold } from "@/server/auth/access";
import { loadHouseholdContext } from "@/server/services/households";
import { getStore } from "@/server/services/offers";
import { listRetailers } from "@/server/services/stores";

export const metadata: Metadata = { title: "Magasins et prix" };

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  live: { label: "Prix réels disponibles", variant: "default" },
  demo: { label: "Démonstration", variant: "secondary" },
  planned: { label: "Prévu", variant: "outline" },
  unavailable: { label: "Pas d'accès autorisé", variant: "outline" },
};

export default async function StoresPage() {
  const { householdId } = await requireHousehold();
  const ctx = await loadHouseholdContext(householdId);
  const [store, retailers] = await Promise.all([ctx.settings?.storeId ? getStore(ctx.settings.storeId) : null, listRetailers()]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Magasins et prix"
        description="Un prix n'est exact que pour un magasin et un moment donnés. Chaque prix affiché indique sa source et sa date."
        actions={
          <Button asChild variant="outline">
            <Link href="/household">Changer de magasin</Link>
          </Button>
        }
      />
      <section className="surface flex flex-col gap-1 p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Magasin actuel</h2>
        <p className="text-lg font-semibold">{store ? store.name : "Aucun magasin sélectionné"}</p>
        {store?.isDemo ? (
          <p className="text-sm text-muted-foreground">Enseigne fictive : les prix sont des données de démonstration, marquées « Démo » partout.</p>
        ) : null}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Enseignes</h2>
        <ul className="surface divide-y">
          {retailers.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.name}</span>
                <Badge variant={STATUS[r.status]?.variant ?? "outline"}>{STATUS[r.status]?.label ?? r.status}</Badge>
              </div>
              {r.notes ? <p className="text-sm text-muted-foreground">{r.notes}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Fraîcheur des prix</h2>
        <p>Live : moins d'une heure · Très récent : moins de 24 h · Récent : moins de 7 jours · Ancien : au-delà, affiché comme estimation · Indisponible : aucun prix connu.</p>
      </section>
    </div>
  );
}
