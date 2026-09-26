"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ChoiceCards } from "@/components/foodlek/forms/choice-cards";
import { NumberStepper } from "@/components/foodlek/forms/number-stepper";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APPETITE_LABELS, APPETITES, type Appetite } from "@/domain/nutrition/config";
import { defaultMember, type HouseholdSetup } from "@/lib/validation/household";

const APPETITE_HINTS: Record<Appetite, string> = {
  small: "Des assiettes plutôt légères.",
  normal: "Des portions classiques.",
  large: "On aime quand il y en a assez.",
};

export function HouseholdStep() {
  const { register, control, formState, setValue, getValues } = useFormContext<HouseholdSetup>();
  const { fields, append, remove } = useFieldArray({ control, name: "members", keyName: "_key" });
  const members = useWatch({ control, name: "members" });
  const appetite = useWatch({ control, name: "generalAppetite" });
  const adults = members.filter((m) => !m.isChild).length;
  const children = members.filter((m) => m.isChild).length;

  function setCount(isChild: boolean, target: number) {
    const current = getValues("members");
    const indices = current.map((m, i) => ({ m, i })).filter(({ m }) => m.isChild === isChild);
    if (target > indices.length) {
      for (let k = indices.length; k < target; k++) {
        append({ ...defaultMember(k, isChild), appetite: getValues("generalAppetite") });
      }
    } else {
      // Remove the last ones of that kind.
      const toRemove = indices.slice(target).map(({ i }) => i);
      remove(toRemove);
    }
  }

  return (
    <FieldGroup>
      <Field data-invalid={Boolean(formState.errors.householdName)}>
        <FieldLabel htmlFor="householdName">Nom du foyer</FieldLabel>
        <Input id="householdName" autoComplete="off" {...register("householdName")} />
        <FieldError errors={[formState.errors.householdName]} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium">Adultes</p>
            <p className="text-sm text-muted-foreground">18 ans et plus</p>
          </div>
          <NumberStepper label="Adultes" value={adults} min={children > 0 ? 1 : 1} max={8} onChange={(n) => setCount(false, n)} />
        </div>
        <div className="surface flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium">Enfants</p>
            <p className="text-sm text-muted-foreground">Moins de 18 ans</p>
          </div>
          <NumberStepper label="Enfants" value={children} min={0} max={6} onChange={(n) => setCount(true, n)} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Repas préparés pour <strong className="text-foreground">{fields.length} personne{fields.length > 1 ? "s" : ""}</strong>. Vous
        pourrez préciser qui mange à chaque repas plus tard.
      </p>
      <FieldError errors={[formState.errors.members?.root ?? (formState.errors.members as { message?: string } | undefined)]} />

      <FieldSet>
        <FieldLegend variant="label">Appétit général du foyer</FieldLegend>
        <FieldDescription>Sert de point de départ ; chaque profil pourra l'ajuster.</FieldDescription>
        <ChoiceCards
          label="Appétit général"
          columns={3}
          value={appetite}
          onChange={(v) => {
            setValue("generalAppetite", v, { shouldDirty: true });
            const list = getValues("members");
            list.forEach((_, i) => setValue(`members.${i}.appetite`, v, { shouldDirty: true }));
          }}
          options={APPETITES.map((a) => ({ value: a, label: APPETITE_LABELS[a], description: APPETITE_HINTS[a] }))}
        />
      </FieldSet>
    </FieldGroup>
  );
}
