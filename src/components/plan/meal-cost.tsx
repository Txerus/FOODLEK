import { CoinsIcon } from "lucide-react";
import { QualityBadge } from "@/components/foodlek/quality-badge";
import type { MealCost } from "@/domain/shopping/meal-cost";
import { formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Price of a dish for the household: value of the ingredients it uses at the
 * price paid (pantry excluded). Leftover meals point to the dish they come from.
 */
export function MealCostTag({
  cost,
  plates,
  leftoverOf,
  className,
}: {
  cost: MealCost | undefined;
  /** Number of plates served by the dish (leftovers included). */
  plates: number;
  leftoverOf?: string | null;
  className?: string;
}) {
  if (leftoverOf) {
    return <p className={cn("text-xs text-muted-foreground", className)}>Coût compté dans le repas du {leftoverOf}</p>;
  }
  if (!cost) return null;
  if (cost.cents === 0 && cost.partial) {
    return <p className={cn("text-xs text-muted-foreground", className)}>Prix du plat indisponible ({cost.missingIngredients.join(", ")} sans prix)</p>;
  }
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <CoinsIcon aria-hidden className="size-4 text-muted-foreground" />
      <span>
        {cost.partial ? "au moins " : "≈ "}
        <strong className="tabular">{formatEuros(cost.cents)}</strong> le plat
        {plates > 1 ? (
          <span className="text-muted-foreground">
            {" "}
            · {formatEuros(Math.round(cost.cents / plates))} par assiette
          </span>
        ) : null}
      </span>
      <QualityBadge quality={cost.quality} detail="Valeur des ingrédients utilisés, au prix payé pour les paquets achetés. Ce qui vient du placard n'est pas compté." />
      {cost.partial ? <span className="w-full text-xs text-muted-foreground">Sans prix : {cost.missingIngredients.join(", ")}</span> : null}
    </p>
  );
}
