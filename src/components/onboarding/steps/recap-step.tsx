"use client";

import { PencilIcon } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { PersonAvatar } from "@/components/foodlek/person";
import { Button } from "@/components/ui/button";
import { BUDGET_MODE_LABELS } from "@/domain/budget/budget";
import { DIET_LABELS } from "@/domain/catalog/diets";
import { ALLERGEN_LABELS } from "@/domain/catalog/types";
import { GOAL_LABELS } from "@/domain/nutrition/config";
import { formatEuros } from "@/lib/format";
import type { HouseholdSetup } from "@/lib/validation/household";
import type { WizardCatalog } from "../types";

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="flex items-start justify-between gap-4 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        <div className="text-foreground">{children}</div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={`Modifier : ${title}`}>
        <PencilIcon data-icon="inline-start" />
        Modifier
      </Button>
    </section>
  );
}

export function RecapStep({ catalog, onEdit }: { catalog: WizardCatalog; onEdit: (stepId: string) => void }) {
  const { control } = useFormContext<HouseholdSetup>();
  const v = useWatch({ control }) as HouseholdSetup;
  const meals = v.schedule.breakfast.length + v.schedule.lunch.length + v.schedule.dinner.length + v.schedule.snack.length;
  const store = catalog.stores.find((s) => s.id === v.storeId);

  return (
    <div className="surface divide-y px-4 sm:px-5">
      <Section title="Foyer" onEdit={() => onEdit("household")}>
        <ul className="flex flex-col gap-2">
          {v.members.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <PersonAvatar name={m.displayName} index={i} className="size-6 text-xs" />
              <span className="font-medium">{m.displayName}</span>
              <span className="text-sm text-muted-foreground">
                {m.profileMode === "detailed" ? "profil détaillé" : "profil simplifié"} · {GOAL_LABELS[m.goal].toLowerCase()}
                {m.diets.length ? ` · ${m.diets.map((d) => DIET_LABELS[d].toLowerCase()).join(", ")}` : ""}
                {m.allergies.length ? ` · allergies : ${m.allergies.map((a) => ALLERGEN_LABELS[a].toLowerCase()).join(", ")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Repas" onEdit={() => onEdit("meals")}>
        {meals} repas par semaine · {v.schedule.dinner.length} dîners, {v.schedule.lunch.length} déjeuners
        {v.schedule.breakfast.length ? `, ${v.schedule.breakfast.length} petits-déjeuners` : ""}
      </Section>
      <Section title="Budget" onEdit={() => onEdit("budget")}>
        {formatEuros(Math.round(v.budgetEuros * 100))} par semaine · {BUDGET_MODE_LABELS[v.budgetMode].label.toLowerCase()}
      </Section>
      <Section title="En cuisine" onEdit={() => onEdit("cooking")}>
        {v.maxWeekdayMinutes} min en semaine, {v.maxWeekendMinutes} min le week-end{v.useLeftovers ? " · restes utilisés" : ""}
      </Section>
      <Section title="Magasin" onEdit={() => onEdit("store")}>
        {store ? store.name : "Aucun pour l'instant (menu sans prix)"}
      </Section>
      <Section title="Placard" onEdit={() => onEdit("pantry")}>
        {v.pantryIngredientIds.length} produit{v.pantryIngredientIds.length > 1 ? "s" : ""} déjà à la maison
      </Section>
    </div>
  );
}
