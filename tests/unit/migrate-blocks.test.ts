// WordPress block markup -> richBody, over the theme's real page patterns (rendered by WordPress
// with `wp eval`, so the PHP URL helpers have run; see tests/fixtures/patterns/).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blockMarkupToRichBody, parseBlocks } from "../../scripts/migrate-wp/blocks";

type Item = { _type: string; _key: string; [k: string]: unknown };

const pattern = (name: string) => readFileSync(`tests/fixtures/patterns/${name}.html`, "utf8");

/** Every item in a richBody, including those nested in sections, columns and container blocks. */
function all(body: Item[]): Item[] {
  return body.flatMap((item) => {
    const nested: Item[] = [];
    if (Array.isArray(item.children) && item._type !== "block") nested.push(...all(item.children as Item[]));
    if (item._type === "columns")
      for (const c of (item.columns as Item[]) ?? []) nested.push(...all((c.children as Item[]) ?? []));
    return [item, ...nested];
  });
}

const ofType = (body: Item[], type: string) => all(body).filter((i) => i._type === type);
const text = (b: Item) => ((b.children as { text: string }[]) ?? []).map((s) => s.text).join("");

/** _key must be unique within every array (Sanity's rule). */
function expectUniqueKeys(value: unknown) {
  if (Array.isArray(value)) {
    const keys = value.filter((v) => v && typeof v === "object" && "_key" in v).map((v) => v._key);
    expect(new Set(keys).size).toBe(keys.length);
    value.forEach(expectUniqueKeys);
  } else if (value && typeof value === "object") Object.values(value).forEach(expectUniqueKeys);
}

const PAGES = ["page-about", "page-sponsors", "page-get-involved", "page-code-of-conduct", "page-privacy"];

describe("parseBlocks", () => {
  it("nests inner blocks and keeps self-closing blocks' attributes", () => {
    const [group] = parseBlocks(
      '<!-- wp:group {"align":"full"} --><div class="wp-block-group alignfull"><!-- wp:cle/mascot {"pose":"hike"} /--></div><!-- /wp:group -->',
    );
    expect(group).toMatchObject({ name: "core/group", attrs: { align: "full" } });
    expect(group.name && group.inner[0]).toMatchObject({ name: "cle/mascot", attrs: { pose: "hike" } });
  });
});

describe("blockMarkupToRichBody over the page patterns", () => {
  it("About: one team, one bead timeline and four mascots, with their attributes", () => {
    const body = blockMarkupToRichBody(pattern("page-about")) as Item[];
    const team = ofType(body, "cleTeam");
    expect(team).toHaveLength(1);
    // No saved attributes: block.json defaults, so the team, bios and photos come from the repo.
    const members = team[0].members as Item[];
    expect(members).toHaveLength(7);
    expect(members[0]).toMatchObject({
      _type: "teamMember",
      _key: "teamMember-0",
      name: "Ted Troxell",
      photo: "ted-troxell",
      lead: true,
    });
    expect(members.map((m) => m.name)).toContain("Helen Shere");
    expect(team[0]).toMatchObject({ leadLabel: "Leadership", align: "wide" });

    const beads = ofType(body, "cleBeadTimeline");
    expect(beads).toHaveLength(1);
    expect(beads[0]).toMatchObject({ open: -1, align: "wide" });
    expect((beads[0].milestones as Item[]).map((m) => m.year)).toEqual(["2010", "2017", "2024", "2026"]);
    expect((beads[0].milestones as Item[])[3]).toMatchObject({ _type: "beadMilestone", title: "A nonprofit, officially" });

    const mascots = ofType(body, "cleMascot");
    expect(mascots.map((m) => [m.pose, m.width, m.align])).toEqual([
      ["stage", 200, "center"],
      ["social", 200, "center"],
      ["workshop", 200, "center"],
      ["hike", 200, "center"],
    ]);
  });

  it("About: text styles, figures, sections and buttons map to their named equivalents", () => {
    const body = blockMarkupToRichBody(pattern("page-about")) as Item[];
    const blocks = ofType(body, "block");
    const h1 = blocks.find((b) => b.style === "light");
    expect(h1 && text(h1)).toBe("Making AI accessible to everyone.");
    expect((h1!.children as Item[]).map((s) => s.marks)).toEqual([[], ["strong"], []]);
    expect(blocks.filter((b) => b.style === "eyebrow").map(text)).toContain("Our story");
    expect(blocks.some((b) => b.style === "mutedSmall")).toBe(true);
    expect(blocks.some((b) => b.style === "h3Large")).toBe(true);
    expect(blocks.some((b) => b.style === "h2Paper")).toBe(true);

    expect(ofType(body, "figure").map((f) => [f.number, f.label])).toEqual([
      ["4,284", "members"],
      ["183", "events since 2010"],
      ["4.8", "rating from 1,465 reviews"],
      ["16", "sponsors in 2026"],
    ]);

    const band = ofType(body, "section").find((s) => s.backgroundColor === "indigo");
    expect(band).toMatchObject({
      tag: "div",
      align: "full",
      layout: "constrained",
      textColor: "paper",
      style: "padding-top:var(--wp--preset--spacing--xl);padding-bottom:var(--wp--preset--spacing--xl)",
    });
    expect(band!.className).toBeFalsy();
    const buttons = ofType(band!.children as Item[], "buttons")[0];
    expect((buttons.items as Item[]).map((b) => [b.label, b.style])).toEqual([
      ["Join on Meetup", "fill"],
      ["All the ways to get involved", "outline"],
    ]);

    const cols = ofType(body, "columns");
    expect(cols[0]).toMatchObject({ align: "wide", style: "margin-top:var(--wp--preset--spacing--l)" });
    expect(cols.find((c) => c.className === "cle-ways")).toBeDefined();

    // The code-of-conduct link survives as a link annotation.
    const link = blocks.flatMap((b) => b.markDefs as Item[]).find((m) => String(m.href).includes("code-of-conduct"));
    expect(link).toMatchObject({ _type: "link", href: "http://localhost:8090/index.php/code-of-conduct/" });
  });

  it("a core/group keeps a zero blockGap", () => {
    const body = blockMarkupToRichBody(
      '<!-- wp:group {"tagName":"main","align":"full","style":{"spacing":{"blockGap":"0"}},"layout":{"type":"default"}} -->\n<main class="wp-block-group alignfull"></main>\n<!-- /wp:group -->',
    ) as Item[];
    expect(body[0]).toMatchObject({ _type: "section", tag: "main", layout: "default", blockGap: "0" });
  });

  it("a core/group with className cle-figure becomes a figure", () => {
    const body = blockMarkupToRichBody(
      '<!-- wp:group {"className":"cle-figure","layout":{"type":"default"}} -->\n<div class="wp-block-group cle-figure"><!-- wp:paragraph -->\n<p>58.4%</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:paragraph -->\n<p>are developers</p>\n<!-- /wp:paragraph --></div>\n<!-- /wp:group -->',
    );
    expect(body).toEqual([{ _type: "figure", _key: expect.any(String), number: "58.4%", label: "are developers" }]);
  });

  it("privacy: three tables with head arrays and rows of cells (links kept)", () => {
    const body = blockMarkupToRichBody(pattern("page-privacy")) as Item[];
    const tables = ofType(body, "table");
    expect(tables).toHaveLength(3);
    expect(tables.map((t) => t.head)).toEqual([
      ["When", "What we collect", "Why"],
      ["Purpose", "Service", "Their privacy policy"],
      ["Information", "How long", "Why"],
    ]);
    const rows = tables[1].rows as { _type: string; cells: string[] }[];
    expect(rows[0]).toMatchObject({ _type: "tableRow", cells: ["Website hosting", "[HOST]", "[link]"] });
    expect(rows[1].cells[2]).toBe('<a href="https://meetup.com/privacy">meetup.com/privacy</a>');
    expect(ofType(body, "block").filter((b) => b.style === "light")).toHaveLength(1);
  });

  it("sponsors and get involved: sponsor list, builder, anchors and embeds", () => {
    const sponsors = blockMarkupToRichBody(pattern("page-sponsors")) as Item[];
    const tiles = ofType(sponsors, "block").filter((b) => b.listItem === "sponsors");
    expect(tiles).toHaveLength(16);
    expect(tiles.every((t) => t.level === 1 && t.style === "normal")).toBe(true);
    expect(ofType(sponsors, "cleSponsorBuilder")).toHaveLength(1);
    expect((ofType(sponsors, "cleSponsorBuilder")[0].tiers as Item[]).map((t) => t._type)).toEqual([
      "sponsorTier",
      "sponsorTier",
      "sponsorTier",
    ]);

    const gi = blockMarkupToRichBody(pattern("page-get-involved")) as Item[];
    const anchors = ofType(gi, "section").map((s) => s.anchor).filter(Boolean);
    expect(anchors).toEqual(["events", "newsletter", "speak", "volunteer", "sponsor", "donate"]);
    const embeds = ofType(gi, "cleEmbedForm");
    expect(embeds.map((e) => e.title)).toEqual(["Newsletter signup", "Pitch a talk", "Donation form"]);
    expect(embeds[1].url).toBe(""); // block.json default: the speaker form waits for its URL
    expect(embeds[2]).toMatchObject({ allowPayment: true, linkUrl: "https://givebutter.com/cle-ai", height: 640 });
    const art = ofType(gi, "columns").flatMap((c) => c.columns as Item[]);
    expect(art.map((c) => [c.width, c.verticalAlignment])).toContainEqual(["36%", "center"]);
  });

  it("every pattern converts with no raw HTML except the sized clay illustrations", () => {
    for (const name of PAGES) {
      const body = blockMarkupToRichBody(pattern(name)) as Item[];
      expect(body.length, name).toBeGreaterThan(0);
      for (const raw of ofType(body, "rawHtml")) expect(raw.html, name).toMatch(/^<figure class="wp-block-image [^"]*cle-art"/);
      expectUniqueKeys(body);
    }
  });

  it("story-after-merger: five beads, the merger last", () => {
    const body = blockMarkupToRichBody(pattern("story-after-merger")) as Item[];
    const beads = ofType(body, "cleBeadTimeline")[0];
    expect((beads.milestones as Item[]).map((m) => m.title)).toEqual([
      "Cleveland Big Data begins",
      "Cleveland AI forms",
      "CLE AI & DATA",
      "A nonprofit, officially",
      "Data in the Land joins",
    ]);
    expect((beads.milestones as Item[])[4]._key).toBe("beadMilestone-4");
  });
});

describe("blockMarkupToRichBody fallbacks", () => {
  it("an unknown block such as core/verse becomes rawHtml with its saved HTML", () => {
    const body = blockMarkupToRichBody(
      '<!-- wp:verse -->\n<pre class="wp-block-verse">Roses are red,\nviolets are blue.</pre>\n<!-- /wp:verse -->',
    );
    expect(body).toEqual([
      { _type: "rawHtml", _key: expect.any(String), html: '<pre class="wp-block-verse">Roses are red,\nviolets are blue.</pre>' },
    ]);
  });

  it("a paragraph whose attributes have no named style becomes rawHtml (R9)", () => {
    const html = '<p class="has-coral-color has-text-color has-xl-font-size">Loud</p>';
    expect(blockMarkupToRichBody(`<!-- wp:paragraph {"textColor":"coral","fontSize":"xl"} -->\n${html}\n<!-- /wp:paragraph -->`)).toEqual([
      { _type: "rawHtml", _key: expect.any(String), html },
    ]);
  });

  it("core/query with cleWhen becomes a queryList", () => {
    const body = blockMarkupToRichBody(
      '<!-- wp:query {"queryId":1,"query":{"perPage":50,"pages":0,"offset":0,"postType":"meetup_events","order":"asc","orderBy":"date","inherit":false,"cleWhen":"upcoming"},"namespace":"cle/events-upcoming","align":"wide"} -->\n<div class="wp-block-query alignwide"><!-- wp:post-template -->\n<!-- wp:post-title {"isLink":true} /-->\n<!-- /wp:post-template --></div>\n<!-- /wp:query -->',
    );
    expect(body).toEqual([{ _type: "queryList", _key: expect.any(String), source: "events", when: "upcoming", count: 50 }]);
    const posts = blockMarkupToRichBody(
      '<!-- wp:query {"query":{"perPage":3,"postType":"post","inherit":false}} --><div class="wp-block-query"></div><!-- /wp:query -->',
    );
    expect(posts).toEqual([{ _type: "queryList", _key: expect.any(String), source: "posts", count: 3 }]);
  });

  it("an unknown cle block keeps its markup; classic HTML between blocks is converted", () => {
    const body = blockMarkupToRichBody('<p>Classic <em>intro</em>.</p>\n<!-- wp:cle/member-link {"x":1} /-->') as Item[];
    expect(body[0]).toMatchObject({ _type: "block", style: "normal" });
    expect(text(body[0])).toBe("Classic intro.");
    expect(body[1]).toEqual({ _type: "rawHtml", _key: expect.any(String), html: '<!-- wp:cle/member-link {"x":1} /-->' });
  });

  it("images use the resolver when given one, and stay raw HTML otherwise", () => {
    const markup =
      '<!-- wp:image {"id":114,"sizeSlug":"large","align":"center","className":"is-style-plain"} -->\n<figure class="wp-block-image aligncenter size-large is-style-plain"><img src="http://localhost:8090/wp-content/uploads/2026/09/cle-logo-1024x1024.png" alt="Logo" class="wp-image-114"/><figcaption class="wp-element-caption">Our logo</figcaption></figure>\n<!-- /wp:image -->';
    expect(blockMarkupToRichBody(markup)[0]).toMatchObject({ _type: "rawHtml" });
    const resolved = blockMarkupToRichBody(markup, {
      resolveImage: (src) =>
        src.includes("cle-logo") ? { _type: "image", asset: { _type: "reference", _ref: "image-abc-10x10-png" } } : undefined,
    });
    expect(resolved).toEqual([
      {
        _type: "image",
        _key: expect.any(String),
        asset: { _type: "reference", _ref: "image-abc-10x10-png" },
        alt: "Logo",
        caption: "Our logo",
        style: "plain",
        align: "center",
      },
    ]);
  });
});
