import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-visual/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored WordPress theme (reference copy for tests and the migration), not part of this app.
    "theme-source/**",
  ]),
]);

export default eslintConfig;
