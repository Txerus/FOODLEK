import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      // Server modules are imported directly in integration tests.
      "server-only": fileURLToPath(new URL("./tests/integration/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/setup.ts"],
          env: {
            DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://foodlek:foodlek@localhost:5432/foodlek_test",
            BETTER_AUTH_SECRET: "integration-tests-secret-with-enough-length",
            NODE_ENV: "test",
          },
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
