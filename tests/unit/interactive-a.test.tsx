// Interactive blocks, part one: the cle/team, cle/bead-timeline, cle/hotspot-scene, cle/embed-form,
// cle/ticker and cle/timeline sections of tests/php/test-interactive.php, test-hotspots.php and
// test-pages.php, plus the confetti and count-up helpers. The browser behaviour is in
// tests/e2e/interactive-a.spec.ts.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeadTimeline } from "@/blocks/bead-timeline/BeadTimeline";
import { EmbedForm } from "@/blocks/embed-form/EmbedForm";
import { HotspotScene, plain } from "@/blocks/hotspot-scene/HotspotScene";
import { blockComponents } from "@/blocks/registry";
import { TeamView, personToMember, type TeamMember } from "@/blocks/team/Team";
import { TickerView, buildTickerItems } from "@/blocks/ticker/Ticker";
import { TimelineView, buildTimeline } from "@/blocks/timeline/Timeline";
import { fireConfetti } from "@/lib/confetti";
import { countFrame, splitCounts, startCountUp } from "@/lib/figures.client";
import { sanitize } from "@/lib/sanitize";
import { getPeople, getTickerPosts } from "@/lib/content/queries";
import { blockMarkupToRichBody } from "../../scripts/migrate-wp/blocks";
import { EVENTS, NOW } from "./helpers/fixtures";

const count = (s: string, needle: string) => s.split(needle).length - 1;

const people = readFileSync("tests/fixtures/dataset.ndjson", "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as { _type: string; order?: number; hidden?: boolean })
  .filter((d) => d._type === "person");

describe("registry", () => {
  it("registers the six blocks of this task", () => {
    for (const t of ["cleTeam", "cleBeadTimeline", "cleHotspotScene", "cleEmbedForm", "cleTicker", "cleTimeline"]) {
      expect(blockComponents[t], t).toBeTypeOf("function");
    }
  });
});

describe("cle/team", () => {
  const seven = people.map((p) => personToMember(p as never));
  const html = renderToStaticMarkup(<TeamView members={seven} leadLabel="Leadership" />);

  it("seven people become seven cards, each opening a bio card", () => {
    expect(seven).toHaveLength(7);
    expect(count(html, '<li class="cle-team-card')).toBe(7);
    expect(count(html, "<dialog")).toBe(7);
    expect(count(html, 'class="cle-team-card__open"')).toBe(7);
    expect(html).toContain('<ul class="cle-team-cards wp-block-cle-team">');
  });

  it("a clickable LinkedIn logo on each card that has a LinkedIn", () => {
    expect(count(html, 'class="cle-team-card__in"')).toBe(7);
    expect(html).toContain('href="https://www.linkedin.com/in/juliana-novic/"');
    expect(html).toContain("Julie Novic on LinkedIn");
    expect(html).toContain("(opens in a new tab)");
  });

  it("exactly three people carry the Leadership label, on the card and in the modal", () => {
    expect(count(html, 'class="cle-team-card__lead"')).toBe(3);
    expect(count(html, 'class="cle-team-modal__lead"')).toBe(3);
    expect(count(html, ">Leadership<")).toBe(6);
  });

  it("everyone's bio is in the page, with the apostrophe escaped", () => {
    expect(html).toContain("Ted Troxell is President of CLE AI &amp; DATA");
    expect(html).toContain("Curtis O’Neal is an AI solutions architect");
    expect(html).toContain("Helen Shere is Head of Mentorship and Education");
    expect(html).not.toContain("cle-team-card__initials");
  });

  it("a person marked hidden is not shown", () => {
    const out = renderToStaticMarkup(<TeamView members={[{ name: "A", hidden: true }, { name: "B" }]} leadLabel="Leadership" />);
    expect(out).not.toContain(">A<");
    expect(out).toContain(">B<");
  });

  it("a person with no name is not shown, and nobody at all renders nothing", () => {
    expect(renderToStaticMarkup(<TeamView members={[{ name: "  " }]} leadLabel="Leadership" />)).toBe("");
    expect(renderToStaticMarkup(<TeamView members={[]} leadLabel="Leadership" />)).toBe("");
  });

  const three: TeamMember[] = [
    { photo: "ted-troxell", name: "Ted Troxell", role: "Operations", lead: true, bio: "Runs the nights.", linkedin: "https://www.linkedin.com/in/x", site: "https://ted.example.com" },
    { photo: "will-tatz", name: "Will Tatz", role: "Community", bio: "Says hello." },
    { photo: "julie-novic", name: "Julie Novic", role: "Finance" },
  ];
  const t2 = renderToStaticMarkup(<TeamView members={three} leadLabel="Leadership" />);

  it("a modal card for each person with a bio, LinkedIn or website, opened from their photo", () => {
    expect(count(t2, '<dialog class="cle-team-modal"')).toBe(2);
    expect(count(t2, 'class="cle-team-card__open"')).toBe(2);
  });

  it("the card has the bio, LinkedIn and personal website", () => {
    expect(t2).toContain("Runs the nights.");
    expect(t2).toContain('href="https://www.linkedin.com/in/x"');
    expect(t2).toContain('href="https://ted.example.com"');
    expect(t2).toContain(">Website");
  });

  it('"Meet ..." moves between the people who have cards', () => {
    expect(t2).toContain("Meet Will");
    expect(t2).toContain("Meet Ted");
    expect(t2).not.toContain("Meet Julie");
  });

  it("unsafe links are dropped", () => {
    const bad = renderToStaticMarkup(<TeamView members={[{ name: "X", linkedin: "javascript:alert(1)" }]} leadLabel="Leadership" />);
    expect(bad).not.toContain("javascript:");
    expect(bad).not.toContain("cle-team-modal");
  });

  it("a link typed without its scheme becomes https; other schemes stay refused", () => {
    const out = renderToStaticMarkup(<TeamView members={[{ name: "X", linkedin: "www.linkedin.com/in/x", site: "ftp://x.test" }]} leadLabel="L" />);
    expect(out).toContain('href="https://www.linkedin.com/in/x"');
    expect(out).not.toContain("ftp:");
    expect(out).not.toContain("Website");
  });

  it('someone without a headshot yet shows their initials ("NP")', () => {
    const np = renderToStaticMarkup(<TeamView members={[{ name: "New Person", photo: "nobody", bio: "Hi." }]} leadLabel="Leadership" />);
    expect(np).toContain(">NP<");
    expect(np).toContain("cle-team-card__initials");
    expect(np).not.toContain("<img");
    // and without any photo field at all, from a person document
    const doc = personToMember({ _id: "p", name: "New Person", role: "Volunteer" } as never);
    expect(renderToStaticMarkup(<TeamView members={[doc]} leadLabel="Leadership" />)).toContain(">NP<");
  });

  it("bundled headshots carry a version query, so a replaced photo shows right away", () => {
    expect(t2).toMatch(/src="\/assets\/team\/ted-troxell\.webp\?v=[0-9a-f]{8}"/);
    expect(t2).toContain('class="cle-team-card__photo"');
    expect(t2).toContain('width="640" height="700"');
  });

  it("the version list matches the files in public/assets/team", () => {
    const versions = JSON.parse(readFileSync("src/blocks/team/photo-versions.json", "utf8")) as Record<string, string>;
    const files = readdirSync("public/assets/team").filter((f) => f.endsWith(".webp"));
    expect(Object.keys(versions).sort()).toEqual(files.map((f) => f.replace(/\.webp$/, "")).sort());
    for (const f of files) {
      const sha = createHash("sha1").update(readFileSync(`public/assets/team/${f}`)).digest("hex").slice(0, 8);
      expect(versions[f.replace(/\.webp$/, "")], f).toBe(sha);
    }
  });

  // Sanity asset ids are content hashes (image-<sha1>-WxH-ext), so replacing a photo uploads a new asset with
  // a new id, and the URL built from it changes; nothing like ?v= is needed for those photos.
  it("a person document's photo URL is named by its asset reference, so a replaced photo has a new URL", () => {
    const url = (ref: string) => {
      const m = personToMember({ _id: "p", name: "A", photo: { _type: "image", asset: { _ref: ref } } } as never);
      return /src="([^"]+)"/.exec(renderToStaticMarkup(<TeamView members={[m]} leadLabel="L" />))![1];
    };
    const a = url("image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-640x700-webp");
    const b = url("image-bbbbbbbbbbbbbbbbbbbbbbbbbbaaaaaaaaaaaaaa-640x700-webp");
    expect(a).toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-640x700.webp");
    expect(a).not.toBe(b);
  });
});

describe("person documents (getPeople)", () => {
  beforeEach(() => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_NOW", NOW.toISOString());
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns the seven, in `order`, with nobody hidden", async () => {
    const got = await getPeople();
    const expected = people.filter((p) => !p.hidden).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    expect(got.map((p) => p.name)).toEqual(expected.map((p) => (p as unknown as { name: string }).name));
    expect(got).toHaveLength(7);
    expect(got[0].name).toBe("Ted Troxell");
  });

  it("leaves out a hidden person and orders by `order`", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "cle-people-"));
    const file = join(dir, "d.ndjson");
    const docs = [
      { _id: "person-b", _type: "person", name: "Bee", order: 2 },
      { _id: "person-h", _type: "person", name: "Hidden", order: 0, hidden: true },
      { _id: "person-a", _type: "person", name: "Ay", order: 1, hidden: false },
      { _id: "person-c", _type: "person", name: "Cee" },
    ];
    writeFileSync(file, docs.map((d) => JSON.stringify(d)).join("\n"));
    vi.stubEnv("FIXTURES_PATH", file);
    expect((await getPeople()).map((p) => p.name)).toEqual(["Ay", "Bee", "Cee"]);
  });
});

describe("cle/bead-timeline", () => {
  const milestones = [
    { year: "2010", title: "Cleveland Big Data begins", body: "Doug." },
    { year: "2017", title: "Cleveland AI forms", body: "Second." },
    { year: "2024", title: "CLE AI & DATA", body: "Merge." },
    { year: "2026", title: "A nonprofit, officially", body: "501(c)(3)." },
  ];
  const html = renderToStaticMarkup(<BeadTimeline milestones={milestones} open={-1} />);

  it("the block's four default beads, only the latest open, the rest marked closed", () => {
    expect(count(html, 'class="cle-beads__bead"')).toBe(4);
    expect(count(html, 'aria-expanded="true"')).toBe(1);
    expect(count(html, 'aria-expanded="false"')).toBe(3);
    expect(count(html, " data-closed")).toBe(3);
    expect(html).toContain('class="cle-beads wp-block-cle-bead-timeline"');
  });

  it("every story is in the page for search and no-script readers", () => {
    expect(count(html, "<h3 id=")).toBe(4);
    expect(html).toContain("A nonprofit, officially");
  });

  it("`open` counts from 0; a skipped milestone with no year is dropped", () => {
    const first = renderToStaticMarkup(<BeadTimeline milestones={[...milestones, { year: " ", title: "x" }]} open={0} />);
    expect(count(first, 'class="cle-beads__bead"')).toBe(4);
    expect(first).toMatch(/id="[^"]*-b0"[^>]*aria-expanded="true"/);
    expect(count(first, 'aria-expanded="true"')).toBe(1);
  });

  it("no milestones renders nothing", () => {
    expect(renderToStaticMarkup(<BeadTimeline milestones={[]} />)).toBe("");
  });
});

describe("cle/embed-form", () => {
  const SANDBOX = "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox";
  const html = (p: Parameters<typeof EmbedForm>[0]) => renderToStaticMarkup(<EmbedForm {...p} />);

  it("renders nothing for an empty or non-https URL", () => {
    expect(html({ url: "" })).toBe("");
    expect(html({ url: undefined })).toBe("");
    expect(html({ url: "http://example.com/form" })).toBe("");
    expect(html({ url: "javascript:alert(1)" })).toBe("");
    expect(html({ url: "//example.com/form" })).toBe("");
  });

  it("the iframe carries the theme's sandbox string, a title and a lazy src", () => {
    const out = html({ url: "https://timcleaidata.substack.com/embed", title: "Newsletter signup", height: 320 });
    expect(out).toContain('src="https://timcleaidata.substack.com/embed"');
    expect(out).toContain(`sandbox="${SANDBOX}"`);
    expect(out).toContain('title="Newsletter signup"');
    expect(out).toContain('loading="lazy"');
    expect(out.toLowerCase()).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(out).toContain('class="wp-block-cle-embed-form"');
  });

  it('allow="payment" only when allowPayment is set', () => {
    expect(html({ url: "https://example.com/f" })).not.toContain("allow=");
    expect(html({ url: "https://example.com/f", allowPayment: false })).not.toContain("allow=");
    expect(html({ url: "https://givebutter.com/embed/c/cle-ai", allowPayment: true })).toMatch(
      /<iframe[^>]*src="https:\/\/givebutter.com\/embed\/c\/cle-ai"[^>]*allow="payment"/,
    );
  });

  it("enforces a minimum height of 200", () => {
    expect(html({ url: "https://example.com/f", height: 50 })).toContain('height="200"');
    expect(html({ url: "https://example.com/f", height: 640 })).toContain('height="640"');
    expect(html({ url: "https://example.com/f" })).toContain('height="720"');
  });

  it("the fallback link opens the form, or an https linkUrl; a non-https one is ignored", () => {
    expect(html({ url: "https://example.com/f" })).toContain('href="https://example.com/f"');
    expect(html({ url: "https://example.com/f", linkUrl: "http://insecure.example" })).toContain('href="https://example.com/f"');
    const out = html({ url: "https://givebutter.com/embed/c/cle-ai", linkUrl: "https://givebutter.com/cle-ai", linkLabel: "Open the donation page in a new tab" });
    expect(out).toContain('href="https://givebutter.com/cle-ai"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener"');
    expect(out).toContain(">Open the donation page in a new tab<");
  });

  it("a blank title falls back to Form", () => {
    expect(html({ url: "https://example.com/f", title: "  " })).toContain('title="Form"');
  });
});

describe("cle/hotspot-scene", () => {
  const image = { _type: "image", asset: { _type: "reference", _ref: "image-963e5074c9145a34bd065c7ad39b44e6b1ca32f5-640x700-webp" } };
  const base = { heading: "Scene", markerStyle: "icon", hotspots: [{ _key: "a", x: 10, y: 10, title: "A", body: "B", icon: "pin" }] };

  it("the scene frame is a hotspots root with icon markers", () => {
    const out = renderToStaticMarkup(<HotspotScene {...base} image={image} />);
    expect(out).toContain("cle-scene__frame cle-hotspots");
    expect(out).toContain("cle-icon--pin");
    expect(out).toContain("cle-scene cle-scene--icon wp-block-cle-hotspot-scene");
    expect(out).toContain("<h2>Scene</h2>");
    expect(count(out, 'class="cle-scene__pin"')).toBe(1);
    expect(out).toContain('<ol class="cle-scene__list">');
  });

  it("markers are numbered from 1, the popover side follows y and a missing icon falls back to chat", () => {
    const spots = [
      { x: 21, y: 36, title: "Just conversation", body: "No slides.", icon: "hotdog" },
      { x: 76, y: 70, title: "New here?", body: "Say hi." },
    ];
    const n = renderToStaticMarkup(<HotspotScene markerStyle="numbered" hotspots={spots} image={image} />);
    expect(count(n, 'class="cle-scene__pin"')).toBe(2);
    expect(n).toContain('<span aria-hidden="true">2</span>');
    expect(n).toContain("is-below");
    expect(n).toContain("is-above");
    expect(n).toMatch(/aria-controls="[^"]+-0"/);
    const i = renderToStaticMarkup(<HotspotScene markerStyle="icon" hotspots={spots} image={image} />);
    expect(i).toContain("cle-icon--hotdog");
    expect(i).toContain("cle-icon--chat");
  });

  it("without an image there is no frame and no list; the inner blocks still show", () => {
    const out = renderToStaticMarkup(<HotspotScene {...base} />);
    expect(out).not.toContain("cle-scene__frame");
    expect(out).not.toContain("cle-scene__list");
    expect(out).toContain("<h2>Scene</h2>");
  });

  it("heading and intro keep inline markup, minus anything unsafe", () => {
    const out = renderToStaticMarkup(
      <HotspotScene {...base} heading={'A <em>big</em> <script>x()</script>night'} intro={'Hi <a href="javascript:x()">there</a>'} image={image} />,
    );
    expect(out).toContain("<em>big</em>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("javascript:");
  });
});

describe("hotspot plain text", () => {
  it("decodes entities once, `&amp;` last, and numeric ones", () => {
    expect(plain("&amp;lt;b&amp;gt;")).toBe("&lt;b&gt;");
    expect(plain("It&#39;s &#x41; &amp; <em>more</em>")).toBe("It's A & more");
  });
});

describe("inline sanitize profile", () => {
  it("also allows the usual text-level tags, with class and a filtered style on span and mark", () => {
    expect(sanitize('<s>a</s><u>b</u><kbd>c</kbd><del>d</del><ins>e</ins><abbr title="t">f</abbr><cite>g</cite><q>h</q>', "inline")).toBe(
      '<s>a</s><u>b</u><kbd>c</kbd><del>d</del><ins>e</ins><abbr title="t">f</abbr><cite>g</cite><q>h</q>',
    );
    expect(sanitize('<span class="x" style="color:red;position:fixed" onclick="y()">a</span><mark class="m">b</mark>', "inline")).toBe(
      '<span class="x" style="color:red">a</span><mark class="m">b</mark>',
    );
    expect(sanitize('<div class="x">a</div>', "inline")).toBe("a");
  });

  it("keeps emphasis and safe links only", () => {
    expect(sanitize('<strong>a</strong> <a href="https://x.test" onclick="y()">b</a><img src=x>', "inline")).toBe(
      '<strong>a</strong> <a href="https://x.test">b</a>',
    );
  });
});

describe("cle/ticker", () => {
  const upcomingPosts = [
    { _id: "p1", title: "A post", slug: { current: "a-post" }, publishedAt: "2026-10-20T14:00:00-04:00", featuredImage: null },
    { _id: "p2", title: "Older", slug: { current: "older" }, publishedAt: "2026-10-01T09:00:00-04:00", featuredImage: null },
  ];
  const items = (source: "posts" | "events" | "both", count = 8, eventPrefix = "Next:") =>
    buildTickerItems({ source, count, eventPrefix, events: EVENTS, posts: upcomingPosts, now: NOW });

  it("events lead with the prefix, soonest first, past events never; posts follow", () => {
    const both = items("both");
    const events = both.filter((i) => i.url.startsWith("/events/"));
    const events0 = EVENTS.find((e) => `/events/${e.slug?.current}` === events[0].url)!;
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((i) => i.title.startsWith("Next: "))).toBe(true);
    expect(both.indexOf(events[0])).toBe(0);
    expect(both.map((i) => i.url)).not.toContain("/events/summer-in-the-flats");
    const dates = events.map((i) => i.iso);
    expect([...dates].sort()).toEqual(dates);
    // events, then posts, cut to the count altogether
    expect(both).toEqual([...items("events"), ...items("posts")].slice(0, 8));
    const oneEvent = buildTickerItems({ source: "both", count: 8, eventPrefix: "Next:", events: [events0], posts: upcomingPosts, now: NOW });
    expect(oneEvent.map((i) => i.url)).toEqual([events[0].url, "/blog/a-post", "/blog/older"]);
    expect(items("posts").map((i) => i.url)).toEqual(["/blog/a-post", "/blog/older"]);
    expect(items("events").every((i) => i.url.startsWith("/events/"))).toBe(true);
  });

  it("the count is clamped to 1..20 and applies to the combined list", () => {
    expect(items("both", 3)).toHaveLength(3);
    expect(items("both", 0)).toHaveLength(1);
    expect(items("both", 99).length).toBeLessThanOrEqual(20);
  });

  it("dates are 'MMM d' in New York time with an ATOM datetime", () => {
    const [p] = items("posts");
    expect(p.date).toBe("Oct 20");
    expect(p.iso).toBe("2026-10-20T14:00:00-04:00");
  });

  const html = renderToStaticMarkup(<TickerView items={items("posts")} label="Latest" duration={50} pauseLabel="Pause" playLabel="Play" />);

  it("a duplicated track: the second copy is hidden from screen readers and the tab order", () => {
    expect(count(html, '<ul class="cle-ticker__list"')).toBe(2);
    expect(count(html, '<ul class="cle-ticker__list" aria-hidden="true">')).toBe(1);
    expect(count(html, 'tabindex="-1"')).toBe(2);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Latest"');
    expect(html).toContain("--cle-ticker-duration:50s");
    expect(html).toContain('class="cle-ticker__toggle"');
    expect(html).toContain('data-play="Play"');
    expect(html).toContain(">Pause<");
  });

  it("the duration has a floor of 10 s, and nothing to show renders nothing", () => {
    expect(renderToStaticMarkup(<TickerView items={items("posts")} label="" duration={2} pauseLabel="Pause" playLabel="Play" />)).toContain(
      "--cle-ticker-duration:10s",
    );
    expect(renderToStaticMarkup(<TickerView items={[]} label="Latest" duration={50} pauseLabel="Pause" playLabel="Play" />)).toBe("");
  });

  it("thumbnails only when asked for", () => {
    const withThumb = [{ ...items("posts")[0], thumb: "/x.webp" }];
    expect(renderToStaticMarkup(<TickerView items={withThumb} showThumbnails label="L" duration={50} pauseLabel="P" playLabel="Y" />)).toContain("cle-ticker__thumb");
    expect(renderToStaticMarkup(<TickerView items={withThumb} showThumbnails={false} label="L" duration={50} pauseLabel="P" playLabel="Y" />)).not.toContain("cle-ticker__thumb");
  });
});

describe("the ticker never lists a post scheduled for later (R2)", () => {
  beforeEach(() => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_NOW", NOW.toISOString());
  });
  afterEach(() => vi.unstubAllEnvs());

  it("getTickerPosts leaves out the future-publishOn fixture post", async () => {
    const all = await getTickerPosts(20);
    expect(all.length).toBeGreaterThan(0);
    expect(all.map((p) => p.slug.current)).not.toContain("scheduled-test-post");
    const dates = all.map((p) => p.publishedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("once its time has come it is listed", async () => {
    vi.stubEnv("FIXTURES_NOW", "2100-01-01T00:00:00Z");
    expect((await getTickerPosts(50)).map((p) => p.slug.current)).toContain("scheduled-test-post");
  });
});

describe("cle/timeline", () => {
  const milestones = [
    { date: "2010-03-01", label: "2010", title: "Cleveland Big Data begins", body: "Doug.", tag: "Origin", major: true },
    { date: "2026-09-28", label: "September 28, 2026", title: "Mega Meetup", tag: "Next up", major: true, next: true },
    { date: "not a date", title: "Skipped" },
  ];
  const tl = buildTimeline({ milestones, includeEvents: true, startYear: 2010, eventLabel: "Meetup", events: EVENTS, now: NOW });

  it("the axis runs from startYear to next year", () => {
    expect(tl.axis[0]).toEqual({ year: 2010, x: 0 });
    expect(tl.axis.at(-1)!.year).toBe(2027);
    expect(tl.axis).toHaveLength(18);
  });

  it("positions are fractions of the axis, items sorted by date, a bad date skipped", () => {
    const xs = tl.items.map((i) => i.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(tl.items.find((i) => i.title === "Skipped")).toBeUndefined();
    expect(tl.items[0].x).toBeCloseTo((59 / 365) / 18, 3);
  });

  it("meetups from the events fill in, unless a milestone already holds that day", () => {
    const events = tl.items.filter((i) => i.event);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].tag).toBe("Meetup");
    expect(events[0].url).toMatch(/^\/events\//);
    const without = buildTimeline({ milestones, includeEvents: false, startYear: 2010, eventLabel: "Meetup", events: EVENTS, now: NOW });
    expect(without.items).toHaveLength(2);
  });

  const html = renderToStaticMarkup(<TimelineView milestones={milestones} includeEvents={false} startYear={2010} eventLabel="Meetup" events={[]} now={NOW} />);

  it("markup: the section carries the year count; items carry data-x and flags", () => {
    expect(html).toContain('class="wp-block-cle-timeline"');
    expect(html).toContain("--cle-tl-years:18");
    expect(html).toContain('class="cle-timeline__item is-major"');
    expect(html).toContain('class="cle-timeline__item is-major is-next"');
    expect(html).toContain('<span class="cle-timeline__tag">Origin</span>');
    expect(html).toContain('<time dateTime="2026-09-28">September 28, 2026</time>');
  });
});

describe("big figures count up", () => {
  it("every number in a figure is its own count, commas and decimals kept as written", () => {
    expect(splitCounts("4,284").filter((p) => p.count).map((p) => p.text)).toEqual(["4,284"]);
    expect(splitCounts("4.8").filter((p) => p.count).map((p) => p.text)).toEqual(["4.8"]);
    expect(splitCounts("4,284 members · 183 events since 2010 · 4.8 from 1,465 reviews").filter((p) => p.count).map((p) => p.text)).toEqual([
      "4,284",
      "183",
      "2010",
      "4.8",
      "1,465",
    ]);
    expect(splitCounts("16 sponsors").map((p) => p.text).join("")).toBe("16 sponsors");
  });

  it("the final values are the written ones: 4,284, 183, 4.8, 16", () => {
    for (const final of ["4,284", "183", "4.8", "16"]) expect(countFrame(final, 1)).toBe(final);
  });

  it("it starts from zero in the same shape and eases up", () => {
    expect(countFrame("4,284", 0)).toBe("0");
    expect(countFrame("4.8", 0)).toBe("0.0");
    expect(Number(countFrame("183", 0.5))).toBeGreaterThan(91);
    expect(Number(countFrame("183", 0.5))).toBeLessThan(183);
    expect(countFrame("4,284", 0.9)).toMatch(/^\d,\d{3}$/);
  });
});

describe("fireConfetti", () => {
  const stubBrowser = (reduced: boolean) => {
    const appended: unknown[] = [];
    const el = () => ({ style: { setProperty: () => {} }, setAttribute: () => {}, appendChild: () => {}, remove: () => {}, className: "" });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced }), innerWidth: 800, innerHeight: 600 });
    vi.stubGlobal("document", { createElement: el, body: { appendChild: (n: unknown) => appended.push(n) } });
    return appended;
  };
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing under reduced motion", () => {
    const layers = stubBrowser(true);
    fireConfetti({ x: 10, y: 10 });
    fireConfetti();
    expect(layers).toHaveLength(0);
  });

  it("does nothing off the browser", () => {
    expect(() => fireConfetti()).not.toThrow();
  });

  it("otherwise adds one layer, from the origin or the middle of the screen", () => {
    vi.useFakeTimers();
    const layers = stubBrowser(false);
    fireConfetti({ x: 10, y: 10 });
    fireConfetti();
    expect(layers).toHaveLength(2);
    vi.useRealTimers();
  });
});

describe("migration of a hotspot scene", () => {
  afterEach(() => vi.restoreAllMocks());

  it("warns when it has an imageId but no image", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    blockMarkupToRichBody('<!-- wp:cle/hotspot-scene {"imageId":42,"heading":"S"} /-->');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("imageId 42");
  });

  it("is quiet without an imageId", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    blockMarkupToRichBody('<!-- wp:cle/hotspot-scene {"heading":"S"} /-->');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("the count-up's cleanup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  /** A page with one figure in view, a manual requestAnimationFrame and recorded listeners. */
  function stubPage() {
    const frames = new Map<number, () => void>();
    let next = 1;
    const listeners = new Set<string>();
    const span = { className: "", dataset: {} as Record<string, string>, textContent: "" };
    const text = { nodeValue: "4,284" };
    const parent = { replaceChild: () => {} };
    Object.assign(text, { parentNode: parent });
    const el = { getBoundingClientRect: () => ({ top: 10, bottom: 50 }) };
    let walked = false;
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
      innerHeight: 800,
      addEventListener: (t: string) => listeners.add(t),
      removeEventListener: (t: string) => listeners.delete(t),
    });
    vi.stubGlobal("requestAnimationFrame", (fn: () => void) => (frames.set(next, fn), next++));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal("NodeFilter", { SHOW_TEXT: 4 });
    vi.stubGlobal("performance", { now: () => Date.now() });
    vi.stubGlobal("document", {
      querySelectorAll: (sel: string) => (sel === ".cle-count" ? [] : [el]),
      createTreeWalker: () => ({ nextNode: () => (walked ? null : ((walked = true), text)) }),
      createDocumentFragment: () => ({ appendChild: () => {} }),
      createTextNode: (t: string) => ({ t }),
      createElement: () => span,
    });
    return { frames, listeners, span };
  }

  it("a frame queued before cleanup is cancelled: no check runs and no interval is left", () => {
    vi.useFakeTimers();
    const { frames, listeners } = stubPage();
    const stop = startCountUp();
    expect(frames.size).toBe(1);
    expect(listeners.size).toBe(2);
    stop();
    expect(frames.size).toBe(0);
    expect(listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("even a frame that still fires after cleanup does nothing", () => {
    vi.useFakeTimers();
    const { frames } = stubPage();
    const stop = startCountUp();
    const queued = [...frames.values()][0];
    stop();
    queued();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a run in progress is stopped by cleanup and leaves no interval", () => {
    vi.useFakeTimers();
    const { frames } = stubPage();
    const stop = startCountUp();
    [...frames.values()][0]();
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts over cleanly after a cleanup (a second page)", () => {
    vi.useFakeTimers();
    const { frames } = stubPage();
    startCountUp()();
    expect(frames.size).toBe(0);
    const stop = startCountUp();
    expect(frames.size).toBe(1);
    stop();
  });
});
