/**
 * Gives the back-office role to an existing account.
 *   pnpm admin:grant moi@example.com
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as t from "../../src/server/db/schema";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    process.stderr.write("Usage : pnpm admin:grant <e-mail du compte>\n");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (fichier .env).");
  const client = postgres(url, { max: 1 });
  const database = drizzle(client, { schema: t, casing: "snake_case" });
  const rows = await database.update(t.user).set({ role: "admin" }).where(eq(t.user.email, email)).returning({ id: t.user.id });
  process.stdout.write(rows.length ? `Compte ${email} : administrateur. Reconnectez-vous pour voir l'administration.\n` : `Aucun compte avec l'e-mail ${email}.\n`);
  await client.end();
}

void main();
