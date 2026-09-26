import { ArrowRightIcon, ClockIcon, PackageOpenIcon, RefreshCcwIcon, ShoppingBasketIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BudgetSummary } from "@/components/plan/budget-summary";
import { EmptyWeek } from "@/components/plan/empty-week";
import { Explanations } from "@/components/plan/explanations";
import { MemberPlate } from "@/components/plan/member-plate";
import { NutritionWeek } from "@/components/plan/nutrition-week";
import { MEAL_TYPE_LABELS, totalMinutes } from "@/domain/catalog/types";
import { findCurrentPlanId, loadPlanView } from "@/server/services/plans";
import { addDays } from "@/lib/week";
import { requireHousehold } from "@/server/auth/access";
import { formatDay, formatEuros, formatMinutes, formatWeekday } from "@/lib/format";
import { recipeHref } from "@/lib/routes";
import { isUpcoming, parisNow } from "@/lib/time";

export const metadata: Metadata = { title: "Accueil" };

export default async function DashboardPage() {
  const { user, householdId } = await requireHousehold();
  const planId = await findCurrentPlanId(householdId);
  const firstName = user.name.split(" ")[0];

  if (!planId) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Bonjour {firstName}</h1>
        <EmptyWeek />
      </div>
    );
  }

  const view = await loadPlanView(householdId, planId);
  const { evaluation: ev, slots, recipes, ctx } = view;
  const now = parisNow();
  const next = slots.find((s) => ev.assignment[s.key] && isUpcoming(s.date, s.mealType, now));
  const nextRecipe = next ? recipes.get(ev.assignment[next.key] ?? "") : undefined;
  const memberIndex = new Map(ctx.members.map((m, i) => [m.id, i]));
  const showNumbersFor = new Map(ev.nutrition.map((n) => [n.memberId, n.showNumbers]));
  const toBuy = ev.shopping.lines.filter((l) => l.toBuy > 0);
  const checked = toBuy.filter((l) => view.checkedIngredientIds.has(l.ingredientId)).length;
  const fromPantry = ev.shopping.lines.filter((l) => l.fromPantry > 0);
  const leftoverSessions = ev.sessions.filter((s) => s.servesSlotKeys.length > 1);
  const perishableLeftovers = ev.shopping.lines.filter((l) => l.leftoverIsWaste && l.leftover > 0);
  const days = [...new Set(slots.map((s) => s.date))];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Semaine du {formatDay(view.weekStart).toLowerCase()} au {formatDay(addDays(view.weekStart, 6)).toLowerCase()}
        </p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Bonjour {firstName}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {next && nextRecipe ? (
            <section aria-labelledby="next-title" className="surface flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span id="next-title" className="font-medium text-foreground">
                  {next.date === now.date ? "Aujourd'hui" : formatWeekday(next.date)} · {MEAL_TYPE_LABELS[next.mealType]}
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <ClockIcon aria-hidden className="size-3.5" />
                  {formatMinutes(totalMinutes(nextRecipe))}
                </span>
                {leftoverSessions.some((s) => s.servesSlotKeys[1] === next.key) ? <Badge variant="secondary">Restes de la veille</Badge> : null}
              </div>
              <h2 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
                <Link href={recipeHref(nextRecipe.slug, next.key)} className="hover:underline hover:decoration-2 hover:underline-offset-4">
                  {nextRecipe.title}
                </Link>
              </h2>
              <div className="flex flex-col gap-2">
                {(ev.portions[next.key] ?? []).map((p) => (
                  <MemberPlate
                    key={p.memberId}
                    portion={p}
                    index={memberIndex.get(p.memberId) ?? 0}
                    ingredients={view.catalog.ingredientIndex}
                    showNumbers={showNumbersFor.get(p.memberId) ?? false}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={recipeHref(nextRecipe.slug, next.key)}>
                    Voir la recette
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="week-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="week-title" className="text-sm font-medium text-muted-foreground">
                Planning repas
              </h2>
              <Link href="/planning" className="text-sm font-medium underline-offset-4 hover:underline">
                Modifier
              </Link>
            </div>
            <ol className="surface divide-y">
              {days.map((date) => (
                <li key={date} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                  <p className={date === now.date ? "font-semibold text-primary" : "font-medium"}>{formatWeekday(date)}</p>
                  <ul className="flex flex-col gap-1">
                    {slots
                      .filter((s) => s.date === date)
                      .map((s) => {
                        const r = recipes.get(ev.assignment[s.key] ?? "");
                        return (
                          <li key={s.key} className="flex min-w-0 items-baseline gap-2 text-sm">
                            <span className="w-20 shrink-0 text-muted-foreground">{MEAL_TYPE_LABELS[s.mealType]}</span>
                            {r ? (
                              <Link href={recipeHref(r.slug, s.key)} className="truncate hover:underline hover:underline-offset-4">
                                {r.title}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground italic">Aucune recette</span>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="surface p-5">
            <BudgetSummary budget={ev.budget} storeName={view.store?.name ?? null} compact />
          </div>

          <section aria-labelledby="shop-title" className="surface flex flex-col gap-3 p-5">
            <h2 id="shop-title" className="text-sm font-medium text-muted-foreground">
              Courses
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2">
                <ShoppingBasketIcon aria-hidden className="size-4 text-muted-foreground" />
                {toBuy.length} produits à acheter{checked ? `, ${checked} déjà dans le panier` : ""}
              </li>
              <li className="flex items-center gap-2">
                <PackageOpenIcon aria-hidden className="size-4 text-muted-foreground" />
                {fromPantry.length} déjà dans votre placard
              </li>
              <li className="flex items-center gap-2">
                <RefreshCcwIcon aria-hidden className="size-4 text-muted-foreground" />
                {leftoverSessions.length} repas prévus avec les restes
              </li>
            </ul>
            {perishableLeftovers.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Restes de produits frais en fin de semaine : {perishableLeftovers.length} produit{perishableLeftovers.length > 1 ? "s" : ""}, soit environ{" "}
                {formatEuros(ev.shopping.wasteValueCents)}.
              </p>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/shopping">Ouvrir la liste de courses</Link>
            </Button>
          </section>

          <div className="surface p-5">
            <NutritionWeek members={ev.nutrition} />
          </div>

          <div className="surface p-5">
            <Explanations items={view.explanations} />
          </div>
        </aside>
      </div>
    </div>
  );
}
