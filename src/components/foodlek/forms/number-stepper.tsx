"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  label,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  id?: string;
}) {
  return (
    <div className="inline-flex items-center gap-3" role="group" aria-label={label}>
      <Button type="button" variant="outline" size="icon" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Retirer une unité : ${label}`}>
        <MinusIcon />
      </Button>
      <output id={id} aria-live="polite" className="w-8 text-center font-display text-2xl font-semibold tabular">
        {value}
      </output>
      <Button type="button" variant="outline" size="icon" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Ajouter une unité : ${label}`}>
        <PlusIcon />
      </Button>
    </div>
  );
}
