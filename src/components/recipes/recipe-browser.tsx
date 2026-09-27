"use client";

import { ClockIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { SingleChips } from "@/components/foodlek/forms/choice-chips";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "@/components/foodlek/quality-badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { DataQuality } from "@/domain/common/data-quality";
import { formatEuros, formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface RecipeListItem {
  slug: string;
  title: string;
  description: string;
  minutes: number;
  kcal: number;
  protein: number;
  costCents: number | null;
  costQuality: DataQuality;
  vegetarian: boolean;
  fish: boolean;
  tags: string[];
  mealTypes: string[];
  eligible: boolean;
  ineligibleReason: string | null;
  /** Photo or illustration, rendered on the server. */
  visual?: ReactNode;
}

type Filter = "all" | "main" | "quick" | "vegetarian" | "fish" | "protein" | "cheap" | "breakfast" | "dessert" | "snack";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "main", label: "Plats" },
  { value: "quick", label: "Moins de 30 min" },
  { value: "vegetarian", label: "Végétariennes" },
  { value: "fish", label: "Poisson" },
  { value: "protein", label: "Protéinées" },
  { value: "cheap", label: "Économiques" },
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "dessert", label: "Desserts" },
  { value: "snack", label: "Goûters" },
];

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const PAGE_SIZE = 24;

export function RecipeBrowser({ items }: { items: RecipeListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // 159 cards at once make a very long page on a phone: show them by pages of 24.
  const [shown, setShown] = useState(PAGE_SIZE);
  const cheapThreshold = useMemo(() => {
    const costs = items.map((i) => i.costCents).filter((c): c is number => c !== null).sort((a, b) => a - b);
    return costs.length ? costs[Math.floor(costs.length / 3)] : null;
  }, [items]);

  const visible = items.filter((i) => {
    if (query && !normalize(`${i.title} ${i.description}`).includes(normalize(query))) return false;
    switch (filter) {
      case "quick":
        return i.minutes < 30;
      case "vegetarian":
        return i.vegetarian;
      case "fish":
        return i.fish;
      case "protein":
        return i.protein >= 35;
      case "cheap":
        return cheapThreshold !== null && i.costCents !== null && i.costCents <= cheapThreshold;
      case "breakfast":
        return i.mealTypes.includes("breakfast");
      case "main":
        return i.mealTypes.includes("lunch") || i.mealTypes.includes("dinner");
      case "dessert":
        return i.tags.includes("dessert");
      case "snack":
        // Every "dessert ou goûter" recipe that is not a dessert is a goûter.
        return i.tags.includes("collation") || (i.mealTypes.includes("snack") && !i.tags.includes("dessert"));
      default:
        return true;
    }
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE_SIZE);
            }} placeholder="Rechercher une recette" aria-label="Rechercher une recette" />
        </InputGroup>
        <SingleChips
          label="Filtrer les recettes"
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setShown(PAGE_SIZE);
          }}
          options={FILTERS}
        />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {visible.length} recette{visible.length > 1 ? "s" : ""}
      </p>
      {visible.length === 0 ? (
        <Empty className="surface">
          <EmptyHeader>
            <EmptyTitle>Aucune recette ne correspond</EmptyTitle>
            <EmptyDescription>Essayez un autre filtre ou un autre mot.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.slice(0, shown).map((i) => (
            <li key={i.slug}>
              <Link
                href={`/recipes/${i.slug}`}
                className={cn(
                  "surface group flex h-full flex-col gap-3 p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift",
                  !i.eligible && "opacity-70",
                )}
              >
                {i.visual ? <div className="-mx-4 -mt-4 overflow-hidden rounded-t-xl">{i.visual}</div> : null}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ClockIcon aria-hidden className="size-3.5" />
                  {formatMinutes(i.minutes)}
                  {i.vegetarian ? <span className="rounded-full bg-basil-soft px-2 py-0.5 text-accent-foreground">Végétarien</span> : null}
                </div>
                <h2 className="font-semibold leading-snug text-balance group-hover:underline group-hover:underline-offset-4">{i.title}</h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">{i.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="tabular">{Math.round(i.kcal)} kcal</span>
                  <span className="tabular">{Math.round(i.protein)} g prot.</span>
                  <span className="text-muted-foreground/70">par portion standard</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
                  {i.costCents !== null ? (
                    <span>
                      ≈ <strong className="tabular">{formatEuros(i.costCents)}</strong> / portion
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Prix indisponible</span>
                  )}
                  <QualityBadge quality={i.costQuality} detail="Coût approximatif : valeur au prix unitaire des ingrédients utilisés." />
                </div>
                {!i.eligible && i.ineligibleReason ? <p className="text-xs text-paprika">Non proposée : {i.ineligibleReason}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {visible.length > shown ? (
        <Button type="button" variant="outline" className="self-center" onClick={() => setShown((n) => n + PAGE_SIZE)}>
          Afficher plus de recettes ({visible.length - shown} restantes)
        </Button>
      ) : null}
    </div>
  );
}
