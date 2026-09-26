"use client";

import { CheckIcon } from "lucide-react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

const chipClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-input bg-card px-3.5 text-sm font-medium transition-[background-color,border-color,color] duration-150 hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=on]:border-primary/40 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground disabled:opacity-50";

/** Multiple choice as wrapping pills (accessible toggle buttons). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="multiple"
      aria-label={label}
      value={[...value]}
      onValueChange={(v) => onChange(v as T[])}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item key={o.value} value={o.value} className={chipClass}>
          {value.includes(o.value) ? <CheckIcon aria-hidden className="size-3.5" /> : null}
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

/** Single choice as pills (for short option sets like "20 min / 30 min / 45 min"). */
export function SingleChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T);
      }}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item key={o.value} value={o.value} className={chipClass}>
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
