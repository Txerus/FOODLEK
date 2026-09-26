"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ChoiceChips } from "@/components/foodlek/forms/choice-chips";
import { IngredientPicker } from "@/components/foodlek/forms/ingredient-picker";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { DIET_LABELS, DIETS } from "@/domain/catalog/diets";
import { ALLERGEN_LABELS, ALLERGENS } from "@/domain/catalog/types";
import type { HouseholdSetup } from "@/lib/validation/household";
import type { WizardCatalog } from "../types";
import { MemberSwitcher } from "./member-switcher";

export function PreferencesStep({ catalog }: { catalog: WizardCatalog }) {
  const { control, setValue } = useFormContext<HouseholdSetup>();
  const members = useWatch({ control, name: "members" });
  const [active, setActive] = useState(0);
  const i = Math.min(active, members.length - 1);
  const m = members[i];
  const ingredients = catalog.ingredients.filter((x) => !x.isStaple);

  return (
    <div className="flex flex-col gap-6">
      <MemberSwitcher active={i} onChange={setActive} />
      <FieldGroup key={i} className="animate-rise">
        <FieldSet>
          <FieldLegend variant="label">Régime alimentaire</FieldLegend>
          <ChoiceChips
            label="Régimes"
            value={m.diets}
            onChange={(v) => setValue(`members.${i}.diets`, v, { shouldDirty: true })}
            options={DIETS.map((d) => ({ value: d, label: DIET_LABELS[d] }))}
          />
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">Allergies et intolérances</FieldLegend>
          <FieldDescription>Les 14 allergènes à déclaration obligatoire. Une recette qui en contient ne sera jamais proposée au foyer.</FieldDescription>
          <ChoiceChips
            label="Allergies"
            value={m.allergies}
            onChange={(v) => setValue(`members.${i}.allergies`, v, { shouldDirty: true })}
            options={ALLERGENS.map((a) => ({ value: a, label: ALLERGEN_LABELS[a] }))}
          />
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">Aliments refusés</FieldLegend>
          <IngredientPicker
            label="Aliments refusés"
            ingredients={ingredients}
            value={m.excludedIngredientIds}
            onChange={(v) => setValue(`members.${i}.excludedIngredientIds`, v, { shouldDirty: true })}
          />
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">Aliments favoris</FieldLegend>
          <FieldDescription>Ils seront un peu plus souvent au menu.</FieldDescription>
          <IngredientPicker
            label="Aliments favoris"
            ingredients={ingredients}
            value={m.likedIngredientIds}
            onChange={(v) => setValue(`members.${i}.likedIngredientIds`, v, { shouldDirty: true })}
          />
        </FieldSet>
      </FieldGroup>
    </div>
  );
}
