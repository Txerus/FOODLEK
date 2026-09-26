"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { ChoiceChips } from "@/components/foodlek/forms/choice-chips";
import { IngredientPicker } from "@/components/foodlek/forms/ingredient-picker";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import type { HouseholdSetup } from "@/lib/validation/household";
import type { WizardCatalog } from "../types";

export function PantryStep({ catalog }: { catalog: WizardCatalog }) {
  const { control, setValue } = useFormContext<HouseholdSetup>();
  const selected = useWatch({ control, name: "pantryIngredientIds" });
  const staples = catalog.ingredients.filter((i) => i.isStaple);
  const others = catalog.ingredients.filter((i) => !i.isStaple);
  const stapleIds = new Set(staples.map((s) => s.id));
  const selectedStaples = selected.filter((id) => stapleIds.has(id));
  const selectedOthers = selected.filter((id) => !stapleIds.has(id));

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">Les basiques</FieldLegend>
        <FieldDescription>Huile, sel, épices… ce que vous avez presque toujours.</FieldDescription>
        <ChoiceChips
          label="Basiques du placard"
          value={selectedStaples}
          onChange={(v) => setValue("pantryIngredientIds", [...v, ...selectedOthers], { shouldDirty: true })}
          options={staples.map((s) => ({ value: s.id, label: s.name }))}
        />
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">Autres produits déjà à la maison</FieldLegend>
        <FieldDescription>Riz, pâtes, conserves… Vous pourrez préciser les quantités plus tard dans « Mon placard ».</FieldDescription>
        <IngredientPicker
          label="Produits du placard"
          ingredients={others}
          value={selectedOthers}
          onChange={(v) => setValue("pantryIngredientIds", [...selectedStaples, ...v], { shouldDirty: true })}
        />
      </FieldSet>
    </FieldGroup>
  );
}
