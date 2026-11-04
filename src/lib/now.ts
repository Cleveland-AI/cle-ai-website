import { cacheLife } from "next/cache";

/**
 * The pinned test clock: `FIXTURES_NOW`, honoured only with `CONTENT_SOURCE=fixtures` so a stray
 * variable can never freeze production's clock. Null when not pinned.
 */
export function pinnedNow(): Date | null {
  const pinned = process.env.FIXTURES_NOW;
  if (process.env.CONTENT_SOURCE !== "fixtures" || !pinned) return null;
  const d = new Date(pinned);
  if (Number.isNaN(d.getTime())) throw new Error(`FIXTURES_NOW is not a date: ${pinned}`);
  return d;
}

/**
 * The site's notion of "now" for server components and queries: the pinned fixtures clock, else the
 * clock captured in a cache entry that refreshes every 5 minutes, like the Sanity queries (R3). Pages
 * that depend on the date (next event, upcoming vs past, Dot's winter hat) stay in the prerendered
 * output and are regenerated in the background.
 */
export async function siteNow(): Promise<Date> {
  return pinnedNow() ?? new Date(await clock());
}

async function clock(): Promise<string> {
  "use cache";
  cacheLife({ revalidate: 300 });
  return new Date().toISOString();
}
