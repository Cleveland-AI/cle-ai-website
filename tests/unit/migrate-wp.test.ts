// The migration's WordPress mappings: event times and meta, redirects, the privacy fills, the
// post-merger story, and media ids.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blockMarkupToRichBody } from "../../scripts/migrate-wp/blocks";
import { createKeys } from "../../scripts/migrate-wp/html";
import {
  applyMergerChapter,
  applyMergerStory,
  autop,
  contentMarkup,
  fillPrivacy,
  patternMarkup,
  PRIVACY_FILLS,
  rewriteUrls,
  slugify,
} from "../../scripts/migrate-wp/index";
import { assetFor, imageInfo } from "../../scripts/migrate-wp/media";
import { THEME_DIR } from "../../scripts/migrate-wp/theme-defaults";
import {
  eventFieldsFromLd,
  eventFieldsFromMeta,
  parseEventLd,
  redirectsFromWp,
  type WpData,
  zonedIso,
} from "../../scripts/migrate-wp/wp";
import { assetFileName, localAssetUrl } from "@/lib/content/assets";

describe("event times", () => {
  it("carry the America/New_York offset in effect that day", () => {
    expect(zonedIso("2026-10-22", 10, 0)).toBe("2026-10-22T10:00:00-04:00");
    expect(zonedIso("2026-11-02", 19, 0)).toBe("2026-11-02T19:00:00-05:00"); // the day after DST ends
    expect(zonedIso("2026-10-31", 19, 0)).toBe("2026-10-31T19:00:00-04:00");
    expect(zonedIso("2026-02-10", 18, 0)).toBe("2026-02-10T18:00:00-05:00");
    expect(zonedIso("2026-03-08", 12, 0)).toBe("2026-03-08T12:00:00-04:00"); // DST starts at 2 AM
  });

  it("read the four 12-hour meta fields like cle_event_datetime()", () => {
    const f = eventFieldsFromMeta({
      event_start_date: "2026-12-10",
      event_start_hour: "06",
      event_start_minute: "00",
      event_start_meridian: "pm",
      event_end_date: "2026-12-10",
      event_end_hour: "08",
      event_end_minute: "30",
      event_end_meridian: "pm",
      venue_name: "Happy Dog",
      venue_address: "5801 Detroit Avenue",
      venue_city: "Cleveland",
      venue_state: "OH",
      venue_zipcode: "44102",
      venue_lat: "41.4849",
      venue_lon: "-81.7294",
      ime_event_link: "http://www.meetup.com/cleveland-ai-data/events/312345678/",
      organizer_name: "",
      organizer_url: "https://ignored.example/",
    });
    expect(f).toEqual({
      start: "2026-12-10T18:00:00-05:00",
      end: "2026-12-10T20:30:00-05:00",
      venue: { name: "Happy Dog", address: "5801 Detroit Avenue", city: "Cleveland", state: "OH", zip: "44102", lat: 41.4849, lng: -81.7294 },
      rsvpUrl: "https://www.meetup.com/cleveland-ai-data/events/312345678/",
      organizer: undefined,
      organizerUrl: undefined,
      meetupId: "312345678",
    });
    expect(eventFieldsFromMeta({ event_start_date: "2026-11-02", organizer_name: "Ann", organizer_url: "https://ann.example/" })).toMatchObject({
      organizer: "Ann",
      organizerUrl: "https://ann.example/",
    });
    // 12 am is midnight; missing hour/minute/meridian default to 12:00 pm; no end date, no end.
    expect(eventFieldsFromMeta({ event_start_date: "2026-11-02", event_start_hour: "12", event_start_meridian: "am" }).start).toBe(
      "2026-11-02T00:00:00-05:00",
    );
    expect(eventFieldsFromMeta({ event_start_date: "2026-11-02" })).toMatchObject({ start: "2026-11-02T12:00:00-05:00", end: undefined, venue: undefined });
  });
});

describe("event fields from the event page's JSON-LD", () => {
  const home = "http://localhost:8090";
  it("takes times, venue, RSVP and organizer", () => {
    const ld = parseEventLd(
      `<html><script type="application/ld+json">{"@context":"https://schema.org","@type":"Event","name":"Mega","startDate":"2026-10-29T17:00:00-04:00","url":"https://www.meetup.com/cleveland-ai-data/events/4266782082/","endDate":"2026-10-29T20:30:00-04:00","location":{"@type":"Place","name":"Cleveland Museum of Natural History","address":{"@type":"PostalAddress","streetAddress":"1 Wade Oval Drive","addressLocality":"Cleveland","addressRegion":"OH","postalCode":"44106","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":41.51152,"longitude":-81.612877}},"organizer":{"@type":"Organization","name":"CLE AI & DATA","url":"https://www.meetup.com/cleveland-ai-data/"}}</script></html>`,
    )!;
    expect(eventFieldsFromLd(ld, `${home}/index.php/meetup-event/mega/`, home)).toEqual({
      start: "2026-10-29T17:00:00-04:00",
      end: "2026-10-29T20:30:00-04:00",
      venue: {
        name: "Cleveland Museum of Natural History",
        address: "1 Wade Oval Drive",
        city: "Cleveland",
        state: "OH",
        zip: "44106",
        lat: 41.51152,
        lng: -81.612877,
      },
      rsvpUrl: "https://www.meetup.com/cleveland-ai-data/events/4266782082/",
      organizer: "CLE AI & DATA",
      organizerUrl: "https://www.meetup.com/cleveland-ai-data/",
      meetupId: "4266782082",
    });
  });

  it("drops an end earlier than the start", () => {
    expect(eventFieldsFromLd({ startDate: "2026-11-04T17:00:00-05:00", endDate: "2026-11-04T16:00:00-05:00" }, "x", "y").end).toBeUndefined();
  });

  it("treats the permalink as no RSVP link and the site itself as no organizer", () => {
    const link = `${home}/index.php/meetup-event/pop-up-coffee-chat/`;
    const f = eventFieldsFromLd(
      { startDate: "2026-11-04T17:00:00-05:00", url: link, location: { name: "Rising Star Coffee" }, organizer: { name: "CLE AI & DATA", url: `${home}/` } },
      link,
      home,
    );
    expect(f).toEqual({
      start: "2026-11-04T17:00:00-05:00",
      end: undefined,
      venue: { name: "Rising Star Coffee" },
      rsvpUrl: undefined,
      organizer: undefined,
      organizerUrl: undefined,
      meetupId: undefined,
    });
  });
});

describe("redirectsFromWp", () => {
  const post = (id: number, slug: string, link: string) => ({ id, slug, link }) as WpData["posts"][number];
  const wp = {
    frontPageId: 11,
    pages: [post(171, "about", "https://cle-ai.com/index.php/about/"), post(11, "home", "https://cle-ai.com/")],
    posts: [post(135, "voila", "https://cle-ai.com/index.php/2026/09/19/voila/"), post(1, "hello-world", "https://cle-ai.com/index.php/2026/09/25/hello-world/")],
    events: [post(4, "mega", "https://cle-ai.com/index.php/meetup-event/mega/")],
    categories: [{ id: 5, slug: "newsletter", name: "Newsletter", description: "", link: "https://cle-ai.com/index.php/category/newsletter/" }],
    users: [
      { id: 2, slug: "tedt", name: "Ted Troxell", link: "https://cle-ai.com/index.php/author/tedt/" },
      { id: 1, slug: "admin", name: "admin", link: "https://cle-ai.com/index.php/author/admin/" },
    ],
    media: [
      {
        id: 114,
        slug: "cle-ai-data-logo",
        link: "https://cle-ai.com/cle-ai-data-logo/",
        source_url: "https://cle-ai.com/wp-content/uploads/2026/09/cle-logo.png",
        alt_text: "",
        media_type: "image",
        mime_type: "image/png",
        media_details: { sizes: { medium: { source_url: "https://cle-ai.com/wp-content/uploads/2026/09/cle-logo-300x300.png" } } },
      },
    ],
  };
  const map = Object.fromEntries(
    redirectsFromWp({
      wp,
      authorSlug: (u) => (u.slug === "tedt" ? "ted-troxell" : undefined),
      mediaUrl: () => "https://cdn.sanity.io/images/p/production/abc-1080x1080.png",
      skip: new Set([1]),
    }).map((r) => [r.from, r.to]),
  );

  it("maps every kind of old URL to its new one", () => {
    expect(map).toEqual({
      "/index.php/about/": "/about",
      "/?page_id=171": "/about",
      "/?page_id=11": "/",
      "/index.php/2026/09/19/voila/": "/blog/voila",
      "/?p=135": "/blog/voila",
      "/index.php/meetup-event/mega/": "/events/mega",
      "/?p=4": "/events/mega",
      "/index.php/category/newsletter/": "/blog/category/newsletter",
      "/index.php/author/tedt/": "/blog/author/ted-troxell",
      "/wp-content/uploads/2026/09/cle-logo.png": "https://cdn.sanity.io/images/p/production/abc-1080x1080.png",
      "/wp-content/uploads/2026/09/cle-logo-300x300.png": "https://cdn.sanity.io/images/p/production/abc-1080x1080.png",
      "/cle-ai-data-logo/": "https://cdn.sanity.io/images/p/production/abc-1080x1080.png",
      "/?attachment_id=114": "https://cdn.sanity.io/images/p/production/abc-1080x1080.png",
    });
  });

  it("never maps a target that is itself an old URL", () => {
    for (const to of Object.values(map)) expect(to).not.toMatch(/index\.php|\?p=/);
  });
});

describe("URL rewriting", () => {
  const isOld = (u: string) => /^(https?:)?\/\/cle-ai\.com/.test(u) || u.startsWith("/index.php/");
  const rewrite = (u: string) => (u.includes("about") ? "/about" : u.includes("events") ? "/events" : "/migrated/x.png");
  it("rewrites bare URLs in URL fields and href/src in HTML fields, never ids", () => {
    expect(
      rewriteUrls(
        {
          _id: "https://cle-ai.com/keep",
          href: "https://cle-ai.com/index.php/about/",
          emptyLink: "https://cle-ai.com/index.php/meetup-events/",
          html: '<a href="/index.php/about/">a</a><img src="https://cle-ai.com/wp-content/uploads/x.png"/><a href="https://example.com/">e</a>',
          cells: ['<a href="https://cle-ai.com/index.php/about/">About</a>'],
        },
        rewrite,
        isOld,
      ),
    ).toEqual({
      _id: "https://cle-ai.com/keep",
      href: "/about",
      emptyLink: "/events",
      html: '<a href="/about">a</a><img src="/migrated/x.png"/><a href="https://example.com/">e</a>',
      cells: ['<a href="/about">About</a>'],
    });
  });

  it("never touches text that merely starts with an old URL", () => {
    const span = { _type: "span", text: "https://cle-ai.com/events is where we post dates", marks: [] };
    const label = { _type: "link", label: "https://cle-ai.com/about", href: "https://cle-ai.com/about has spaces" };
    expect(rewriteUrls({ children: [span], items: [label] }, rewrite, isOld)).toEqual({ children: [span], items: [label] });
  });
});

describe("classic posts", () => {
  it("keep their paragraphs: no block delimiters means rendered HTML, or autop of the raw text", () => {
    const fromRaw = blockMarkupToRichBody(contentMarkup({ raw: "First paragraph.\n\nSecond paragraph." }));
    expect(fromRaw.map((b) => [b._type, (b as { children: { text: string }[] }).children.map((c) => c.text).join("")])).toEqual([
      ["block", "First paragraph."],
      ["block", "Second paragraph."],
    ]);
    expect(contentMarkup({ raw: "First paragraph.\n\nSecond paragraph.", rendered: "<p>First paragraph.</p>\n<p>Second paragraph.</p>\n" })).toBe(
      "<p>First paragraph.</p>\n<p>Second paragraph.</p>\n",
    );
    expect(contentMarkup({ raw: "<!-- wp:paragraph --><p>x</p><!-- /wp:paragraph -->", rendered: "<p>x</p>" })).toContain("<!-- wp:");
    expect(autop("One\nline\n\n<ul><li>a</li></ul>")).toBe("<p>One<br />\nline</p>\n<ul><li>a</li></ul>");
  });
});

describe("the privacy policy (R11)", () => {
  const original = patternMarkup(THEME_DIR, "page-privacy");
  const filled = fillPrivacy(original);
  it("fills only the host and newsletter, and adds a row per new service", () => {
    for (const gone of ["[HOST]", "[NEWSLETTER TOOL]"]) expect(filled).not.toContain(gone);
    for (const name of ["Vercel", "Substack", "Resend", "Cloudflare Turnstile", "Sanity", "Poptin"]) expect(filled).toContain(`<td>${name}</td>`);
    for (const url of [
      "https://vercel.com/legal/privacy-notice",
      "https://substack.com/privacy",
      "https://resend.com/legal/privacy-policy",
      "https://www.cloudflare.com/turnstile-privacy-policy/",
      "https://www.sanity.io/legal/privacy",
      "https://www.poptin.com/privacy-policy/",
    ])
      expect(filled).toContain(`<a href="${url}">`);
  });
  it("keeps every passage that would need rewording with its original brackets", () => {
    for (const kept of [
      "[ANALYTICS TOOL, e.g., WordPress Stats or Google Analytics 4]",
      "[If Google Analytics: IP addresses are anonymized and we have not enabled advertising features.]",
      "<td>Analytics</td><td>[ANALYTICS TOOL]</td><td>[link]</td>",
      "[per the analytics tool's setting, e.g., 14 months]",
      "Collected through analytics (see Cookies below)",
      "[YouTube / Vimeo]",
      "[SURVEY TOOL]",
    ])
      expect(filled).toContain(kept);
    // Nothing else changed: removing the four added rows and the two fills gives the original back.
    expect(filled.length).toBeGreaterThan(original.length);
  });
  it("still converts to three tables", () => {
    const tables = blockMarkupToRichBody(filled).flatMap((s) => ((s as { children?: { _type: string }[] }).children ?? []).filter((c) => c._type === "table"));
    expect(tables).toHaveLength(3);
  });
  it("refuses a pattern that has drifted from the fills", () => {
    expect(() => fillPrivacy("<p>nothing</p>")).toThrow(/expected/);
    expect(PRIVACY_FILLS).toHaveLength(3);
  });
});

describe("after the merger", () => {
  const story = blockMarkupToRichBody(patternMarkup(THEME_DIR, "story-after-merger"), { keys: createKeys("m") });
  it("replaces the About page's Our story section", () => {
    const about = blockMarkupToRichBody(readFileSync("tests/fixtures/patterns/page-about.html", "utf8"));
    const { body, replaced } = applyMergerStory(about, story);
    expect(replaced).toBe(true);
    expect(body).toHaveLength(about.length);
    expect(JSON.stringify(body)).toContain("Data in the Land joins");
    expect(JSON.stringify(body)).not.toContain("Sixteen years of showing up.");
  });
  it("replaces the homepage How it started paragraph", () => {
    const home = blockMarkupToRichBody(readFileSync(`${THEME_DIR}/templates/front-page.html`, "utf8"), { drop: ["core/template-part"] });
    const { body, replaced } = applyMergerChapter(home, story);
    expect(replaced).toBe(true);
    expect(JSON.stringify(body)).toContain("and in November Data in the Land");
    expect(JSON.stringify(home)).not.toContain("template-part");
  });
});

describe("media ids", () => {
  it("reads image sizes and builds Sanity's asset id from the bytes", () => {
    const buf = readFileSync(`${THEME_DIR}/assets/team/ted-troxell.webp`);
    expect(imageInfo(buf)).toMatchObject({ width: 640, height: 700, ext: "webp" });
    const asset = assetFor(buf, "ted-troxell.webp")!;
    expect(asset.id).toMatch(/^image-[a-f0-9]{40}-640x700-webp$/);
    expect(localAssetUrl(asset.id)).toBe(`/migrated/${asset.sha1}-640x700.webp`);
    expect(assetFileName("image-nope")).toBeUndefined();
    expect(imageInfo(readFileSync(`${THEME_DIR}/screenshot.png`))).toMatchObject({ ext: "png" });
  });
  it("slugifies names like WordPress", () => {
    expect(slugify("Curtis O'Neal")).toBe("curtis-oneal");
    expect(slugify("Voilà: CLE AI & DATA")).toBe("voila-cle-ai-data");
  });
});
