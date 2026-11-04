import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * `npm run visual` (R41): the WordPress theme on the Docker test site against the Next fixtures build.
 * Not part of `npm run check` because it needs the WordPress test site on localhost:8090, which comes from tests/bin/up in the original WordPress theme workspace and is not part of this repo, so it cannot run from this repo alone.
 * The Next side is the e2e suite's server (`next start` on a fixtures build, port 3100), but built by
 * tests/visual/build.mjs into .next-visual with the clock pinned to the start of the run, so dates
 * and "upcoming" match the test site's real clock.
 */
const PORT = 3100;
const nowFile = path.join(__dirname, "out", "now.txt");
const FIXTURES_NOW = (() => {
  try {
    return readFileSync(nowFile, "utf8").trim();
  } catch {
    throw new Error(`${nowFile} missing: run \`npm run visual\` (it builds first), not playwright directly`);
  }
})();

export default defineConfig({
  testDir: ".",
  testMatch: "parity.spec.ts",
  fullyParallel: true,
  workers: 4,
  timeout: 120_000,
  reporter: [["list"], ["./table-reporter.ts"]],
  use: { ...devices["Desktop Chrome"] },
  projects: [{ name: "chromium" }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    cwd: path.join(__dirname, "../.."),
    reuseExistingServer: false,
    env: { CONTENT_SOURCE: "fixtures", FIXTURES_NOW, NEXT_DIST_DIR: ".next-visual" },
  },
});
