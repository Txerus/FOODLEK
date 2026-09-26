import { execSync } from "node:child_process";

/** Migrates and seeds the integration database once per run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://foodlek:foodlek@localhost:5432/foodlek_test";
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: url, NODE_ENV: "test" };
  execSync("pnpm -s db:migrate", { env, stdio: "inherit" });
  execSync("pnpm -s db:seed", { env, stdio: "inherit" });
}
