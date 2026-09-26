"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { ChoiceCards } from "@/components/foodlek/forms/choice-cards";
import { SingleChips } from "@/components/foodlek/forms/choice-chips";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { HouseholdSetup } from "@/lib/validation/household";
import type { WizardCatalog } from "../types";

export function StoreStep({ catalog }: { catalog: WizardCatalog }) {
  const { control, setValue } = useFormContext<HouseholdSetup>();
  const v = useWatch({ control });
  const options = [
    ...catalog.stores.map((s) => ({
      value: s.id,
      label: s.isDemo ? `${s.name}` : `${s.retailerName} — ${s.name}`,
      description: s.isDemo
        ? "Enseigne fictive : prix de démonstration pour essayer FOODLEK, sans lien avec un magasin réel."
        : (s.city ?? undefined),
    })),
    { value: "none", label: "Choisir plus tard", description: "Le menu sera calculé sans prix." },
  ];

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">Magasin</FieldLegend>
        <ChoiceCards
          label="Magasin"
          value={v.storeId ?? "none"}
          onChange={(x) => setValue("storeId", x === "none" ? null : x, { shouldDirty: true })}
          options={options}
        />
        <details className="group rounded-xl border border-dashed p-3.5 text-sm">
          <summary className="cursor-pointer font-medium">Et Carrefour, Leclerc, Intermarché… ?</summary>
          <p className="mt-2 text-muted-foreground">
            Aucune de ces enseignes ne propose aujourd'hui d'accès public à son catalogue et à ses prix. FOODLEK ne récupère pas ces données sans autorisation : ces magasins seront ajoutés dès qu'un accès officiel ou partenaire sera en place.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {catalog.retailers.map((r) => (
              <li key={r.name}>
                <Badge variant="outline">{r.name} · bientôt</Badge>
              </li>
            ))}
          </ul>
        </details>
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">Produits bio</FieldLegend>
        <SingleChips
          label="Produits bio"
          value={v.organic ?? "indifferent"}
          onChange={(x) => setValue("organic", x, { shouldDirty: true })}
          options={[
            { value: "indifferent", label: "Indifférent" },
            { value: "prefer", label: "De préférence bio" },
          ]}
        />
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">Marques distributeur</FieldLegend>
        <SingleChips
          label="Marques distributeur"
          value={v.storeBrand ?? "indifferent"}
          onChange={(x) => setValue("storeBrand", x, { shouldDirty: true })}
          options={[
            { value: "prefer", label: "Je les privilégie" },
            { value: "indifferent", label: "Indifférent" },
            { value: "avoid", label: "Je les évite" },
          ]}
        />
      </FieldSet>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="promos">Profiter des promotions</FieldLabel>
          <FieldDescription>Uniquement les promotions réellement indiquées par la source de prix.</FieldDescription>
        </FieldContent>
        <Switch id="promos" checked={v.acceptPromotions ?? true} onCheckedChange={(x) => setValue("acceptPromotions", x, { shouldDirty: true })} />
      </Field>
    </FieldGroup>
  );
}
