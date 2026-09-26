"use client";

import { DATA_QUALITY_EXPLANATIONS, DATA_QUALITY_LABELS, type DataQuality } from "@/domain/common/data-quality";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const STYLES: Record<DataQuality, string> = {
  VERIFIED: "border-quality-verified/30 text-quality-verified bg-basil-soft",
  LIVE: "border-quality-live/30 text-quality-live bg-basil-soft",
  RECENT: "border-quality-recent/30 text-quality-recent bg-accent",
  ESTIMATED: "border-saffron text-saffron-ink bg-saffron-soft",
  DEMO: "border-dashed border-quality-demo/60 text-quality-demo bg-muted",
  MISSING: "border-border text-quality-missing bg-muted",
};

/**
 * Every figure that depends on external data carries this badge. It opens on
 * tap as well as click, so the explanation is reachable on phones.
 */
export function QualityBadge({
  quality,
  detail,
  className,
}: {
  quality: DataQuality;
  /** Extra sentence explaining this particular figure. */
  detail?: string;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-5 shrink-0 cursor-help items-center rounded-full border px-2 text-[0.6875rem] font-semibold tracking-wide uppercase transition-colors hover:brightness-95",
            STYLES[quality],
            className,
          )}
          aria-label={`Qualité de la donnée : ${DATA_QUALITY_LABELS[quality]}. Afficher l'explication`}
        >
          {DATA_QUALITY_LABELS[quality]}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" align="start">
        <p className="font-medium">{DATA_QUALITY_LABELS[quality]}</p>
        <p className="mt-1 text-muted-foreground">{DATA_QUALITY_EXPLANATIONS[quality]}</p>
        {detail ? <p className="mt-2 text-muted-foreground">{detail}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
