import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findEvent } from "@/lib/events/find";
import { eventJsonLd } from "@/lib/events/jsonld";
import { hasEnded, isPast, mapUrl, splitEvents, whenLong, whenShort, type EventDoc } from "@/lib/events/time";

// Ports tests/php/test-event-helpers.php, test-events-spec.php and test-find-event.php. The fixture
// dataset is the seed: same events as seed.php, dated around "now" = 2026-11-03.
const fixtures: EventDoc[] = readFileSync("tests/fixtures/dataset.ndjson", "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((d) => d._type === "event");
const ev = (slug: string): EventDoc => {
  const e = fixtures.find((x) => x.slug?.current === slug);
  if (!e) throw new Error(`fixture event ${slug} missing`);
  return e;
};
type LD = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const NOW = new Date("2026-11-03T12:00:00-05:00");
const mk = (start: string, end?: string, extra: Partial<EventDoc> = {}): EventDoc => ({
  _id: `e.${start}`,
  _type: "event",
  _createdAt: "",
  _updatedAt: "",
  _rev: "",
  title: "T",
  start,
  ...(end ? { end } : {}),
  ...extra,
});

describe("event time helpers", () => {
  it("keeps the right local time across the DST change (test-event-helpers, test-events-spec)", () => {
    // February is EST, October is EDT, December is EST: the offset is in the data and never re-derived.
    expect(whenShort(ev("winter-meetup-est-check"))).toBe("Tuesday, February 10 · 6:00 pm – 8:00 pm");
    expect(whenShort(ev("october-workshop"))).toBe("Thursday, October 22 · 10:00 am – 1:00 pm");
    expect(whenShort(ev("cle-ai-and-data-monthly-social-at-happy-dog-december"))).toBe("Thursday, December 10 · 6:00 pm – 8:00 pm");
    // 7 PM on Nov 2 (after the Nov 1 change) is 00:00Z on Nov 3 and must still read 7:00 PM.
    const afterDst = mk("2026-11-02T19:00:00-05:00");
    expect(whenLong(afterDst)).toBe("Monday, 2 November 2026, 7:00 PM");
    expect(whenShort(afterDst)).toBe("Monday, November 2 · 7:00 pm");
    // A UTC offset other than New York's is still shown in New York time.
    expect(whenLong(mk("2026-11-02T19:00:00-08:00"))).toBe("Monday, 2 November 2026, 10:00 PM");
  });

  it("formats the long date from the spec", () => {
    expect(whenLong(mk("2026-09-28T17:00:00-04:00", "2026-09-28T20:30:00-04:00"))).toBe(
      "Monday, 28 September 2026, 5:00 – 8:30 PM",
    );
    expect(whenLong(ev("october-workshop"))).toBe("Thursday, 22 October 2026, 10:00 AM – 1:00 PM");
    const noEnd = whenLong(ev("pop-up-coffee-chat"));
    expect(noEnd.endsWith(", 5:00 PM")).toBe(true);
    expect(noEnd).not.toContain("–");
    expect(whenShort(ev("pop-up-coffee-chat"))).toBe("Wednesday, November 4 · 5:00 pm");
    // An end before the start is ignored; an end on another day shows its own date.
    expect(whenLong(mk("2026-09-28T17:00:00-04:00", "2026-09-28T16:00:00-04:00"))).toBe("Monday, 28 September 2026, 5:00 PM");
    expect(whenLong(mk("2026-09-28T22:00:00-04:00", "2026-09-29T01:00:00-04:00"))).toBe(
      "Monday, 28 September 2026, 10:00 PM – Tuesday, 29 September 2026, 1:00 AM",
    );
    expect(whenShort(mk("2026-09-28T17:00:00-04:00", "2026-09-28T20:00:00-04:00"), "EEE, MMM d")).toBe("Mon, Sep 28 · 5:00 pm – 8:00 pm");
    expect(whenLong({} as EventDoc)).toBe("");
    expect(whenShort({ start: "not a date" } as EventDoc)).toBe("");
  });

  it("treats an event as past only once its New York day is over", () => {
    expect(isPast(ev("tonight-lightning-talks"), new Date("2026-10-26T12:00:00-04:00"))).toBe(false);
    expect(isPast(ev("summer-in-the-flats"), NOW)).toBe(true);
    // Starts 22:00 today, still upcoming at 23:30, past at 00:00 tomorrow.
    const late = mk("2026-11-03T22:00:00-05:00");
    expect(isPast(late, new Date("2026-11-03T23:30:00-05:00"))).toBe(false);
    expect(isPast(late, new Date("2026-11-04T00:00:00-05:00"))).toBe(true);
    // Instants, not strings: 23:30 ET is 04:30Z the next UTC day.
    expect(isPast(late, new Date("2026-11-04T04:30:00Z"))).toBe(false);
    expect(isPast(late, new Date("2026-11-04T05:00:00Z"))).toBe(true);
    // Archive rule is by START day: a multi-day event that started yesterday is past, and so is a
    // 22:00-01:00 event the next day.
    const multi = mk("2026-11-02T10:00:00-05:00", "2026-11-05T12:00:00-05:00");
    expect(isPast(multi, new Date("2026-11-02T23:59:00-05:00"))).toBe(false);
    expect(isPast(multi, new Date("2026-11-03T12:00:00-05:00"))).toBe(true);
    const overnight = mk("2026-11-03T22:00:00-05:00", "2026-11-04T01:00:00-05:00");
    expect(isPast(overnight, new Date("2026-11-03T23:30:00-05:00"))).toBe(false);
    expect(isPast(overnight, new Date("2026-11-04T00:30:00-05:00"))).toBe(true);
    // No usable start: not past.
    expect(isPast({} as EventDoc, NOW)).toBe(false);
  });

  it("hasEnded is the instant rule: (end ?? start) before now", () => {
    const e = mk("2026-11-03T17:00:00-05:00", "2026-11-03T20:00:00-05:00");
    expect(hasEnded(e, new Date("2026-11-03T19:59:00-05:00"))).toBe(false);
    expect(hasEnded(e, new Date("2026-11-03T20:01:00-05:00"))).toBe(true);
    expect(isPast(e, new Date("2026-11-03T20:01:00-05:00"))).toBe(false);
    const noEnd = mk("2026-11-03T17:00:00-05:00");
    expect(hasEnded(noEnd, new Date("2026-11-03T16:59:00-05:00"))).toBe(false);
    expect(hasEnded(noEnd, new Date("2026-11-03T17:01:00-05:00"))).toBe(true);
    expect(hasEnded({} as EventDoc, NOW)).toBe(false);
  });

  it("splits upcoming (soonest first) from past (newest first)", () => {
    const { upcoming, past } = splitEvents(fixtures, new Date("2026-10-26T12:00:00-04:00"));
    expect(upcoming[0].slug?.current).toBe("tonight-lightning-talks");
    expect(past.map((e) => e.slug?.current)).not.toContain("tonight-lightning-talks");
    const ups = upcoming.map((e) => Date.parse(e.start as string));
    expect(ups).toEqual([...ups].sort((a, b) => a - b));
    const pasts = past.map((e) => Date.parse(e.start as string));
    expect(pasts).toEqual([...pasts].sort((a, b) => b - a));
    expect(past.length).toBeGreaterThan(12);
    expect(upcoming.length + past.length).toBe(fixtures.length);
    // Sorted by instant even when offsets differ.
    const a = mk("2026-11-10T20:00:00-05:00"); // 01:00Z Nov 11
    const b = mk("2026-11-10T23:00:00Z"); // 18:00 ET Nov 10: earlier
    expect(splitEvents([a, b], NOW).upcoming).toEqual([b, a]);
    // Events with no usable start are left out.
    expect(splitEvents([{ _id: "x" } as EventDoc], NOW)).toEqual({ upcoming: [], past: [] });
  });
});

describe("mapUrl", () => {
  it("uses lat,lon verbatim, else the encoded address, else the name, else nothing", () => {
    expect(mapUrl(ev("mega-meetup-at-the-museum"))).toBe("https://www.google.com/maps/search/?api=1&query=41.51152,-81.612877");
    expect(mapUrl(ev("hike-north-chagrin")).endsWith(encodeURIComponent("3037 SOM Center Road, Willoughby Hills, OH 44094"))).toBe(true);
    expect(mapUrl(ev("online-reading-group"))).toBe("");
    expect(mapUrl(mk("2026-11-03T10:00:00-05:00", undefined, { venue: {} }))).toBe("");
    expect(mapUrl(mk("2026-11-03T10:00:00-05:00"))).toBe("");
    expect(mapUrl(ev("pop-up-coffee-chat"))).toBe(
      "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Rising Star Coffee"),
    );
    // lat 0 / lng 0 is a real coordinate.
    expect(mapUrl(mk("2026-11-03T10:00:00-05:00", undefined, { venue: { lat: 0, lng: 0 } }))).toContain("query=0,0");
  });
});

describe("findEvent", () => {
  const evs = fixtures;
  const now = new Date("2026-10-26T12:00:00-04:00");
  it("finds the next matching upcoming event, case-insensitively (test-find-event)", () => {
    expect(findEvent(evs, "social", false, [], now)?.title).toContain("Social");
    expect(findEvent(evs, "Mega", false, [], now)?.title).toContain("Mega");
    expect(findEvent(evs, "Nonexistent", false, [], now)).toBeNull();
    expect(findEvent(evs, "Nonexistent", true, [], now)).not.toBeNull();
    expect(findEvent(evs, "", false, [], now)?._id).toBe(splitEvents(evs, now).upcoming[0]._id);
  });
  it("skips excluded slugs or ids, ignores past events, and copes with none", () => {
    const first = splitEvents(evs, now).upcoming[0];
    const next = findEvent(evs, "", false, [first.slug?.current ?? ""], now);
    expect(next?._id).not.toBe(first._id);
    expect(findEvent(evs, "", false, [first._id ?? ""], now)?._id).not.toBe(first._id);
    expect(findEvent(evs, "Summer", false, [], now)).toBeNull(); // past
    expect(findEvent([], "", true)).toBeNull();
  });
});

describe("eventJsonLd", () => {
  it("builds Event structured data and leaves empty fields out", () => {
    const ld = eventJsonLd(ev("october-workshop")) as LD;
    expect(ld["@type"]).toBe("Event");
    expect(ld.startDate).toBe("2026-10-22T10:00:00-04:00");
    expect(ld.endDate).toBe("2026-10-22T13:00:00-04:00");
    expect(ld.location.address.streetAddress).toBe("5801 Detroit Avenue");
    expect(ld.location.geo).toEqual({ "@type": "GeoCoordinates", latitude: 41.4849, longitude: -81.7294 });
    expect(ld.organizer.nonprofitStatus).toBe("https://schema.org/Nonprofit501c3");
    expect(ld.url).toBe("https://www.meetup.com/cleveland-ai-data/events/1219926102/");
  });
  it("omits location when the venue is empty, and endDate when there is no end", () => {
    const ld = eventJsonLd(mk("2026-10-22T10:00:00-04:00", undefined, { title: "X", slug: { _type: "slug", current: "x" }, venue: {} })) as LD;
    expect(ld.startDate).toBe("2026-10-22T10:00:00-04:00");
    expect("location" in ld).toBe(false);
    expect("endDate" in ld).toBe(false);
    expect("description" in ld).toBe(false);
    expect("image" in ld).toBe(false);
    expect(ld.url).toBe("https://cle-ai.com/events/x");
    expect(JSON.stringify(ld)).not.toContain('""');
  });
  it("marks a cancelled Meetup event as EventCancelled", () => {
    const ld = eventJsonLd(mk("2026-10-22T10:00:00-04:00", undefined, { meetupStatus: "cancelled" })) as LD;
    expect(ld.eventStatus).toBe("https://schema.org/EventCancelled");
    expect((eventJsonLd(mk("2026-10-22T10:00:00-04:00")) as LD).eventStatus).toBe("https://schema.org/EventScheduled");
  });
  it("uses a named organizer without the nonprofit flag, and returns null with no start", () => {
    const ld = eventJsonLd(mk("2026-10-22T10:00:00-04:00", undefined, { organizer: "Someone Else" })) as LD;
    expect(ld.organizer).toEqual({ "@type": "Organization", name: "Someone Else" });
    const linked = eventJsonLd(mk("2026-10-22T10:00:00-04:00", undefined, { organizer: "Ann", organizerUrl: "https://ann.example/" })) as LD;
    expect(linked.organizer).toEqual({ "@type": "Organization", name: "Ann", url: "https://ann.example/" });
    expect(eventJsonLd({} as EventDoc)).toBeNull();
  });
});
