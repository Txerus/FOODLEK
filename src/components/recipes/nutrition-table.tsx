import { PersonDot } from "@/components/foodlek/person";
import { QualityBadge } from "@/components/foodlek/quality-badge";
import type { DataQuality } from "@/domain/common/data-quality";
import type { Nutrients } from "@/domain/nutrition/nutrients";

interface Row {
  key: string;
  label: string;
  index: number | null;
  nutrients: Nutrients;
  targetKcal: number | null;
  showNumbers: boolean;
}

const fmt = (n: number, digits = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: digits });

export function NutritionTable({ rows, quality, sources }: { rows: Row[]; quality: DataQuality; sources: string[] }) {
  return (
    <section aria-labelledby="nutri-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="nutri-title" className="font-display text-xl font-semibold">
          Valeurs nutritionnelles
        </h2>
        <QualityBadge quality={quality} detail={`Calculées à partir des ingrédients. Source : ${sources.join(", ") || "—"}.`} />
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Assiette
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Énergie
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Protéines
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Lipides
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Glucides
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Fibres
              </th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((r) => (
              <tr key={r.key} className="border-b last:border-0">
                <th scope="row" className="px-4 py-2.5 text-left font-medium">
                  <span className="inline-flex items-center gap-2">
                    {r.index !== null ? <PersonDot index={r.index} /> : null}
                    {r.label}
                  </span>
                </th>
                {r.showNumbers ? (
                  <>
                    <td className="px-3 py-2.5 text-right">
                      {fmt(r.nutrients.energyKcal)} kcal
                      {r.targetKcal ? <span className="block text-xs text-muted-foreground">repère {fmt(r.targetKcal)}</span> : null}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.nutrients.proteinG)} g</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.nutrients.fatG)} g</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.nutrients.carbsG)} g</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.nutrients.fiberG, 1)} g</td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-2.5 text-right text-muted-foreground">
                    Portion adaptée à l'appétit
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimations générales calculées à partir de tables de composition ; elles ne remplacent pas l'avis d'un professionnel de santé.
      </p>
    </section>
  );
}
