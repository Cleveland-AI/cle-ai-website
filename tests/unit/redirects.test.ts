// Task 16: every old WordPress URL is answered with one permanent hop to its new address (spec Goal 8).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import generated from "@/lib/redirects/generated.json";
import { resolveRedirect, sanitizeSanityRedirects, type SanityRedirect } from "@/lib/redirects/map";
import { PLACEHOLDER_PROJECT_ID } from "@/sanity/env";

/** The Sanity project generated.json's upload redirects point at: the placeholder until step 4.3 regenerates it. */
const CDN_PROJECT = (generated as { to: string }[]).find((g) => g.to.startsWith("https://cdn.sanity.io/images/"))!.to.split("/")[4];

const r = (url: string, sanity: SanityRedirect[] = []) => {
  const u = new URL(url, "https://cle-ai.com");
  return resolveRedirect(u.pathname, u.search, sanity);
};

describe("generated.json (M11)", () => {
  it("points every upload redirect at the configured Sanity project once one is set", () => {
    const configured = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
    const targets = (generated as { to: string }[]).map((g) => g.to).filter((to) => to.startsWith("https://cdn.sanity.io/images/"));
    expect(targets.length).toBeGreaterThan(0);
    const stale = targets.filter((to) => to.split("/")[4] !== (configured || PLACEHOLDER_PROJECT_ID));
    // Regenerate with step 4.3 of docs/switch-over.md and commit it: stale targets 308 to a dead host.
    expect(stale).toEqual([]);
  });
});

describe("the brief's table", () => {
  const table: [string, string][] = [
    ["/index.php/about/", "/about"],
    ["/index.php/get-involed/", "/get-involved"],
    ["/get-involed", "/get-involved"],
    ["/get-involed/", "/get-involved"],
    ["/index.php/2026/09/19/voila-cle-ai-data-newsletter-september-2026/", "/blog/voila-cle-ai-data-newsletter-september-2026"],
    ["/2026/09/19/voila-cle-ai-data-newsletter-september-2026/", "/blog/voila-cle-ai-data-newsletter-september-2026"],
    ["/?p=10", "/blog/what-we-learned-running-183-meetups"],
    ["/?p=138", "/events/october-workshop"],
    ["/index.php/meetup-event/october-workshop/", "/events/october-workshop"],
    ["/index.php/meetup-event/", "/events"],
    ["/index.php/category/podcast/", "/blog/category/podcast"],
    ["/index.php/author/tedt/", "/blog/author/ted-troxell"],
    ["/author/tedt/", "/blog/author/ted-troxell"],
    ["/index.php/feed/", "/feed.xml"],
    ["/feed/", "/feed.xml"],
    ["/newsletter", "https://timcleaidata.substack.com/"],
    ["/index.php/newsletter/", "https://timcleaidata.substack.com/"],
    ["/wp-content/uploads/2026/09/scene.webp", `https://cdn.sanity.io/images/${CDN_PROJECT}/production/3623850b5ee35529359679926db67181f5bd6977-2000x1116.webp`],
    ["/About/", "/about"],
  ];
  it.each(table)("%s -> %s", (from, to) => expect(r(from)).toBe(to));

  it("/about is final", () => expect(r("/about")).toBeNull());
  it("the home page is final", () => expect(r("/")).toBeNull());
});

describe("R39 rules", () => {
  const table: [string, string][] = [
    ["/events?query-2-page=2", "/events/page/2"],
    ["/events/?query-2-page=3", "/events/page/3"],
    ["/events?query-2-page=1", "/events"],
    ["/events?query-2-page=junk", "/events"],
    ["/2026/09/", "/blog/2026/09"],
    ["/index.php/2026/09/", "/blog/2026/09"],
    ["/2026/09/page/2/", "/blog/2026/09/page/2"],
    ["/page/3/", "/blog/page/3"],
    ["/index.php/page/3/", "/blog/page/3"],
    ["/page/1/", "/blog"],
    ["/index.php/category/podcast/page/2/", "/blog/category/podcast/page/2"],
    ["/index.php/category/podcast/page/1/", "/blog/category/podcast"],
    ["/index.php/author/tedt/page/2/", "/blog/author/ted-troxell/page/2"],
    ["/index.php/author/someone-new/", "/blog/author/someone-new"],
    ["/index.php/brand-new-page/", "/brand-new-page"],
    ["/index.php", "/"],
    ["/comments/feed/", "/feed.xml"],
    ["/index.php/comments/feed/", "/feed.xml"],
    ["/index.php/2026/09/19/some-post/feed/", "/feed.xml"],
    ["/some-post/feed/", "/feed.xml"],
    ["/index.php/category/podcast/feed/", "/feed.xml"],
    ["/index.php/2026/09/24/podcast-episode-12/", "/blog/podcast-episode-12"],
    ["/2026/09/24/not-in-the-list/", "/blog/not-in-the-list"],
    ["/index.php/meetup-event/never-seen/", "/events/never-seen"],
    ["/Index.php/ABOUT/", "/about"],
    ["/?s=meetup", "/search?q=meetup"],
    ["/wp-content/uploads/2026/09/scene-1200x670.webp", `https://cdn.sanity.io/images/${CDN_PROJECT}/production/3623850b5ee35529359679926db67181f5bd6977-2000x1116.webp`],
  ];
  it.each(table)("%s -> %s", (from, to) => expect(r(from)).toBe(to));

  it("keeps harmless query strings on internal targets and drops WordPress ones", () => {
    expect(r("/index.php/about/?utm_source=x")).toBe("/about?utm_source=x");
    expect(r("/events?query-2-page=2&utm_source=x")).toBe("/events/page/2?utm_source=x");
    expect(r("/?p=10&utm_source=x")).toBe("/blog/what-we-learned-running-183-meetups");
  });
  it("drops the query for external targets", () => {
    expect(r("/newsletter?utm_source=x")).toBe("https://timcleaidata.substack.com/");
  });
  it("leaves unrelated live paths alone", () => {
    for (const p of ["/blog", "/blog/a-post", "/events", "/events/page/2", "/search?q=x", "/feed.xml", "/studio", "/privacy"]) {
      expect(r(p)).toBeNull();
    }
  });
  it("collapses doubled slashes", () => expect(resolveRedirect("//about", "")).toBe("/about"));
  it("R40: an unknown ?p=, ?page_id= or ?attachment_id= goes to the home page", () => {
    expect(r("/?p=99999")).toBe("/");
    expect(r("/?page_id=99999")).toBe("/");
    expect(r("/?attachment_id=99999")).toBe("/");
    expect(r("/index.php?p=99999&utm_source=x")).toBe("/?utm_source=x");
  });
  it("only folds the case of plain characters, never of %XX escapes", () => {
    expect(r("/blog/caf%C3%A9")).toBeNull();
    expect(r("/Blog/caf%C3%A9")).toBe("/blog/caf%C3%A9");
  });
  it("never sends a target that next.config would redirect again", () => {
    expect(r("/page/1/")).toBe("/blog");
    expect(r("/old", [{ from: "/old", to: "/events/page/1" }])).toBe("/events");
    expect(r("/old", [{ from: "/old", to: "/blog/page/1" }])).toBe("/blog");
    expect(r("/old", [{ from: "/old", to: "/blog/category/podcast/page/1" }])).toBe("/blog/category/podcast");
    expect(r("/old", [{ from: "/old", to: "/blog/author/ted-troxell/page/1" }])).toBe("/blog/author/ted-troxell");
    expect(r("/old", [{ from: "/old", to: "/blog/2026/09/page/1" }])).toBe("/blog/2026/09");
    expect(r("/old", [{ from: "/old", to: "/events/page/2" }])).toBe("/events/page/2");
  });
});

describe("no chains, no loops", () => {
  it("every generated target is final", () => {
    for (const { to } of generated as { from: string; to: string }[]) {
      if (to.startsWith("http")) continue;
      expect(r(to), to).toBeNull();
    }
  });
  it("every generated source resolves to its target in one hop", () => {
    for (const { from, to } of generated as { from: string; to: string }[]) {
      expect(r(from), from).toBe(to);
    }
  });
  it("following any result again returns null", () => {
    const sources = [
      ...(generated as { from: string }[]).map((g) => g.from),
      "/get-involed", "/events?query-2-page=2", "/2026/09/", "/page/2/", "/index.php/category/x/page/2/", "/index.php/x/", "/About/", "/feed/", "/index.php/author/tedt/",
    ];
    for (const s of sources) {
      const to = r(s);
      if (to && !to.startsWith("http")) expect(r(to), `${s} -> ${to}`).toBeNull();
    }
  });
  it("matches next.config's page-1 redirects instead of chaining into them", () => {
    for (const s of ["/page/1/", "/events?query-2-page=1", "/index.php/category/blog/page/1/", "/2026/09/page/1/"]) {
      expect(r(s)).not.toMatch(/\/page\/1$/);
    }
  });
});

describe("redirect documents from Sanity", () => {
  const doc = (from: string, to: string): SanityRedirect => ({ from, to });
  it("applies an added redirect", () => {
    expect(r("/old-promo", [doc("/old-promo", "/events")])).toBe("/events");
    expect(r("/Old-Promo/", [doc("/old-promo", "https://example.com/x")])).toBe("https://example.com/x");
  });
  it("Sanity wins over the generated table (editors can fix a bad migration)", () => {
    expect(r("/index.php/about/", [doc("/about", "/get-involved")])).toBe("/get-involved");
    expect(r("/index.php/sponsors/", [doc("/sponsors", "/about")])).toBe("/about");
  });
  it("never chains: a target that is itself an old URL is resolved through", () => {
    expect(r("/promo", [doc("/promo", "/index.php/about/")])).toBe("/about");
    expect(r("/a", [doc("/a", "/b"), doc("/b", "/c")])).toBe("/c");
  });
  it("drops loops entirely", () => {
    expect(r("/a", [doc("/a", "/b"), doc("/b", "/a")])).toBeNull();
    expect(r("/a", [doc("/a", "/a")])).toBeNull();
    expect(r("/get-involed", [doc("/get-involved", "/get-involed")])).toBeNull();
  });
  it("rejects dangerous or malformed entries", () => {
    const bad = [
      doc("/x", "javascript:alert(1)"),
      doc("/x", "JaVaScRiPt:alert(1)"),
      doc("/x", "data:text/html,hi"),
      doc("/x", "http://example.com/"),
      doc("/x", "//evil.example/"),
      doc("/x", "/\\evil.example"),
      doc("/x", "https://exa mple.com"),
      doc("/x", ""),
      doc("x", "/events"),
      doc("/studio", "/events"),
      doc("/studio/desk", "/events"),
      doc("/api/forms", "/events"),
      doc("/_next/static", "/events"),
      { from: 5, to: "/y" } as unknown as SanityRedirect,
    ];
    expect(sanitizeSanityRedirects(bad)).toEqual([]);
    expect(r("/x", bad)).toBeNull();
  });
  it("keeps good entries", () => {
    expect(sanitizeSanityRedirects([doc("/x", "/events"), doc("/y", "https://example.com/z")])).toHaveLength(2);
  });
  it("redirect source with a query matches that query", () => {
    expect(r("/?promo=1", [doc("/?promo=1", "/events")])).toBe("/events");
    expect(r("/?promo=2", [doc("/?promo=1", "/events")])).toBeNull();
  });
});

describe("the files stay consistent", () => {
  it("the newsletter target is the exact Substack signup", () => {
    expect(readFileSync("src/lib/redirects/map.ts", "utf8")).toContain('"https://timcleaidata.substack.com/"');
  });
});
