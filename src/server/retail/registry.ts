import { openPricesProvider } from "./open-prices";
import { unavailableProvider, type RetailProvider } from "./provider";

/**
 * French retailers and the current state of their integration. See
 * DATA_SOURCES.md for the investigation behind each status. A status only
 * changes to "live" once an access path that is allowed (official or partner
 * API, open data) is implemented — never through scraping.
 */

export type IntegrationStatus = "demo" | "live" | "unavailable" | "planned";

export interface RetailerDefinition {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  integrationStatus: IntegrationStatus;
  notes: string;
  /** Words identifying the retailer's stores in OpenStreetMap names (Open Prices locations). */
  brandWords: string[];
}

const NO_PUBLIC_API =
  "Pas de catalogue en ligne ouvert (les CGU des sites interdisent d'en extraire les prix). Prix réels disponibles : ceux relevés en magasin et publiés sur Open Prices, via « Prix réels de votre enseigne ».";

export const FRENCH_RETAILERS: RetailerDefinition[] = [
  {
    id: "ret_carrefour",
    slug: "carrefour",
    name: "Carrefour",
    website: "https://www.carrefour.fr",
    integrationStatus: "unavailable",
    notes: `${NO_PUBLIC_API} Accès au catalogue complet : portail partenaires developer.fr.carrefour.io ou programme d'affiliation.`,
    brandWords: ["carrefour"],
  },
  { id: "ret_leclerc", slug: "leclerc", name: "E.Leclerc", website: "https://www.e.leclerc", integrationStatus: "unavailable", notes: NO_PUBLIC_API, brandWords: ["leclerc"] },
  { id: "ret_intermarche", slug: "intermarche", name: "Intermarché", website: "https://www.intermarche.com", integrationStatus: "unavailable", notes: NO_PUBLIC_API, brandWords: ["intermarche"] },
  { id: "ret_auchan", slug: "auchan", name: "Auchan", website: "https://www.auchan.fr", integrationStatus: "unavailable", notes: NO_PUBLIC_API, brandWords: ["auchan"] },
  { id: "ret_coursesu", slug: "courses-u", name: "Super U / Courses U", website: "https://www.coursesu.com", integrationStatus: "unavailable", notes: NO_PUBLIC_API, brandWords: ["super u", "hyper u", "u express", "marche u"] },
  { id: "ret_monoprix", slug: "monoprix", name: "Monoprix", website: "https://www.monoprix.fr", integrationStatus: "unavailable", notes: NO_PUBLIC_API, brandWords: ["monoprix"] },
  { id: "ret_lidl", slug: "lidl", name: "Lidl", website: "https://www.lidl.fr", integrationStatus: "unavailable", notes: NO_PUBLIC_API, brandWords: ["lidl"] },
];

export function providerForRetailer(slug: string): RetailProvider {
  const retailer = FRENCH_RETAILERS.find((r) => r.slug === slug);
  return unavailableProvider(
    { id: slug, label: retailer?.name ?? slug, access: "Aucun accès autorisé à ce jour", license: null },
    retailer?.notes ?? NO_PUBLIC_API,
  );
}

export function openPrices(options: { enabled: boolean; contact: string | undefined }): RetailProvider {
  return openPricesProvider({
    enabled: options.enabled,
    userAgent: `FOODLEK/0.1 (${options.contact || "contact non configuré"})`,
  });
}
