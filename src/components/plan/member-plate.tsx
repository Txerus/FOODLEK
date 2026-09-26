import { PersonDot } from "@/components/foodlek/person";
import { formatIngredientAmount } from "@/domain/catalog/format";
import type { IngredientIndex } from "@/domain/catalog/types";
import type { MemberPortion } from "@/domain/portions/portions";
import { cn } from "@/lib/utils";

/** One line per person: the main components of their plate. */
export function MemberPlate({
  portion,
  index,
  ingredients,
  showNumbers,
  className,
}: {
  portion: MemberPortion;
  index: number;
  ingredients: IngredientIndex;
  showNumbers: boolean;
  className?: string;
}) {
  const main = portion.items.filter((i) => i.role === "protein" || i.role === "starch");
  const vegGrams = portion.items.filter((i) => i.role === "vegetable").reduce((s, i) => s + i.grams, 0);
  return (
    <div className={cn("flex items-start gap-2 text-sm", className)}>
      <PersonDot index={index} className="mt-1.5" />
      <p className="min-w-0 text-pretty">
        <span className="font-medium">{portion.name}</span>
        <span className="text-muted-foreground">
          {" · "}
          {main
            .map((i) => {
              const ing = ingredients.get(i.ingredientId);
              const amount = ing ? formatIngredientAmount(i.quantity, i.unit, ing) : i.ingredientName;
              return i.cookedGrams ? `${amount} (≈ ${i.cookedGrams} g cuit)` : amount;
            })
            .join(" · ")}
          {vegGrams > 0 ? ` · ${Math.round(vegGrams / 10) * 10} g de légumes` : ""}
          {showNumbers ? ` · ${Math.round(portion.nutrients.energyKcal)} kcal, ${Math.round(portion.nutrients.proteinG)} g prot.` : ""}
        </span>
      </p>
    </div>
  );
}
