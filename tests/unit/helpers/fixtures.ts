// The fixture dataset (tests/fixtures/dataset.ndjson), read directly for component tests.
import { readFileSync } from "node:fs";
import type { SiteSettings } from "@/lib/content/types";
import type { EventDoc } from "@/lib/events/time";
import { E2E_NOW } from "../../e2eNow";

const docs = readFileSync("tests/fixtures/dataset.ndjson", "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as { _type: string; _id: string });

export const SETTINGS = docs.find((d) => d._type === "siteSettings") as unknown as SiteSettings;
export const EVENTS = docs.filter((d) => d._type === "event") as unknown as EventDoc[];
/** The e2e clock (tests/e2eNow.ts): the evening of "Tonight: lightning talks". */
export const NOW = new Date(E2E_NOW);

export function event(slug: string): EventDoc {
  const e = EVENTS.find((x) => x.slug?.current === slug);
  if (!e) throw new Error(`no fixture event ${slug}`);
  return e;
}
