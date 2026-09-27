"use client";

import { InfoIcon } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ChoiceCards } from "@/components/foodlek/forms/choice-cards";
import { ChoiceChips, SingleChips } from "@/components/foodlek/forms/choice-chips";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import {
  ACTIVITY_LABELS,
  ACTIVITY_LEVELS,
  APPETITE_LABELS,
  APPETITES,
  GOAL_LABELS,
  GOALS,
} from "@/domain/nutrition/config";
import { SPECIAL_SITUATION_LABELS, SPECIAL_SITUATIONS } from "@/domain/nutrition/targets";
import type { HouseholdSetup } from "@/lib/validation/household";
import { MemberSwitcher } from "./member-switcher";
import { WeightGoalFields } from "./weight-goal";

const numberOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

export function ProfilesStep() {
  const { control, register, setValue, formState } = useFormContext<HouseholdSetup>();
  const members = useWatch({ control, name: "members" });
  const [active, setActive] = useState(0);
  const i = Math.min(active, members.length - 1);
  const m = members[i];
  const errors = formState.errors.members?.[i];
  const invalid = new Set(
    members.map((_, k) => k).filter((k) => Boolean(formState.errors.members?.[k])),
  );

  return (
    <div className="flex flex-col gap-6">
      <MemberSwitcher active={i} onChange={setActive} invalid={invalid} />
      <FieldGroup key={i} className="animate-rise">
        <Field data-invalid={Boolean(errors?.displayName)}>
          <FieldLabel htmlFor={`m${i}-name`}>Prénom ou pseudonyme</FieldLabel>
          <Input id={`m${i}-name`} autoComplete="off" {...register(`members.${i}.displayName`)} />
          <FieldError errors={[errors?.displayName]} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Niveau de détail</FieldLegend>
          <ChoiceCards
            label="Niveau de détail du profil"
            columns={2}
            value={m.profileMode}
            onChange={(v) => setValue(`members.${i}.profileMode`, v, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
            options={[
              { value: "simplified", label: "Simplifié", description: "Sans poids ni mensurations : les portions suivent l'appétit." },
              { value: "detailed", label: "Détaillé", description: "Taille, poids et activité pour estimer les besoins." },
            ]}
          />
        </FieldSet>

        {m.profileMode === "detailed" ? (
          <>
            <FieldSet data-invalid={Boolean(errors?.sex)}>
              <FieldLegend variant="label">Sexe physiologique</FieldLegend>
              <FieldDescription>
                Utilisé uniquement dans l'équation de dépense énergétique (Mifflin-St Jeor), qui diffère selon le sexe physiologique. « Non précisé » utilise une moyenne.
              </FieldDescription>
              <SingleChips
                label="Sexe physiologique"
                value={m.sex ?? ""}
                onChange={(v) => setValue(`members.${i}.sex`, v as HouseholdSetup["members"][number]["sex"], { shouldDirty: true, shouldValidate: true })}
                options={[
                  { value: "female", label: "Femme" },
                  { value: "male", label: "Homme" },
                  { value: "unspecified", label: "Non précisé" },
                ]}
              />
              <FieldError errors={[errors?.sex]} />
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field data-invalid={Boolean(errors?.birthYear)}>
                <FieldLabel htmlFor={`m${i}-birth`}>Année de naissance</FieldLabel>
                <Input id={`m${i}-birth`} inputMode="numeric" type="number" {...register(`members.${i}.birthYear`, { setValueAs: numberOrNull })} />
                <FieldError errors={[errors?.birthYear]} />
              </Field>
              <Field data-invalid={Boolean(errors?.heightCm)}>
                <FieldLabel htmlFor={`m${i}-height`}>Taille</FieldLabel>
                <InputGroup>
                  <InputGroupInput id={`m${i}-height`} inputMode="numeric" type="number" {...register(`members.${i}.heightCm`, { setValueAs: numberOrNull })} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>cm</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError errors={[errors?.heightCm]} />
              </Field>
              <Field data-invalid={Boolean(errors?.weightKg)}>
                <FieldLabel htmlFor={`m${i}-weight`}>Poids</FieldLabel>
                <InputGroup>
                  <InputGroupInput id={`m${i}-weight`} inputMode="decimal" type="number" step="0.1" {...register(`members.${i}.weightKg`, { setValueAs: numberOrNull })} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>kg</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError errors={[errors?.weightKg]} />
              </Field>
            </div>
            <FieldSet>
              <FieldLegend variant="label">Activité physique</FieldLegend>
              <ChoiceCards
                label="Activité physique"
                columns={2}
                value={m.activity}
                onChange={(v) => setValue(`members.${i}.activity`, v, { shouldDirty: true })}
                options={ACTIVITY_LEVELS.map((a) => ({ value: a, label: ACTIVITY_LABELS[a].label, description: ACTIVITY_LABELS[a].hint }))}
              />
            </FieldSet>
          </>
        ) : null}

        <FieldSet data-invalid={Boolean(errors?.goal)}>
          <FieldLegend variant="label">Objectif</FieldLegend>
          <SingleChips
            label="Objectif"
            value={m.goal}
            onChange={(v) => setValue(`members.${i}.goal`, v, { shouldDirty: true, shouldValidate: true })}
            options={GOALS.filter((g) => !(m.isChild && g === "lose")).map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
          />
          {m.goal === "lose" && m.profileMode === "simplified" ? (
            <FieldDescription>Un objectif de perte de poids s'appuie sur le profil détaillé. En profil simplifié, les portions suivent l'appétit.</FieldDescription>
          ) : null}
          <FieldError errors={[errors?.goal]} />
        </FieldSet>

        <WeightGoalFields index={i} />

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={`m${i}-protein`}>Apport en protéines élevé</FieldLabel>
            <FieldDescription>1,6 g par kg et par jour au lieu de 1 g (profil détaillé).</FieldDescription>
          </FieldContent>
          <Switch id={`m${i}-protein`} checked={m.highProtein} onCheckedChange={(v) => setValue(`members.${i}.highProtein`, v, { shouldDirty: true })} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Appétit</FieldLegend>
          <SingleChips
            label="Appétit"
            value={m.appetite}
            onChange={(v) => setValue(`members.${i}.appetite`, v, { shouldDirty: true })}
            options={APPETITES.map((a) => ({ value: a, label: APPETITE_LABELS[a] }))}
          />
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Situation particulière</FieldLegend>
          <FieldDescription>Facultatif. Dans ces situations, FOODLEK n'applique aucune restriction et adapte simplement les portions à l'appétit.</FieldDescription>
          <ChoiceChips
            label="Situation particulière"
            value={m.specialSituations}
            onChange={(v) => setValue(`members.${i}.specialSituations`, v, { shouldDirty: true })}
            options={SPECIAL_SITUATIONS.map((s) => ({ value: s, label: SPECIAL_SITUATION_LABELS[s] }))}
          />
          {m.specialSituations.length > 0 ? (
            <Alert>
              <InfoIcon aria-hidden />
              <AlertDescription>
                Pour cette personne, pas d'objectif calorique ni de restriction. Les conseils d'un professionnel de santé priment toujours sur ceux de FOODLEK.
              </AlertDescription>
            </Alert>
          ) : null}
        </FieldSet>
      </FieldGroup>
    </div>
  );
}
