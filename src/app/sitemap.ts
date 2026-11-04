import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/content/queries";
import { authorPath, categoryPath, postPath, siteUrl } from "@/lib/posts";

const when = (iso: string | null) => (iso ? new Date(iso) : undefined);

/**
 * /sitemap.xml: the home page, the blog and events archives, pages, public posts, events, and the
 * categories and authors that have posts. No /studio, /api or search; a post with a future publishOn
 * is not in the query's results, so it is not here either.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const d = await getSitemapData();
  const entry = (path: string, lastModified?: Date) => ({ url: `${origin}${path}`, ...(lastModified ? { lastModified } : {}) });
  return [
    entry("/"),
    entry("/blog"),
    entry("/events"),
    ...d.pages.map((p) => entry(`/${p.slug}`, when(p.updated))),
    ...d.posts.map((p) => entry(postPath(p.slug), when(p.updated))),
    ...d.events.map((e) => entry(`/events/${e.slug}`, when(e.updated))),
    ...d.categories.map((c) => entry(categoryPath(c))),
    ...d.authors.map((a) => entry(authorPath(a))),
  ];
}
