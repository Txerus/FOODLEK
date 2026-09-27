"use client";

import {
  CalendarDaysIcon,
  ChefHatIcon,
  EllipsisIcon,
  HouseIcon,
  ShoppingBasketIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/foodlek/brand";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/dashboard", label: "Accueil", icon: HouseIcon },
  { href: "/planning", label: "Semaine", icon: CalendarDaysIcon },
  { href: "/shopping", label: "Courses", icon: ShoppingBasketIcon },
  { href: "/recipes", label: "Recettes", icon: ChefHatIcon },
  { href: "/pantry", label: "Placard", icon: WarehouseIcon },
] as const;

const SECONDARY = [
  { href: "/household", label: "Mon foyer", description: "Personnes, repas, budget, magasin" },
  { href: "/nutrition", label: "Nutrition", description: "Besoins estimés et méthode de calcul" },
  { href: "/stores", label: "Magasins et prix", description: "Sources des prix et enseignes" },
  { href: "/settings", label: "Compte et données", description: "Mot de passe, export, suppression" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop / tablet top bar */}
      <header className="sticky top-0 z-30 hidden border-b bg-background/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <BrandMark href="/dashboard" />
          <nav aria-label="Navigation principale" className="flex items-center gap-1">
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive(pathname, item.href) && "bg-accent text-accent-foreground hover:bg-accent",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {SECONDARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "hidden rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground lg:inline-flex",
                  isActive(pathname, item.href) && "text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Sheet>
              <SheetTrigger className="inline-flex items-center rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted lg:hidden">
                Plus
              </SheetTrigger>
              <MoreSheet userName={userName} onNavigate={() => undefined} />
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/90 px-4 backdrop-blur md:hidden">
        <BrandMark href="/dashboard" />
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Onglets principaux"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY.slice(0, 4).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground",
                    active && "text-primary",
                  )}
                >
                  <item.icon aria-hidden className={cn("size-5", active && "stroke-[2.25]")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground">
                <EllipsisIcon aria-hidden className="size-5" />
                Plus
              </SheetTrigger>
              <MoreSheet userName={userName} onNavigate={() => setOpen(false)} side="bottom" />
            </Sheet>
          </li>
        </ul>
      </nav>
    </>
  );
}

function MoreSheet({ userName, onNavigate, side = "right" }: { userName: string; onNavigate: () => void; side?: "right" | "bottom" }) {
  return (
    <SheetContent side={side} className={cn(side === "bottom" && "rounded-t-2xl")}>
      <SheetHeader>
        <SheetTitle>Bonjour {userName}</SheetTitle>
        <SheetDescription>Réglages du foyer et de votre compte</SheetDescription>
      </SheetHeader>
      <nav aria-label="Menu secondaire" className="px-4 pb-6">
        <ul className="flex flex-col">
          {[...PRIMARY.slice(4), ...SECONDARY].map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={onNavigate} className="flex flex-col rounded-lg px-3 py-3 hover:bg-muted">
                <span className="font-medium">{item.label}</span>
                {"description" in item ? <span className="text-sm text-muted-foreground">{item.description}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </SheetContent>
  );
}
