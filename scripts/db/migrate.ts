import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const client = postgres(url, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
  process.stdout.write("Migrations appliquées.\n");
}

function describe(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(current.message);
    current = (current as Error & { cause?: unknown }).cause;
  }
  const text = parts.join(" ← ") || String(error);
  if (/ECONNREFUSED|connect/i.test(text)) {
    return `${text}\nPostgreSQL ne répond pas à l'adresse de DATABASE_URL. Démarrez-le (ex. \`docker compose up -d\`) puis relancez.`;
  }
  if (/password authentication failed|does not exist/i.test(text)) {
    return `${text}\nVérifiez l'utilisateur, le mot de passe et le nom de base dans DATABASE_URL.`;
  }
  return text;
}

main().catch((error: unknown) => {
  process.stderr.write(`${describe(error)}\n`);
  process.exit(1);
});
