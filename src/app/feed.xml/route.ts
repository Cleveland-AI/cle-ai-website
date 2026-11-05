import { listPosts } from "@/lib/content/queries";
import { buildFeed, excerptOf, FEED_LIMIT, siteUrl } from "@/lib/posts";

/** /feed.xml: RSS 2.0, posts only, newest first. listPosts filters out posts whose publishOn is still ahead. */
export async function GET() {
  const { posts } = await listPosts({ limit: FEED_LIMIT });
  const xml = buildFeed(
    siteUrl(),
    posts.map((p) => ({
      title: p.title,
      slug: p.slug.current,
      publishedAt: p.publishedAt,
      excerpt: excerptOf(p),
      categories: (p.categories ?? []).flatMap((c) => (c.title ? [c.title] : [])),
    })),
  );
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
