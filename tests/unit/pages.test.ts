import { describe, expect, it } from "vitest";
import { hasOwnHeadline } from "@/lib/pages";
import { reservedPageSlug } from "@/sanity/schemas/reservedSlugs";

const block = (style: string) => ({ _type: "block", _key: "a", style, children: [{ _type: "span", text: "x" }] });

describe("hasOwnHeadline", () => {
  it("is false for no body or ordinary text", () => {
    expect(hasOwnHeadline(null)).toBe(false);
    expect(hasOwnHeadline([block("normal"), block("h2")] as never)).toBe(false);
  });
  it("sees an h1-style block, also nested in sections and columns", () => {
    expect(hasOwnHeadline([block("light")] as never)).toBe(true);
    expect(hasOwnHeadline([{ _type: "section", _key: "s", children: [{ _type: "columns", _key: "c", columns: [{ _key: "k", children: [block("light")] }] }] }] as never)).toBe(true);
  });
  it("sees an <h1 in raw HTML", () => {
    expect(hasOwnHeadline([{ _type: "rawHtml", _key: "r", html: "<div><h1 class=x>Hi</h1></div>" }] as never)).toBe(true);
    expect(hasOwnHeadline([{ _type: "rawHtml", _key: "r", html: "<h2>Hi</h2>" }] as never)).toBe(false);
  });
});

describe("reservedPageSlug", () => {
  it("rejects the site's own routes", () => {
    for (const s of ["blog", "events", "search", "studio", "api", "feed.xml", "newsletter", "sitemap.xml", "robots.txt", "favicon.ico", "wp-admin", "wp-json", "index.php"]) expect(reservedPageSlug({ current: s })).not.toBe(true);
    expect(reservedPageSlug({ current: "about" })).toBe(true);
  });
});

describe("search ordering (R24)", () => {
  it("an older doc with the word in its title outranks a newer body-only hit", async () => {
    const { evaluate, parse } = await import("groq-js");
    const { SEARCH_QUERY } = await import("@/lib/content/queries");
    const text = (t: string) => [{ _type: "block", _key: "b", style: "normal", children: [{ _type: "span", _key: "s", text: t }] }];
    const post = (id: string, title: string, at: string, body: string) => ({ _id: id, _type: "post", title, slug: { current: id }, publishedAt: at, body: text(body) });
    const dataset = [
      post("newer-body", "Weekly notes", "2026-10-01T12:00:00Z", "we discussed zebracorns"),
      post("older-title", "All about zebracorns", "2025-01-01T12:00:00Z", "nothing here"),
    ];
    const params = { terms: ["zebracorns*"], from: 0, to: 10 };
    const res = (await (await evaluate(parse(SEARCH_QUERY, { params }), { dataset, params, timestamp: new Date("2026-10-26T00:00:00Z") })).get()) as { results: { _id: string }[] };
    expect(res.results.map((r) => r._id)).toEqual(["older-title", "newer-body"]);
    // The dynamic imports (groq-js, the queries module) can take over 5 s under a full parallel run (M9).
  }, 30_000);
});
