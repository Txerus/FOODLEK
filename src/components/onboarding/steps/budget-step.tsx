"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { ChoiceCards } from "@/components/foodlek/forms/choice-cards";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { BUDGET_MODE_LABELS, BUDGET_MODES } from "@/domain/budget/budget";
import { formatEuros } from "@/lib/format";
import type { HouseholdSetup } from "@/lib/validation/household";

export function BudgetStep() {
  const { control, register, setValue, formState } = useFormContext<HouseholdSetup>();
  const budget = useWatch({ control, name: "budgetEuros" });
  const mode = useWatch({ control, name: "budgetMode" });
  const members = useWatch({ control, name: "members" });
  const schedule = useWatch({ control, name: "schedule" });
  const meals = schedule.breakfast.length + schedule.lunch.length + schedule.dinner.length + schedule.snack.length;
  const perPersonMeal = meals > 0 && members.length > 0 && budget > 0 ? Math.round((budget * 100) / (meals * members.length)) : null;

  return (
    <FieldGroup>
      <Field data-invalid={Boolean(formState.errors.budgetEuros)}>
        <FieldLabel htmlFor="budget">Budget alimentaire par semaine</FieldLabel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <InputGroup className="sm:w-40">
            <InputGroupInput
              id="budget"
              type="number"
              inputMode="decimal"
              min={10}
              max={1000}
              className="font-display text-xl font-semibold"
              {...register("budgetEuros", { valueAsNumber: true })}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>€</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <Slider
            aria-label="Budget hebdomadaire"
            min={20}
            max={300}
            step={5}
            value={[Number.isFinite(budget) ? Math.min(300, Math.max(20, budget)) : 90]}
            onValueChange={([v]) => setValue("budgetEuros", v, { shouldDirty: true, shouldValidate: true })}
            className="flex-1"
          />
        </div>
        {perPersonMeal !== null ? (
          <FieldDescription>
            Soit environ <strong className="text-foreground">{formatEuros(perPersonMeal)}</strong> par personne et par repas pour {meals} repas.
          </FieldDescription>
        ) : null}
        <FieldError errors={[formState.errors.budgetEuros]} />
      </Field>
      <FieldSet>
        <FieldLegend variant="label">Comment le respecter ?</FieldLegend>
        <ChoiceCards
          label="Comportement du budget"
          value={mode}
          onChange={(v) => setValue("budgetMode", v, { shouldDirty: true })}
          options={BUDGET_MODES.map((m) => ({ value: m, label: BUDGET_MODE_LABELS[m].label, description: BUDGET_MODE_LABELS[m].hint }))}
        />
      </FieldSet>
    </FieldGroup>
  );
}
