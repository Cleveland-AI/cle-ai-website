import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    // next-sanity imports "next/headers" without an extension; inlined, vite resolves it (and tests can mock it).
    server: { deps: { inline: ["next-sanity"] } },
  },
});
