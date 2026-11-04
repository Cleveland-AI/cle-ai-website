import { fromZonedTime } from "date-fns-tz";
import { fmt, SITE_TZ } from "@/lib/events/time";

/** WordPress's default "blog pages show at most" (posts_per_page). */
export const POSTS_PER_PAGE = 10;
/** How many posts the RSS feed carries. */
export const FEED_LIMIT = 10;

export const BLOG_PATH = "/blog";
export const postPath = (slug: string) => `${BLOG_PATH}/${slug}`;
export const categoryPath = (slug: string) => `${BLOG_PATH}/category/${slug}`;
export const authorPath = (slug: string) => `${BLOG_PATH}/author/${slug}`;

/** The site's public origin, no trailing slash. */
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://cle-ai.com").replace(/\/+$/, "");

/** How many pages `total` posts make (at least one), and the GROQ slice for page `page`. */
export function pageWindow(total: number, perPage = POSTS_PER_PAGE, page = 1) {
  return { pages: Math.max(1, Math.ceil(total / perPage)), from: (page - 1) * perPage, to: page * perPage };
}

/** The post date as WordPress prints it ("September 19, 2026"), in site time. */
export const postDate = (iso: string) => fmt(new Date(iso), "MMMM d, yyyy");
/** The same instant as PHP's DATE_ATOM, for <time datetime>. */
export const postAtom = (iso: string) => fmt(new Date(iso), "yyyy-MM-dd'T'HH:mm:ssXXX");

type Block = { _type?: string; children?: unknown[]; text?: string; listItem?: string };
// Like WordPress's excerpt_remove_blocks: list items are skipped (core/list-item isn't an allowed
// inner block, so the whole list drops out) and a quote's text counts.
function collectText(nodes: unknown[] | undefined, out: string[]) {
  for (const n of nodes ?? []) {
    const b = n as Block;
    if (b?.listItem) continue;
    if (b?._type === "quote" && typeof b.text === "string") out.push(b.text, " ");
    else if (b?._type === "span" && typeof b.text === "string") out.push(b.text);
    else if (Array.isArray(b?.children)) {
      collectText(b.children, out);
      out.push(" ");
    }
  }
}

/** wp_trim_words: the first `n` words, with "…" when there were more. */
export function trimWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > n ? `${words.slice(0, n).join(" ")}…` : words.join(" ");
}

/** The excerpt field, else WordPress's automatic one: the first 55 words of the body text. */
export function excerptOf(post: { excerpt?: string | null; body?: unknown[] | null }): string {
  if (post.excerpt?.trim()) return post.excerpt.trim();
  const out: string[] = [];
  collectText(post.body ?? undefined, out);
  const words = out.join("").split(/\s+/).filter(Boolean);
  return words.length > 55 ? `${words.slice(0, 55).join(" ")}…` : words.join(" ");
}

// Characters XML 1.0 forbids (everything below 0x20 except tab, newline and carriage return, and U+FFFE/F).
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const esc = (s: string) => s.replace(XML_ILLEGAL, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rfc822 = (iso: string) => new Date(iso).toUTCString().replace("GMT", "+0000");

/** The instants a New York calendar month starts and ends (end exclusive), as UTC ISO strings. */
export function monthRange(year: number, month: number): { since: string; until: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const at = (y: number, m: number) => fromZonedTime(`${y}-${pad(m)}-01T00:00:00`, SITE_TZ).toISOString();
  return { since: at(year, month), until: month === 12 ? at(year + 1, 1) : at(year, month + 1) };
}

/** `<yyyy>`/`<mm>` route segments as a month (2000-2099-style four digits, 01-12), or null. */
export function parseMonth(year: string, month: string): { year: number; month: number } | null {
  if (!/^\d{4}$/.test(year) || !/^(0[1-9]|1[0-2])$/.test(month)) return null;
  return { year: Number(year), month: Number(month) };
}

/** "September 2026". */
export const monthTitle = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export type FeedPost = {
  title: string;
  slug: string;
  publishedAt: string;
  excerpt?: string | null;
  categories?: string[];
};

/**
 * A standard RSS 2.0 document; `posts` must already be newest first and public. Items carry title, link,
 * date, categories and the excerpt only: leaving the full post content out is deliberate (R20), so the
 * feed sends readers to the site.
 */
export function buildFeed(origin: string, posts: FeedPost[]): string {
  const items = posts
    .map((p) => {
      const url = `${origin}${postPath(p.slug)}`;
      return [
        "    <item>",
        `      <title>${esc(p.title)}</title>`,
        `      <link>${esc(url)}</link>`,
        `      <guid isPermaLink="true">${esc(url)}</guid>`,
        `      <pubDate>${rfc822(p.publishedAt)}</pubDate>`,
        ...(p.categories ?? []).map((c) => `      <category>${esc(c)}</category>`),
        ...(p.excerpt ? [`      <description>${esc(p.excerpt)}</description>`] : []),
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>CLE AI &amp; DATA</title>",
    `    <link>${esc(origin)}</link>`,
    `    <atom:link href="${esc(origin)}/feed.xml" rel="self" type="application/rss+xml"/>`,
    "    <description>Cleveland's community for AI and data.</description>",
    "    <language>en-US</language>",
    ...(posts[0] ? [`    <lastBuildDate>${rfc822(posts[0].publishedAt)}</lastBuildDate>`] : []),
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** A /page/<n> segment as a page number >= 2, or null (page 1 redirects to the archive itself). */
export function pageNumber(n: string): number | null {
  return /^[1-9]\d{0,3}$/.test(n) && n !== "1" ? Number(n) : null;
}
