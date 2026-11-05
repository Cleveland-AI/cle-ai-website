import { formatInTimeZone } from "date-fns-tz";
import type { Event } from "@/lib/content/types";

/** An event document, or any projection of one (GROQ returns null for a missing field). */
export type EventDoc = { [K in keyof Event]?: Event[K] | null };
/** The fields splitting and sorting need, so any projection with a start works. */
export type Timed = Pick<EventDoc, "start" | "end">;

export const SITE_TZ = "America/New_York";

/** Parses an ISO string with an offset to an instant; never compares strings. */
function instant(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const fmt = (d: Date, pattern: string) => formatInTimeZone(d, SITE_TZ, pattern);
const etDay = (d: Date) => fmt(d, "yyyy-MM-dd");

/** The event's start and (valid, later) end as instants; null start means the event has no usable date. */
export function eventRange(e: Timed): { start: Date; end: Date | null } | null {
  const start = instant(e.start);
  if (!start) return null;
  const end = instant(e.end);
  return { start, end: end && end > start ? end : null };
}

/**
 * The archive rule (cle_event_query_args / cle_events): by START day in America/New_York. An event is
 * upcoming until the end of its start day, whatever its end time. Used by lists and archives
 * (`splitEvents`, QueryList). The Upcoming/Past badge and RSVP button use `hasEnded` instead.
 */
export function isPast(e: Timed, now: Date = new Date()): boolean {
  const r = eventRange(e);
  if (!r) return false;
  return etDay(r.start) < etDay(now);
}

/**
 * The instant rule (cle_event_is_past): past once (end ?? start) is before `now`; false when neither
 * parses. Used for the Upcoming/Past badge and the RSVP button on event pages. Lists use `isPast`.
 */
export function hasEnded(e: Timed, now: Date = new Date()): boolean {
  const t = instant(e.end) ?? instant(e.start);
  return t ? t < now : false;
}

/** Cards: "Monday, September 28 · 5:00 pm – 8:00 pm". Same output as cle_event_when. */
export function whenShort(e: Timed, pattern = "EEEE, MMMM d"): string {
  const r = eventRange(e);
  if (!r) return "";
  let out = fmt(r.start, `${pattern} · h:mm aaa`);
  if (r.end && etDay(r.end) === etDay(r.start)) out += ` – ${fmt(r.end, "h:mm aaa")}`;
  return out;
}

/**
 * Event page: "Monday, 28 September 2026, 5:00 – 8:30 PM". The date shows once when start and end
 * share a day (AM/PM once too when they share it); start only when there is no end.
 */
export function whenLong(e: Timed): string {
  const r = eventRange(e);
  if (!r) return "";
  const date = fmt(r.start, "EEEE, d MMMM yyyy");
  if (!r.end) return `${date}, ${fmt(r.start, "h:mm a")}`;
  if (etDay(r.end) !== etDay(r.start)) {
    return `${date}, ${fmt(r.start, "h:mm a")} – ${fmt(r.end, "EEEE, d MMMM yyyy, h:mm a")}`;
  }
  const from = fmt(r.start, "a") === fmt(r.end, "a") ? fmt(r.start, "h:mm") : fmt(r.start, "h:mm a");
  return `${date}, ${from} – ${fmt(r.end, "h:mm a")}`;
}

/** A possibly missing string field, trimmed ("" when missing). */
export const trim = (s: string | null | undefined) => (s ?? "").trim();

/** "1 Wade Oval Drive, Cleveland, OH 44106"; "" when there is no address data. */
export function addressLine(e: EventDoc): string {
  const t = trim;
  const v = e.venue ?? {};
  const stateZip = `${t(v.state)} ${t(v.zip)}`.trim();
  return [t(v.address), t(v.city), stateZip].filter(Boolean).join(", ");
}

/** Google Maps link: lat,lng when both are set, else the encoded address (or venue name), else "". */
export function mapUrl(e: EventDoc): string {
  const v = e.venue ?? {};
  if (typeof v.lat === "number" && typeof v.lng === "number" && Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`;
  }
  const q = addressLine(e) || (v.name ?? "").trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

/** Upcoming soonest first, past newest first. Events with no usable start are left out. */
export function splitEvents<T extends Timed>(events: T[], now: Date = new Date()): { upcoming: T[]; past: T[] } {
  const dated = events
    .map((e) => ({ e, t: instant(e.start)?.getTime() }))
    .filter((x): x is { e: T; t: number } => x.t !== undefined);
  const upcoming = dated.filter((x) => !isPast(x.e, now)).sort((a, b) => a.t - b.t);
  const past = dated.filter((x) => isPast(x.e, now)).sort((a, b) => b.t - a.t);
  return { upcoming: upcoming.map((x) => x.e), past: past.map((x) => x.e) };
}
