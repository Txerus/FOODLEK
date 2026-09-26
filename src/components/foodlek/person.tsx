import { cn } from "@/lib/utils";

const PERSON_BG = ["bg-person-1", "bg-person-2", "bg-person-3", "bg-person-4"] as const;
const PERSON_TEXT = ["text-person-1", "text-person-2", "text-person-3", "text-person-4"] as const;

export function personColor(index: number) {
  return { bg: PERSON_BG[index % PERSON_BG.length], text: PERSON_TEXT[index % PERSON_TEXT.length] };
}

export function PersonDot({ index, className }: { index: number; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", personColor(index).bg, className)} />;
}

export function PersonAvatar({ name, index, className }: { name: string; index: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
        personColor(index).bg,
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
