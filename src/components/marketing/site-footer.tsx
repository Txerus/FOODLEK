import Link from "next/link";
import { BrandMark } from "@/components/foodlek/brand";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { href: "/#fonctionnement", label: "Fonctionnement" },
      { href: "/#budget", label: "Budget" },
      { href: "/#anti-gaspillage", label: "Anti-gaspillage" },
      { href: "/signup", label: "Créer ma semaine" },
    ],
  },
  {
    title: "Recettes et guides",
    links: [
      { href: "/recettes", label: "Toutes les recettes" },
      { href: "/guides/budget-courses", label: "Tenir un budget courses" },
      { href: "/guides/meal-prep", label: "Cuisiner à l'avance" },
      { href: "/guides", label: "Tous les guides" },
    ],
  },
  {
    title: "Transparence",
    links: [
      { href: "/sources", label: "Sources des données" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <BrandMark />
          <p className="max-w-xs text-sm text-muted-foreground">
            Repas, nutrition et courses optimisés ensemble, pour tout le foyer.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-2 text-sm">
            <p className="font-semibold">{c.title}</p>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        <p>
          Les estimations nutritionnelles de FOODLEK sont générales et ne remplacent pas l'avis d'un professionnel de santé. Valeurs nutritionnelles : USDA FoodData Central (domaine public) ; ANSES-Ciqual et Open Food Facts selon disponibilité.
        </p>
      </div>
    </footer>
  );
}
