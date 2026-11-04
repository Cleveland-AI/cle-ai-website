import type { SanityClient } from "@sanity/client";
import { type EventSyncFields, toEventDoc } from "./map";
import type { MeetupEvent } from "./types";

/** What the sync needs from the Sanity client; tests pass an in-memory fake. */
export type SanityWriter = Pick<SanityClient, "fetch" | "createIfNotExists" | "patch" | "transaction">;

/**
 * Fields the sync owns and may overwrite. Everything else on an event (notes, extraPhotos, anything
 * an editor adds) is never touched. `slug` is set when a document is created and kept afterwards,
 * so an editor's URL (and the redirect map built from it) doesn't move; `image` and `excerpt` are
 * listed because the sync owns them, but Meetup's data doesn't currently produce them.
 * `venue` is written as a whole object (its sub-fields `venue.state` and `venue.zip` are listed so
 * the ownership is explicit, and they travel with it); dotted names are never patched one by one.
 */
export const SYNC_OWNED_FIELDS = [
  "meetupId",
  "title",
  "slug",
  "start",
  "end",
  "venue",
  "rsvpUrl",
  "image",
  "descriptionHtml",
  "organizer",
  "organizerUrl",
  "venue.state",
  "venue.zip",
  "excerpt",
  "meetupStatus",
] as const;

/** Optional fields that are removed when Meetup no longer has a value for them. */
const UNSET_WHEN_ABSENT = ["end", "venue"] as const;

type Existing = Record<string, unknown> & { _id: string; slug?: { current?: string } };

const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as object).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)]));
  }
  return v;
}

const PROJECTION = [...new Set(SYNC_OWNED_FIELDS.map((f) => f.split(".")[0]))];
const EXISTING_QUERY = `*[_type == "event" && !(_id in path("drafts.**"))]{_id, ${PROJECTION.join(", ")}}`;

export async function syncEvents(
  fetched: MeetupEvent[],
  write: SanityWriter,
  opts: { source?: "graphql" | "ical" } = {},
): Promise<{ created: number; updated: number; unchanged: number }> {
  const existing = await write.fetch<Existing[]>(EXISTING_QUERY);
  const byId = new Map(existing.map((d) => [d._id, d]));
  const byMeetupId = new Map(existing.filter((d) => d.meetupId).map((d) => [String(d.meetupId), d]));
  const slugs = new Set(existing.map((d) => d.slug?.current).filter((s): s is string => !!s));
  const uniqueSlug = (base: string) => {
    let s = base;
    for (let n = 2; slugs.has(s); n++) s = `${base}-${n}`;
    slugs.add(s);
    return s;
  };

  const tx = write.transaction();
  const result = { created: 0, updated: 0, unchanged: 0 };

  for (const m of fetched) {
    const doc: EventSyncFields = toEventDoc(m);
    const current = byId.get(doc._id) ?? byMeetupId.get(m.id);
    if (!current) {
      const { slug, ...rest } = doc;
      tx.createIfNotExists({ ...rest, slug: { _type: "slug", current: uniqueSlug(slug) } });
      result.created++;
      continue;
    }
    const fields: Record<string, unknown> = { ...doc };
    delete fields.slug;
    const set: Record<string, unknown> = {};
    for (const k of PROJECTION) {
      if (k === "slug") {
        // An existing document keeps its slug; one without gets it now.
        if (!current.slug?.current) set.slug = { _type: "slug", current: uniqueSlug(doc.slug) };
        continue;
      }
      const next = fields[k];
      if (next !== undefined && !same(current[k], next)) set[k] = next;
    }
    // The iCal feed is thinner than the API: a field it lacks is not a field Meetup dropped.
    const unset = (opts.source === "ical" ? [] : UNSET_WHEN_ABSENT).filter((k) => fields[k] === undefined && current[k] !== undefined);
    if (!Object.keys(set).length && !unset.length) {
      result.unchanged++;
      continue;
    }
    tx.patch(current._id, { ...(Object.keys(set).length ? { set } : {}), ...(unset.length ? { unset: [...unset] } : {}) });
    result.updated++;
  }

  if (result.created + result.updated > 0) await tx.commit();
  return result;
}
