import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // French copy is full of apostrophes, which are harmless in JSX text.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["scripts/**", "**/*.test.ts", "e2e/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/components/ui/**", "drizzle/**", "shot.tmp.mjs"]),
]);

export default eslintConfig;
