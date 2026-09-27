/**
 * Loads environment files for command-line scripts in the same order as
 * Next.js, so `pnpm db:seed` sees the same settings as `pnpm dev`:
 * .env.<mode>.local, .env.local, .env.<mode>, .env — the first file that
 * defines a variable wins, and variables already set in the shell win over all.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const mode = process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV === "test" ? "test" : "development";
const files = [`.env.${mode}.local`, mode === "test" ? null : ".env.local", `.env.${mode}`, ".env"].filter((f): f is string => f !== null);

for (const file of files) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) config({ path, quiet: true });
}
