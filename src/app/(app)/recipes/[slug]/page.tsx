import { ArrowLeftIcon, ChefHatIcon, ClockIcon, FlameIcon, TimerIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonDot } from "@/components/foodlek/person";
import { QualityBadge } from "@/components/foodlek/quality-badge";
import { AddToWeek } from "@/components/recipes/add-to-week";
import { RecipeVisual } from "@/components/recipes/recipe-visual";
import { NutritionTable } from "@/components/recipes/nutrition-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DIET_LABELS } from "@/domain/catalog/diets";
import { formatAmountOnly } from "@/domain/catalog/format";
import { ALLERGEN_LABELS, MEAL_TYPE_LABELS, totalMinutes, type Difficulty } from "@/domain/catalog/types";
import { computeTargets, mealTarget } from "@/domain/nutrition/targets";
import { formatDay, formatEuros, formatMinutes } from "@/lib/format";
import { cookHref } from "@/lib/routes";
import { requireHousehold } from "@/server/auth/access";
import { getCatalog } from "@/server/services/catalog";
import { getRecipeDetail } from "@/server/services/recipes";

const DIFFICULTY: Record<Difficulty, string> = { easy: "Facile", medium: "Intermédiaire", hard: "Difficile" };

export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const recipe = (await getCatalog()).recipesBySlug.get(slug);
  return { title: recipe?.title ?? "Recette" };
}

export default async function RecipePage({ params, searchParams }: PageProps<"/recipes/[slug]">) {
  const { householdId } = await requireHousehold();
  const { slug } = await params;
  const sp = await searchParams;
  const slotKey = typeof sp.repas === "string" ? sp.repas : null;
  const detail = await getRecipeDetail(householdId, slug, slotKey);
  if (!detail) notFound();
  const { recipe, portions, cooking, slot, ctx, catalog } = detail;
  const index = new Map(ctx.members.map((m, i) => [m.id, i]));
  const today = new Date();
  const targetsById = new Map(ctx.members.map((m) => [m.id, computeTargets(m.profile, today)]));
  const byIngredient = (memberId: string, ingredientId: string) =>
    portions.find((p) => p.memberId === memberId)?.items.find((i) => i.ingredientId === ingredientId);

  return (
    <article className="flex flex-col gap-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={slot ? "/planning" : "/recipes"}>
            <ArrowLeftIcon data-icon="inline-start" />
            {slot ? "Semaine" : "Recettes"}
          </Link>
        </Button>
      </div>

      <RecipeVisual recipe={recipe} priority creditLink sizes="100vw" className="aspect-[16/7] max-h-80" />

      <header className="flex flex-col gap-4">
        {slot ? (
          <p className="text-sm font-medium text-primary">
            {MEAL_TYPE_LABELS[slot.mealType]} · {formatDay(slot.date)}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-semibold text-balance sm:text-5xl">{recipe.title}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{recipe.description}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <ClockIcon aria-hidden className="size-4" />
            {formatMinutes(totalMinutes(recipe))} <span className="text-muted-foreground/70">({recipe.prepMinutes} min de préparation)</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ChefHatIcon aria-hidden className="size-4" />
            {DIFFICULTY[recipe.difficulty]}
          </li>
          <li className="inline-flex items-center gap-1.5 capitalize">
            <FlameIcon aria-hidden className="size-4" />
            {recipe.cuisine}
          </li>
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {detail.diets
            .filter((d) => d !== "halal")
            .map((d) => (
              <Badge key={d} variant="secondary">
                {DIET_LABELS[d]}
              </Badge>
            ))}
          {detail.allergens.map((a) => (
            <Badge key={a} variant="outline">
              Contient : {ALLERGEN_LABELS[a].toLowerCase()}
            </Badge>
          ))}
        </div>
        {!detail.eligible ? (
          <Alert>
            <AlertDescription>Cette recette n'est pas proposée à votre foyer : {detail.ineligibleReasons.join(" ; ")}.</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href={cookHref(recipe.slug, slot?.key)}>
              <TimerIcon data-icon="inline-start" />
              Mode cuisine
            </Link>
          </Button>
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            {detail.cost.cents !== null ? <>≈ {formatEuros(detail.cost.cents)} par portion standard</> : "Coût indisponible"}
            <QualityBadge quality={detail.cost.quality} detail="Coût approximatif au prix unitaire ; le coût réel dépend des paquets achetés (voir la liste de courses)." />
          </span>
        </div>
        {!slot && detail.placement && detail.placement.slots.length > 0 ? (
          <AddToWeek
            planId={detail.placement.planId}
            recipeId={recipe.id}
            slots={detail.placement.slots.map((s) => ({ key: s.key, label: `${formatDay(s.date)} · ${MEAL_TYPE_LABELS[s.mealType].toLowerCase()}` }))}
          />
        ) : null}
      </header>

      <section aria-labelledby="portions-title" className="flex flex-col gap-3">
        <h2 id="portions-title" className="font-display text-xl font-semibold">
          {slot ? "Ingrédients de ce repas" : "Ingrédients pour votre foyer"}
        </h2>
        {slot && slot.servesSlotKeys.length > 1 ? (
          <p className="text-sm text-muted-foreground">
            Les quantités à cuisiner incluent les restes pour le {MEAL_TYPE_LABELS.lunch.toLowerCase()} du lendemain.
          </p>
        ) : !slot ? (
          <p className="text-sm text-muted-foreground">Portions calculées pour un dîner, selon le profil de chacun.</p>
        ) : null}
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Ingrédient
                </th>
                {portions.map((p) => (
                  <th key={p.memberId} scope="col" className="px-3 py-2.5 text-right font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <PersonDot index={index.get(p.memberId) ?? 0} />
                      {p.name}
                    </span>
                  </th>
                ))}
                <th scope="col" className="bg-muted/60 px-4 py-2.5 text-right font-medium text-foreground">
                  À cuisiner
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {recipe.ingredients.map((ri) => {
                const ing = catalog.ingredientIndex.get(ri.ingredientId);
                if (!ing) return null;
                const total = cooking.find((c) => c.ingredientId === ri.ingredientId && c.unit === ri.unit);
                return (
                  <tr key={`${ri.ingredientId}-${ri.unit}`} className="border-b last:border-0">
                    <th scope="row" className="px-4 py-2.5 text-left font-normal">
                      <span className="font-medium">{ing.name}</span>
                      {ri.note ? <span className="block text-xs text-muted-foreground">{ri.note}</span> : null}
                    </th>
                    {portions.map((p) => {
                      const item = byIngredient(p.memberId, ri.ingredientId);
                      return (
                        <td key={p.memberId} className="px-3 py-2.5 text-right whitespace-nowrap">
                          {item ? formatAmountOnly(item.quantity, item.unit, ing) : "—"}
                          {item?.cookedGrams ? <span className="block text-xs text-muted-foreground">≈ {item.cookedGrams} g cuit</span> : null}
                        </td>
                      );
                    })}
                    <td className="bg-muted/60 px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                      {total ? formatAmountOnly(Math.round(total.quantity * 100) / 100, total.unit, ing) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="steps-title" className="flex flex-col gap-3">
        <h2 id="steps-title" className="font-display text-xl font-semibold">
          Préparation
        </h2>
        <ol className="flex flex-col gap-4">
          {recipe.steps.map((s) => (
            <li key={s.order} className="grid grid-cols-[2rem_1fr] gap-3">
              <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                {s.order}
              </span>
              <div className="pt-1">
                <p className="text-pretty">{s.text}</p>
                {s.timerSeconds ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <TimerIcon aria-hidden className="size-3.5" /> {formatMinutes(Math.round(s.timerSeconds / 60))}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <NutritionTable
        quality={detail.nutrition.quality}
        sources={detail.nutrition.sources}
        rows={[
          ...portions.map((p) => {
            const member = ctx.members.find((m) => m.id === p.memberId);
            const targets = targetsById.get(p.memberId);
            const mealType = slot?.mealType ?? "dinner";
            return {
              key: p.memberId,
              label: p.name,
              index: index.get(p.memberId) ?? 0,
              nutrients: p.nutrients,
              targetKcal: member && targets && targets.energyKcal !== null ? mealTarget(member.profile, targets, mealType).energyKcal : null,
              showNumbers: targets?.showNumbers ?? true,
            };
          }),
          { key: "std", label: "Portion standard", index: null, nutrients: detail.nutrition.nutrients, targetKcal: null, showNumbers: true },
        ]}
      />
    </article>
  );
}
