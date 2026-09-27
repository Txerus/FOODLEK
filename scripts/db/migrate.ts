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

/** Flattens causes, AggregateErrors (IPv4 + IPv6 attempts on Windows) and error codes. */
function collect(error: unknown, out: string[]) {
  if (!(error instanceof Error)) {
    if (error !== undefined) out.push(String(error));
    return;
  }
  const code = (error as Error & { code?: string }).code;
  if (error.message || code) out.push([code, error.message].filter(Boolean).join(" "));
  if (error instanceof AggregateError) for (const e of error.errors) collect(e, out);
  collect((error as Error & { cause?: unknown }).cause, out);
}

function describe(error: unknown): string {
  const parts: string[] = [];
  collect(error, parts);
  const text = parts.join(" ← ");
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connect/i.test(text) || parts.length <= 1) {
    return `${text}\nPostgreSQL ne répond pas à l'adresse de DATABASE_URL (${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@") ?? "non définie"}).\nDémarrez PostgreSQL (ex. \`docker compose up -d\`) puis relancez.`;
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
