// Task 15: titles, canonicals and og:image on every route, the sitemap and robots, the Poptin pixel,
// no analytics, event JSON-LD, and the CSP (R33) with no violations. Nothing here leaves the machine:
// Poptin, Cloudflare, Givebutter and Substack are routed to empty responses.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://cle-ai.com").replace(/\/+$/, "");
// A fixtures build (this one) loads a local stand-in for the pixel (src/lib/poptin.ts); the unit test pins the real address.
const POPTIN = "/assets/js/poptin-fixture.js";

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function tag(html: string, tagName: "link" | "meta", key: string, value: string, attr: string): string | undefined {
  for (const m of html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "g"))) {
    const t = m[0];
    if (new RegExp(`\\b${key}="${value}"`).test(t)) return decode(new RegExp(`\\b${attr}="([^"]*)"`).exec(t)?.[1] ?? "");
  }
  return undefined;
}
const titleOf = (html: string) => decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "");
const canonicalOf = (html: string) => tag(html, "link", "rel", "canonical", "href");
const ogImageOf = (html: string) => tag(html, "meta", "property", "og:image", "content");

async function block(page: Page) {
  const hits: string[] = [];
  await page.route(/^https:\/\/([^/]+\.)?(popt\.in|poptin\.com|cloudflare\.com|givebutter\.com|substack\.com)\//, (route) => {
    hits.push(route.request().url());
    const type = route.request().resourceType();
    return route.fulfill(type === "script" ? { contentType: "application/javascript", body: "" } : { contentType: "text/html", body: "<!doctype html><title>blocked</title>" });
  });
  return hits;
}

const ROUTES: [string, RegExp][] = [
  ["/", /^CLE AI & DATA – Cleveland’s community for AI and data$/],
  ["/about", /^About – CLE AI & DATA$/],
  ["/a-plain-page", /^A plain page – CLE AI & DATA$/],
  ["/blog", /^Blog – CLE AI & DATA$/],
  ["/blog/page/2", /^Blog – Page 2 – CLE AI & DATA$/],
  ["/blog/what-we-learned-running-183-meetups", /^What we learned running 183 meetups – CLE AI & DATA$/],
  ["/blog/category/meetup", /^Meetup – CLE AI & DATA$/],
  ["/events", /^Meetup Events – CLE AI & DATA$/],
  ["/events/october-workshop", /^October workshop – CLE AI & DATA$/],
  ["/search?q=meetup", /^Search Results for “meetup” – CLE AI & DATA$/],
  ["/blog/2026/09", /^September 2026 – CLE AI & DATA$/],
  ["/blog/author/ted-troxell", /^Ted Troxell – CLE AI & DATA$/],
];

test.describe("titles, canonicals, og:image", () => {
  for (const [path, title] of ROUTES) {
    test(`${path}`, async ({ request }) => {
      const res = await request.get(path);
      // /blog/page/2 only exists when there is a second page; every other route here must exist.
      test.skip(path === "/blog/page/2" && res.status() === 404, "the fixtures have a single page of posts");
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(titleOf(html)).toMatch(title);
      const url = new URL(path, "http://x");
      // Canonical: absolute, self, without the query string (search results canonicalise to /search).
      // (Next prints the home page's canonical without the slash: the same URL.)
      expect(canonicalOf(html)).toBe(url.pathname === "/" ? SITE : `${SITE}${url.pathname}`);
      expect(ogImageOf(html)).toMatch(/^https:\/\/.+\.(png|jpe?g|webp)(\?.*)?$/);
    });
  }

  test("a 404 has a title and og:image too", async ({ request }) => {
    // Two segments: the unmatched-URL 404 (global-not-found), which renders on the server.
    const res = await request.get("/no/such-page");
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(titleOf(html)).toBe("Page not found – CLE AI & DATA");
    expect(ogImageOf(html)).toBeTruthy();
  });

  test("the default og:image file exists and is a PNG", async ({ request }) => {
    const res = await request.get("/assets/og-default.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("search results are noindex; ordinary pages are not", async ({ request }) => {
    expect(tag(await (await request.get("/search?q=meetup")).text(), "meta", "name", "robots", "content")).toMatch(/noindex/);
    expect(tag(await (await request.get("/about")).text(), "meta", "name", "robots", "content") ?? "").not.toMatch(/noindex/);
  });

  test("a post is an og:type article with its excerpt or first words as the description", async ({ request }) => {
    const html = await (await request.get("/blog/what-we-learned-running-183-meetups")).text();
    expect(tag(html, "meta", "property", "og:type", "content")).toBe("article");
    expect(tag(html, "meta", "name", "description", "content")).toBeTruthy();
  });
});

test.describe("sitemap and robots", () => {
  async function locs(request: Page["request"]) {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    return [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  }

  test("lists the home page, pages, visible posts, events and archives", async ({ request }) => {
    const urls = await locs(request);
    for (const p of ["/", "/about", "/blog", "/events", "/blog/what-we-learned-running-183-meetups", "/events/october-workshop"]) {
      expect(urls).toContain(p === "/" ? `${SITE}/` : `${SITE}${p}`);
    }
    // Categories and authors appear when they have a public post.
    expect(urls.some((u) => u.includes("/blog/category/"))).toBe(true);
    expect(urls.some((u) => u.includes("/blog/author/"))).toBe(true);
  });

  test("excludes the scheduled post, the Studio, the API and search", async ({ request }) => {
    const urls = await locs(request);
    expect(urls.filter((u) => u.includes("scheduled-test-post"))).toEqual([]);
    expect(urls.filter((u) => /\/(studio|api|search)(\/|$)/.test(u))).toEqual([]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("every URL in it is a real page with a title, canonical and og:image", async ({ request }) => {
    for (const loc of await locs(request)) {
      const path = new URL(loc).pathname;
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect(titleOf(html), path).not.toBe("");
      expect(canonicalOf(html), path).toBe(loc.replace(/^(https?:\/\/[^/]+)\/$/, "$1"));
      expect(ogImageOf(html), path).toBeTruthy();
    }
  });

  test("robots.txt disallows /studio and /api and points at the sitemap", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toMatch(/^User-agent: \*$/im);
    expect(txt).toMatch(/^Disallow: \/studio$/m);
    expect(txt).toMatch(/^Disallow: \/api$/m);
    expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});

test.describe("Poptin", () => {
  for (const path of ["/", "/about", "/no-such-page"]) {
    test(`the pixel is on ${path}`, async ({ page }) => {
      await block(page);
      await page.goto(path);
      await expect(page.locator(`script[src="${POPTIN}"]`)).toHaveCount(1);
    });
  }

  test("it is not in the Studio", async ({ request }) => {
    const res = await request.get("/studio");
    expect(await res.text()).not.toContain("popt.in");
  });
});

test.describe("no analytics anywhere", () => {
  // Words (any case), and the ID shapes (exact case: "g-december" in a slug is not a Google ID).
  const WORDS = /googletagmanager|gtag\(|gtag\/js|google-analytics|googleanalytics|monsterinsights|site-?kit|_gaq/i;
  const IDS = /\bUA-\d{4,}-\d+\b|\bG-[A-Z0-9]{8,}\b/;
  const FORBIDDEN = { test: (s: string) => WORDS.test(s) || IDS.test(s) };
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
    });

  test("no built HTML page mentions Google Tag Manager, gtag, Analytics, MonsterInsights or Site Kit", () => {
    const files = walk(".next/server/app");
    expect(files.length).toBeGreaterThan(20);
    const bad = files.filter((f) => FORBIDDEN.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  test("a rendered page loads no analytics request", async ({ page }) => {
    const seen: string[] = [];
    await block(page);
    page.on("request", (r) => seen.push(r.url()));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(seen.filter((u) => FORBIDDEN.test(u) || /google/i.test(new URL(u).hostname))).toEqual([]);
  });
});

test.describe("event JSON-LD", () => {
  test("is parseable Event data with an offset start and a location", async ({ request }) => {
    const html = await (await request.get("/events/mega-meetup-at-the-museum")).text();
    const raw = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(raw).toHaveLength(1);
    const ld = JSON.parse(raw[0].replace(/\\u003c/g, "<"));
    expect(ld["@type"]).toBe("Event");
    expect(ld.name).toBe("Mega Meetup at the Museum");
    expect(ld.startDate).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
    expect(ld.location).toBeTruthy();
  });
});

test.describe("security headers and CSP (R33, R34)", () => {
  test("/ reports the full policy and enforces only the minimal one (R36)", async ({ request }) => {
    const h = (await request.get("/")).headers();
    const report = h["content-security-policy-report-only"];
    expect(report).toContain("default-src 'self'");
    expect(report).toContain("https://cdn.popt.in");
    expect(report).toContain("https://challenges.cloudflare.com");
    expect(report).toContain("frame-ancestors 'self'");
    expect(report).not.toContain("unsafe-eval");
    expect(h["content-security-policy"]).toBe("frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
    expect(h["x-frame-options"]).toBe("SAMEORIGIN");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["permissions-policy"]).toContain('payment=(self "https://givebutter.com")');
  });

  test("a 404 carries the policy too", async ({ request }) => {
    expect((await request.get("/no-such-page")).headers()["content-security-policy-report-only"]).toContain("default-src 'self'");
  });

  test("the Studio is not served the site CSP", async ({ request }) => {
    const res = await request.get("/studio");
    // Only clickjacking protection, no site policy.
    expect(res.headers()["content-security-policy"]).toBe("frame-ancestors 'self'");
    expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers()["content-security-policy-report-only"]).toBeUndefined();
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  for (const path of ["/", "/about", "/get-involved", "/sponsors", "/blog", "/events/october-workshop", "/no/such-page"]) {
    test(`${path} loads with zero CSP violations`, async ({ page }) => {
      const violations: string[] = [];
      await block(page);
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
          (window as unknown as { __csp: string[] }).__csp ??= [];
          (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
        });
      });
      page.on("console", (m) => {
        if (/content security policy/i.test(m.text())) violations.push(m.text());
      });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Give the afterInteractive Poptin script and any iframes a beat to attempt their loads.
      await page.waitForTimeout(300);
      const inPage = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
      expect([...violations, ...inPage]).toEqual([]);
    });
  }

  test("R37: an embed form pointing at any https site loads with no CSP violation", async ({ page }) => {
    const violations: string[] = [];
    await block(page);
    await page.route(/^https:\/\/[^/]*example\.org\//, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>form</title>" }));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => ((window as unknown as { __csp: string[] }).__csp ??= []).push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    page.on("console", (m) => /content security policy/i.test(m.text()) && violations.push(m.text()));
    await page.goto("/get-involved");
    const frame = page.locator("iframe.cle-embed-form__frame").first();
    await frame.evaluate((el) => {
      (el as HTMLIFrameElement).src = "https://forms.example.org/embed/abc";
      const img = document.createElement("img");
      img.src = "https://images.example.org/pic.png";
      document.body.append(img);
    });
    await page.waitForTimeout(500);
    const inPage = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
    expect([...violations, ...inPage]).toEqual([]);
  });

  test("draft banner: absent in a normal page", async ({ page }) => {
    await block(page);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /exit preview/i })).toHaveCount(0);
  });
});
