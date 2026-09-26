"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { IngredientPicker } from "@/components/foodlek/forms/ingredient-picker";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { removePantryItemAction, setPantryItemAction } from "@/server/actions/pantry";

export interface PantryRow {
  ingredientId: string;
  name: string;
  unitLabel: string;
  quantity: number | null;
}

function QuantityInput({ row }: { row: PantryRow }) {
  const router = useRouter();
  const [value, setValue] = useState(row.quantity === null ? "" : String(row.quantity));
  const [pending, start] = useTransition();
  function save() {
    const quantity = value.trim() === "" ? null : Number(value.replace(",", "."));
    if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) {
      toast.error("Quantité invalide.");
      return;
    }
    if (quantity === row.quantity) return;
    start(async () => {
      const res = await setPantryItemAction({ ingredientId: row.ingredientId, quantity });
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }
  return (
    <InputGroup className="w-36">
      <InputGroupInput
        inputMode="decimal"
        placeholder="Assez"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        aria-label={`Quantité de ${row.name} (laisser vide pour « j'en ai assez »)`}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{row.unitLabel}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

export function PantryManager({ rows, ingredients }: { rows: PantryRow[]; ingredients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const selected = rows.map((r) => r.ingredientId);

  function add(ids: string[]) {
    const added = ids.filter((id) => !selected.includes(id));
    start(async () => {
      for (const id of added) {
        const res = await setPantryItemAction({ ingredientId: id, quantity: null });
        if (!res.ok) toast.error(res.error);
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await removePantryItemAction({ ingredientId: id });
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2" aria-label="Ajouter au placard">
        <IngredientPicker label="Ajouter un produit" ingredients={ingredients.filter((i) => !selected.includes(i.id))} value={[]} onChange={add} placeholder="Ajouter : riz, œufs, huile…" />
      </section>
      {rows.length === 0 ? (
        <Empty className="surface">
          <EmptyHeader>
            <EmptyTitle>Votre placard est vide</EmptyTitle>
            <EmptyDescription>Ajoutez ce que vous avez déjà : ces produits seront retirés de la liste de courses.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="surface divide-y" aria-busy={pending}>
          {rows.map((r) => (
            <li key={r.ingredientId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 font-medium">{r.name}</span>
              <QuantityInput row={r} />
              <Button variant="ghost" size="icon" aria-label={`Retirer ${r.name}`} onClick={() => remove(r.ingredientId)} disabled={pending}>
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">
        Sans quantité, FOODLEK considère que vous en avez assez pour la semaine. Avec une quantité, seul le manque est ajouté aux courses. Dates limites et scan de code-barres arriveront plus tard.
      </p>
    </div>
  );
}
