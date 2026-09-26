import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/foodlek/page-header";
import { QualityBadge } from "@/components/foodlek/quality-badge";
import { EmptyWeek } from "@/components/plan/empty-week";
import { ShoppingList, type AisleView, type ShoppingLineView } from "@/components/shopping/shopping-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { freshnessOf } from "@/domain/common/data-quality";
import { formatAmountOnly } from "@/domain/catalog/format";
import { AISLE_LABELS, type Ingredient } from "@/domain/catalog/types";
import type { ShoppingLine } from "@/domain/shopping/aggregate";
import { formatDateTime, formatEuros } from "@/lib/format";
import { requireHousehold } from "@/server/auth/access";
import { findCurrentPlanId, loadPlanView } from "@/server/services/plans";

export const metadata: Metadata = { title: "Courses" };

function amount(q: number, ing: Ingredient) {
  return formatAmountOnly(Math.round(q), ing.purchaseUnit, ing);
}

function unitPriceLabel(cents: number | null, unit: string): string | null {
  if (cents === null) return null;
  const per = unit === "piece" ? "pièce" : unit === "ml" ? "l" : "kg";
  return `${formatEuros(cents)}/${per}`;
}

function toView(line: ShoppingLine, ing: Ingredient, now: Date): ShoppingLineView {
  return {
    ingredientId: line.ingredientId,
    name: line.ingredientName,
    neededLabel: amount(line.needed, ing),
    fromPantryLabel: line.fromPantry > 0 ? amount(line.fromPantry, ing) : null,
    leftoverLabel: line.leftover >= 1 ? amount(line.leftover, ing) : null,
    leftoverIsWaste: line.leftoverIsWaste,
    purchases: line.choices.map((c) => ({
      count: c.count,
      packLabel: c.offer.packLabel,
      productName: c.offer.name,
      brand: c.offer.brand,
      priceCents: c.offer.priceCents as number,
      unitPriceLabel: unitPriceLabel(c.offer.unitPriceCents, c.offer.packUnit),
      quality: c.offer.quality,
      freshness: freshnessOf(c.offer.fetchedAt, now),
      fetchedAtLabel: c.offer.fetchedAt ? formatDateTime(c.offer.fetchedAt) : null,
      provider: c.offer.provider,
      storeName: c.offer.storeName,
      sourceUrl: c.offer.sourceUrl,
      isOrganic: c.offer.isOrganic,
      promotion: c.offer.promotion?.label ?? null,
      substitution: c.offer.substitution,
    })),
    costCents: line.costCents,
    quality: line.quality,
    priceMissing: line.priceMissing,
    usedIn: [...new Set(line.usedIn.map((u) => u.recipeTitle))],
  };
}

export default async function ShoppingPage() {
  const { householdId } = await requireHousehold();
  const planId = await findCurrentPlanId(householdId);
  if (!planId) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Courses" />
        <EmptyWeek />
      </div>
    );
  }
  const view = await loadPlanView(householdId, planId);
  const { shopping, budget } = view.evaluation;
  const index = view.catalog.ingredientIndex;
  const now = new Date();
  const aisles: AisleView[] = shopping.byAisle
    .map((g) => ({
      aisle: g.aisle,
      label: AISLE_LABELS[g.aisle],
      lines: g.lines.filter((l) => l.toBuy > 0).map((l) => toView(l, index.get(l.ingredientId) as Ingredient, now)),
    }))
    .filter((g) => g.lines.length > 0);
  const pantry = shopping.lines.filter((l) => l.toBuy === 0 && l.fromPantry > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Liste de courses"
        description="Les ingrédients de toute la semaine, regroupés et convertis en vrais conditionnements."
        actions={
          <div className="flex flex-col items-end gap-1">
            <p className="font-display text-3xl font-semibold tabular">{formatEuros(shopping.totalCents)}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              budget {formatEuros(budget.budgetCents)} <QualityBadge quality={shopping.quality} />
            </p>
          </div>
        }
      />
      {view.store ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          Prix : {view.store.name}
          {view.store.isDemo ? ". Prix fictifs, sans lien avec une enseigne réelle." : ""}
        </p>
      ) : (
        <Alert>
          <AlertTitle>Aucun magasin sélectionné</AlertTitle>
          <AlertDescription>
            Les quantités sont exactes, mais aucun prix n'est affiché. <Link href="/household" className="underline">Choisir un magasin</Link>
          </AlertDescription>
        </Alert>
      )}
      {shopping.missingPriceCount > 0 && view.store ? (
        <Alert>
          <AlertTitle>{shopping.missingPriceCount} produit(s) sans prix dans ce magasin</AlertTitle>
          <AlertDescription>Le total affiché ne les inclut pas. Aucun prix n'est inventé.</AlertDescription>
        </Alert>
      ) : null}
      <ShoppingList planId={planId} aisles={aisles} initiallyChecked={[...view.checkedIngredientIds]} />
      {pantry.length > 0 ? (
        <section aria-labelledby="pantry-title" className="flex flex-col gap-2">
          <h2 id="pantry-title" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Déjà dans votre placard
          </h2>
          <p className="text-sm text-muted-foreground">
            {pantry.map((l) => l.ingredientName).join(", ")}.{" "}
            <Link href="/pantry" className="underline underline-offset-4">
              Gérer le placard
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
