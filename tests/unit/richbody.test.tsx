import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { blockComponents } from "@/blocks/registry";
import { LIST_STYLES, TEXT_STYLES, findTextStyle } from "@/components/core/textStyles";
import { RichBody } from "@/components/RichBody";
import { QueryList } from "@/components/core/QueryList";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const render = (value: unknown) => renderToStaticMarkup(<RichBody value={value as RichBodyValue} />);
const block = (style: string, text: string, extra: object = {}) => ({
  _type: "block",
  _key: "b" + text,
  style,
  markDefs: [],
  children: [{ _type: "span", _key: "s", text, marks: [] }],
  ...extra,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("RichBody", () => {
  it("renders nothing for an empty array, null and undefined", () => {
    expect(render([])).toBe("");
    expect(render(null)).toBe("");
    expect(render(undefined)).toBe("");
  });

  it("renders paragraphs and styled headings with WordPress classes", () => {
    expect(render([block("normal", "Hi")])).toBe('<p class="wp-block-paragraph">Hi</p>');
    expect(render([block("h2", "T")])).toBe('<h2 class="wp-block-heading">T</h2>');
    expect(render([block("light", "T")])).toBe('<h1 class="wp-block-heading is-style-light has-xxxl-font-size">T</h1>');
    expect(render([block("eyebrow", "E")])).toBe('<p class="is-style-eyebrow wp-block-paragraph">E</p>');
  });

  it("renders every named text style to WordPress's markup", () => {
    const expected: Record<string, string> = {
      eyebrowCentered: '<p class="has-text-align-center is-style-eyebrow wp-block-paragraph">x</p>',
      leadCentered: '<p class="has-text-align-center has-ink-soft-color has-text-color has-m-font-size wp-block-paragraph">x</p>',
      sponsorName: '<p class="has-ink-soft-color has-text-color has-l-font-size wp-block-paragraph" style="font-weight:800">x</p>',
      figures: '<p class="cle-figures has-ink-soft-color has-text-color has-s-font-size wp-block-paragraph">x</p>',
      legal: '<p class="cle-footer__legal has-s-font-size wp-block-paragraph">x</p>',
      worldOnly: '<p class="cle-world-only wp-block-paragraph">x</p>',
      h1Wide: '<h1 class="wp-block-heading alignwide">x</h1>',
      h1Centered: '<h1 class="wp-block-heading has-text-align-center">x</h1>',
      h1Large: '<h1 class="wp-block-heading has-xxl-font-size">x</h1>',
      h2Paper: '<h2 class="wp-block-heading has-paper-color has-text-color">x</h2>',
      h3Large: '<h3 class="wp-block-heading has-l-font-size">x</h3>',
    };
    for (const [name, html] of Object.entries(expected)) expect(render([block(name, "x")]), name).toBe(html);
    for (const name of Object.keys(TEXT_STYLES)) expect(render([block(name, "x")]), name).toContain(">x</");
  });

  it("renders the sponsors list and maps styles back for migration", () => {
    const li = block("normal", "AWS", { listItem: "sponsors", level: 1 });
    expect(render([li])).toBe('<ul class="wp-block-list alignwide cle-sponsors"><li>AWS</li></ul>');
    expect(Object.keys(LIST_STYLES)).toEqual(["bullet", "number", "chapters", "sponsors"]);
    expect(findTextStyle("h1", ["wp-block-heading", "is-style-light", "has-xxxl-font-size"])).toBe("light");
    expect(findTextStyle("p", ["has-ink-soft-color", "has-text-color", "has-l-font-size"], "font-weight:800")).toBe("sponsorName");
    expect(findTextStyle("p", ["nope"])).toBeUndefined();
  });

  it("renders chapters lists and links", () => {
    const li = block("normal", "One", { listItem: "chapters", level: 1 });
    expect(render([li])).toBe('<ul class="wp-block-list is-style-chapters"><li>One</li></ul>');
    const withLink = {
      ...block("normal", "go"),
      markDefs: [{ _type: "link", _key: "l", href: "/x", blank: true }],
      children: [{ _type: "span", _key: "s", text: "go", marks: ["l", "strong"] }],
    };
    const html = render([withLink]);
    expect(html).toContain('<a href="/x" target="_blank" rel="noopener noreferrer">');
    expect(html).toContain("<strong>go</strong>");
  });

  it("renders a section with WordPress group classes", () => {
    const html = render([
      {
        _type: "section",
        _key: "s",
        align: "wide",
        backgroundColor: "indigo",
        textColor: "paper",
        layout: "constrained",
        anchor: "donate",
        children: [block("normal", "in")],
      },
    ]);
    expect(html).toMatch(/^<div id="donate" class="wp-block-group alignwide /);
    for (const c of [
      "has-indigo-background-color",
      "has-background",
      "has-paper-color",
      "has-text-color",
      "is-layout-constrained",
      "wp-block-group-is-layout-constrained",
    ])
      expect(html).toContain(c);
    expect(html).toContain('<p class="wp-block-paragraph">in</p>');
  });

  // front-page.html's <main> sets blockGap 0: WordPress gives it a block-supports container class
  // that zeroes its children's margins (Task 17 visual parity).
  it("renders a section with blockGap 0 with WordPress's zero-gap container class", () => {
    const html = render([{ _type: "section", _key: "s", tag: "main", align: "full", layout: "default", blockGap: "0" }]);
    expect(html).toContain('class="wp-block-group alignfull is-layout-flow wp-container-core-group-is-layout-59e8d3b3 wp-block-group-is-layout-flow"');
    expect(render([{ _type: "section", _key: "s", layout: "default" }])).not.toContain("59e8d3b3");
  });

  it("renders a section with a custom tag, class and inline style", () => {
    const html = render([
      { _type: "section", _key: "s", tag: "section", className: "cle-policy", style: "padding-top:var(--wp--preset--spacing--l);margin:0" },
    ]);
    expect(html).toContain("<section ");
    expect(html).toContain("cle-policy");
    expect(html).toContain("padding-top:var(--wp--preset--spacing--l)");
  });

  it("renders columns", () => {
    const html = render([
      {
        _type: "columns",
        _key: "c",
        columns: [
          { _type: "column", _key: "a", width: "36%", children: [block("normal", "A")] },
          { _type: "column", _key: "b", children: [block("normal", "B")] },
        ],
      },
    ]);
    expect(html).toContain('<div class="wp-block-columns is-layout-flex wp-container-core-columns-is-layout-e22c4a5e wp-block-columns-is-layout-flex">');
    expect(html).not.toContain("alignwide");
    expect(html).toContain('class="wp-block-column is-layout-flow wp-block-column-is-layout-flow" style="flex-basis:36%"');
    expect(html).toContain("B");
  });

  it("renders columns alignment, classes and margin style", () => {
    const html = render([
      {
        _type: "columns",
        _key: "c",
        align: "wide",
        verticalAlignment: "center",
        className: "cle-art-row",
        style: "margin-top:var(--wp--preset--spacing--l)",
        columns: [{ _type: "column", _key: "a", verticalAlignment: "center", width: "64%" }],
      },
    ]);
    expect(html).toContain(
      'class="wp-block-columns alignwide are-vertically-aligned-center cle-art-row is-layout-flex wp-container-core-columns-is-layout-e22c4a5e wp-block-columns-is-layout-flex" style="margin-top:var(--wp--preset--spacing--l)"',
    );
    expect(html).toContain('class="wp-block-column is-vertically-aligned-center is-layout-flow wp-block-column-is-layout-flow" style="flex-basis:64%"');
  });

  it("renders buttons", () => {
    const html = render([
      {
        _type: "buttons",
        _key: "b",
        items: [
          { _type: "button", _key: "1", label: "Join", href: "https://m.example/" },
          { _type: "button", _key: "2", label: "More", href: "/more", style: "outline" },
        ],
      },
    ]);
    expect(html).toContain('<div class="wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex">');
    expect(html).toContain('<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://m.example/">Join</a></div>');
    expect(html).toContain('<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="/more">More</a></div>');
  });

  it("renders a figure as the number paragraph then the label paragraph", () => {
    const html = render([{ _type: "figure", _key: "f", number: "4,284", label: "members" }]);
    expect(html).toContain('class="wp-block-group cle-figure');
    expect(html).toContain('<p class="wp-block-paragraph">4,284</p><p class="wp-block-paragraph">members</p>');
  });

  it("renders a table", () => {
    const html = render([
      {
        _type: "table",
        _key: "t",
        head: ["A", "B"],
        rows: [{ _type: "tableRow", _key: "r", cells: ["1", "2"] }],
      },
    ]);
    expect(html).toContain('<figure class="wp-block-table cle-table" tabindex="0" role="region" aria-label="Table"><table class="has-fixed-layout">');
    expect(html).toContain("<thead><tr><th>A</th><th>B</th></tr></thead>");
    expect(html).toContain("<tbody><tr><td>1</td><td>2</td></tr></tbody>");
  });

  it("renders table cells as the HTML WordPress saved (links kept)", () => {
    const html = render([
      {
        _type: "table",
        _key: "t",
        head: ["Service"],
        rows: [{ _type: "tableRow", _key: "r", cells: ['<a href="https://meetup.com/privacy">meetup.com/privacy</a>'] }],
      },
    ]);
    expect(html).toContain('<td><a href="https://meetup.com/privacy">meetup.com/privacy</a></td>');
  });

  it("cuts table cells down to links, strong, em and br", () => {
    const html = render([
      {
        _type: "table",
        _key: "t",
        rows: [
          {
            _type: "tableRow",
            _key: "r",
            cells: [
              '<strong>Bold</strong> <em>it</em><br>x <script>alert(1)</script><span class="x">kept</span>',
              '<a href="javascript:alert(1)" onclick="x()">bad</a> <a href="https://ok.example/" target="_blank">ok</a> 1 < 2',
            ],
          },
        ],
      },
    ]);
    // Script contents are dropped with the tag; other tags keep their text (sanitize.ts, R15).
    expect(html).toContain("<td><strong>Bold</strong> <em>it</em><br />x kept</td>");
    expect(html).toContain('<td><a>bad</a> <a href="https://ok.example/">ok</a> 1 &lt; 2</td>');
  });

  it("renders text with WordPress's smart quotes and dashes, leaving the stored text alone", () => {
    const value = [block("normal", `Don't say "never" -- or...`)];
    expect(render(value)).toBe('<p class="wp-block-paragraph">Don’t say “never” — or…</p>');
    expect(value[0].children[0].text).toBe(`Don't say "never" -- or...`);
  });

  it("texturizes table cell text like WordPress", () => {
    const html = render([{ _type: "table", _key: "t", rows: [{ _type: "tableRow", _key: "r", cells: ['a "prefer not to say" option'] }] }]);
    expect(html).toContain("<td>a “prefer not to say” option</td>");
    expect(html).toContain('<figure class="wp-block-table cle-table" tabindex="0" role="region" aria-label="Table">');
  });

  it("renders a table with no rows or head without crashing", () => {
    expect(render([{ _type: "table", _key: "t" }])).toContain("<table");
  });

  it("renders a quote with cite", () => {
    const html = render([{ _type: "quote", _key: "q", text: "Wow", citeName: "Ann", citeTitle: "CEO" }]);
    // core/quote as WordPress renders it: a flow-layout container, the text a core/paragraph (Task 17).
    expect(html).toContain('<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow">');
    expect(html).toContain('<p class="wp-block-paragraph">Wow</p>');
    expect(html).toContain("<cite>Ann, CEO</cite>");
  });

  it("renders separator and spacer", () => {
    expect(render([{ _type: "separator", _key: "s" }])).toContain('<hr class="wp-block-separator has-alpha-channel-opacity"/>');
    expect(render([{ _type: "separator", _key: "s", style: "dots" }])).toContain("is-style-dots");
    expect(render([{ _type: "spacer", _key: "s", height: "40px" }])).toContain(
      '<div style="height:40px" aria-hidden="true" class="wp-block-spacer"></div>',
    );
  });

  it("renders an image as a figure", () => {
    const html = render([
      {
        _type: "image",
        _key: "i",
        alt: "A cat",
        caption: "Cap",
        style: "framed",
        align: "wide",
        asset: { _type: "reference", _ref: "image-abc123def456abc123def456abc123def456abc1-800x600-jpg" },
      },
    ]);
    expect(html).toContain('<figure class="wp-block-image alignwide');
    expect(html).toContain('alt="A cat"');
    // No Sanity project configured here: migrated images come from public/migrated (Task 5).
    expect(html).toContain('src="/migrated/abc123def456abc123def456abc123def456abc1-800x600.jpg"');
    expect(html).toContain("<figcaption");
  });

  it("serves images from Sanity's CDN once a project is configured", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SANITY_PROJECT_ID", "abc123");
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    const { imageUrl } = await import("@/components/core/Image");
    const asset = { _type: "reference", _ref: "image-abc123def456abc123def456abc123def456abc1-800x600-jpg" };
    expect(imageUrl({ asset })).toMatch(/^https:\/\/cdn\.sanity\.io\/images\/abc123\/production\/abc123def456abc123def456abc123def456abc1-800x600\.jpg\?/);
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    expect(imageUrl({ asset })).toBe("/migrated/abc123def456abc123def456abc123def456abc1-800x600.jpg");
    vi.resetModules();
  });

  it("renders rawHtml", () => {
    expect(render([{ _type: "rawHtml", _key: "r", html: '<p class="x">raw</p>' }])).toContain('<p class="x">raw</p>');
    const bad = render([{ _type: "rawHtml", _key: "r", html: '<p onclick="x()">a</p><script>alert(1)</script><img src=x onerror=alert(1) ' }]);
    expect(bad).toContain("<p>a</p>");
    expect(bad).not.toMatch(/onclick|<script|<img/);
  });

  // Task 17: a wrapper element (even display: contents) breaks the flow layout's :first-child and
  // :last-child margin rules, so a single-root fragment renders as that root, like WordPress.
  it("renders single-root rawHtml without a wrapper", () => {
    const html = render([
      { _type: "rawHtml", _key: "r", html: '<figure class="wp-block-image cle-art"><img src="/a.webp" alt="" style="width:220px"/></figure>' },
    ]);
    expect(html).toBe('<figure class="wp-block-image cle-art"><img src="/a.webp" alt="" style="width:220px" /></figure>');
  });

  it("keeps the wrapper for several roots or an unusual root", () => {
    expect(render([{ _type: "rawHtml", _key: "r", html: "<p>a</p><p>b</p>" }])).toBe('<div style="display:contents"><p>a</p><p>b</p></div>');
    expect(render([{ _type: "rawHtml", _key: "r", html: "<div><p>a</p></div><div>b</div>" }])).toContain("display:contents");
    expect(render([{ _type: "rawHtml", _key: "r", html: "plain text" }])).toContain("display:contents");
  });

  it("renders a registered cle block with its attributes spread as props", () => {
    blockComponents.cleDummy = ({ title, items }: { title?: string; items?: string[] }) => (
      <aside data-title={title}>{(items ?? []).join("+")}</aside>
    );
    try {
      const html = render([{ _type: "cleDummy", _key: "d", title: "Hi", items: ["a", "b"] }]);
      expect(html).toBe('<aside data-title="Hi">a+b</aside>');
    } finally {
      delete blockComponents.cleDummy;
    }
  });

  it("renders nothing for an unknown type, warns once per type, and never throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const v = [
      { _type: "mysteryBlock", _key: "1" },
      { _type: "mysteryBlock", _key: "2" },
      { _type: "cleNotRegistered", _key: "3" },
    ];
    expect(render(v)).toBe("");
    expect(render(v)).toBe("");
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(msgs.filter((m) => m.includes("mysteryBlock"))).toHaveLength(1);
    expect(msgs.filter((m) => m.includes("cleNotRegistered"))).toHaveLength(1);
  });
});

describe("QueryList", () => {
  it("lists posts from the fixtures dataset", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ql-"));
    const f = join(dir, "d.ndjson");
    writeFileSync(
      f,
      [
        { _id: "p1", _type: "post", title: "First", slug: { current: "first" }, publishedAt: "2026-10-01T00:00:00Z" },
        { _id: "p2", _type: "post", title: "Later", slug: { current: "later" }, publishedAt: "2026-10-02T00:00:00Z", publishOn: "2027-01-01T00:00:00Z" },
      ]
        .map((d) => JSON.stringify(d))
        .join("\n"),
    );
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_PATH", f);
    vi.stubEnv("FIXTURES_NOW", "2026-11-03T12:00:00Z");
    const html = renderToStaticMarkup(await QueryList({ source: "posts", count: 3 }));
    expect(html).toContain("First");
    expect(html).toContain('href="/blog/first"');
    expect(html).not.toContain("Later");
    vi.unstubAllEnvs();
  });

  // front-page.html's "Latest posts": a 3-column query grid of title (h3, l), date and a 24-word
  // excerpt, as WordPress renders it (Task 17 visual parity).
  it("renders posts as the theme's query grid", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ql-grid-"));
    const f = join(dir, "d.ndjson");
    const long = Array.from({ length: 30 }, (_, i) => `w${i + 1}`).join(" ");
    writeFileSync(
      f,
      JSON.stringify({ _id: "p1", _type: "post", title: "First", slug: { current: "first" }, publishedAt: "2026-10-01T16:00:00Z", excerpt: long }),
    );
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_PATH", f);
    vi.stubEnv("FIXTURES_NOW", "2026-11-03T12:00:00Z");
    const html = renderToStaticMarkup(await QueryList({ source: "posts", count: 3 }));
    expect(html).toContain('<div class="wp-block-query alignwide is-layout-flow wp-block-query-is-layout-flow"><ul class="columns-3 wp-block-post-template is-layout-grid');
    expect(html).toContain('<li class="wp-block-post"><h3 class="wp-block-post-title has-l-font-size"><a href="/blog/first" target="_self">First</a></h3>');
    expect(html).toContain('<div class="wp-block-post-date"><time dateTime="2026-10-01T12:00:00-04:00">October 1, 2026</time></div>');
    expect(html).toContain(`<p class="wp-block-post-excerpt__excerpt">${long.split(" ").slice(0, 24).join(" ")}…</p>`);
    vi.unstubAllEnvs();
  });

  it("splits events into upcoming and past around the end of the New York day", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ql-ev-"));
    const f = join(dir, "d.ndjson");
    const ev = (id: string, start: string, slug: string | null = id) => ({
      _id: id,
      _type: "event",
      title: id,
      start,
      ...(slug ? { slug: { current: slug } } : {}),
    });
    writeFileSync(
      f,
      [
        ev("yesterday", "2026-11-02T19:00:00-05:00"),
        ev("tonight", "2026-11-03T18:00:00-05:00"), // 23:00Z today: upcoming until the end of the day
        ev("late-tonight", "2026-11-03T23:30:00-05:00"), // 04:30Z tomorrow, still today in New York
        ev("tomorrow", "2026-11-04T18:30:00-05:00"),
        ev("noslug", "2026-11-10T18:00:00-05:00", null),
      ]
        .map((d) => JSON.stringify(d))
        .join("\n"),
    );
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_PATH", f);
    // 03:00Z on Nov 4 is 22:00 on Nov 3 in New York (after the DST change).
    vi.stubEnv("FIXTURES_NOW", "2026-11-04T03:00:00Z");
    const up = renderToStaticMarkup(await QueryList({ source: "events", when: "upcoming", count: 10 }));
    expect(up).toContain("tonight");
    expect(up).toContain("late-tonight");
    expect(up).toContain("tomorrow");
    expect(up).not.toContain("yesterday");
    expect(up).not.toContain("noslug");
    expect(up.indexOf("tonight")).toBeLessThan(up.indexOf("tomorrow"));
    const past = renderToStaticMarkup(await QueryList({ source: "events", when: "past", count: 10 }));
    expect(past).toContain("yesterday");
    expect(past).not.toContain("tonight");
    expect(past).toContain('href="/events/yesterday"');
    // Once New York's day is over, tonight's events move to past.
    vi.stubEnv("FIXTURES_NOW", "2026-11-04T05:00:00Z");
    const later = renderToStaticMarkup(await QueryList({ source: "events", when: "upcoming", count: 10 }));
    expect(later).not.toContain("late-tonight");
    expect(later).toContain("tomorrow");
  });

  it("skips posts with no slug rather than linking to /blog/", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ql-ns-"));
    const f = join(dir, "d.ndjson");
    writeFileSync(f, JSON.stringify({ _id: "p", _type: "post", title: "Sluggless", publishedAt: "2026-10-01T00:00:00Z" }));
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_PATH", f);
    vi.stubEnv("FIXTURES_NOW", "2026-11-03T12:00:00Z");
    expect(renderToStaticMarkup((await QueryList({ source: "posts", count: 3 })) ?? <></>)).toBe("");
  });
});
