import { QualityBadge } from "@/components/foodlek/quality-badge";
import { Progress } from "@/components/ui/progress";
import type { BudgetSummary as Budget } from "@/domain/budget/budget";
import { formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BudgetSummary({ budget, storeName, compact = false }: { budget: Budget; storeName: string | null; compact?: boolean }) {
  const ratio = budget.budgetCents > 0 ? Math.min(100, Math.round((budget.basketCents / budget.budgetCents) * 100)) : 0;
  const over = budget.marginCents < 0;
  const detail = budget.partial
    ? "Certains articles n'ont pas de prix : le total est incomplet."
    : storeName
      ? `Prix du magasin : ${storeName}.`
      : undefined;
  return (
    <section aria-labelledby="budget-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="budget-title" className="text-sm font-medium text-muted-foreground">
          Budget de la semaine
        </h2>
        <QualityBadge quality={budget.quality} detail={detail} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold tabular">{formatEuros(budget.basketCents)}</span>
        <span className="text-muted-foreground">/ {formatEuros(budget.budgetCents)}</span>
      </div>
      <Progress
        value={ratio}
        aria-label={`Panier : ${ratio} % du budget`}
        className={cn("h-2", over && "[&>[data-slot=progress-indicator]]:bg-paprika")}
      />
      <dl className={cn("grid gap-3 text-sm", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        <div>
          <dt className="text-muted-foreground">{over ? "Dépassement" : "Marge"}</dt>
          <dd className={cn("font-semibold tabular", over && "text-paprika")}>{formatEuros(Math.abs(budget.marginCents))}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Par personne et par repas</dt>
          <dd className="font-semibold tabular">{budget.perPersonPerMealCents !== null ? formatEuros(budget.perPersonPerMealCents) : "—"}</dd>
        </div>
        {!compact ? (
          <>
            <div>
              <dt className="text-muted-foreground">Par repas</dt>
              <dd className="font-semibold tabular">{budget.perMealCents !== null ? formatEuros(budget.perMealCents) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Par jour</dt>
              <dd className="font-semibold tabular">{budget.perDayCents !== null ? formatEuros(budget.perDayCents) : "—"}</dd>
            </div>
          </>
        ) : null}
      </dl>
      {budget.partial ? <p className="text-sm text-saffron-ink">Total partiel : des articles n'ont pas de prix dans ce magasin.</p> : null}
    </section>
  );
}
