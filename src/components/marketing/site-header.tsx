import Link from "next/link";
import { BrandMark } from "@/components/foodlek/brand";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <BrandMark />
        <nav aria-label="Navigation du site" className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link href="/#fonctionnement" className="hover:text-foreground">
            Fonctionnement
          </Link>
          <Link href="/recettes" className="hover:text-foreground">
            Recettes
          </Link>
          <Link href="/guides/budget-courses" className="hover:text-foreground">
            Guides
          </Link>
          <Link href="/#faq" className="hover:text-foreground">
            FAQ
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Créer ma semaine</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
