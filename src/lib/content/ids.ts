// Document ids. Sanity treats a dot in an _id as a path: such a document is private, so an
// unauthenticated query (the public site's client has no token) never sees it, even in a public
// dataset. Content the site shows must therefore have dot-free ids; only the deliberately private
// kinds below keep a dot (final review C1).

/** The two private kinds: `secrets.meetupSync` (meetupSyncState) and `submission.<uuid>`. */
export const PRIVATE_TYPES = ["submission", "meetupSyncState"] as const;

/** The kinds of content the migration and the Meetup sync create with fixed ids. */
export type ContentIdType = "page" | "post" | "person" | "category" | "event";

/**
 * A public content id: `<type>-<key>`, e.g. `page-about`, `post-<slug>`, `event-<meetupId>`.
 * Anything outside Sanity's safe id characters (dots included) becomes "-".
 */
export const contentId = (type: ContentIdType, key: string | number) =>
  `${type}-${String(key).replace(/[^A-Za-z0-9_-]/g, "-")}`;

/** The published id of a document (without the `drafts.` prefix). */
export const publishedId = (id: string) => id.replace(/^drafts\./, "");

/** True when a document of `type` with `id` would be hidden from the tokenless public client by mistake. */
export const isHiddenPublicId = (id: string, type: string | undefined) =>
  !(PRIVATE_TYPES as readonly string[]).includes(type ?? "") && publishedId(id).includes(".");
