import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMetadata } from "@/lib/seo";
import { buildCsp, securityHeaders } from "@/lib/security-headers";
import { createRequire } from "node:module";
import nextConfig from "../../next.config";
import * as titles from "@/lib/seo";

// The matcher Next itself compiles header sources with (no types shipped).
const { pathToRegexp } = createRequire(import.meta.url)("next/dist/compiled/path-to-regexp") as { pathToRegexp: (source: string) => RegExp };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/sanity/env");
});

type Og = { title?: string; description?: string; url?: string; images?: { url: string; width?: number; height?: number }[] };
const og = (m: ReturnType<typeof buildMetadata>) => m.openGraph as unknown as Og;
const absTitle = (m: ReturnType<typeof buildMetadata>) => (m.title as { absolute: string }).absolute;

describe("buildMetadata", () => {
  it("titles a page the way WordPress prints it: title, en dash, site name", () => {
    expect(absTitle(buildMetadata({ title: "About", path: "/about" }))).toBe("About – CLE AI & DATA");
  });

  it("titles the homepage with the site name and tagline", () => {
    expect(absTitle(buildMetadata({ path: "/", home: true }))).toBe("CLE AI & DATA – Cleveland’s community for AI and data");
  });

  it("uses the SEO title and description over the document's own, and the excerpt over the default", () => {
    const m = buildMetadata({ title: "Plain", excerpt: "An excerpt.", seo: { title: "Custom", description: "Custom desc" }, path: "/x" });
    expect(absTitle(m)).toBe("Custom – CLE AI & DATA");
    expect(m.description).toBe("Custom desc");
    expect(buildMetadata({ title: "Plain", excerpt: "An excerpt.", path: "/x" }).description).toBe("An excerpt.");
    expect(buildMetadata({ title: "Plain", path: "/x" }).description).toBe("Cleveland’s community for AI and data.");
  });

  it("makes the canonical absolute from the site URL, self-referencing for paginated archives", () => {
    expect(buildMetadata({ title: "Blog – Page 2", path: "/blog/page/2" }).alternates?.canonical).toBe("https://cle-ai.com/blog/page/2");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.example.com/");
    expect(buildMetadata({ title: "A", path: "/a" }).alternates?.canonical).toBe("https://preview.example.com/a");
  });

  it("falls back to /assets/og-default.png, absolute, for og:image and the Twitter card", () => {
    const m = buildMetadata({ title: "A", path: "/a" });
    expect(og(m).images?.[0].url).toBe("https://cle-ai.com/assets/og-default.png");
    expect((m.twitter as { card: string }).card).toBe("summary_large_image");
  });

  const ref = (c: string) => ({ _type: "image", asset: { _type: "reference", _ref: `image-${c.repeat(40)}-800x600-jpg` } });
  async function withProject() {
    vi.resetModules();
    vi.doMock("@/sanity/env", () => ({ PLACEHOLDER_PROJECT_ID: "placeholder", projectId: "realproj", dataset: "production", apiVersion: "2026-11-01" }));
    return (await import("@/lib/seo")).buildMetadata;
  }

  it("crops a Sanity image to 1200x630", async () => {
    const build = await withProject();
    const url = og(build({ title: "A", path: "/a", image: ref("a") })).images![0];
    expect(url.url).toMatch(/^https:\/\/cdn\.sanity\.io\/images\/realproj\/production\/a{40}-800x600\.jpg\?.*w=1200/);
    expect(url.url).toContain("h=630");
    expect([url.width, url.height]).toEqual([1200, 630]);
  });

  it("prefers the SEO image over the document image", async () => {
    const build = await withProject();
    const m = build({ title: "A", path: "/a", image: ref("a"), seo: { image: ref("b") } });
    expect(og(m).images![0].url).toContain("b".repeat(40));
  });

  it("without Sanity (fixtures) points at the migrated file on the site origin", () => {
    const m = buildMetadata({ title: "A", path: "/a", image: ref("c") });
    expect(og(m).images![0].url).toBe(`https://cle-ai.com/migrated/${"c".repeat(40)}-800x600.jpg`);
  });

  it("noindexes on request (search) and when the SEO field says so", () => {
    expect(buildMetadata({ title: "Search", path: "/search", noindex: true }).robots).toMatchObject({ index: false });
    expect(buildMetadata({ title: "A", path: "/a", seo: { noindex: true } }).robots).toMatchObject({ index: false });
    expect(buildMetadata({ title: "A", path: "/a" }).robots).toBeUndefined();
  });

  it("marks posts as articles", () => {
    expect((buildMetadata({ title: "A", path: "/blog/a", type: "article" }).openGraph as { type: string }).type).toBe("article");
  });
});

describe("Content-Security-Policy (R33)", () => {
  const directive = (name: string) => {
    const d = buildCsp()
      .split(";")
      .map((s) => s.trim())
      .find((s) => s === name || s.startsWith(`${name} `));
    return d?.split(/\s+/).slice(1) ?? [];
  };

  it("has the agreed directives and no eval", () => {
    expect(directive("default-src")).toEqual(["'self'"]);
    expect(directive("script-src")).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'", "https://cdn.popt.in", "https://*.popt.in", "https://challenges.cloudflare.com"]),
    );
    // Poptin's jQuery, by path, not all of cdnjs.
    expect(directive("script-src")).toContain("https://cdnjs.cloudflare.com/ajax/libs/jquery/");
    expect(directive("script-src")).not.toContain("https://cdnjs.cloudflare.com");
    expect(buildCsp()).not.toContain("unsafe-eval");
    expect(directive("frame-src")).toEqual(
      expect.arrayContaining(["https://givebutter.com", "https://*.givebutter.com", "https://*.substack.com", "https://challenges.cloudflare.com"]),
    );
    expect(directive("img-src")).toEqual(expect.arrayContaining(["'self'", "data:", "blob:", "https://cdn.sanity.io"]));
    expect(directive("font-src")).toEqual(["'self'", "data:"]);
    expect(directive("form-action")).toEqual(["'self'"]);
    expect(directive("base-uri")).toEqual(["'self'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("frame-ancestors")).toEqual(["'self'"]);
    expect(directive("connect-src")).toEqual(expect.arrayContaining(["'self'", "https://challenges.cloudflare.com"]));
  });

  it("R36: the full policy is report-only; only frame-ancestors, object-src and base-uri are enforced", () => {
    const h = Object.fromEntries(securityHeaders(false).map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["content-security-policy-report-only"]).toBe(buildCsp());
    expect(h["content-security-policy"]).toBe("frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
    expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("flipping CSP_ENFORCE sends the full policy as the enforced one and drops report-only", () => {
    const h = Object.fromEntries(securityHeaders(true).map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["content-security-policy"]).toBe(buildCsp());
    expect(h["content-security-policy-report-only"]).toBeUndefined();
  });

  it("R37: frames and images may come from any https origin, so embeds and sanitized content are never blanked", () => {
    expect(directive("frame-src")).toContain("https:");
    expect(directive("img-src")).toEqual(expect.arrayContaining(["'self'", "data:", "blob:", "https:"]));
  });

  it("security headers carry nosniff, the referrer policy, and a permissions policy that lets only Givebutter pay", () => {
    const h = Object.fromEntries(securityHeaders().map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["permissions-policy"]).toContain("microphone=()");
    expect(h["permissions-policy"]).toContain("geolocation=()");
    expect(h["permissions-policy"]).toContain('payment=(self "https://givebutter.com")');
  });

  it("next.config applies the site headers everywhere except /studio, which gets no CSP of any kind (R34)", async () => {
    const rules = await nextConfig.headers!();
    const has = (r: (typeof rules)[number], key: string) => r.headers.some((h) => h.key.toLowerCase() === key);
    const matches = (r: (typeof rules)[number], path: string) => pathToRegexp(r.source).test(path);
    const site = rules.find((r) => has(r, "content-security-policy"))!;
    expect(site).toBeDefined();
    for (const path of ["/", "/about", "/blog/a-post", "/api/x", "/studios-we-like"]) expect(matches(site, path), path).toBe(true);
    for (const path of ["/studio", "/studio/desk", "/studio/structure/post"]) expect(matches(site, path), path).toBe(false);

    const studio = rules.filter((r) => matches(r, "/studio/desk") && !matches(r, "/about"));
    expect(studio.length).toBeGreaterThan(0);
    const studioHeaders = Object.fromEntries(studio.flatMap((r) => r.headers).map((h) => [h.key.toLowerCase(), h.value]));
    // Clickjacking protection only: the rest of the Studio stays exempt from the site policy.
    expect(studioHeaders["content-security-policy"]).toBe("frame-ancestors 'self'");
    expect(studioHeaders["x-frame-options"]).toBe("SAMEORIGIN");
    expect(studioHeaders["content-security-policy-report-only"]).toBeUndefined();
    expect(studioHeaders["x-content-type-options"]).toBe("nosniff");
  });
});

describe("R38: titles follow wp_get_document_title", () => {
  it("archives use the bare term, month and search names", async () => {
    const t = (m: ReturnType<typeof buildMetadata>) => (m.title as { absolute: string }).absolute;
    expect(t(buildMetadata({ title: "Meetup", path: "/blog/category/meetup" }))).toBe("Meetup – CLE AI & DATA");
    expect(t(buildMetadata({ title: "October 2026", path: "/blog/2026/10" }))).toBe("October 2026 – CLE AI & DATA");
    expect(t(buildMetadata({ title: "Search Results for “ai”", path: "/search", noindex: true }))).toBe("Search Results for “ai” – CLE AI & DATA");
    expect(titles.searchTitle("ai")).toBe("Search Results for “ai”");
    expect(titles.pageTitle("Meetup", 2)).toBe("Meetup – Page 2");
  });

  it("texturizes the whole title, as wp_get_document_title does", () => {
    expect(absTitle(buildMetadata({ title: "What's new", path: "/x" }))).toBe("What’s new – CLE AI & DATA");
    expect(absTitle(buildMetadata({ seo: { title: 'She said "hi"' }, path: "/x" }))).toBe("She said “hi” – CLE AI & DATA");
    expect((buildMetadata({ title: "What's new", path: "/x" }).openGraph as { title: string }).title).toBe("What’s new – CLE AI & DATA");
  });
});
