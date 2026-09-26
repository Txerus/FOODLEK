"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export interface CardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/** Single choice presented as selectable cards (radio semantics, arrow-key navigation). */
export function ChoiceCards<T extends string>({
  options,
  value,
  onChange,
  label,
  columns = 1,
  className,
}: {
  options: readonly CardOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      value={value ?? undefined}
      onValueChange={(v) => onChange(v as T)}
      className={cn(
        "grid gap-2",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {options.map((o) => (
        <RadioGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className="group flex items-start gap-3 rounded-xl border border-input bg-card p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:border-primary data-[state=checked]:bg-basil-soft data-[state=checked]:shadow-[inset_0_0_0_1px_var(--primary)]"
        >
          <span
            aria-hidden
            className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card group-data-[state=checked]:border-primary"
          >
            <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-primary" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{o.label}</span>
            {o.description ? <span className="text-sm text-muted-foreground">{o.description}</span> : null}
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
