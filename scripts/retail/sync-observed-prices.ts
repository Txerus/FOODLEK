/**
 * Real prices of a retailer around a city, from Open Prices (prices paid in
 * store and published by Open Food Facts contributors, ODbL).
 *
 *   pnpm prix:enseigne --enseigne carrefour --ville Annecy
 *   pnpm prix:enseigne --enseigne leclerc --ville Lyon --rayon 20 --jours 120
 *
 * Creates (or refreshes) the store "Carrefour — prix observés autour
 * d'Annecy", selectable in FOODLEK. Needs internet access to
 * prices.openfoodfacts.org. OPEN_DATA_CONTACT (e-mail) is sent in the
 * User-Agent, as Open Food Facts asks.
 */
import "../env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { INGREDIENT_SEEDS, ingredientId } from "../../src/data/ingredients";
import * as t from "../../src/server/db/schema";
import { ObservedSyncError, syncObservedPrices } from "../../src/server/retail/observed-sync";
import { FRENCH_RETAILERS } from "../../src/server/retail/registry";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
}

async function main() {
  const retailerSlug = arg("enseigne", "carrefour") as string;
  const city = arg("ville");
  if (!city) {
    process.stderr.write(
      `Usage : pnpm prix:enseigne --enseigne <${FRENCH_RETAILERS.map((r) => r.slug).join("|")}> --ville <ville> [--rayon 30] [--jours 180]\n`,
    );
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (fichier .env).");
  const client = postgres(url, { max: 1 });
  const database = drizzle(client, { schema: t, casing: "snake_case" });
  try {
    const result = await syncObservedPrices(
      database,
      INGREDIENT_SEEDS.map((s) => ({
        id: ingredientId(s.slug),
        slug: s.slug,
        name: s.name,
        purchaseUnit: s.purchaseUnit,
        measures: s.measures,
      })),
      {
        retailerSlug,
        city,
        radiusKm: Number(arg("rayon", "30")),
        maxAgeDays: Number(arg("jours", "180")),
        userAgent: `FOODLEK/0.1 (${process.env.OPEN_DATA_CONTACT || "usage personnel"})`,
        onProgress: (m) => process.stdout.write(`${m}\n`),
      },
    );
    process.stdout.write(
      `\n${result.storeName}\n${result.priceCount} prix enregistrés pour ${result.priced.length} ingrédients, ${result.imagesAdded} photo(s) de produit ajoutée(s).\n` +
        (result.missing.length
          ? `Sans prix observé (${result.missing.length}) : ${result.missing.join(", ")}\n(la liste de courses utilisera un prix d'un autre magasin, sinon le prix fictif de démonstration, signalés comme tels)\n`
          : "") +
        `\nChoisissez ce magasin dans FOODLEK (Magasins et prix), puis régénérez la semaine.\n`,
    );
  } catch (e) {
    process.stderr.write(`${e instanceof ObservedSyncError ? e.message : e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
