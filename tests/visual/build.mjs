// `npm run visual`, step 1: a fixtures build whose clock is pinned to the moment this run starts.
// The WordPress test site renders with the real clock, and its events carry the same dates as the
// fixtures (both come from the same seed), so pinning the Next clock to "now" puts the same events
// under Upcoming / Past / Next big night on both sides. The build goes to .next-visual so the e2e
// build (.next, pinned to E2E_NOW) is never overwritten.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const now = new Date().toISOString();
mkdirSync(path.join(here, "out"), { recursive: true });
writeFileSync(path.join(here, "out", "now.txt"), now);
const root = path.join(here, "../..");
// next build rewrites tsconfig.json for a custom distDir (adds .next-visual/types to "include" and
// reformats it); put it back as it was, since .next-visual is excluded anyway.
const tsconfig = path.join(root, "tsconfig.json");
const tsconfigText = readFileSync(tsconfig, "utf8");
const res = spawnSync("npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CONTENT_SOURCE: "fixtures", FIXTURES_NOW: now, NEXT_DIST_DIR: ".next-visual" },
});
writeFileSync(tsconfig, tsconfigText);
process.exit(res.status ?? 1);
