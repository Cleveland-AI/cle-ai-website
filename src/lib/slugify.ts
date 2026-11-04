/**
 * WordPress's sanitize_title() for titles and names: lower-case ASCII words joined by hyphens. The
 * migration and the Meetup sync share this one copy, because the sync's slugs must match the
 * migration's (and its redirect map).
 */
export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
