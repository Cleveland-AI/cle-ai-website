// The event blocks over the fixture events: the cle/event-meta section of tests/php/test-events-spec.php,
// the cle/next-event renders in test-find-event.php and the venue-map checks in test-interactive.php.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { blockComponents } from "@/blocks/registry";
import { EventMeta } from "@/blocks/event-meta/EventMeta";
import { NextEventView } from "@/blocks/next-event/NextEvent";
import { VenueMapView } from "@/blocks/venue-map/VenueMap";
import { findEvent } from "@/lib/events/find";
import { EVENTS, NOW, event } from "./helpers/fixtures";

const meta = (slug: string, attrs: Parameters<typeof EventMeta>[0] extends infer P ? Omit<P, "event" | "now"> : never, now = NOW) =>
  renderToStaticMarkup(<EventMeta event={event(slug)} now={now} {...attrs} />);
const PAGE = { showStatus: true, dateStyle: "long" } as const;
const FOOT = { showDate: false, showVenue: false, showRsvp: false, showOrganizer: true, showBackLink: true } as const;

describe("cle/event-meta", () => {
  it("an upcoming event shows its status and RSVP, in the order status, date, venue, RSVP", () => {
    const mega = meta("mega-meetup-at-the-museum", PAGE);
    expect(mega).toContain(">Upcoming<");
    expect(mega).toContain("RSVP on Meetup");
    const at = (s: string) => mega.indexOf(s);
    expect(at("cle-event-meta__status")).toBeLessThan(at("cle-event-meta__when"));
    expect(at("cle-event-meta__when")).toBeLessThan(at("cle-event-meta__where"));
    expect(at("cle-event-meta__where")).toBeLessThan(at("cle-event-meta__rsvp"));
  });

  it("venue name, then the address linked to the map; WordPress's markup", () => {
    const mega = meta("mega-meetup-at-the-museum", PAGE);
    expect(mega).toContain(">Cleveland Museum of Natural History<");
    expect(mega).toContain('query=41.51152,-81.612877">1 Wade Oval Drive, Cleveland, OH 44106</a>');
    expect(mega).toBe(
      '<div class="is-upcoming wp-block-cle-event-meta">' +
        '<p class="cle-event-meta__status"><span class="cle-eyebrow">Upcoming</span></p>' +
        '<p class="cle-event-meta__when"><time dateTime="2026-10-29T17:00:00-04:00">Thursday, 29 October 2026, 5:00 – 8:30 PM</time></p>' +
        '<div class="cle-event-meta__where"><p class="cle-event-meta__venue">Cleveland Museum of Natural History</p>' +
        '<p class="cle-event-meta__address"><a href="https://www.google.com/maps/search/?api=1&amp;query=41.51152,-81.612877">1 Wade Oval Drive, Cleveland, OH 44106</a></p></div>' +
        '<p class="cle-event-meta__rsvp"><a class="wp-element-button" href="https://www.meetup.com/cleveland-ai-data/events/4266782082/">RSVP on Meetup</a></p>' +
        "</div>",
    );
  });

  it("a past event shows Past and no RSVP button at all", () => {
    const old = meta("summer-in-the-flats", PAGE);
    expect(old).toContain(">Past<");
    expect(old).toContain('class="is-past wp-block-cle-event-meta"');
    expect(old).not.toContain("wp-element-button");
    expect(old).not.toContain("meetup.com");
  });

  it("Past means ended (hasEnded): tonight's event is Upcoming until it ends, then Past while still listed today", () => {
    const tonight = (iso: string) => meta("tonight-lightning-talks", PAGE, new Date(iso));
    expect(tonight("2026-10-26T23:30:00-04:00")).toContain(">Upcoming<");
    const after = tonight("2026-10-26T23:59:30-04:00");
    expect(after).toContain(">Past<");
    expect(after).not.toContain("RSVP on Meetup");
  });

  it("no venue data, no venue block", () => {
    expect(meta("online-reading-group", PAGE)).not.toContain("cle-event-meta__where");
  });

  it("a name-only venue links the name to the map; no end shows the start only", () => {
    const chat = meta("pop-up-coffee-chat", PAGE);
    expect(chat).toContain(
      '<div class="cle-event-meta__where"><p class="cle-event-meta__address"><a href="https://www.google.com/maps/search/?api=1&amp;query=Rising%20Star%20Coffee">Rising Star Coffee</a></p></div>',
    );
    expect(chat).toContain(">Wednesday, 4 November 2026, 5:00 PM</time>");
    expect(chat).not.toContain("RSVP on Meetup");
  });

  it("the organizer shows when set; the back link goes to /events", () => {
    const foot = meta("mega-meetup-at-the-museum", FOOT);
    expect(foot).toContain('<p class="cle-event-meta__organizer">Organized by <a href="https://www.meetup.com/cleveland-ai-data/">CLE AI &amp; DATA</a></p>');
    const plain = renderToStaticMarkup(<EventMeta event={{ ...event("mega-meetup-at-the-museum"), organizerUrl: undefined }} now={NOW} {...FOOT} />);
    expect(plain).toContain('<p class="cle-event-meta__organizer">Organized by CLE AI &amp; DATA</p>');
    expect(foot).toContain('<p class="cle-event-meta__back"><a href="/events">← All events</a></p>');
    const none = meta("monthly-social-at-happy-dog", FOOT);
    expect(none).not.toContain("Organized by");
    expect(none).toContain('href="/events"');
  });

  it("cards: the short date with the year, and the venue by name (or city)", () => {
    expect(meta("pop-up-coffee-chat", { showVenue: false, showRsvp: false })).toContain(
      '<time dateTime="2026-11-04T17:00:00-05:00">Wednesday, November 4, 2026 · 5:00 pm</time>',
    );
    expect(meta("october-workshop", { showDate: false, showRsvp: false, venueStyle: "name", fontSize: "s" })).toBe(
      '<div class="is-past wp-block-cle-event-meta has-s-font-size"><p class="cle-event-meta__where">Tech Elevator</p></div>',
    );
  });

  it("renders nothing with nothing to show, or without an event", () => {
    expect(meta("bare-event", { showDate: false, showVenue: true, showRsvp: true })).toBe("");
    expect(renderToStaticMarkup(<EventMeta now={NOW} />)).toBe("");
  });
});

describe("cle/next-event", () => {
  const next = (match: string, attrs: object = {}) =>
    renderToStaticMarkup(<NextEventView event={findEvent(EVENTS, match, false, [], NOW)} {...attrs} />);

  it("honours match", () => {
    expect(next("Social", { showExcerpt: false })).toContain("Monthly Social");
  });

  it("shows its empty text when nothing matches", () => {
    expect(next("Nonexistent", { emptyText: "Check Meetup for the next date." })).toBe(
      '<div class="cle-next-event--callout wp-block-cle-next-event"><p class="cle-next-event__empty">Check Meetup for the next date. <a href="https://www.meetup.com/cleveland-ai-data/">Join on Meetup</a></p></div>',
    );
  });

  it("callout: eyebrow, linked title, date, venue line, excerpt and the RSVP button", () => {
    expect(next("Mega", { eyebrow: "Next big night" })).toBe(
      '<div class="cle-next-event--callout wp-block-cle-next-event">' +
        '<p class="cle-eyebrow">Next big night</p>' +
        '<h2 class="cle-next-event__title"><a href="/events/mega-meetup-at-the-museum">Mega Meetup at the Museum</a></h2>' +
        '<p class="cle-next-event__meta"><time dateTime="2026-10-29T17:00:00-04:00">Thursday, October 29 · 5:00 pm – 8:30 pm</time></p>' +
        '<p class="cle-next-event__meta">Cleveland Museum of Natural History, 1 Wade Oval Drive, Cleveland, OH 44106</p>' +
        '<p class="cle-next-event__excerpt">Talks and networking. Mega Meetup at the Museum.</p>' +
        '<p><a class="wp-element-button" href="https://www.meetup.com/cleveland-ai-data/events/4266782082/">RSVP on Meetup</a></p>' +
        "</div>",
    );
  });

  it("bar: the announcement line; without an RSVP link it points at the event page", () => {
    const bar = renderToStaticMarkup(
      <NextEventView
        event={event("pop-up-coffee-chat")}
        layout="bar"
        eyebrow="Next"
        align="full"
        backgroundColor="indigo"
        textColor="paper"
      />,
    );
    expect(bar).toBe(
      '<div class="cle-next-event--bar alignfull wp-block-cle-next-event has-text-color has-paper-color has-background has-indigo-background-color">' +
        '<p class="cle-next-event__line"><strong>Next:</strong> <a href="/events/pop-up-coffee-chat">Pop-up coffee chat</a> ' +
        '<span class="cle-next-event__meta"><time dateTime="2026-11-04T17:00:00-05:00">Wed, Nov 4 · 5:00 pm</time> · Rising Star Coffee</span> ' +
        '<a class="cle-next-event__rsvp" href="/events/pop-up-coffee-chat">RSVP on Meetup</a></p></div>',
    );
  });
});

describe("cle/venue-map", () => {
  const map = (attrs: object = {}) => renderToStaticMarkup(<VenueMapView events={EVENTS} now={NOW} _key="m" {...attrs} />);

  it("the clay map shows with three numbered pins", () => {
    const m = map();
    expect(m).toContain("venue-map.webp");
    expect(m.split('class="cle-scene__pin"').length - 1).toBe(3);
    expect(m).toContain("--x:25%;--y:41%");
    expect(m).toContain('<span aria-hidden="true">1</span>');
  });

  it("each venue shows its next event, linked", () => {
    const m = map();
    expect(m).toContain(
      '<li><strong>Cleveland Museum of Natural History</strong> <span>1 Wade Oval Drive, University Circle. Big nights. Next: <a href="/events/mega-meetup-at-the-museum">Mega Meetup at the Museum</a>, Thu, Oct 29 · 5:00 pm – 8:30 pm.</span></li>',
    );
  });

  it("without its image, it shows just the list", () => {
    const m = map({ art: "no-such-map" });
    expect(m).not.toContain("cle-map__frame");
    expect(m).toContain("cle-map__list is-only");
    expect(m).toContain("Next: <a href=");
    expect(m).toContain("Monthly Social at Happy Dog");
  });

  it("a venue with no upcoming event says so", () => {
    expect(map({ pins: [{ title: "Nowhere", match: "zzz-none" }] })).toContain("Nothing on the calendar here yet.");
  });

  it("pins without a title are dropped; none left renders nothing", () => {
    expect(map({ pins: [{ title: " ", match: "Social" }] })).toBe("");
  });
});

describe("registry", () => {
  it("registers the seven site-shell and event blocks", () => {
    for (const type of ["cleLogo", "cleNav", "cleMenu", "cleMascot", "cleNextEvent", "cleEventMeta", "cleVenueMap"]) {
      expect(blockComponents[type], type).toBeTypeOf("function");
    }
  });
});
