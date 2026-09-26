import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

function createDb() {
  const client = postgres(env().DATABASE_URL, { max: 10, prepare: true });
  return drizzle(client, { schema, casing: "snake_case" });
}

type Db = ReturnType<typeof createDb>;

// Reuse the pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __foodlekDb?: Db };

export function db(): Db {
  if (!globalForDb.__foodlekDb) globalForDb.__foodlekDb = createDb();
  return globalForDb.__foodlekDb;
}

export type Database = Db;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
