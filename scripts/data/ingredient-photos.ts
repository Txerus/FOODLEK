/**
 * Finds a generic photo for each ingredient on Pexels (free licence, free API
 * key: https://www.pexels.com/api/). The shopping list shows it when the
 * product bought has no photo of its own (loose produce, demo products,
 * prices typed in by the household), labelled as an illustration.
 *
 *   pnpm photos:ingredients            # ingredients without a photo
 *   pnpm photos:ingredients --force    # search again for every ingredient
 *
 * Needs PEXELS_API_KEY in .env and internet access.
 */
import "../env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { INGREDIENT_PHOTO_QUERIES } from "../../src/data/ingredient-photo-queries";
import { pickIngredientPhoto, searchPexels } from "../../src/server/data/pexels";
import * as t from "../../src/server/db/schema";

async function main() {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    process.stderr.write(
      "PEXELS_API_KEY manquant : créez une clé gratuite sur https://www.pexels.com/api/ puis ajoutez-la dans .env\n",
    );
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (fichier .env).");
  const client = postgres(url, { max: 1 });
  const database = drizzle(client, { schema: t, casing: "snake_case" });
  try {
    const rows = await database
      .select({ id: t.ingredients.id, slug: t.ingredients.slug, name: t.ingredients.name, imageUrl: t.ingredients.imageUrl })
      .from(t.ingredients);
    let found = 0;
    for (const row of rows) {
      if (row.imageUrl && !force) continue;
      const photo = pickIngredientPhoto(await searchPexels(INGREDIENT_PHOTO_QUERIES[row.slug] ?? row.name, apiKey));
      if (photo) {
        await database
          .update(t.ingredients)
          .set({ imageUrl: photo.url, imageCredit: photo.credit, imageSourceUrl: photo.sourceUrl })
          .where(eq(t.ingredients.id, row.id));
        found++;
      }
      process.stdout.write(`${row.name} : ${photo ? "photo trouvée" : "aucune photo"}\n`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    process.stdout.write(`\n${found} photo(s) d'ingrédient enregistrée(s).\n`);
  } catch (e) {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
