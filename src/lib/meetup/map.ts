import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { sanitize } from "@/lib/sanitize";
import { SITE_TZ } from "@/lib/events/time";
import type { MeetupEvent } from "./types";

/** The fields the sync writes. `slug` is a plain string here; the sync wraps it as a Sanity slug. */
export type EventSyncFields = {
  _id: string;
  _type: "event";
  meetupId: string;
  title: string;
  slug: string;
  start: string;
  end?: string;
  venue?: { name?: string; address?: string; city?: string; state?: string; zip?: string; lat?: number; lng?: number };
  rsvpUrl?: string;
  descriptionHtml?: string;
  organizer?: string;
  organizerUrl?: string;
  meetupStatus: "active" | "cancelled";
};

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * An ISO time with an offset, or a bare local time, as an ISO string with the America/New_York
 * offset in effect at that instant (so a time across the Nov 1 change keeps its local hour).
 * Returns undefined when the input isn't a date.
 */
export function toNewYorkIso(input: string | null | undefined): string | undefined {
  const s = (input ?? "").trim();
  if (!s) return undefined;
  const d = HAS_ZONE.test(s) ? new Date(s) : fromZonedTime(s, SITE_TZ);
  return Number.isNaN(d.getTime()) ? undefined : formatInTimeZone(d, SITE_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * The slug the old WordPress plugin would give a new event: sanitize_title(title), i.e. lower-case
 * words joined by hyphens (the dedupe `-2`, `-3` suffix is added by the sync). Same rule as the migration.
 */
export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Meetup descriptions are HTML or plain text; plain text becomes paragraphs. Always sanitised. */
function descriptionToHtml(text: string | null | undefined): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  const html = /<[a-z][\s\S]*>/i.test(t)
    ? t
    : t
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
        .join("");
  return sanitize(html, "eventDescription");
}

const clean = (s: string | null | undefined) => (s ?? "").trim() || undefined;

export function toEventDoc(m: MeetupEvent): EventSyncFields {
  const start = toNewYorkIso(m.dateTime);
  if (!start) throw new Error(`Meetup event ${m.id} has no usable start time: ${m.dateTime}`);
  const end = toNewYorkIso(m.endTime);
  const v = m.venue;
  const venue = v
    ? Object.fromEntries(
        Object.entries({
          name: clean(v.name),
          address: clean(v.address),
          city: clean(v.city),
          state: clean(v.state),
          zip: clean(v.postalCode),
          lat: typeof v.lat === "number" ? v.lat : undefined,
          lng: typeof v.lng === "number" ? v.lng : undefined,
        }).filter(([, x]) => x !== undefined),
      )
    : {};
  const doc: EventSyncFields = {
    _id: `event.${m.id}`,
    _type: "event",
    meetupId: m.id,
    title: m.title.trim(),
    slug: slugify(m.title) || `event-${m.id}`,
    start,
    // An end that isn't after the start is a data error; leave it out.
    ...(end && Date.parse(end) > Date.parse(start) ? { end } : {}),
    ...(Object.keys(venue).length ? { venue } : {}),
    ...(clean(m.eventUrl) ? { rsvpUrl: clean(m.eventUrl) } : {}),
    ...(descriptionToHtml(m.description) ? { descriptionHtml: descriptionToHtml(m.description) } : {}),
    ...(clean(m.organizer) ? { organizer: clean(m.organizer) } : {}),
    ...(clean(m.organizerUrl) ? { organizerUrl: clean(m.organizerUrl) } : {}),
    meetupStatus: /^cancel/i.test(m.status) ? "cancelled" : "active",
  };
  return doc;
}
