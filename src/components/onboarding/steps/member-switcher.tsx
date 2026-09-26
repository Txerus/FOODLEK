"use client";

import { useWatch, useFormContext } from "react-hook-form";
import { PersonAvatar } from "@/components/foodlek/person";
import { cn } from "@/lib/utils";
import type { HouseholdSetup } from "@/lib/validation/household";

/** Tabs to move between household members inside a step. */
export function MemberSwitcher({ active, onChange, invalid }: { active: number; onChange: (i: number) => void; invalid?: Set<number> }) {
  const { control } = useFormContext<HouseholdSetup>();
  const members = useWatch({ control, name: "members" });
  if (members.length <= 1) return null;
  return (
    <div role="tablist" aria-label="Personnes du foyer" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {members.map((m, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === active}
          onClick={() => onChange(i)}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-sm font-medium transition-colors",
            i === active ? "border-foreground/20 bg-card shadow-soft" : "border-transparent text-muted-foreground hover:bg-muted",
            invalid?.has(i) && "border-destructive/60",
          )}
        >
          <PersonAvatar name={m.displayName || "?"} index={i} className="size-7 text-xs" />
          {m.displayName || `Personne ${i + 1}`}
          {invalid?.has(i) ? <span className="sr-only"> (à compléter)</span> : null}
        </button>
      ))}
    </div>
  );
}
