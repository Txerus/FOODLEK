/**
 * Imports the ANSES-Ciqual 2025 table (Licence Ouverte / Etalab 2.0).
 *
 *   pnpm data:ciqual              # downloads the XML files from Recherche Data Gouv
 *   pnpm data:ciqual --local DIR  # uses alim_*.xml and compo_*.xml already downloaded
 *
 * Every food is stored in food_compositions with source CIQUAL and the table
 * version. Ingredients are re-linked only when data/reference/ciqual-mapping.json
 * gives a verified alim_code for them.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import mapping from "../../data/reference/ciqual-mapping.json";
import { decodeXml, parseAlim, parseCompo } from "../../src/server/data/ciqual";
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
  for (const [ingredientId, code] of Object.entries(mapping.mappings as Record<string, string>)) {
    const compositionId = `comp_ciqual_${code}`;
    const exists = await database.select({ id: t.foodCompositions.id }).from(t.foodCompositions).where(and(eq(t.foodCompositions.id, compositionId)));
    if (exists.length === 0) {
      process.stderr.write(`Code Ciqual ${code} inconnu pour ${ingredientId}, ignoré\n`);
      continue;
    }
    await database.update(t.ingredients).set({ compositionId }).where(eq(t.ingredients.id, ingredientId));
    linked++;
  }
  await client.end();
  process.stdout.write(`${n} compositions Ciqual importées, ${linked} ingrédients reliés.\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
