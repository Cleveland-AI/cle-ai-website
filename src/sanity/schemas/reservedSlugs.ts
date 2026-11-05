/** Post URLs are /blog/<slug>, so a slug must not collide with the blog's own routes. */
export const RESERVED_POST_SLUGS = ["page", "category", "author"];

/**
 * Sanity custom validator for a post's slug: rejects the route words and four-digit years
 * (/blog/<yyyy>/<mm> is the date archive). Returns true or the message the editor sees.
 */
export function reservedPostSlug(value: { current?: string } | undefined | null): true | string {
  const slug = value?.current;
  if (!slug) return true;
  if (RESERVED_POST_SLUGS.includes(slug)) return `"${slug}" is used by the blog's own pages. Choose another slug.`;
  if (/^\d{4}$/.test(slug)) return "A four-digit year is used by the blog's date archive. Choose another slug.";
  return true;
}

/** A page lives at /<slug>, so a slug must not collide with the site's own top-level routes. */
export const RESERVED_PAGE_SLUGS = ["blog", "events", "search", "studio", "api", "feed.xml", "newsletter", "sitemap.xml", "robots.txt", "favicon.ico", "wp-admin", "wp-json", "index.php"];

/** Sanity custom validator for a page's slug. Returns true or the message the editor sees. */
export function reservedPageSlug(value: { current?: string } | undefined | null): true | string {
  const slug = value?.current;
  if (!slug) return true;
  if (RESERVED_PAGE_SLUGS.includes(slug)) return `"${slug}" is used by the site's own pages. Choose another slug.`;
  return true;
}
