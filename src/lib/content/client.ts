import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { evaluate, parse } from "groq-js";
import { createClient } from "next-sanity";
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import { siteNow } from "@/lib/now";
import { apiVersion, dataset, PLACEHOLDER_PROJECT_ID, projectId } from "@/sanity/env";

export type QueryParams = Record<string, unknown>;
export type QueryOptions = { draft?: boolean };

/**
 * Runs a GROQ query against the content source.
 *
 * - `CONTENT_SOURCE=fixtures`: evaluated locally with groq-js over `tests/fixtures/dataset.ndjson`
 *   (or `FIXTURES_PATH`); `now()` is siteNow() (FIXTURES_NOW when pinned). Never cached, so every call sees the
 *   current file and clock.
 * - Otherwise: Sanity's published perspective, cached with tag `sanity` for 300 s
 *   (`revalidateTag('sanity')` refreshes it on publish). `opts.draft` skips the cache and reads drafts;
 *   so does Next's draft mode (Studio's Presentation tool, /api/draft), checked inside the cached
 *   function: with draft mode on, Next re-runs every cached function on each request and saves nothing.
 */
export async function query<T>(groq: string, params: QueryParams = {}, opts: QueryOptions = {}): Promise<T> {
  if (process.env.CONTENT_SOURCE === "fixtures") return (await queryFixtures(groq, params)) as T;
  if (projectId === PLACEHOLDER_PROJECT_ID) {
    throw new Error(
      "query(): no Sanity project configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID, or CONTENT_SOURCE=fixtures.",
    );
  }
  if (opts.draft) return queryDrafts<T>(groq, params);
  return (await queryPublished(groq, params)) as T;
}

// ---- Sanity ----

const client = createClient({ projectId, dataset, apiVersion, useCdn: true, perspective: "published" });

async function queryPublished(groq: string, params: QueryParams): Promise<unknown> {
  "use cache";
  cacheTag("sanity");
  cacheLife({ revalidate: 300 });
  // isEnabled is the one draftMode() member a cache scope may read (Next 16 docs, "use cache").
  if ((await draftMode()).isEnabled) return queryDrafts(groq, params);
  return client.fetch(groq, params);
}

async function queryDrafts<T>(groq: string, params: QueryParams): Promise<T> {
  const token = process.env.SANITY_API_DRAFTS_TOKEN || process.env.SANITY_API_READ_TOKEN;
  if (!token) throw new Error("query(): draft mode needs SANITY_API_DRAFTS_TOKEN.");
  return client
    .withConfig({ token, useCdn: false, perspective: "drafts" })
    .fetch<T>(groq, params, { cache: "no-store" });
}

// ---- Fixtures ----

type Doc = Record<string, unknown>;
let loaded: { path: string; mtimeMs: number; docs: Doc[] } | undefined;
const warnedMissing = new Set<string>();

// Fixtures are for tests only: the turbopackIgnore comments keep the build from tracing the
// whole project into the server bundle on account of these dynamic paths.
function fixturesPath(): string {
  return resolve(/*turbopackIgnore: true*/ process.env.FIXTURES_PATH || "tests/fixtures/dataset.ndjson");
}

function loadFixtures(): Doc[] {
  const path = fixturesPath();
  if (!existsSync(/*turbopackIgnore: true*/ path)) {
    // Ruling R1: before Task 5 creates the fixtures, an absent file is an empty dataset.
    if (!warnedMissing.has(path)) {
      warnedMissing.add(path);
      console.warn(`query(): fixtures file ${path} not found; using an empty dataset.`);
    }
    return [];
  }
  const { mtimeMs } = statSync(/*turbopackIgnore: true*/ path);
  if (loaded?.path !== path || loaded.mtimeMs !== mtimeMs) {
    const docs = readFileSync(/*turbopackIgnore: true*/ path, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as Doc);
    loaded = { path, mtimeMs, docs };
  }
  return loaded.docs;
}

async function queryFixtures(groq: string, params: QueryParams): Promise<unknown> {
  // now() is FIXTURES_NOW when pinned, else the site's cached clock (siteNow), so fixture pages
  // prerender like Sanity ones, with or without a pinned clock.
  const timestamp = await siteNow();
  const dataset = loadFixtures();
  const result = await evaluate(parse(groq, { params }), { dataset, params, timestamp });
  return result.get();
}
