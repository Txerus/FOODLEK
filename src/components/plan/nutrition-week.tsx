import { PersonDot } from "@/components/foodlek/person";
import type { MemberWeekNutrition } from "@/domain/planning/types";

function Bar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;
  const width = Math.min(100, pct);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="w-11 text-right text-xs tabular text-muted-foreground">{pct} %</span>
    </div>
  );
}

/** Planned vs target over the planned meals only (other meals are the household's own). */
export function NutritionWeek({ members }: { members: MemberWeekNutrition[] }) {
  return (
    <section aria-labelledby="nutrition-title" className="flex flex-col gap-4">
      <h2 id="nutrition-title" className="text-sm font-medium text-muted-foreground">
        Nutrition des repas planifiés
      </h2>
      <ul className="flex flex-col gap-4">
        {members.map((m, i) => (
          <li key={m.memberId} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm">
              <PersonDot index={i} />
              <span className="font-medium">{m.name}</span>
              <span className="text-muted-foreground">· {m.mealCount} repas</span>
            </div>
            {m.showNumbers ? (
              <div className="grid gap-1.5 pl-4">
                <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs text-muted-foreground">
                  Énergie
                  <Bar value={m.planned.energyKcal} target={m.targetEnergyKcal} />
                </div>
                {m.targetProteinG ? (
                  <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs text-muted-foreground">
                    Protéines
                    <Bar value={m.planned.proteinG} target={m.targetProteinG} />
                  </div>
                ) : null}
                {m.estimated ? <p className="text-xs text-saffron-ink">Repère estimé d'après l'appétit (profil simplifié).</p> : null}
              </div>
            ) : (
              <p className="pl-4 text-xs text-muted-foreground">Portions adaptées à l'appétit, sans objectif chiffré.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
