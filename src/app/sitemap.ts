import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/guides";
import { siteConfig } from "@/lib/site";
import { getCatalog } from "@/server/services/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const staticPages = ["", "/recettes", "/guides", "/sources", "/confidentialite"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const }));
  const guides = GUIDES.map((g) => ({ url: `${base}/guides/${g.slug}`, changeFrequency: "monthly" as const }));
  let recipes: MetadataRoute.Sitemap = [];
  try {
    recipes = (await getCatalog()).recipes.map((r) => ({ url: `${base}/recettes/${r.slug}`, changeFrequency: "monthly" as const }));
  } catch {
    // Without a database (e.g. at build time) the sitemap still lists static pages.
  }
  return [...staticPages, ...guides, ...recipes];
}
