/**
 * Removes superseded and very old observed prices (keeps manual and demo prices).
 *   pnpm prix:nettoyage
 */
import "../env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as t from "../../src/server/db/schema";
import { pruneOldPrices } from "../../src/server/retail/maintenance";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (fichier .env).");
  const client = postgres(url, { max: 1 });
  try {
    const r = await pruneOldPrices(drizzle(client, { schema: t, casing: "snake_case" }));
    process.stdout.write(`${r.superseded} prix remplacés et ${r.expired} prix de plus de 2 ans supprimés, ${r.logs} journaux de synchronisation anciens.\n`);
  } finally {
    await client.end();
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
