import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("font-display inline-flex items-baseline gap-0.5 text-xl font-semibold tracking-tight text-foreground", className)}
      aria-label="FOODLEK, accueil"
    >
      <span>foodlek</span>
      <span aria-hidden className="size-1.5 translate-y-[-0.1em] rounded-full bg-paprika" />
    </Link>
  );
}
