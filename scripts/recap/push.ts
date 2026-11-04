// Everything the recap command sends to Sanity goes through here, behind a small client interface
// so tests can fake it. The one hard rule: only `drafts.` documents are written, and never over a
// published post. A person publishes in Studio.
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { SanityClient } from "@sanity/client";
import sharp from "sharp";
import type { EventDoc } from "../../src/lib/events/time";
import type { RecapDraft } from "./notes";

/** The few Sanity calls the recap command makes. */
export type RecapClient = {
  fetch<T>(query: string, params?: Record<string, unknown>): Promise<T>;
  getDocument(id: string): Promise<{ _id: string; _rev?: string } | null | undefined>;
  create(doc: RecapDraft): Promise<unknown>;
  /** Replaces the draft only if it is still at revision `rev`; fails if someone changed it meanwhile. */
  replaceDraft(doc: RecapDraft, rev: string): Promise<unknown>;
  uploadImage(buf: Buffer, opts: { filename: string; contentType: string }): Promise<{ _id: string }>;
};

export function fromSanityClient(client: SanityClient): RecapClient {
  return {
    fetch: <T>(query: string, params: Record<string, unknown> = {}) => client.fetch<T>(query, params),
    getDocument: (id) => client.getDocument(id),
    create: (doc) => client.create(doc),
    // ifRevisionID is a patch option, so a no-op patch carries the check; the transaction is atomic,
    // so the createOrReplace only lands when the revision still matches.
    replaceDraft: (doc, rev) =>
      client.transaction().patch(doc._id, { ifRevisionID: rev, set: { kind: doc.kind } }).createOrReplace(doc).commit(),
    uploadImage: (buf, { filename, contentType }) => client.assets.upload("image", buf, { filename, contentType }),
  };
}

/** Published events only (a draft event has nothing to link to yet). */
export const RECAP_EVENTS_QUERY = `*[_type == "event" && !(_id in path("drafts.**"))]{_id, title, slug, start}`;

export const loadEvents = (client: RecapClient) => client.fetch<EventDoc[]>(RECAP_EVENTS_QUERY);

/** Published recap posts that already link to the event. */
export const PUBLISHED_RECAPS_QUERY = `*[_type == "post" && kind == "recap" && event._ref == $eventId && !(_id in path("drafts.**"))]{_id, "slug": slug.current}`;

type DraftSlot = Pick<RecapDraft, "_id" | "_type" | "event">;

/**
 * Every check that decides whether the draft may be saved, run before any upload and again on save.
 * Refuses any `_id` outside `drafts.`, a published post at the same id, any published recap of the
 * same event, and an existing draft unless `replace` is set. Returns the existing draft, if any.
 */
export async function checkDraftSlot(
  doc: DraftSlot,
  client: RecapClient,
  opts: { replace?: boolean } = {},
): Promise<{ _id: string; _rev?: string } | null> {
  if (typeof doc._id !== "string" || !doc._id.startsWith("drafts.") || doc._id.length <= "drafts.".length)
    throw new Error(`Refusing to write "${doc._id}": the recap command only writes drafts (ids starting with "drafts.").`);
  if (doc._type !== "post") throw new Error(`Refusing to write a ${doc._type}: the recap command only writes posts.`);
  const published = doc._id.slice("drafts.".length);
  if (await client.getDocument(published))
    throw new Error(`"${published}" is already published. Edit it in Studio; the recap command never changes a published post.`);
  const recaps = await client.fetch<{ _id: string; slug?: string | null }[]>(PUBLISHED_RECAPS_QUERY, { eventId: doc.event._ref });
  if (recaps?.length)
    throw new Error(
      `This event already has a published recap: ${recaps.map((r) => `${r._id} (/blog/${r.slug ?? "?"})`).join(", ")}. Edit it in Studio instead.`,
    );
  const existing = (await client.getDocument(doc._id)) ?? null;
  if (existing && !opts.replace)
    throw new Error(`A draft "${doc._id}" already exists. Review it in Studio, or pass --replace to overwrite it.`);
  return existing;
}

/**
 * Saves the recap draft after `checkDraftSlot`. A new draft uses create(), which fails if the draft
 * appeared in the meantime; --replace overwrites only the revision that was checked.
 */
export async function pushDraft(doc: RecapDraft, client: RecapClient, opts: { replace?: boolean } = {}): Promise<void> {
  const existing = await checkDraftSlot(doc, client, opts);
  if (!existing) await client.create(doc);
  else if (!existing._rev) throw new Error(`The draft "${doc._id}" has no revision to check; not replacing it.`);
  else await client.replaceDraft(doc, existing._rev);
}

// ---- Photos ----

export const MAX_PHOTO_WIDTH = 2400;

const PHOTO_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const FORMAT_TYPES: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/** The photo files in `dir`, sorted by name. Other files are skipped and returned in `skipped`. */
export function listPhotos(dir: string): { photos: string[]; skipped: string[] } {
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const photos = names.filter((n) => PHOTO_TYPES[extname(n).toLowerCase()]);
  return { photos: photos.map((n) => join(dir, n)), skipped: names.filter((n) => !photos.includes(n)) };
}

/**
 * At most 2400px wide, upright (EXIF orientation applied), in its own format. Sharp drops EXIF
 * metadata by default, so camera GPS doesn't reach the public CDN.
 */
export async function resizePhoto(buf: Buffer, filename: string): Promise<{ buf: Buffer; contentType: string }> {
  const animated = extname(filename).toLowerCase() === ".gif";
  const img = sharp(buf, { animated }).rotate();
  const meta = await img.metadata();
  const contentType = FORMAT_TYPES[meta.format ?? ""];
  if (!contentType) throw new Error(`${filename}: unsupported image format (${meta.format ?? "unknown"}). Use JPEG, PNG, WebP or GIF.`);
  const out = await img.resize({ width: MAX_PHOTO_WIDTH, withoutEnlargement: true }).toBuffer();
  return { buf: out, contentType };
}

/** Resizes and uploads each photo in order; returns their asset ids. */
export async function uploadPhotos(paths: string[], client: RecapClient, log: (s: string) => void = () => {}): Promise<string[]> {
  const ids: string[] = [];
  for (const path of paths) {
    const filename = path.split(/[\\/]/).pop()!;
    const { buf, contentType } = await resizePhoto(readFileSync(path), filename);
    const asset = await client.uploadImage(buf, { filename, contentType });
    log(`  uploaded ${filename}`);
    ids.push(asset._id);
  }
  return ids;
}
