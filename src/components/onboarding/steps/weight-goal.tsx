"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SingleChips } from "@/components/foodlek/forms/choice-chips";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { computeTargets } from "@/domain/nutrition/targets";
import type { HouseholdSetup } from "@/lib/validation/household";

const numberOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

const DURATIONS = [
  { value: "none", label: "Pas de délai" },
  { value: "8", label: "2 mois" },
  { value: "12", label: "3 mois" },
  { value: "24", label: "6 mois" },
  { value: "36", label: "9 mois" },
  { value: "52", label: "1 an" },
];

/** Target weight and timeframe, with a live, safe projection from the nutrition engine. */
export function WeightGoalFields({ index }: { index: number }) {
  const { control, register, setValue, formState } = useFormContext<HouseholdSetup>();
  const m = useWatch({ control, name: `members.${index}` });
  const errors = formState.errors.members?.[index];
  if (m.profileMode !== "detailed" || (m.goal !== "lose" && m.goal !== "gain")) return null;

  const t = computeTargets(
    {
      id: "preview",
      name: m.displayName,
      mode: m.profileMode,
      sex: m.sex,
      birthYear: m.birthYear,
      birthMonth: m.birthMonth,
      heightCm: m.heightCm,
      weightKg: m.weightKg,
      activity: m.activity,
      goal: m.goal,
      targetWeightKg: m.targetWeightKg,
      goalWeeks: m.goalWeeks,
      highProtein: m.highProtein,
      appetite: m.appetite,
      specialSituations: m.specialSituations,
    },
    new Date(),
  );
  const plan = t.weightPlan;

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4">
      <Field data-invalid={Boolean(errors?.targetWeightKg)}>
        <FieldLabel htmlFor={`m${index}-target`}>Poids souhaité</FieldLabel>
        <InputGroup className="max-w-40">
          <InputGroupInput
            id={`m${index}-target`}
            type="number"
            inputMode="decimal"
            step="0.5"
            {...register(`members.${index}.targetWeightKg`, { setValueAs: numberOrNull })}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>kg</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>Facultatif. Sans poids cible, FOODLEK applique un rythme modéré.</FieldDescription>
        <FieldError errors={[errors?.targetWeightKg]} />
      </Field>
      <FieldSet>
        <FieldLegend variant="label">En combien de temps ?</FieldLegend>
        <SingleChips
          label="Délai souhaité"
          value={m.goalWeeks === null ? "none" : String(m.goalWeeks)}
          onChange={(v) => setValue(`members.${index}.goalWeeks`, v === "none" ? null : Number(v), { shouldDirty: true })}
          options={DURATIONS}
        />
      </FieldSet>
      {plan ? (
        <div className="flex flex-col gap-2 text-sm" aria-live="polite">
          <p>
            <strong>
              {plan.dailyDeltaKcal < 0 ? `${-plan.dailyDeltaKcal} kcal de moins` : `${plan.dailyDeltaKcal} kcal de plus`}
            </strong>{" "}
            par jour que l'entretien, soit environ <strong>{plan.weeklyChangeKg.toLocaleString("fr-FR")} kg par semaine</strong> : objectif{" "}
            {plan.targetKg} kg dans <strong>{plan.projectedWeeks} semaines</strong> environ.
          </p>
          {t.warnings.map((w) => (
            <p key={w} className="flex gap-2 text-saffron-ink">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {w}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            Estimation (≈ 7 700 kcal par kg) : le poids varie d'un jour à l'autre et le rythme réel dépend de chacun.
          </p>
        </div>
      ) : m.weightKg && m.heightCm && m.birthYear && m.sex ? null : (
        <p className="text-sm text-muted-foreground">Renseignez taille, poids, année de naissance et sexe pour voir l'estimation.</p>
      )}
    </div>
  );
}
