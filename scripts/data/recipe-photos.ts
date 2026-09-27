/**
 * Finds professional photos for the recipes on Pexels (free licence, free API
 * key: https://www.pexels.com/api/) and stores up to 8 candidates per recipe.
 * The first one is used until an admin chooses another in the back-office
 * (Admin → Photos des recettes).
 *
 *   pnpm photos:recettes            # recipes without a photo
 *   pnpm photos:recettes --force    # search again for every recipe
 *
 * Needs PEXELS_API_KEY in .env and internet access.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { RECIPE_PHOTO_QUERIES } from "../../src/data/recipe-photo-queries";
import { searchPexels, toCandidates } from "../../src/server/data/pexels";
import * as t from "../../src/server/db/schema";

async function main() {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    process.stderr.write("PEXELS_API_KEY manquant : créez une clé gratuite sur https://www.pexels.com/api/ puis ajoutez-la dans .env\n");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (fichier .env).");
  const client = postgres(url, { max: 1 });
  const database = drizzle(client, { schema: t, casing: "snake_case" });
  try {
    const recipes = await database.select({ id: t.recipes.id, slug: t.recipes.slug, title: t.recipes.title, imageUrl: t.recipes.imageUrl }).from(t.recipes);
    let updated = 0;
    for (const r of recipes) {
      if (r.imageUrl && !force) continue;
      const query = RECIPE_PHOTO_QUERIES[r.slug] ?? r.title;
      const candidates = toCandidates(await searchPexels(query, apiKey), r.title);
      const first = candidates[0];
      await database
        .update(t.recipes)
        .set({
          imageCandidates: candidates,
          ...(first && (!r.imageUrl || force) ? { imageUrl: first.src, imageCredit: first.credit, imageSourceUrl: first.sourceUrl } : {}),
        })
        .where(eq(t.recipes.id, r.id));
      process.stdout.write(`${r.title} : ${candidates.length} photo(s)\n`);
      updated++;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    process.stdout.write(`\n${updated} recette(s) traitée(s). Vérifiez et changez les photos dans Admin → Photos des recettes.\n`);
  } catch (e) {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
