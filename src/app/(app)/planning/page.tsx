import { ClockIcon, PinIcon, RefreshCcwIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/foodlek/page-header";
import { QualityBadge } from "@/components/foodlek/quality-badge";
import { EmptyWeek } from "@/components/plan/empty-week";
import { MealActions } from "@/components/plan/meal-actions";
import { MemberPlate } from "@/components/plan/member-plate";
import { OverBudgetNotice } from "@/components/plan/over-budget-notice";
import { RegenerateButton } from "@/components/plan/regenerate-button";
import { Badge } from "@/components/ui/badge";
import { MEAL_TYPE_LABELS, totalMinutes } from "@/domain/catalog/types";
import { formatDay, formatEuros, formatMinutes } from "@/lib/format";
import { MealCostTag } from "@/components/plan/meal-cost";
import { recipeHref } from "@/lib/routes";
import { parisNow } from "@/lib/time";
import { addDays } from "@/lib/week";
import { requireHousehold } from "@/server/auth/access";
import { findCurrentPlanId, loadPlanView } from "@/server/services/plans";

export const metadata: Metadata = { title: "Semaine" };

export default async function PlanningPage() {
  const { householdId } = await requireHousehold();
  const planId = await findCurrentPlanId(householdId);
  if (!planId) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Votre semaine" />
        <EmptyWeek />
      </div>
    );
  }
  const view = await loadPlanView(householdId, planId);
  const { evaluation: ev, slots, recipes, ctx } = view;
  const memberIndex = new Map(ctx.members.map((m, i) => [m.id, i]));
  const showNumbers = new Map(ev.nutrition.map((n) => [n.memberId, n.showNumbers]));
  const leftoverOf = new Map<string, string>();
  const platesOf = new Map<string, number>();
  for (const s of ev.sessions) {
    s.servesSlotKeys.slice(1).forEach((k) => leftoverOf.set(k, s.slotKey));
    platesOf.set(s.slotKey, s.servesSlotKeys.reduce((n, k) => n + (ev.portions[k]?.length ?? 0), 0));
  }
  const slotLabel = (key: string) => {
    const s = slots.find((x) => x.key === key);
    return s ? `${formatDay(s.date).toLowerCase()} (${MEAL_TYPE_LABELS[s.mealType].toLowerCase()})` : "";
  };
  const days = [...new Set(slots.map((s) => s.date))];
  const today = parisNow().date;
  const empty = new Map(view.emptySlots.map((e) => [e.key, e.label]));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Du ${formatDay(view.weekStart).toLowerCase()} au ${formatDay(addDays(view.weekStart, 6)).toLowerCase()}`}
        title="Votre semaine"
        description="Un plat par repas pour tout le foyer, des portions adaptées à chacun. Chaque modification recalcule les courses et le budget."
        actions={<RegenerateButton />}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          Panier <strong className="tabular">{formatEuros(ev.budget.basketCents)}</strong> / {formatEuros(ev.budget.budgetCents)}
        </span>
        <QualityBadge quality={ev.budget.quality} />
        <span className="text-muted-foreground">
          {ev.budget.perPersonPerMealCents !== null ? `${formatEuros(ev.budget.perPersonPerMealCents)} par personne et par repas` : ""}
        </span>
        <Link href="/shopping" className="font-medium underline-offset-4 hover:underline">
          Voir les courses
        </Link>
      </div>

      <OverBudgetNotice planId={planId} budget={ev.budget} accepted={view.overBudgetAcceptedAt !== null} />

      <ol className="flex flex-col gap-8">
        {days.map((date) => (
          <li key={date} className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-2 font-display text-xl font-semibold">
              {formatDay(date)}
              {date === today ? <span className="text-sm font-sans font-medium text-primary">Aujourd'hui</span> : null}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {slots
                .filter((s) => s.date === date)
                .map((slot) => {
                  const recipe = recipes.get(ev.assignment[slot.key] ?? "");
                  const locked = view.lockedKeys.has(slot.key);
                  const fromLeftovers = leftoverOf.get(slot.key);
                  const mealLabel = `${MEAL_TYPE_LABELS[slot.mealType]} du ${formatDay(slot.date).toLowerCase()}`;
                  return (
                    <li key={slot.key} className="surface flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span className="tracking-wide uppercase">{MEAL_TYPE_LABELS[slot.mealType]}</span>
                            {recipe ? (
                              <span className="inline-flex items-center gap-1 normal-case">
                                <ClockIcon aria-hidden className="size-3" />
                                {fromLeftovers ? "À réchauffer" : formatMinutes(totalMinutes(recipe))}
                              </span>
                            ) : null}
                            {locked ? (
                              <Badge variant="secondary" className="gap-1">
                                <PinIcon aria-hidden className="size-3" /> Épinglé
                              </Badge>
                            ) : null}
                            {fromLeftovers ? (
                              <Badge variant="secondary" className="gap-1">
                                <RefreshCcwIcon aria-hidden className="size-3" /> Restes de la veille
                              </Badge>
                            ) : null}
                          </div>
                          {recipe ? (
                            <h3 className="text-lg leading-snug font-semibold text-balance">
                              <Link href={recipeHref(recipe.slug, slot.key)} className="hover:underline hover:underline-offset-4">
                                {recipe.title}
                              </Link>
                            </h3>
                          ) : (
                            <p className="text-muted-foreground">{empty.get(slot.key) ?? "Aucune recette."}</p>
                          )}
                        </div>
                        {recipe ? <MealActions planId={planId} slotKey={slot.key} locked={locked} mealLabel={mealLabel} /> : null}
                      </div>
                      {recipe ? (
                        <div className="flex flex-col gap-1.5">
                          {(ev.portions[slot.key] ?? []).map((p) => (
                            <MemberPlate
                              key={p.memberId}
                              portion={p}
                              index={memberIndex.get(p.memberId) ?? 0}
                              ingredients={view.catalog.ingredientIndex}
                              showNumbers={showNumbers.get(p.memberId) ?? false}
                            />
                          ))}
                        </div>
                      ) : null}
                      {recipe ? (
                        <MealCostTag
                          cost={view.mealCosts.get(slot.key)}
                          plates={platesOf.get(slot.key) ?? 1}
                          leftoverOf={fromLeftovers ? slotLabel(fromLeftovers) : null}
                          className="border-t pt-3"
                        />
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
