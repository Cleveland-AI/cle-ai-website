// Shared GROQ queries. `npm run typegen` types each defineQuery result in types.ts.
// Every public post query includes VISIBLE_NOW (scheduled posts stay hidden until publishOn).
import { defineQuery } from "next-sanity";
import { fmt, type EventDoc } from "@/lib/events/time";
import { query } from "./client";
import { VISIBLE_NOW } from "./filters";
import { monthRange, pageWindow, POSTS_PER_PAGE } from "@/lib/posts";
import type {
  AUTHOR_QUERY_RESULT,
  HOMEPAGE_QUERY_RESULT,
  AUTHOR_SLUGS_QUERY_RESULT,
  CATEGORY_QUERY_RESULT,
  CATEGORY_SLUGS_QUERY_RESULT,
  PAGE_BY_SLUG_QUERY_RESULT,
  PAGE_SLUGS_QUERY_RESULT,
  SEARCH_QUERY_RESULT,
  POST_DATES_QUERY_RESULT,
  POST_LIST_QUERY_RESULT,
  POST_NEWER_QUERY_RESULT,
  POST_OLDER_QUERY_RESULT,
  PEOPLE_QUERY_RESULT,
  POST_QUERY_RESULT,
  POST_SLUGS_QUERY_RESULT,
  SITEMAP_QUERY_RESULT,
  TICKER_POSTS_QUERY_RESULT,
  SiteSettings,
} from "./types";

export const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings" && _id == "siteSettings"][0]`);

export const HOMEPAGE_QUERY = defineQuery(`*[_type == "homepage" && _id == "homepage"][0]{ body }`);

export const PAGE_BY_SLUG_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]`);

export const PAGE_SLUGS_QUERY = defineQuery(`*[_type == "page" && defined(slug.current)].slug.current`);

export const POST_BY_SLUG_QUERY = defineQuery(
  `*[_type == "post" && slug.current == $slug && ${VISIBLE_NOW}][0]{
    ...,
    author->{ name, slug, role, photo },
    categories[]->{ title, slug },
    event->{ title, slug, start, end }
  }`,
);

export const POSTS_QUERY = defineQuery(
  `*[_type == "post" && ${VISIBLE_NOW}] | order(publishedAt desc) [$from...$to]{
    _id, title, slug, kind, publishedAt, excerpt, featuredImage,
    author->{ name, slug },
    categories[]->{ title, slug }
  }`,
);

export const EVENT_BY_SLUG_QUERY = defineQuery(`*[_type == "event" && slug.current == $slug][0]`);

/**
 * Minimal events list for queryList blocks (Task 7 builds the real events pages). Unfiltered on
 * purpose: `start` is an ISO string with a UTC offset, and "upcoming" is decided by parsing it to a
 * Date and comparing America/New_York calendar days, which a GROQ string comparison can't do safely.
 */
export const EVENTS_QUERY = defineQuery(`*[_type == "event"] | order(start asc){ _id, title, slug, start, end, venue }`);

/** Every event with a page, soonest first: what the events pages and event blocks list. */
export const EVENTS_LIST_QUERY = defineQuery(
  `*[_type == "event" && defined(slug.current)] | order(start asc){
    _id, title, slug, start, end, venue, rsvpUrl, image, excerpt, organizer, meetupStatus
  }`,
);

export const EVENT_SLUGS_QUERY = defineQuery(`*[_type == "event" && defined(slug.current)].slug.current`);

const NO_SETTINGS: SiteSettings = { _id: "siteSettings", _type: "siteSettings", _createdAt: "", _updatedAt: "", _rev: "" };

/** The siteSettings singleton (menus, footer lines, announcement bar); empty settings when it is missing. */
export async function getSiteSettings(): Promise<SiteSettings> {
  return (await query<SiteSettings | null>(SITE_SETTINGS_QUERY)) ?? NO_SETTINGS;
}

/** The homepage singleton's body (front-page.html's content); empty when the document is missing. */
export async function getHomepageBody(): Promise<NonNullable<NonNullable<HOMEPAGE_QUERY_RESULT>["body"]>> {
  return (await query<HOMEPAGE_QUERY_RESULT>(HOMEPAGE_QUERY))?.body ?? [];
}

/** Every event with a page, soonest first. Upcoming vs past is decided by the caller (splitEvents). */
export async function getEvents(): Promise<EventDoc[]> {
  return (await query<EventDoc[] | null>(EVENTS_LIST_QUERY)) ?? [];
}

/** One event document by slug, or null. */
export async function getEvent(slug: string): Promise<EventDoc | null> {
  return query<EventDoc | null>(EVENT_BY_SLUG_QUERY, { slug });
}

// ---- Posts (Task 9). Every query below includes VISIBLE_NOW. ----

/**
 * The generated result types (types.ts, `npm run typegen`) make title, slug and publishedAt nullable.
 * The post queries only match posts that define all three (PUBLIC_POST), and `narrow` checks it at
 * runtime, so everything past the fetch functions sees them as present.
 */
type Narrow<T> = Omit<T, "title" | "slug" | "publishedAt"> & {
  title: string;
  slug: { current: string };
  publishedAt: string;
};
export type PostCard = Narrow<POST_LIST_QUERY_RESULT["posts"][number]>;
export type PostFull = Narrow<NonNullable<POST_QUERY_RESULT>>;

function narrow<T extends { title: string | null; slug: { current?: string } | null; publishedAt: string | null }>(
  p: T,
): Narrow<T> | null {
  const slug = p.slug?.current;
  return p.title && slug && p.publishedAt ? ({ ...p, slug: { current: slug } } as Narrow<T>) : null;
}
const present = <T>(xs: (T | null)[] | null | undefined): T[] => (xs ?? []).filter((x): x is T => x != null);

const CARD = `{
  _id, title, slug, publishedAt, excerpt, featuredImage,
  "body": select(defined(excerpt) && excerpt != "" => null, body),
  author->{ name, slug },
  categories[]->{ title, slug }
}`;
export const PUBLIC_POST = `_type == "post" && defined(slug.current) && defined(title) && defined(publishedAt) && ${VISIBLE_NOW}`;

export const POST_QUERY = defineQuery(
  `*[${PUBLIC_POST} && slug.current == $slug][0]{
    _id, title, slug, publishedAt, excerpt, body, featuredImage, seo,
    author->{ name, slug },
    categories[]->{ title, slug }
  }`,
);
export const POST_LIST_QUERY = defineQuery(
  `{
    "total": count(*[${PUBLIC_POST} && ($category == "" || $category in categories[]->slug.current) && ($author == "" || author->slug.current == $author) && ($since == "" || (dateTime(publishedAt) >= dateTime($since) && dateTime(publishedAt) < dateTime($until)))]),
    "posts": *[${PUBLIC_POST} && ($category == "" || $category in categories[]->slug.current) && ($author == "" || author->slug.current == $author) && ($since == "" || (dateTime(publishedAt) >= dateTime($since) && dateTime(publishedAt) < dateTime($until)))]
      | order(publishedAt desc, _id desc) [$from...$to]${CARD}
  }`,
);
export const POST_OLDER_QUERY = defineQuery(
  `*[${PUBLIC_POST} && _id != $id && (publishedAt < $at || (publishedAt == $at && _id < $id))] | order(publishedAt desc, _id desc)[0]{ title, slug }`,
);
export const POST_NEWER_QUERY = defineQuery(
  `*[${PUBLIC_POST} && _id != $id && (publishedAt > $at || (publishedAt == $at && _id > $id))] | order(publishedAt asc, _id asc)[0]{ title, slug }`,
);
export const POST_DATES_QUERY = defineQuery(`*[${PUBLIC_POST}].publishedAt`);
export const POST_SLUGS_QUERY = defineQuery(`*[${PUBLIC_POST}].slug.current`);
export const CATEGORY_QUERY = defineQuery(
  `*[_type == "category" && slug.current == $slug][0]{ _id, title, slug, description }`,
);
export const CATEGORY_SLUGS_QUERY = defineQuery(`*[_type == "category" && defined(slug.current)].slug.current`);
export const AUTHOR_QUERY = defineQuery(`*[_type == "person" && slug.current == $slug][0]{ _id, name, slug }`);
export const AUTHOR_SLUGS_QUERY = defineQuery(
  `array::unique(*[${PUBLIC_POST} && defined(author->slug.current)].author->slug.current)`,
);

/** One public post by slug, or null (a post whose publishOn is in the future is null). */
export async function getPost(slug: string): Promise<PostFull | null> {
  const post = await query<POST_QUERY_RESULT>(POST_QUERY, { slug });
  return post ? narrow(post) : null;
}

/** One page of public posts, newest first, with the total that makes the page count. */
export async function listPosts({
  page = 1,
  category = "",
  author = "",
  limit = POSTS_PER_PAGE,
  month,
}: {
  page?: number;
  category?: string;
  author?: string;
  limit?: number;
  /** Only posts published in this New York calendar month. */
  month?: { year: number; month: number };
} = {}): Promise<{
  posts: PostCard[];
  total: number;
}> {
  const { from, to } = pageWindow(0, limit, page);
  const res = await query<POST_LIST_QUERY_RESULT | null>(POST_LIST_QUERY, {
    from,
    to,
    category,
    author,
    ...(month ? monthRange(month.year, month.month) : { since: "", until: "" }),
  });
  return { posts: (res?.posts ?? []).flatMap((p) => narrow(p) ?? []), total: res?.total ?? 0 };
}

/** The public posts before (older) and after (newer) this one; scheduled posts never appear. */
export async function adjacentPosts(post: { _id: string; publishedAt: string }) {
  const params = { id: post._id, at: post.publishedAt };
  const [older, newer] = await Promise.all([
    query<POST_OLDER_QUERY_RESULT>(POST_OLDER_QUERY, params),
    query<POST_NEWER_QUERY_RESULT>(POST_NEWER_QUERY, params),
  ]);
  const link = (p: { title: string | null; slug: { current?: string } | null } | null) =>
    p?.slug?.current ? { title: p.title ?? "", slug: p.slug.current } : null;
  return { previous: link(older), next: link(newer) };
}

export async function getPostSlugs(): Promise<string[]> {
  return present(await query<POST_SLUGS_QUERY_RESULT | null>(POST_SLUGS_QUERY));
}
export async function getCategory(slug: string) {
  return query<CATEGORY_QUERY_RESULT>(CATEGORY_QUERY, { slug });
}
export async function getCategorySlugs(): Promise<string[]> {
  return present(await query<CATEGORY_SLUGS_QUERY_RESULT | null>(CATEGORY_SLUGS_QUERY));
}
export async function getAuthor(slug: string) {
  return query<AUTHOR_QUERY_RESULT>(AUTHOR_QUERY, { slug });
}
export async function getAuthorSlugs(): Promise<string[]> {
  return present(await query<AUTHOR_SLUGS_QUERY_RESULT | null>(AUTHOR_SLUGS_QUERY));
}

/** Every New York month (as {year, month}) that has at least one public post. */
export async function getPostMonths(): Promise<{ year: number; month: number }[]> {
  const dates = present(await query<POST_DATES_QUERY_RESULT | null>(POST_DATES_QUERY));
  const keys = new Set(dates.map((d) => fmt(new Date(d), "yyyy-MM")));
  return [...keys].map((k) => ({ year: Number(k.slice(0, 4)), month: Number(k.slice(5)) }));
}

// ---- Pages and search (Task 10) ----

/** One page by slug, or null. */
export async function getPage(slug: string) {
  return query<PAGE_BY_SLUG_QUERY_RESULT>(PAGE_BY_SLUG_QUERY, { slug });
}
export async function getPageSlugs(): Promise<string[]> {
  return present(await query<PAGE_SLUGS_QUERY_RESULT | null>(PAGE_SLUGS_QUERY));
}

export const SEARCH_PER_PAGE = 10;
/** Search words beyond this many are ignored. */
const MAX_TERMS = 8;

/**
 * Posts, pages and events whose title, text or excerpt contain every search word (GROQ `match`: whole
 * words, the last one also as a prefix). Posts go through PUBLIC_POST, so a scheduled post never shows.
 * Pages and events have no publishOn, so VISIBLE_NOW has nothing to apply to there.
 * Order (R24): hits whose title has every word first, then newest first. Pages show no date (they have no
 * publish date worth showing); `notes` is searched because the event page prints it publicly.
 */
const SEARCH_MATCH = `(
  (${PUBLIC_POST} || (_type in ["page", "event"] && defined(slug.current) && defined(title)))
  && [title, excerpt, pt::text(body), pt::text(notes)] match $terms
)`;
export const SEARCH_QUERY = defineQuery(
  `{
    "total": count(*[${SEARCH_MATCH}]),
    "results": *[${SEARCH_MATCH}] | order(select(title match $terms => 0, 1) asc, coalesce(publishedAt, start, _createdAt) desc, _id desc) [$from...$to]{
      _id, _type, title, slug, excerpt, body,
      "date": select(_type == "post" => publishedAt, _type == "event" => start)
    }
  }`,
);

export type SearchResult = { _id: string; type: "post" | "page" | "event"; title: string; slug: string; date: string | null; excerpt: string | null; body: unknown[] | null };

/** The words a query is made of: letters and digits only, lower-cased, at most MAX_TERMS. */
export function searchTerms(q: string): string[] {
  return (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, MAX_TERMS);
}

/** One page of results for `q`, with the total. An empty query (or one with no words) finds nothing. */
export async function search(q: string, page = 1): Promise<{ results: SearchResult[]; total: number }> {
  const words = searchTerms(q);
  if (!words.length) return { results: [], total: 0 };
  const terms = words.map((w, i) => (i === words.length - 1 ? `${w}*` : w));
  const { from, to } = pageWindow(0, SEARCH_PER_PAGE, page);
  const res = await query<SEARCH_QUERY_RESULT | null>(SEARCH_QUERY, { terms, from, to });
  const results = (res?.results ?? []).flatMap((r): SearchResult[] => {
    const type = r._type === "post" || r._type === "page" || r._type === "event" ? r._type : null;
    if (!type || !r.title || !r.slug?.current) return [];
    return [{ _id: r._id, type, title: r.title, slug: r.slug.current, date: r.date ?? null, excerpt: r.excerpt ?? null, body: (r.body as unknown[] | null) ?? null }];
  });
  return { results, total: res?.total ?? 0 };
}

// ---- Interactive blocks (Task 11) ----

/** The team, in `order` (then name), without anyone hidden. */
export const PEOPLE_QUERY = defineQuery(
  `*[_type == "person" && hidden != true && defined(name)] | order(order asc, name asc, _id asc){
    _id, name, role, lead, bio, linkedin, site, photo
  }`,
);
export type PersonDoc = PEOPLE_QUERY_RESULT[number];

/** Everyone the team block lists when it has no members of its own. */
export async function getPeople(): Promise<PersonDoc[]> {
  return (await query<PEOPLE_QUERY_RESULT | null>(PEOPLE_QUERY)) ?? [];
}

/** The ticker's posts: newest first, public only (PUBLIC_POST, so a scheduled post never appears). */
export const TICKER_POSTS_QUERY = defineQuery(
  `*[${PUBLIC_POST}] | order(publishedAt desc, _id desc)[0...$count]{ _id, title, slug, publishedAt, featuredImage }`,
);
export type TickerPost = Narrow<TICKER_POSTS_QUERY_RESULT[number]>;

export async function getTickerPosts(count: number): Promise<TickerPost[]> {
  const res = await query<TICKER_POSTS_QUERY_RESULT | null>(TICKER_POSTS_QUERY, { count: Math.max(1, Math.min(20, Math.trunc(count) || 1)) });
  return (res ?? []).flatMap((p) => narrow(p) ?? []);
}

// ---- Sitemap (Task 15) ----

/**
 * Everything the sitemap lists, as WordPress's core sitemaps would: pages, public posts (PUBLIC_POST, so a
 * scheduled post stays out until its time), events, categories that have a public post, and authors with one.
 * Pages and posts whose SEO field says "hide from search engines" are left out.
 */
export const SITEMAP_QUERY = defineQuery(
  `{
    "pages": *[_type == "page" && defined(slug.current) && seo.noindex != true]{ "slug": slug.current, _updatedAt },
    "posts": *[${PUBLIC_POST} && seo.noindex != true]{ "slug": slug.current, _updatedAt, publishedAt },
    "events": *[_type == "event" && defined(slug.current)]{ "slug": slug.current, _updatedAt },
    "categories": *[_type == "category" && defined(slug.current) && count(*[${PUBLIC_POST} && ^._id in categories[]._ref]) > 0]{ "slug": slug.current },
    "authors": array::unique(*[${PUBLIC_POST} && defined(author->slug.current)].author->slug.current)
  }`,
);

export type SitemapData = {
  pages: { slug: string; updated: string | null }[];
  posts: { slug: string; updated: string | null }[];
  events: { slug: string; updated: string | null }[];
  categories: string[];
  authors: string[];
};

export async function getSitemapData(): Promise<SitemapData> {
  const res = await query<SITEMAP_QUERY_RESULT | null>(SITEMAP_QUERY);
  const withSlug = <T extends { slug: string | null; _updatedAt?: string | null }>(xs: T[] | null | undefined) =>
    (xs ?? []).flatMap((x) => (x.slug ? [{ slug: x.slug, updated: x._updatedAt ?? null }] : []));
  return {
    pages: withSlug(res?.pages),
    posts: withSlug(res?.posts),
    events: withSlug(res?.events),
    categories: present((res?.categories ?? []).map((c) => c.slug)),
    authors: present(res?.authors),
  };
}
