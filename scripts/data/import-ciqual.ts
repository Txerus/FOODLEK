/**
 * Imports the ANSES-Ciqual 2025 table (Licence Ouverte / Etalab 2.0).
 *
 *   pnpm data:ciqual              # downloads the XML files from Recherche Data Gouv
 *   pnpm data:ciqual --local DIR  # uses alim_*.xml and compo_*.xml already downloaded
 *   pnpm data:ciqual --suggest    # also writes data/reference/ciqual-suggestions.json
 *
 * Every food is stored in food_compositions with source CIQUAL and the table
 * version. Ingredients are re-linked only when data/reference/ciqual-mapping.json
 * gives a code AND the exact Ciqual name checked by a person, and the table
 * still has that name for that code. --suggest lists, for each ingredient, the
 * closest Ciqual foods to check: nothing is linked from suggestions.
 */
import "../env";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import mapping from "../../data/reference/ciqual-mapping.json";
import { INGREDIENT_SEEDS, ingredientId } from "../../src/data/ingredients";
import { decodeXml, mappingMatches, parseAlim, parseCompo, suggestCiqualMatches, type CiqualMappingEntry } from "../../src/server/data/ciqual";
import * as t from "../../src/server/db/schema";

const VERSION = "Ciqual 2025 (2025-11-03)";
const LICENSE = "Licence Ouverte / Etalab 2.0 — ANSES-Ciqual";
// Distribution files on Recherche Data Gouv (DOI 10.57745/RDMHWY).
const FILES = {
  alim: "https://entrepot.recherche.data.gouv.fr/api/access/datafile/666252",
  compo: "https://entrepot.recherche.data.gouv.fr/api/access/datafile/666249",
};

async function load(kind: "alim" | "compo", localDir: string | null): Promise<Uint8Array> {
  if (localDir) {
    const file = (await readdir(localDir)).find((f) => f.startsWith(`${kind}_`) && f.endsWith(".xml"));
    if (!file) throw new Error(`Fichier ${kind}_*.xml introuvable dans ${localDir}`);
    return new Uint8Array(await readFile(path.join(localDir, file)));
  }
  const res = await fetch(FILES[kind]);
  if (!res.ok) throw new Error(`Téléchargement ${kind} impossible (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await mkdir("data/downloads", { recursive: true });
  await writeFile(`data/downloads/${kind}_ciqual.xml`, bytes);
  return bytes;
}

async function main() {
  const localIndex = process.argv.indexOf("--local");
  const localDir = localIndex > 0 ? process.argv[localIndex + 1] : null;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const [alimBytes, compoBytes] = await Promise.all([load("alim", localDir), load("compo", localDir)]);
  for (const [k, b] of [["alim", alimBytes], ["compo", compoBytes]] as const) {
    process.stdout.write(`${k} sha256 ${createHash("sha256").update(b).digest("hex")}\n`);
  }
  const foods = parseAlim(decodeXml(alimBytes));
  const compo = parseCompo(decodeXml(compoBytes));
  const client = postgres(url, { max: 1 });
  const database = drizzle(client, { schema: t, casing: "snake_case" });
  let n = 0;
  for (const food of foods) {
    const per100g = compo.get(food.code);
    if (!per100g) continue;
    const id = `comp_ciqual_${food.code}`;
    const values = {
      source: "CIQUAL",
      sourceRef: food.code,
      sourceLabel: "ANSES-Ciqual",
      sourceVersion: VERSION,
      sourceName: food.nameFr,
      license: LICENSE,
      url: "https://ciqual.anses.fr/",
      quality: "VERIFIED",
      per100g,
    };
    await database.insert(t.foodCompositions).values({ id, ...values }).onConflictDoUpdate({ target: t.foodCompositions.id, set: values });
    n++;
  }
  let linked = 0;
  const byCode = new Map(foods.map((f) => [f.code, f]));
  for (const [ingredient, entry] of Object.entries(mapping.mappings as Record<string, CiqualMappingEntry>)) {
    const food = byCode.get(entry.code);
    if (!mappingMatches(entry, food)) {
      process.stderr.write(
        `${ingredient} : le code ${entry.code} correspond à « ${food?.nameFr ?? "aucun aliment"} » et non à « ${entry.name} » : ignoré\n`,
      );
      continue;
    }
    await database.update(t.ingredients).set({ compositionId: `comp_ciqual_${entry.code}` }).where(eq(t.ingredients.id, ingredient));
    linked++;
  }
  if (process.argv.includes("--suggest")) {
    const suggestions = Object.fromEntries(
      INGREDIENT_SEEDS.map((seed) => [
        ingredientId(seed.slug),
        { ingredient: seed.name, candidates: suggestCiqualMatches(seed.name, foods).map((f) => ({ code: f.code, name: f.nameFr })) },
      ]),
    );
    await writeFile(
      "data/reference/ciqual-suggestions.json",
      `${JSON.stringify({ _about: "Candidats à vérifier, jamais appliqués automatiquement. Copiez les bons dans ciqual-mapping.json.", table: VERSION, suggestions }, null, 2)}\n`,
    );
    process.stdout.write("Suggestions écrites dans data/reference/ciqual-suggestions.json : vérifiez-les puis reportez les bonnes dans ciqual-mapping.json.\n");
  }
  await client.end();
  process.stdout.write(`${n} compositions Ciqual importées, ${linked} ingrédients reliés.\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
