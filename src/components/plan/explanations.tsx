import { LightbulbIcon } from "lucide-react";
import type { Explanation } from "@/domain/planning/explain";

export function Explanations({ items, title = "Pourquoi ce menu" }: { items: Explanation[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="why-title" className="flex flex-col gap-3">
      <h2 id="why-title" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <LightbulbIcon aria-hidden className="size-4" />
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((e, i) => (
          <li key={i} className="border-l-2 border-accent pl-3 text-sm text-pretty">
            {e.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
