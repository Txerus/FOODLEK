import { z } from "zod";
import type { RecipePhotoCandidate } from "../db/schema";

/**
 * Pexels photo search (free API key: https://www.pexels.com/api/). Pexels
 * photos may be used for free, including commercially, without attribution
 * being mandatory; FOODLEK still credits the photographer and links to
 * Pexels, as the API guidelines ask.
 */

const photoSchema = z.object({
  id: z.number(),
  width: z.number(),
  height: z.number(),
  url: z.string().url(),
  photographer: z.string(),
  alt: z.string().nullable().optional(),
  src: z.object({ large2x: z.string().url(), large: z.string().url() }),
});

export const pexelsSearchSchema = z.object({ photos: z.array(photoSchema) });

export function toCandidates(json: unknown, fallbackAlt: string): RecipePhotoCandidate[] {
  return pexelsSearchSchema
    .parse(json)
    .photos.filter((p) => p.width >= 1200 && p.width > p.height && new URL(p.src.large2x).hostname === "images.pexels.com")
    .map((p) => ({
      src: p.src.large2x,
      alt: p.alt?.trim() || fallbackAlt,
      credit: `Photo : ${p.photographer} / Pexels`,
      sourceUrl: p.url,
      width: p.width,
      height: p.height,
    }));
}

export async function searchPexels(query: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const params = new URLSearchParams({ query, orientation: "landscape", size: "large", per_page: "8" });
  const res = await fetchImpl(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401 || res.status === 403) throw new Error("Clé Pexels refusée : vérifiez PEXELS_API_KEY.");
  if (res.status === 429) throw new Error("Limite de requêtes Pexels atteinte : réessayez dans une heure.");
  if (!res.ok) throw new Error(`Pexels a répondu ${res.status}.`);
  return res.json();
}

export interface IngredientPhoto {
  url: string;
  credit: string;
  sourceUrl: string;
}

/**
 * First usable photo of a search, at a size fit for a thumbnail. Used as the
 * generic picture of an ingredient, never as the photo of a product.
 */
export function pickIngredientPhoto(json: unknown): IngredientPhoto | null {
  const photo = pexelsSearchSchema.parse(json).photos.find((p) => new URL(p.src.large).hostname === "images.pexels.com");
  return photo ? { url: photo.src.large, credit: `Photo : ${photo.photographer} / Pexels`, sourceUrl: photo.url } : null;
}
