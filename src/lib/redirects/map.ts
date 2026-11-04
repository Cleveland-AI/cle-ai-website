import generated from "./generated.json";

/**
 * Old WordPress URLs -> new addresses (spec Goal 8). Pure: no I/O, so it runs in the proxy and in tests.
 *
 * `resolveRedirect(pathname, search, sanity?)` returns ONE final target (a path with optional query, or an
 * https URL), or null when the URL is already where it should be. Following a result through it again always
 * gives null: there are no chains and no loops.
 *
 * Order of precedence (documented choice):
 *   1. Sanity `redirect` documents (people's rules win, so an editor can correct a bad migration entry);
 *   2. generated.json (Task 5's exact map: /?p=ID, /?attachment_id=ID, dated permalinks, uploads);
 *   3. the pattern rules below (R39).
 * Whatever a step returns is run through the same steps again until nothing matches (max 8 hops), so a Sanity
 * target that is itself an old URL is resolved through. A cycle anywhere drops the whole chain (null).
 *
 * Matching is case-insensitive and tolerates trailing and doubled slashes and the `/index.php` prefix.
 * Query strings: WordPress's own parameters (p, page_id, attachment_id, query-N-page, paged, s, ...) are consumed
 * by the rule that uses them and dropped; any other parameter (utm_*, ...) is carried onto internal targets and
 * dropped for external ones (Substack, the CDN).
 */

export type SanityRedirect = { from: string; to: string };

export const NEWSLETTER_URL = "https://timcleaidata.substack.com/";

const SANITY_AUTHORS: Record<string, string> = { tedt: "ted-troxell", ted: "ted-troxell", curtis: "curtis-oneal", will: "will-tatz" };
const WP_PARAMS = new Set(["p", "page_id", "attachment_id", "paged", "page", "s", "preview", "preview_id", "preview_nonce", "cat", "tag", "m", "author", "replytocom", "feed"]);
const PROTECTED = /^\/(studio|api|_next|assets|fonts|migrated)(\/|$)/;
const MAX_HOPS = 8;

// Folds the case of plain characters only: %C3%A9 and %c3%a9 are the same bytes, and re-casing an escape
// would turn a live /blog/caf%C3%A9 into a pointless redirect.
const foldCase = (s: string) => s.replace(/%[0-9a-fA-F]{2}|[^%]+|%/g, (m) => (m.length === 3 && m[0] === "%" ? m : m.toLowerCase()));
const tidy = (pathname: string): string => {
  const p = foldCase(pathname.replace(/\/{2,}/g, "/")).replace(/\/+$/, "");
  return p === "" ? "/" : p;
};
const stripIndex = (p: string): string => {
  const s = p.replace(/^\/index\.php(?=\/|$)/, "");
  return s === "" ? "/" : s;
};

// generated.json, keyed by the normalised source (index.php removed, lowercase, no trailing slash).
const generatedMap = new Map<string, string>();
for (const { from, to } of generated as { from: string; to: string }[]) {
  const q = from.indexOf("?");
  const key = q < 0 ? stripIndex(tidy(from)) : `${stripIndex(tidy(from.slice(0, q)))}${from.slice(q)}`;
  // /index.php/about/ -> /about is the same key as its target once index.php is stripped: the generic
  // /index.php rule covers it, and keeping it would make /about redirect to itself.
  if (key !== to) generatedMap.set(key, to);
}

const isExternal = (t: string) => /^https:\/\//i.test(t);

function carry(params: URLSearchParams): string {
  const keep = new URLSearchParams();
  for (const [k, v] of params) if (!WP_PARAMS.has(k) && !/^query-\d+-page$/.test(k)) keep.append(k, v);
  const s = keep.toString();
  return s ? `?${s}` : "";
}

const pageN = (v: string | null): number => {
  const n = Number(v);
  return Number.isInteger(n) && n > 1 ? n : 1;
};
const withPage = (base: string, n: number) => (n > 1 ? `${base}/page/${n}` : base);

/** One hop. `path` is tidy (lowercase, slashes collapsed, trailing slash gone) and may still carry /index.php. */
function stepRaw(rawPath: string, search: string, sanity: Map<string, string>): string | null {
  const path = tidy(rawPath);
  const hadIndex = /^\/index\.php(\/|$)/.test(path);
  const p = stripIndex(path);
  if (PROTECTED.test(p)) return null;
  const params = new URLSearchParams(search);
  const extra = () => carry(params);

  // 1. Sanity redirect documents.
  const withQuery = search ? sanity.get(`${p}${search.toLowerCase()}`) : undefined;
  if (withQuery) return withQuery;
  const s = sanity.get(p);
  if (s) return isExternal(s) ? s : s + (s.includes("?") ? "" : extra());

  // 2. generated.json
  if (p === "/") {
    for (const k of ["p", "page_id", "attachment_id"]) {
      const v = params.get(k);
      if (v && /^\d+$/.test(v)) {
        const hit = generatedMap.get(`/?${k}=${v}`);
        if (hit) return hit;
      }
    }
    const q = params.get("s");
    if (q) return `/search?q=${encodeURIComponent(q)}`;
    // R40: an old post, page or attachment id we do not know goes to the home page.
    if (["p", "page_id", "attachment_id"].some((k) => params.has(k))) return `/${extra()}`;
  }
  const gen = generatedMap.get(p);
  if (gen) return gen;

  // 3. Pattern rules (R39).
  // Feeds: /feed, /comments/feed, /<anything>/feed, /feed/atom ...
  if (/(^|\/)feed(\/(rss2?|atom|rdf))?$/.test(p) || p === "/rss") return "/feed.xml";
  if (p === "/get-involed") return `/get-involved${extra()}`;
  if (p === "/newsletter") return NEWSLETTER_URL;
  if (p === "/meetup-event") return `/events${extra()}`;
  let m: RegExpExecArray | null;
  if ((m = /^\/meetup-event\/([^/]+)$/.exec(p))) return `/events/${m[1]}${extra()}`;

  // WordPress's own pager on the events and blog listings.
  if (p === "/events" || p === "/blog") {
    const key = [...params.keys()].find((k) => /^query-\d+-page$/.test(k) || k === "paged");
    if (key) return `${withPage(p, pageN(params.get(key)))}${extra()}`;
  }
  // /page/N -> /blog/page/N
  if ((m = /^\/page\/(\d+)$/.exec(p))) return `${withPage("/blog", pageN(m[1]))}${extra()}`;
  // category / author archives
  if ((m = /^\/(category|author)\/([^/]+)(?:\/page\/(\d+))?$/.exec(p))) {
    const slug = m[1] === "author" ? (SANITY_AUTHORS[m[2]] ?? m[2]) : m[2];
    return `${withPage(`/blog/${m[1]}/${slug}`, pageN(m[3] ?? null))}${extra()}`;
  }
  // /yyyy/mm[/page/N], /yyyy/mm/dd, /yyyy/mm/dd/<slug>
  if ((m = /^\/(\d{4})\/(0[1-9]|1[0-2])(?:\/page\/(\d+))?$/.exec(p))) return `${withPage(`/blog/${m[1]}/${m[2]}`, pageN(m[3] ?? null))}${extra()}`;
  if ((m = /^\/(\d{4})\/(0[1-9]|1[0-2])\/\d{2}$/.exec(p))) return `/blog/${m[1]}/${m[2]}${extra()}`;
  if ((m = /^\/\d{4}\/(?:0[1-9]|1[0-2])\/\d{2}\/([^/]+)$/.exec(p))) return `/blog/${m[1]}${extra()}`;

  // Uploads: WordPress's resized copies (-300x167) share the original's address.
  if (p.startsWith("/wp-content/uploads/")) {
    const original = p.replace(/-\d+x\d+(\.[a-z0-9]+)$/, "$1");
    if (original !== p) return generatedMap.get(original) ?? null;
    return null;
  }

  // Any other /index.php/<path> is a page: drop the prefix.
  if (hadIndex) return `${p}${extra()}`;

  // Cosmetic only (uppercase, trailing or doubled slash): one tidy hop. The query is kept as it was.
  if (path !== rawPath) return `${path}${search}`;
  // WordPress params left on a live path (e.g. /about?page_id=3): drop them.
  if ([...params.keys()].some((k) => WP_PARAMS.has(k)) && p !== "/") return `${p}${extra()}`;
  return null;
}

// next.config.ts already redirects page 1 of every archive; aiming at it would make a second hop.
const PAGE_ONE = /^(\/events|\/blog|\/blog\/(?:category|author)\/[^/?]+|\/blog\/\d{4}\/\d{2})\/page\/1(?=$|\?)/;
function step(rawPath: string, search: string, sanity: Map<string, string>): string | null {
  const t = stepRaw(rawPath, search, sanity);
  return t && !isExternal(t) ? t.replace(PAGE_ONE, "$1") : t;
}

/** A Sanity `from` is lowercased, index.php-stripped, trailing-slash-free; a `?query` part is kept verbatim (lowercased). */
function keyOf(from: string): string {
  const q = from.indexOf("?");
  const path = stripIndex(tidy(q < 0 ? from : from.slice(0, q)));
  return q < 0 ? path : `${path}${from.slice(q).toLowerCase()}`;
}

const PROTECTED_FROM = /^\/(studio|api|_next)(\/|\?|$)/i;

/**
 * Keeps only entries that are safe to serve: `from` a site path (not /studio, /api, /_next); `to` a site path
 * ("/x", not "//host" or "/\host") or an https URL. javascript:, data:, http: and anything with whitespace or
 * control characters is dropped.
 */
export function sanitizeSanityRedirects(raw: unknown): SanityRedirect[] {
  if (!Array.isArray(raw)) return [];
  const out: SanityRedirect[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const { from, to } = e as Record<string, unknown>;
    if (typeof from !== "string" || typeof to !== "string") continue;
    const f = from.trim();
    const t = to.trim();
    if (/[\s\u0000-\u001f\u007f\\]/.test(f) || /[\s\u0000-\u001f\u007f\\]/.test(t)) continue;
    if (!f.startsWith("/") || f.startsWith("//") || PROTECTED_FROM.test(f)) continue;
    if (t.startsWith("/")) {
      if (t.startsWith("//")) continue;
    } else {
      let u: URL;
      try {
        u = new URL(t);
      } catch {
        continue;
      }
      if (u.protocol !== "https:" || !u.hostname) continue;
    }
    out.push({ from: f, to: t });
  }
  return out;
}

// One lookup table per list object: the loader hands out the same array until it refreshes, so the table is
// built once per refresh, not once per request.
const tables = new WeakMap<SanityRedirect[], Map<string, string>>();
function tableFor(list: SanityRedirect[]): Map<string, string> {
  let t = tables.get(list);
  if (!t) {
    t = new Map();
    for (const { from, to } of sanitizeSanityRedirects(list)) t.set(keyOf(from), to);
    tables.set(list, t);
  }
  return t;
}
const NO_SANITY: SanityRedirect[] = [];

export function resolveRedirect(pathname: string, search: string, sanity: SanityRedirect[] = NO_SANITY): string | null {
  const table = tableFor(sanity);

  const seen = new Set<string>();
  let path = pathname;
  let query = search && search !== "?" ? search : "";
  seen.add(`${path}${query}`);
  let last: string | null = null;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const next = step(path, query, table);
    if (next === null) return finish(last, pathname, search);
    last = next;
    if (isExternal(next)) return next;
    const q = next.indexOf("?");
    path = q < 0 ? next : next.slice(0, q);
    query = q < 0 ? "" : next.slice(q);
    const id = `${path}${query}`;
    if (seen.has(id)) return null; // a cycle: serve nothing rather than loop
    seen.add(id);
  }
  return null; // too many hops: treat as a loop
}

function finish(last: string | null, pathname: string, search: string): string | null {
  if (last === null || last === `${pathname}${search}`) return null;
  return last;
}
