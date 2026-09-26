import type { Metadata } from "next";
import { PageHeader } from "@/components/foodlek/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/server/auth/access";
import { adminOverview } from "@/server/services/admin";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface flex flex-col gap-3 p-5">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminPage() {
  await requireAdmin();
  const o = await adminOverview();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Back-office" description="Vue d'ensemble des données de référence et des intégrations." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Comptes">
          <p className="font-display text-3xl font-semibold">{o.users}</p>
          <p className="text-sm text-muted-foreground">{o.households} foyers</p>
        </Card>
        <Card title="Recettes">
          <ul className="text-sm">
            {o.recipes.map((r) => (
              <li key={r.status}>
                {r.status === "validated" ? "Validées" : "Brouillons"} : <strong>{r.n}</strong>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Ingrédients">
          <p className="text-sm">Sans composition : {o.ingredientsWithoutComposition}</p>
          <p className="text-sm">Sans produit associé : {o.unmappedIngredients.length}</p>
          {o.unmappedIngredients.length ? <p className="text-xs text-muted-foreground">{o.unmappedIngredients.map((i) => i.name).join(", ")}</p> : null}
        </Card>
      </div>
      <Card title="Enseignes">
        <ul className="divide-y text-sm">
          {o.retailers.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              {r.name}
              <Badge variant="outline">{r.integrationStatus}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Dernières synchronisations">
          {o.syncs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune synchronisation.</p>
          ) : (
            <ul className="divide-y text-sm">
              {o.syncs.map((s) => (
                <li key={s.id} className="py-2">
                  <span className="font-medium">{s.provider}</span> · {s.status} · {s.itemCount} éléments · {formatDateTime(s.startedAt)}
                  {s.message ? <span className="block text-xs text-muted-foreground">{s.message}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Erreurs de mapping ouvertes">
          {o.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune.</p>
          ) : (
            <ul className="text-sm">
              {o.issues.map((i) => (
                <li key={i.id}>
                  {i.kind} : {i.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Feature flags">
        <ul className="divide-y text-sm">
          {o.flags.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-3 py-2">
              <span>
                <code>{f.key}</code> <span className="text-muted-foreground">— {f.description}</span>
              </span>
              <Badge variant={f.enabled ? "default" : "outline"}>{f.enabled ? "actif" : "inactif"}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
