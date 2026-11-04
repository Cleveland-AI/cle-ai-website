// The fixture dataset every later task tests against: tests/fixtures/dataset.ndjson, made by
// `npm run migrate -- --from http://localhost:8090 --out tests/fixtures/dataset.ndjson` from the
// theme's Docker test site, plus the hand-written tests/fixtures/extra.ndjson.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentTypes } from "@/sanity/schemas/documents";
import { schemaTypes } from "@/sanity/schemas";

type Doc = { _id: string; _type: string; [k: string]: unknown };
const docs: Doc[] = readFileSync("tests/fixtures/dataset.ndjson", "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const byId = new Map(docs.map((d) => [d._id, d]));
const ofType = (t: string) => docs.filter((d) => d._type === t);
const redirects: { from: string; to: string }[] = JSON.parse(readFileSync("src/lib/redirects/generated.json", "utf8"));

/** Every object nested anywhere in a value. */
function objects(v: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(v)) v.forEach((x) => objects(x, out));
  else if (v && typeof v === "object") {
    out.push(v as Record<string, unknown>);
    Object.values(v).forEach((x) => objects(x, out));
  }
  return out;
}

describe("fixture dataset", () => {
  it("has the singletons, seven people, the privacy page and the test site's content", () => {
    expect(ofType("homepage").map((d) => d._id)).toEqual(["homepage"]);
    expect(ofType("siteSettings").map((d) => d._id)).toEqual(["siteSettings"]);
    expect(ofType("person")).toHaveLength(7);
    expect(ofType("person").every((p) => p.hidden === false)).toBe(true);
    const pages = ofType("page").map((p) => (p.slug as { current: string }).current);
    for (const slug of ["about", "sponsors", "get-involved", "code-of-conduct", "privacy", "team-test"]) expect(pages).toContain(slug);
    expect(ofType("post").length).toBeGreaterThanOrEqual(6);
    expect(ofType("event").length).toBeGreaterThanOrEqual(22);
    expect(ofType("category").map((c) => c._id).sort()).toEqual(["category.blog", "category.meetup", "category.newsletter", "category.podcast"]);
  });

  it("uses only document and field names the schema declares", () => {
    const fields = new Map<string, Set<string>>(documentTypes.map((t) => [t.name, new Set(["_id", "_type", ...(t as { fields: { name: string }[] }).fields.map((f) => f.name)])]));
    for (const d of docs) {
      if (d._type === "sanity.imageAsset") continue;
      expect(fields.has(d._type), d._type).toBe(true);
      for (const k of Object.keys(d)) expect(fields.get(d._type)!.has(k), `${d._id}.${k}`).toBe(true);
    }
    const known = new Set([
      ...schemaTypes.map((t) => t.name),
      ...["block", "span", "link", "image", "reference", "slug", "column", "button", "tableRow"],
      ...["beadMilestone", "comingUpEvent", "firstNightStep", "giftStep", "sponsorPerk", "sponsorTier", "storyLayer", "storyForeground", "chapterBubble", "teamMember", "timelineMilestone", "venuePin", "hotspot"],
      ...["sanity.imageAsset", "sanity.imageMetadata", "sanity.imageDimensions"],
    ]);
    const unknown = new Set(objects(docs).map((o) => o._type as string | undefined).filter((t) => t && !known.has(t)));
    expect([...unknown]).toEqual([]);
  });

  it("gives every array item a _key unique within its array", () => {
    for (const o of [...objects(docs), ...docs]) {
      for (const v of Object.values(o)) {
        if (!Array.isArray(v)) continue;
        const keys = v.filter((x) => x && typeof x === "object").map((x) => (x as { _key?: string })._key);
        if (!keys.length) continue;
        expect(keys.every(Boolean)).toBe(true);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it("leaves no links to the old site", () => {
    const s = JSON.stringify(docs);
    expect(s).not.toMatch(/localhost:8090/);
    expect(s).not.toMatch(/\/index\.php\//);
    expect(s).not.toMatch(/wp-content/);
  });

  it("About: the team reads the people; the story is the post-merger one", () => {
    const about = objects(byId.get("page.about"));
    const team = about.filter((o) => o._type === "cleTeam");
    expect(team).toHaveLength(1);
    expect(team[0].members).toEqual([]);
    const beads = about.find((o) => o._type === "cleBeadTimeline")!;
    expect((beads.milestones as { title: string }[]).map((m) => m.title).at(-1)).toBe("Data in the Land joins");
    expect(about.filter((o) => o._type === "cleMascot")).toHaveLength(4);
    expect(ofType("person").map((p) => [p.name, p.order, p.lead])).toEqual(
      expect.arrayContaining([
        ["Ted Troxell", 0, true],
        ["Helen Shere", 6, false],
      ]),
    );
  });

  it("the team test page holds New Person, with no photo, only there", () => {
    const team = objects(byId.get("page.team-test")).find((o) => o._type === "cleTeam")!;
    expect(team.members).toEqual([expect.objectContaining({ name: "New Person", photo: "", hidden: false })]);
    expect(ofType("person").some((p) => p.name === "New Person")).toBe(false);
  });

  it("every image points at an asset document whose file exists under public/", () => {
    const assets = new Map(ofType("sanity.imageAsset").map((a) => [a._id, a]));
    const refs = objects(docs).filter((o) => o._type === "image").map((o) => (o.asset as { _ref: string })._ref);
    expect(refs.length).toBeGreaterThanOrEqual(8);
    for (const ref of refs) {
      const asset = assets.get(ref);
      expect(asset, ref).toBeDefined();
      expect(existsSync(`public${asset!.url}`), String(asset!.url)).toBe(true);
    }
    expect(ofType("person").every((p) => p.photo)).toBe(true);
  });

  it("the privacy policy has three tables, the host and newsletter filled, and awaits counsel", () => {
    const privacy = byId.get("page.privacy")!;
    const s = JSON.stringify(privacy);
    expect(objects(privacy).filter((o) => o._type === "table")).toHaveLength(3);
    for (const gone of ["[HOST]", "[NEWSLETTER TOOL]"]) expect(s).not.toContain(gone);
    expect(s).toContain("[ANALYTICS TOOL, e.g., WordPress Stats or Google Analytics 4]");
    expect(privacy.reviewStatus).toBe("draft-awaiting-counsel");
    expect(ofType("page").filter((p) => p.reviewStatus).map((p) => p._id)).toEqual(["page.privacy"]);
  });

  it("the homepage is the front-page template with the post-merger chapter", () => {
    const home = objects(byId.get("homepage"));
    expect(home.filter((o) => o._type === "cleWorldChapter")).toHaveLength(6);
    expect(JSON.stringify(byId.get("homepage"))).toContain("and in November Data in the Land");
    expect(home.find((o) => o._type === "queryList")).toMatchObject({ source: "posts", count: 3 });
    // front-page.html's <main> has blockGap 0.
    expect((byId.get("homepage")!.body as Record<string, unknown>[])[0]).toMatchObject({ _type: "section", tag: "main", blockGap: "0" });
  });

  it("events keep DST-correct offsets, partial venues and their meetup ids", () => {
    const events = ofType("event");
    const bySlug = new Map(events.map((e) => [(e.slug as { current: string }).current, e]));
    for (const e of events) expect(e.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(bySlug.get("october-workshop")!.start).toBe("2026-10-22T10:00:00-04:00");
    expect(bySlug.get("cle-ai-and-data-monthly-social-at-happy-dog-december")!.start).toBe("2026-12-10T18:00:00-05:00");
    expect(bySlug.get("pop-up-coffee-chat")).toMatchObject({ venue: { name: "Rising Star Coffee" } });
    expect(bySlug.get("pop-up-coffee-chat")!.end).toBeUndefined();
    expect(bySlug.get("pop-up-coffee-chat")!.rsvpUrl).toBeUndefined();
    expect(bySlug.get("online-reading-group")!.venue).toBeUndefined();
    const mega = bySlug.get("mega-meetup-at-the-museum")!;
    expect(mega._id).toBe(`event.${mega.meetupId}`);
    expect(mega).toMatchObject({ organizer: "CLE AI & DATA", organizerUrl: "https://www.meetup.com/cleveland-ai-data/", venue: { lat: 41.51152, lng: -81.612877 } });
    const bare = bySlug.get("bare-event")!;
    expect(bare.venue ?? bare.end ?? bare.image).toBeUndefined();
  });

  it("the scheduled post is hidden until 2099 and carries its unique word", () => {
    const p = byId.get("post.scheduled-test-post")!;
    expect(p.publishOn).toBe("2099-01-01T00:00:00Z");
    expect(JSON.stringify(p)).toContain("zebracorn");
  });

  it("site settings come from the menus and the theme's parts", () => {
    const s = byId.get("siteSettings")!;
    expect((s.primaryMenu as { href: string }[]).map((l) => l.href)).toEqual(
      expect.arrayContaining(["/", "/events", "/about", "/sponsors", "/get-involved"]),
    );
    expect(s.footerLegalLinks).toEqual([
      expect.objectContaining({ label: "Privacy policy", href: "/privacy" }),
      expect.objectContaining({ label: "Code of conduct", href: "/code-of-conduct" }),
    ]);
    expect(s.einLine).toContain("EIN 42-2843242");
  });
});

describe("generated redirects", () => {
  const map = new Map(redirects.map((r) => [r.from, r.to]));
  it("cover pages, posts, ?p= links, events, categories, authors and uploads", () => {
    expect(map.get("/index.php/about/")).toBe("/about");
    expect(map.get("/index.php/2026/09/19/voila-cle-ai-data-newsletter-september-2026/")).toBe("/blog/voila-cle-ai-data-newsletter-september-2026");
    expect(map.get("/?p=135")).toBe("/blog/voila-cle-ai-data-newsletter-september-2026");
    expect(map.get("/index.php/meetup-event/october-workshop/")).toBe("/events/october-workshop");
    expect(map.get("/index.php/category/newsletter/")).toBe("/blog/category/newsletter");
    expect(map.get("/index.php/author/ted/")).toBe("/blog/author/ted-troxell");
    expect(map.get("/wp-content/uploads/2026/09/cle-logo.png")).toMatch(/^https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/[a-f0-9]{40}-1080x1080\.png$/);
  });
  it("point at new URLs only, once each", () => {
    expect(new Set(redirects.map((r) => r.from)).size).toBe(redirects.length);
    for (const { from, to } of redirects) {
      expect(to).not.toMatch(/index\.php|^\/\?|wp-content/);
      expect(map.has(to), `${from} -> ${to} chains`).toBe(false);
    }
  });
});
