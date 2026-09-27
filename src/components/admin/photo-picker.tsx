"use client";

import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chooseRecipePhotoAction } from "@/server/actions/admin";

export interface PickerCandidate {
  src: string;
  alt: string;
  credit: string;
  sourceUrl: string;
}

export function PhotoPicker({ recipeId, current, candidates }: { recipeId: string; current: string | null; candidates: PickerCandidate[] }) {
  const [pending, start] = useTransition();
  const choose = (src: string | null) =>
    start(async () => {
      const res = await chooseRecipePhotoAction({ recipeId, src });
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message ?? "Enregistré.");
    });
  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {candidates.map((c) => {
          const selected = c.src === current;
          return (
            <li key={c.src}>
              <button
                type="button"
                disabled={pending}
                onClick={() => choose(c.src)}
                aria-pressed={selected}
                aria-label={`Choisir : ${c.alt} (${c.credit})`}
                className={cn(
                  "relative block aspect-[4/3] w-full overflow-hidden rounded-lg border-2 transition-colors",
                  selected ? "border-primary" : "border-transparent hover:border-muted-foreground/40",
                )}
              >
                <Image src={c.src} alt={c.alt} fill sizes="(min-width: 640px) 25vw, 50vw" className="object-cover" />
                {selected ? (
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-primary p-1 text-primary-foreground">
                    <CheckIcon aria-hidden className="size-3.5" />
                  </span>
                ) : null}
              </button>
              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-muted-foreground hover:underline">
                {c.credit}
              </a>
            </li>
          );
        })}
      </ul>
      {current ? (
        <Button type="button" variant="ghost" size="sm" className="self-start" disabled={pending} onClick={() => choose(null)}>
          Utiliser l'illustration à la place
        </Button>
      ) : null}
    </div>
  );
}
