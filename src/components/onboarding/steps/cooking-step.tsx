"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { ChoiceCards } from "@/components/foodlek/forms/choice-cards";
import { ChoiceChips, SingleChips } from "@/components/foodlek/forms/choice-chips";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { EQUIPMENT, EQUIPMENT_LABELS } from "@/domain/catalog/types";
import { formatMinutes } from "@/lib/format";
import type { HouseholdSetup } from "@/lib/validation/household";

const WEEKDAY_TIMES = ["20", "30", "40", "60"] as const;
const WEEKEND_TIMES = ["30", "45", "75", "120"] as const;

export function CookingStep() {
  const { control, setValue, formState } = useFormContext<HouseholdSetup>();
  const v = useWatch({ control });
  const set = <K extends keyof HouseholdSetup>(key: K, value: HouseholdSetup[K]) =>
    setValue(key as never, value as never, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">Temps de cuisine en semaine (par repas)</FieldLegend>
        <SingleChips
          label="Temps en semaine"
          value={String(v.maxWeekdayMinutes)}
          onChange={(x) => set("maxWeekdayMinutes", Number(x))}
          options={WEEKDAY_TIMES.map((t) => ({ value: t, label: formatMinutes(Number(t)) }))}
        />
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">Le week-end</FieldLegend>
        <SingleChips
          label="Temps le week-end"
          value={String(v.maxWeekendMinutes)}
          onChange={(x) => set("maxWeekendMinutes", Number(x))}
          options={WEEKEND_TIMES.map((t) => ({ value: t, label: formatMinutes(Number(t)) }))}
        />
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">Niveau en cuisine</FieldLegend>
        <ChoiceCards
          label="Niveau en cuisine"
          columns={3}
          value={v.skill ?? "intermediate"}
          onChange={(x) => set("skill", x)}
          options={[
            { value: "beginner", label: "Débutant", description: "Des recettes faciles uniquement." },
            { value: "intermediate", label: "À l'aise", description: "Faciles et intermédiaires." },
            { value: "advanced", label: "Confirmé", description: "Tout le catalogue." },
          ]}
        />
      </FieldSet>
      <FieldSet data-invalid={Boolean(formState.errors.equipment)}>
        <FieldLegend variant="label">Matériel disponible</FieldLegend>
        <ChoiceChips
          label="Matériel"
          value={v.equipment ?? []}
          onChange={(x) => set("equipment", x)}
          options={EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }))}
        />
        <FieldError errors={[formState.errors.equipment as { message?: string } | undefined]} />
      </FieldSet>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="leftovers">Cuisiner une fois, manger deux fois</FieldLabel>
          <FieldDescription>Un dîner peut être cuisiné en plus grande quantité pour le déjeuner du lendemain.</FieldDescription>
        </FieldContent>
        <Switch id="leftovers" checked={v.useLeftovers ?? true} onCheckedChange={(x) => set("useLeftovers", x)} />
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="batch">Batch cooking</FieldLabel>
          <FieldDescription>Vous préférez cuisiner en grandes quantités ; les restes sont privilégiés.</FieldDescription>
        </FieldContent>
        <Switch id="batch" checked={v.batchCooking ?? false} onCheckedChange={(x) => set("batchCooking", x)} />
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="quick">Priorité aux repas rapides</FieldLabel>
        </FieldContent>
        <Switch id="quick" checked={v.preferQuickMeals ?? false} onCheckedChange={(x) => set("preferQuickMeals", x)} />
      </Field>

      <FieldSet>
        <FieldLegend variant="label">Recettes différentes dans la semaine</FieldLegend>
        <SingleChips
          label="Nombre maximum de recettes"
          value={v.maxDistinctRecipes === null || v.maxDistinctRecipes === undefined ? "none" : String(v.maxDistinctRecipes)}
          onChange={(x) => set("maxDistinctRecipes", x === "none" ? null : Number(x))}
          options={[
            { value: "none", label: "Sans limite" },
            { value: "4", label: "4 max" },
            { value: "6", label: "6 max" },
            { value: "8", label: "8 max" },
          ]}
        />
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">Manger plusieurs fois la même recette</FieldLegend>
        <SingleChips
          label="Tolérance à la répétition"
          value={v.repetitionTolerance ?? "medium"}
          onChange={(x) => set("repetitionTolerance", x)}
          options={[
            { value: "low", label: "Jamais deux fois" },
            { value: "medium", label: "Deux fois, ça va" },
            { value: "high", label: "Aucun problème" },
          ]}
        />
      </FieldSet>
    </FieldGroup>
  );
}
