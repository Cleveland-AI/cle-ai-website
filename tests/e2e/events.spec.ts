// Port of every events check() in tests/bin/spec-check, against the fixture build. The clock is
// pinned (FIXTURES_NOW, see playwright.config.ts) to 6 pm on Oct 26 2026, the evening of
// "Tonight: lightning talks", so the upcoming/past split is fixed.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const fixtureEvents = readFileSync("tests/fixtures/dataset.ndjson", "utf8")
  .split("\n")
  .filter((l) => l.includes('"_type":"event"'))
  .map((l) => JSON.parse(l) as { slug: { current: string } });

async function get(page: Page, path: string) {
  const res = await page.goto(path);
  const main = await page.locator("main").evaluate((m) => m.outerHTML);
  return { status: res?.status(), html: await page.content(), main };
}

const order = (html: string, needles: string[]) => {
  const pos = needles.map((n) => html.indexOf(n));
  return pos.every((p) => p >= 0) && pos.every((p, i) => i === 0 || pos[i - 1] <= p);
};

type Ld = Record<string, unknown> & { location?: Record<string, never>; organizer?: Record<string, unknown> };
async function eventLd(page: Page): Promise<Ld | undefined> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b) as Ld).find((d) => d["@type"] === "Event");
}

test.describe("events archive", () => {
  test("Upcoming before Past; 12 past events, soonest upcoming first, RSVP on upcoming cards only", async ({ page }) => {
    const { status, main } = await get(page, "/events");
    expect(status, "/events renders").toBe(200);
    const upAt = main.indexOf(">Upcoming<");
    const pastAt = main.indexOf(">Past events<");
    expect(upAt, "Upcoming section comes before Past").toBeGreaterThanOrEqual(0);
    expect(upAt).toBeLessThan(pastAt);
    const upcoming = main.slice(upAt, pastAt);
    const past = main.slice(pastAt);

    expect(upcoming, "an event taking place today is under Upcoming").toContain("Tonight: lightning talks");
    expect(past).not.toContain("Tonight: lightning talks");
    const titlesUp = [...upcoming.matchAll(/wp-block-post-title[^>]*><a[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(titlesUp[0], "Upcoming is soonest first").toBe("Tonight: lightning talks");

    expect(upcoming.split("RSVP on Meetup").length - 1, "RSVP links on upcoming cards").toBeGreaterThanOrEqual(3);
    expect(past, "no RSVP links on past cards").not.toContain("RSVP on Meetup");

    expect(past.match(/wp-block-post-title/g)?.length, "Past shows 12 events").toBe(12);
    expect(past, "with a link to page 2").toContain('href="/events/page/2"');

    const mega = upcoming.indexOf("Mega Meetup at the Museum</a>");
    const card = upcoming.slice(upcoming.lastIndexOf("<li", mega), upcoming.indexOf("</li>", mega));
    expect(
      order(card, ["cle-event-meta__when", "Mega Meetup at the Museum", "Cleveland Museum of Natural History", "RSVP on Meetup"]),
      "each card: date, title, venue name, RSVP",
    ).toBe(true);
  });

  test("the second page of past events works; past the last page is a 404", async ({ page, request }) => {
    expect((await request.get("/events/page/3")).status()).toBe(404);
    expect((await request.get("/events/page/two")).status()).toBe(404);
    const first = await request.get("/events/page/1", { maxRedirects: 0 });
    expect(first.status()).toBe(308);
    expect(first.headers().location).toBe("/events");
    const { status, main } = await get(page, "/events/page/2");
    expect(status).toBe(200);
    const past = main.slice(main.indexOf(">Past events<"));
    expect(past.match(/wp-block-post-title/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(past).toContain('class="wp-block-query-pagination-previous"');
    expect(past).toContain('<span aria-current="page" class="page-numbers current">2</span>');
    expect(past).toContain('<a href="/events" class="wp-block-query-pagination-previous">Previous Page</a>');
  });

  test("the archive has the venue map with three pins, and the page title", async ({ page }) => {
    await page.goto("/events");
    await expect(page.locator("main h1")).toHaveText("Events");
    await expect(page.locator(".cle-map .cle-scene__pin")).toHaveCount(3);
    await expect(page).toHaveTitle("Meetup Events – CLE AI & DATA");
  });
});

test.describe("event pages", () => {
  test("a fully populated event: order, format, back link and JSON-LD", async ({ page }) => {
    const { status, main } = await get(page, "/events/mega-meetup-at-the-museum");
    expect(status).toBe(200);
    expect(
      order(main, [
        "wp-block-post-title",
        ">Upcoming<",
        "cle-event-meta__when",
        "Cleveland Museum of Natural History",
        "query=41.51152,-81.612877",
        "RSVP on Meetup",
        "wp-block-post-content",
        "Organized by",
        "All events",
      ]),
      "event page order: title, status, date/time, venue, map-linked address, RSVP, content, organizer, back link",
    ).toBe(true);
    expect(main, "date and time in the spec's format, date once").toMatch(
      /(Mon|Tue|Wednes|Thurs|Fri|Satur|Sun)[a-z]*day, \d{1,2} [A-Z][a-z]+ 20\d\d, 5:00 – 8:30 PM/,
    );
    expect(main, "back link uses the events archive URL").toContain('href="/events"');
    expect(main, "the organizer links where Meetup says").toContain('Organized by <a href="https://www.meetup.com/cleveland-ai-data/">CLE AI &amp; DATA</a>');
    await expect(page).toHaveTitle("Mega Meetup at the Museum – CLE AI & DATA");

    const ev = await eventLd(page);
    expect(ev, "Event JSON-LD present and valid JSON").toBeDefined();
    const start = String(ev!.startDate);
    expect(start).toMatch(/^\d{4}-\d\d-\d\dT17:00:00-0[45]:00$/);
    expect(String(ev!.endDate).endsWith(":30:00" + start.slice(-6)), "endDate ISO 8601 with offset").toBe(true);
    const loc = ev!.location as unknown as { "@type": string; address: { "@type": string }; geo: { latitude: number } };
    expect(loc["@type"]).toBe("Place");
    expect(loc.address["@type"]).toBe("PostalAddress");
    expect(loc.geo.latitude).toBe(41.51152);
    expect(ev!.organizer?.name).toBe("CLE AI & DATA");
    expect(ev!.organizer?.url).toBe("https://www.meetup.com/cleveland-ai-data/");
    expect(String(ev!.url).startsWith("https://www.meetup.com/"), "url is the Meetup RSVP link").toBe(true);
    expect(ev!.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(ev!.name).toBe("Mega Meetup at the Museum");
  });

  test("when CLE AI & DATA organizes, the JSON-LD marks it a 501(c)(3)", async ({ page }) => {
    await page.goto("/events/monthly-social-at-happy-dog");
    expect((await eventLd(page))?.organizer?.nonprofitStatus).toBe("https://schema.org/Nonprofit501c3");
  });

  test("past event: status Past, no RSVP button", async ({ page }) => {
    const { status, main } = await get(page, "/events/summer-in-the-flats");
    expect(status).toBe(200);
    expect(main).toContain(">Past<");
    expect(main).not.toContain("RSVP on Meetup");
    expect(main).not.toContain("wp-element-button");
  });

  test("December event: EST offset and correct local time", async ({ page }) => {
    const { status, html } = await get(page, "/events/cle-ai-and-data-monthly-social-at-happy-dog-december");
    expect(status).toBe(200);
    expect((await eventLd(page))?.startDate).toBe("2026-12-10T18:00:00-05:00");
    expect(html).toContain("Thursday, 10 December 2026, 6:00 – 8:00 PM");
  });

  test("October event: EDT offset, AM and PM both shown", async ({ page }) => {
    const { status, html } = await get(page, "/events/october-workshop");
    expect(status).toBe(200);
    expect(html).toContain("2026-10-22T10:00:00-04:00");
    expect(html).toContain("Thursday, 22 October 2026, 10:00 AM – 1:00 PM");
  });

  test("partial event: name-only venue, no end, no RSVP, no organizer label", async ({ page }) => {
    const { status, main } = await get(page, "/events/pop-up-coffee-chat");
    expect(status).toBe(200);
    expect(main).toContain("Rising Star Coffee");
    expect(main).not.toContain("RSVP on Meetup");
    expect(main).not.toContain("Organized by");
    const afterWhen = main.split("cle-event-meta__when")[1].slice(0, 200).replace(/<[^>]+>/g, "");
    expect(afterWhen).not.toContain(" – ");
  });

  test("event with no venue data omits the venue block; its JSON-LD has no empty fields", async ({ page }) => {
    const { status, main } = await get(page, "/events/online-reading-group");
    expect(status).toBe(200);
    expect(main).not.toContain("cle-event-meta__where");
    const ev = (await eventLd(page))!;
    expect(ev).not.toHaveProperty("location");
    for (const v of Object.values(ev)) {
      expect(v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && v && !Object.keys(v).length)).toBe(false);
    }
  });

  test("an event with an image shows it wide on its page and as a 16/9 link in the past grid", async ({ page }) => {
    await page.goto("/events/photo-night");
    const figure = page.locator("main > .wp-block-cle-event-meta + figure.alignwide.wp-block-post-featured-image");
    await expect(figure).toHaveCount(1);
    await expect(figure.locator("img")).toHaveAttribute("src", /^\/migrated\/1fb2bec663a7819b7dca10af69113ff6f03da463-1080x1080\.png$/);
    await expect(page.locator("main > figure.wp-block-post-featured-image + .wp-block-post-content")).toHaveCount(1);
    await page.goto("/events");
    const card = page.locator(".wp-block-post-template.is-layout-grid > li").filter({ hasText: "Photo night" });
    await expect(card.locator('figure.wp-block-post-featured-image[style*="aspect-ratio"] > a[href="/events/photo-night"] > img')).toHaveCount(1);
    // Cards without an image have no figure.
    await expect(page.locator(".wp-block-post-template.is-layout-grid > li").filter({ hasText: "October workshop" }).locator("figure")).toHaveCount(0);
  });

  test("an event with no image has no image element and no gap", async ({ page }) => {
    for (const slug of ["mega-meetup-at-the-museum", "bare-event"]) {
      await page.goto(`/events/${slug}`);
      await expect(page.locator("main .wp-block-post-featured-image")).toHaveCount(0);
      await expect(page.locator("main img")).toHaveCount(0);
      // The status/date block is followed directly by the content.
      await expect(page.locator("main > .wp-block-cle-event-meta + .wp-block-post-content")).toHaveCount(1);
    }
  });

  test("every event returns 200; an unknown slug is a 404", async ({ request }) => {
    expect(fixtureEvents.length).toBeGreaterThan(20);
    const bad: string[] = [];
    for (const e of fixtureEvents) {
      const res = await request.get(`/events/${e.slug.current}`);
      if (res.status() !== 200) bad.push(`${e.slug.current} ${res.status()}`);
    }
    expect(bad).toEqual([]);
    expect((await request.get("/events/no-such-event")).status()).toBe(404);
  });
});

test.describe("site shell", () => {
  test("header: logo home, menus from site settings, search to /search", async ({ page }) => {
    await page.goto("/events");
    const header = page.locator("header.cle-header");
    await expect(header.locator("a.wp-block-cle-logo")).toHaveAttribute("href", "/");
    await expect(header.locator('nav[aria-label="Main"] a')).toHaveText(["Home", "Events", "Shop", "Donate", "About", "Sponsors", "Get involved"]);
    await expect(header.locator('nav[aria-label="Main"] .current-menu-item > a')).toHaveText("Events");
    await expect(header.locator('nav[aria-label="Social"] a')).toHaveText(["Substack", "Meetup", "Discord"]);
    const form = header.locator("form.wp-block-search");
    await expect(form).toHaveAttribute("action", "/search");
    await expect(form.locator("input")).toHaveAttribute("name", "q");
  });

  test("the header search submits to /search?q=", async ({ page }) => {
    await page.goto("/events");
    await page.locator(".cle-search summary").click();
    await page.locator(".cle-search input").fill("zebra");
    await page.locator(".cle-search input").press("Enter");
    await expect(page).toHaveURL(/\/search\?q=zebra$/);
  });

  test("footer: Dot, legal links and the EIN line", async ({ page }) => {
    await page.goto("/events");
    const footer = page.locator("footer.cle-footer");
    await expect(footer.locator(".cle-dot--peek img")).toHaveAttribute("src", "/assets/illustrations/dot-peek.webp");
    await expect(footer.locator(".cle-footer__legal a")).toHaveText(["Privacy policy", "Code of conduct"]);
    await expect(footer).toContainText("CLE AI & DATA is a 501(c)(3) nonprofit, run by volunteers. Cleveland AI and Data, EIN 42-2843242.");
  });

  test("the announcement bar is on every page except the homepage", async ({ page }) => {
    await page.goto("/events/october-workshop");
    const bar = page.locator(".cle-next-event--bar");
    await expect(bar).toHaveCount(1);
    await expect(bar.locator(".cle-next-event__line > a").first()).toHaveText("Tonight: lightning talks");
    await page.goto("/");
    await expect(page.locator(".cle-next-event--bar")).toHaveCount(0);
    await expect(page.locator("header.cle-header")).toHaveCount(1);
  });

  test("the logo's drop-in plays once per visit", async ({ page }) => {
    await page.goto("/events");
    await expect(page.locator("html")).toHaveClass(/\bcle-js\b/);
    await expect(page.locator("html")).not.toHaveClass(/cle-logo-seen/);
    await page.goto("/events/october-workshop");
    await expect(page.locator("html")).toHaveClass(/\bcle-logo-seen\b/);
  });

  test("phone: the overlay menu opens, moves focus, and closes on Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/events");
    const open = page.locator(".cle-nav__open");
    const panel = page.locator(".cle-nav__panel");
    await expect(panel).toBeHidden();
    await open.click();
    await expect(panel).toHaveClass(/is-open/);
    await expect(open).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".cle-nav__close")).toBeFocused();
    await expect(page.locator("body")).toHaveClass(/cle-nav-is-open/);
    await page.keyboard.press("Escape");
    await expect(panel).not.toHaveClass(/is-open/);
    await expect(open).toBeFocused();
    await expect(open).toHaveAttribute("aria-expanded", "false");
    await open.click();
    await page.locator(".cle-nav__close").click();
    await expect(panel).not.toHaveClass(/is-open/);
    await expect(open).toBeFocused();
  });

  test("Dot hops after three pokes", async ({ page }) => {
    await page.goto("/events");
    const dot = page.locator("footer .cle-dot");
    await dot.scrollIntoViewIfNeeded();
    for (let i = 0; i < 3; i++) await dot.click();
    await expect(dot).toHaveClass(/is-hopping/);
    await expect(page.locator(".cle-confetti")).toHaveCount(1);
  });
});
