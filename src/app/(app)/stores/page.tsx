import type { Metadata } from "next";
import { PageHeader } from "@/components/foodlek/page-header";
import { ObservedPricesForm, UseStoreButton } from "@/components/stores/observed-prices";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { requireHousehold } from "@/server/auth/access";
import { db } from "@/server/db/client";
import { listObservedStores } from "@/server/retail/observed-sync";
import { FRENCH_RETAILERS } from "@/server/retail/registry";
import { loadHouseholdContext } from "@/server/services/households";
import { getStore } from "@/server/services/offers";
import { listRetailers, listSelectableStores } from "@/server/services/stores";

export const metadata: Metadata = { title: "Magasins et prix" };

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  observed: { label: "Prix réels observés", variant: "default" },
  live: { label: "Prix réels disponibles", variant: "default" },
  demo: { label: "Démonstration", variant: "secondary" },
  planned: { label: "Prévu", variant: "outline" },
  unavailable: { label: "Pas de catalogue en ligne autorisé", variant: "outline" },
};

export default async function StoresPage() {
  const { householdId } = await requireHousehold();
  const ctx = await loadHouseholdContext(householdId);
  const currentStoreId = ctx.settings?.storeId ?? null;
  const [store, retailers, stores, observed] = await Promise.all([
    currentStoreId ? getStore(currentStoreId) : null,
    listRetailers(),
    listSelectableStores(),
    listObservedStores(db()),
  ]);
  const observedById = new Map(observed.map((s) => [s.id, s]));
  const retailersWithObserved = new Set(observed.map((s) => s.retailerId));
  // The same explanation applies to several retailers: shown once, below the list.
  const noteCounts = new Map<string, number>();
  for (const r of retailers) if (r.notes) noteCounts.set(r.notes, (noteCounts.get(r.notes) ?? 0) + 1);
  const sharedNotes = [...noteCounts].filter(([, n]) => n > 1).map(([note]) => note);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Magasins et prix"
        description="Un prix n'est exact que pour un magasin et un moment donnés. Chaque prix affiché indique sa source, le magasin et la date du relevé."
      />

      <section className="surface flex flex-col gap-1 p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Magasin actuel</h2>
        <p className="text-lg font-semibold">{store ? store.name : "Aucun magasin sélectionné"}</p>
        {store?.isDemo ? (
          <p className="text-sm text-muted-foreground">Enseigne fictive : les prix sont des données de démonstration, marquées « Démo » partout. Récupérez les prix réels de votre enseigne ci-dessous.</p>
        ) : null}
      </section>

      <section aria-labelledby="observed-title" className="surface flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <h2 id="observed-title" className="font-display text-xl font-semibold">
            Prix réels de votre enseigne
          </h2>
          <p className="text-sm text-muted-foreground">
            FOODLEK récupère les prix réellement payés dans les magasins de l'enseigne autour de chez vous, publiés sur{" "}
            <a href="https://prices.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Open Prices
            </a>{" "}
            (Open Food Facts, licence ODbL) à partir de tickets de caisse et d'étiquettes. Ce sont de vrais prix, datés, pas le catalogue en ligne de l'enseigne : ils peuvent différer de quelques centimes et certains produits n'ont pas encore été relevés.
          </p>
        </div>
        <ObservedPricesForm retailers={FRENCH_RETAILERS.map((r) => ({ slug: r.slug, name: r.name }))} defaultCity="" />
      </section>

      <section aria-labelledby="stores-title" className="flex flex-col gap-3">
        <h2 id="stores-title" className="font-display text-xl font-semibold">
          Magasins disponibles
        </h2>
        <ul className="surface divide-y">
          {stores.map((s) => {
            const obs = observedById.get(s.id);
            return (
              <li key={s.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {s.isDemo
                      ? "Prix fictifs de démonstration"
                      : obs
                        ? `${obs.priceCount} prix réels · mis à jour le ${obs.lastSyncAt ? formatDateTime(obs.lastSyncAt) : "—"}`
                        : s.retailerName}
                  </span>
                </div>
                <UseStoreButton storeId={s.id} current={s.id === currentStoreId} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="retailers-title" className="flex flex-col gap-3">
        <h2 id="retailers-title" className="font-display text-xl font-semibold">
          Enseignes
        </h2>
        <ul className="surface divide-y">
          {retailers.map((r) => {
            const status = retailersWithObserved.has(r.id) ? "observed" : r.status;
            return (
              <li key={r.id} className="flex flex-col gap-1.5 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <Badge variant={STATUS[status]?.variant ?? "outline"}>{STATUS[status]?.label ?? status}</Badge>
                </div>
                {r.notes && !sharedNotes.includes(r.notes) ? <p className="text-sm text-muted-foreground">{r.notes}</p> : null}
              </li>
            );
          })}
        </ul>
        {sharedNotes.map((note) => (
          <p key={note} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {retailers
                .filter((r) => r.notes === note)
                .map((r) => r.name)
                .join(", ")}{" "}
              :
            </span>{" "}
            {note}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-2 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Fraîcheur des prix</h2>
        <p>Live : moins d'une heure · Très récent : moins de 24 h · Récent : moins de 7 jours · Ancien : au-delà, affiché comme estimation · Indisponible : aucun prix connu.</p>
      </section>
    </div>
  );
}
