/**
 * Links to a retailer's own product search, used by the shopping list. This is
 * a plain link opened by the user in their browser: no data is read from the
 * retailer's site. Placing the order stays on the retailer's site (a direct
 * basket transfer, like Jow's, requires a commercial partnership).
 *
 * The URL formats come from each site's public search page and may change;
 * check them in a browser when a retailer updates its site.
 */
export interface RetailerLink {
  slug: string;
  name: string;
  search: (query: string) => string;
}

const q = (s: string) => encodeURIComponent(s);

export const RETAILER_LINKS: RetailerLink[] = [
  { slug: "carrefour", name: "Carrefour", search: (s) => `https://www.carrefour.fr/s?q=${q(s)}` },
  { slug: "leclerc", name: "E.Leclerc", search: (s) => `https://www.e.leclerc/recherche?q=${q(s)}` },
  { slug: "intermarche", name: "Intermarché", search: (s) => `https://www.intermarche.com/recherche/${q(s)}` },
  { slug: "auchan", name: "Auchan", search: (s) => `https://www.auchan.fr/recherche?text=${q(s)}` },
  { slug: "courses-u", name: "Courses U", search: (s) => `https://www.coursesu.com/recherche?q=${q(s)}` },
  { slug: "monoprix", name: "Monoprix", search: (s) => `https://courses.monoprix.fr/search?q=${q(s)}` },
];

export function retailerLink(slug: string | null | undefined): RetailerLink | null {
  return RETAILER_LINKS.find((r) => r.slug === slug) ?? null;
}

/** Search query for an ingredient: its name without parenthesised precisions. */
export function searchQueryFor(ingredientName: string): string {
  return ingredientName.replace(/\s*\([^)]*\)/g, "").trim();
}
