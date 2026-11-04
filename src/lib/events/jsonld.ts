import { eventRange, fmt, type EventDoc } from "./time";

const SITE_NAME = "CLE AI & DATA";
const DEFAULT_SITE_URL = "https://cle-ai.com";
const iso = (d: Date) => fmt(d, "yyyy-MM-dd'T'HH:mm:ssXXX");
const text = (s: string | null | undefined) => (s ?? "").trim();
type Obj = Record<string, unknown>;
const clean = (o: Obj): Obj =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v as Obj).length)),
  );

/** schema.org Event data for an event page, or null with no usable start. Empty fields are left out. */
export function eventJsonLd(e: EventDoc, opts: { siteUrl?: string; imageUrl?: string } = {}): Obj | null {
  const r = eventRange(e);
  if (!r) return null;
  const site = (opts.siteUrl ?? DEFAULT_SITE_URL).replace(/\/$/, "");
  const v = e.venue ?? {};
  const address = clean({
    "@type": "PostalAddress",
    streetAddress: text(v.address),
    addressLocality: text(v.city),
    addressRegion: text(v.state),
    postalCode: text(v.zip),
  });
  const place = clean({ "@type": "Place", name: text(v.name), address: Object.keys(address).length > 1 ? address : undefined });
  if (typeof v.lat === "number" && typeof v.lng === "number") {
    place.geo = { "@type": "GeoCoordinates", latitude: v.lat, longitude: v.lng };
  }
  const organizerName = text(e.organizer);
  const organizer: Obj = organizerName
    ? clean({ "@type": "Organization", name: organizerName, url: text(e.organizerUrl) })
    : { "@type": "Organization", name: SITE_NAME, url: `${site}/` };
  // The group itself is a 501(c)(3); say so whenever it is the organizer.
  if (organizer.name === SITE_NAME) organizer.nonprofitStatus = "https://schema.org/Nonprofit501c3";
  const slug = e.slug?.current;
  return clean({
    "@context": "https://schema.org",
    "@type": "Event",
    name: text(e.title),
    startDate: iso(r.start),
    endDate: r.end ? iso(r.end) : undefined,
    eventStatus: e.meetupStatus === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: text(e.rsvpUrl) || (slug ? `${site}/events/${slug}` : ""),
    description: text(e.excerpt),
    location: Object.keys(place).length > 1 ? place : undefined,
    organizer,
    image: opts.imageUrl,
  });
}
