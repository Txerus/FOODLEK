"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export interface PickableIngredient {
  id: string;
  name: string;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Search-and-pick list of ingredients, with removable chips for the selection. */
export function IngredientPicker({
  ingredients,
  value,
  onChange,
  label,
  placeholder = "Rechercher un aliment…",
}: {
  ingredients: readonly PickableIngredient[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  label: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    // Names starting with the query first ("ri" → Riz…), then a word starting with it, then anywhere.
    const rank = (name: string) => (name.startsWith(q) ? 0 : name.split(/[\s'’-]+/).some((w) => w.startsWith(q)) ? 1 : 2);
    return ingredients
      .filter((i) => !value.includes(i.id) && normalize(i.name).includes(q))
      .map((i) => ({ i, r: rank(normalize(i.name)) }))
      .sort((a, b) => a.r - b.r || a.i.name.localeCompare(b.i.name, "fr"))
      .slice(0, 8)
      .map(({ i }) => i);
  }, [ingredients, query, value]);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} : sélection`}>
          {value.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-accent pr-2 pl-3 text-sm text-accent-foreground hover:bg-accent/70"
                aria-label={`Retirer ${byId.get(id)?.name ?? id}`}
              >
                {byId.get(id)?.name ?? id}
                <XIcon aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-controls={listId}
          aria-describedby={matches.length > 0 ? `${listId}-hint` : undefined}
          autoComplete="off"
          onKeyDown={(e) => {
            // Enter adds the first suggestion (and never submits the surrounding form).
            if (e.key !== "Enter") return;
            e.preventDefault();
            const first = matches[0];
            if (!first) return;
            onChange([...value, first.id]);
            setQuery("");
          }}
        />
      </InputGroup>
      {matches.length > 0 ? (
        <p id={`${listId}-hint`} className="-mb-1 text-xs text-muted-foreground">
          Entrée : ajouter « {matches[0].name} »
        </p>
      ) : null}
      {matches.length > 0 ? (
        <ul id={listId} className="flex flex-wrap gap-2" aria-label="Suggestions">
          {matches.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, i.id]);
                  setQuery("");
                }}
                className="inline-flex h-8 items-center rounded-full border border-dashed border-input px-3 text-sm hover:border-primary/50 hover:bg-accent/50"
              >
                + {i.name}
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim() ? (
        <p className="text-sm text-muted-foreground">Aucun aliment ne correspond.</p>
      ) : null}
    </div>
  );
}
