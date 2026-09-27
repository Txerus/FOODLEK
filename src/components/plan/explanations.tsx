"use client";

import { ChevronDownIcon, LightbulbIcon } from "lucide-react";
import { useState } from "react";
import type { Explanation } from "@/domain/planning/explain";

/** Shown after the first three reasons, on request: a long list buries the menu on a phone. */
const VISIBLE = 3;

export function Explanations({ items, title = "Pourquoi ce menu" }: { items: Explanation[]; title?: string }) {
  const [all, setAll] = useState(false);
  if (items.length === 0) return null;
  const shown = all ? items : items.slice(0, VISIBLE);
  return (
    <section aria-labelledby="why-title" className="flex flex-col gap-3">
      <h2 id="why-title" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <LightbulbIcon aria-hidden className="size-4" />
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {shown.map((e, i) => (
          <li key={i} className="border-l-2 border-accent pl-3 text-sm text-pretty">
            {e.text}
          </li>
        ))}
      </ul>
      {items.length > VISIBLE ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {all ? "Afficher moins" : `Voir les ${items.length - VISIBLE} autres raisons`}
          <ChevronDownIcon aria-hidden className={`size-4 transition-transform ${all ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </section>
  );
}
