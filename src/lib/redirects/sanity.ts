import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "next-sanity";
import { fixturesAllowed } from "@/lib/forms/constants";
import { apiVersion, dataset, PLACEHOLDER_PROJECT_ID, projectId } from "@/sanity/env";
import { sanitizeSanityRedirects, type SanityRedirect } from "./map";

/**
 * The `redirect` documents people add in the Studio, for the proxy, which runs on nearly every request and
 * cannot use "use cache". So: a module-level cache, stale-while-revalidate.
 *   - Fresh (under TTL_MS): returned as is (the same array, so map.ts builds its lookup table once per refresh).
 *   - Expired with a list on hand: that list is returned at once and one background refresh starts.
 *   - Cold start: the first request waits for the fetch, which is cut off after FETCH_TIMEOUT_MS.
 * A failed or timed-out fetch keeps the last good list (or none), is retried after the next TTL, and is
 * logged once per failure window (until a fetch succeeds again), never per request.
 * A new redirect therefore starts working on each instance within about TTL_MS after the next request.
 */
const TTL_MS = 60_000;
export const FETCH_TIMEOUT_MS = 1500;
const QUERY = `*[_type == "redirect" && defined(from) && defined(to)]{from, to}`;

let cache: { at: number; list: SanityRedirect[] } | undefined;
let inflight: Promise<SanityRedirect[]> | undefined;
let failing = false;

export function resetSanityRedirectsCache() {
  cache = undefined;
  inflight = undefined;
  failing = false;
}

/** Fixtures: read the file directly (no clock, no cache layer). */
function fromFixtures(): SanityRedirect[] {
  // turbopackIgnore: a dynamic path that must not make the build trace the project.
  const path = resolve(/*turbopackIgnore: true*/ process.env.FIXTURES_PATH || "tests/fixtures/dataset.ndjson");
  if (!existsSync(/*turbopackIgnore: true*/ path)) return [];
  const docs = readFileSync(/*turbopackIgnore: true*/ path, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as { _type?: string; from?: unknown; to?: unknown });
  return sanitizeSanityRedirects(docs.filter((d) => d._type === "redirect"));
}

async function fetchList(): Promise<SanityRedirect[]> {
  // Fixtures behaviour only where fixtures are allowed (never on Vercel, R30).
  if (fixturesAllowed()) return fromFixtures();
  if (projectId === PLACEHOLDER_PROJECT_ID) return [];
  const client = createClient({ projectId, dataset, apiVersion, useCdn: true, perspective: "published" });
  const ctl = new AbortController();
  // A timer (not only the abort signal) so a client that ignores the signal still cannot hold the request.
  return new Promise<SanityRedirect[]>((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      ctl.abort();
      rejectPromise(new Error(`redirect documents: no answer from Sanity in ${FETCH_TIMEOUT_MS} ms`));
    }, FETCH_TIMEOUT_MS);
    client.fetch<unknown>(QUERY, {}, { signal: ctl.signal }).then(
      (raw) => {
        clearTimeout(timer);
        resolvePromise(sanitizeSanityRedirects(raw));
      },
      (err) => {
        clearTimeout(timer);
        rejectPromise(err);
      },
    );
  });
}

function refresh(): Promise<SanityRedirect[]> {
  inflight ??= fetchList()
    .then((list) => {
      failing = false;
      cache = { at: Date.now(), list };
      return list;
    })
    .catch((err) => {
      if (!failing) console.error("redirects: could not load redirect documents", err);
      failing = true;
      cache = { at: Date.now(), list: cache?.list ?? [] };
      return cache.list;
    })
    .finally(() => {
      inflight = undefined;
    });
  return inflight;
}

export async function loadSanityRedirects(): Promise<SanityRedirect[]> {
  if (cache) {
    if (Date.now() - cache.at >= TTL_MS) void refresh();
    return cache.list;
  }
  return refresh();
}
