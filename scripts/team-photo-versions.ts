// Writes src/blocks/team/photo-versions.json: the first eight hex digits of each bundled headshot's
// SHA-1, which the team block adds to the photo URL as ?v= (the theme used the file's mtime). A unit
// test keeps the list in step with public/assets/team. Run with `npm run team-photos`; the output is committed.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, "../public/assets/team");
const versions: Record<string, string> = {};
for (const f of readdirSync(dir).filter((n) => n.endsWith(".webp")).sort()) {
  versions[f.replace(/\.webp$/, "")] = createHash("sha1").update(readFileSync(resolve(dir, f))).digest("hex").slice(0, 8);
}
writeFileSync(resolve(here, "../src/blocks/team/photo-versions.json"), JSON.stringify(versions, null, 2) + "\n");
console.log(`${Object.keys(versions).length} headshots`);
