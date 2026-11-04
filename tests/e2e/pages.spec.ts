// Port of the page checks in tests/php/test-pages.php and tests/bin/spec-check (pages, 404, search),
// against the fixture build. Clock pinned to Oct 26 2026.
import { expect, test, type Page } from "@playwright/test";

async function get(page: Page, path: string) {
  const res = await page.goto(path);
  // /search streams its results in after the shell; wait for them.
  if (path.startsWith("/search")) await page.locator("main h1.wp-block-query-title").waitFor();
  const main = await page.locator("main").first().evaluate((m) => m.outerHTML);
  return { status: res?.status(), html: await page.content(), main };
}
const count = (s: string, needle: string) => s.split(needle).length - 1;

test.describe("pages", () => {
  test("an ordinary page keeps its title", async ({ page }) => {
    const { status, main } = await get(page, "/a-plain-page");
    expect(status).toBe(200);
    expect(main).toContain('class="wp-block-post-title"');
    expect(main).toContain("Just text.");
    await expect(page.locator("body.cle-has-own-headline, .cle-has-own-headline")).toHaveCount(0);
  });

  test("a page whose body has its own h1 hides the title, on the landing template", async ({ page }) => {
    const { status, main } = await get(page, "/about");
    expect(status).toBe(200);
    expect(count(main, "<h1")).toBe(1);
    expect(main).toContain("Making AI accessible to <strong>everyone</strong>.");
    expect(main).not.toContain("wp-block-post-title");
    // R21: the seven team cards come with the cle/team block (Task 11); the About page itself renders.
    expect(main).toContain("wp-block-group");
  });

  test("... and on the default template", async ({ page }) => {
    const { status, main } = await get(page, "/own-headline-test");
    expect(status).toBe(200);
    expect(count(main, "<h1")).toBe(1);
    expect(main).toContain("A headline of its own");
    expect(main).not.toContain("wp-block-post-title");
    expect(main).toMatch(/class="[^"]*\balignfull\b[^"]*\bwp-block-post-content\b/);
    // the flag the theme's CSS keys on, so the first section's own spacing wins
    await expect(page.locator("main.wp-block-group.cle-has-own-headline")).toHaveCount(1);
  });

  test("code of conduct", async ({ page }) => {
    const { status, main } = await get(page, "/code-of-conduct");
    expect(status).toBe(200);
    for (const part of ["What we expect", "What isn’t OK", "If something happens", "What we’ll do", "info@cle-ai.com", "call 911"]) {
      expect(main, part).toContain(part);
    }
  });

  test("privacy: three tables, one headline, service names filled in (R11)", async ({ page }) => {
    const { status, main } = await get(page, "/privacy");
    expect(status).toBe(200);
    expect(count(main, 'class="wp-block-table cle-table"')).toBe(3);
    expect(count(main, "<h1")).toBe(1);
    for (const part of ["Who we are and what this covers", "What we collect", "Your choices", "How long we keep things", "6545 Market Ave N"]) {
      expect(main, part).toContain(part);
    }
    expect(main).not.toContain("[HOST]");
    expect(main).not.toContain("[NEWSLETTER TOOL]");
  });

  test("an unknown slug is a 404 with the shell and the lost Dot", async ({ page }) => {
    for (const path of ["/no-such-page", "/blog/no-such-post", "/events/no-such-event"]) {
      const { status, main, html } = await get(page, path);
      expect(status, path).toBe(404);
      // WordPress texturizes the 404 template's apostrophe (Task 17 visual parity).
      expect(main, path).toContain("Dot can’t find that page.");
      expect(main).toContain("cle-dot--lost");
      expect(main).toContain('role="search"');
      expect(html, `${path} has the header`).toContain("cle-search");
      expect(html, `${path} has the footer`).toContain("501(c)(3) nonprofit");
    }
  });
});

// What renders in this task of tests/php/test-pages.php and spec-check:122-147. Moved to later tasks:
//   Task 11 (now in interactive-a.spec.ts; cle/team, cle/bead-timeline, cle/embed-form): seven team cards, headshots with ?v=, three Leadership
//     labels, modals, five beads on About (after-merger story, R25), the newsletter iframe (src, sandbox, title) and the donation iframe
//     (src, allow="payment", Givebutter fallback link), two iframes on Get involved, embed-form https/min-height rules.
//   Task 12 (cle/sponsor-builder, cle/gift-slider, cle/way-finder, cle/coming-up): tier prices ($800, $1,800, $2,500),
//     the builder instead of the static tiers, the way-finder and gift slider, the coming-up card, the "Does your
//     employer match gifts?" tie-in beyond static copy.
//   Not ported (R22): the merger embargo scan.
test.describe("Sponsors and Get involved", () => {
  test("/sponsors: landing template, one h1, sponsor tiles, stance, styles", async ({ page }) => {
    const { status, main } = await get(page, "/sponsors");
    expect(status).toBe(200);
    expect(count(main, "<h1")).toBe(1);
    expect(main).not.toContain("wp-block-post-title");
    expect(main).toContain("Arista Networks");
    expect(main).not.toContain("Cloudera");
    expect(main).not.toMatch(/>IBM</);
    const tiles = main.match(/<ul class="[^"]*\bcle-sponsors\b[^"]*">([\s\S]*?)<\/ul>/)?.[1] ?? "";
    expect(count(tiles, "<li")).toBe(16);
    expect(main).toContain("acknowledgment, not endorsement");
    expect(main).toContain("501(c)(3)");
    expect(main).toContain("assets/illustrations/corporate-partners.webp");
    expect(main).toContain("Or email info@cle-ai.com");
    const corporate = main.slice(main.indexOf("Corporate partners"));
    expect(count(corporate, "<li><strong>")).toBe(4);
    expect(count(main, "<iframe"), "the inquiry form waits for its URL").toBe(0);
    expect(main, "inline styles survive the filter").toMatch(/style="[^"]*padding-top:var\(--wp--preset--spacing--section\)/);
  });

  test("/get-involved: landing template, one h1, the anchors the way-finder points to, art, styles", async ({ page }) => {
    const { status, main } = await get(page, "/get-involved");
    expect(status).toBe(200);
    expect(count(main, "<h1")).toBe(1);
    expect(main).not.toContain("wp-block-post-title");
    for (const a of ["events", "newsletter", "speak", "volunteer", "sponsor", "donate"]) expect(main, `#${a}`).toContain(`id="${a}"`);
    for (const img of ["mailbox", "microphone", "sprout"]) expect(main).toContain(`assets/illustrations/${img}.webp`);
    expect(main).toContain("tax-deductible as allowed by law");
    expect(main).toContain("501(c)(3)");
    expect(main).toMatch(/style="[^"]+"/);
    // the newsletter and donation embeds (Task 11); the speaker form stays empty until its URL is set
    expect(count(main, "<iframe")).toBe(2);
    // every iframe that does render keeps an https src
    for (const src of await page.locator("main iframe").evaluateAll((els) => els.map((e) => e.getAttribute("src") ?? ""))) {
      expect(src).toMatch(/^https:\/\//);
    }
  });

  test("every internal link on the menu and the pages resolves (spec-check:149-156)", async ({ page, request }) => {
    const links = new Set<string>();
    for (const path of ["/", "/about", "/sponsors", "/get-involved", "/privacy", "/code-of-conduct"]) {
      await page.goto(path);
      const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
      for (const h of hrefs) {
        if (!h.startsWith("/") || h.startsWith("//")) continue;
        const clean = h.split(/[#?]/)[0];
        if (!clean || /\.(css|js|png|webp|woff2|ico)$|^\/_next\/|^\/feed|^\/wp-/.test(clean)) continue;
        links.add(clean);
      }
    }
    expect(links.size).toBeGreaterThan(5);
    for (const l of links) expect((await request.get(l)).status(), l).toBe(200);
  });
});

test.describe("search", () => {
  test("finds a page, a post and an event; results have title link, date and excerpt", async ({ page }) => {
    let r = await get(page, "/search?q=privacy");
    expect(r.status).toBe(200);
    expect(r.main).toContain("Search results for: “privacy”");
    expect(r.main).toContain('href="/privacy"');
    expect(r.main, "pages show no date (R24)").not.toContain("wp-block-post-date");
    r = await get(page, "/search?q=lightning");
    expect(r.main).toContain('href="/events/');
    r = await get(page, "/search?q=newsletter");
    expect(r.main).toContain('href="/blog/voila-cle-ai-data-newsletter-september-2026"');
    expect(r.main).toContain("wp-block-post-date");
  });

  test("hits with every word in the title come first (R24)", async ({ page }) => {
    const { main } = await get(page, "/search?q=newsletter");
    const first = main.indexOf('class="wp-block-post-title');
    expect(first).toBeGreaterThan(0);
    expect(main.slice(first, first + 400).toLowerCase()).toContain("newsletter");
  });

  test("a scheduled post's unique word returns nothing", async ({ page }) => {
    const { main } = await get(page, "/search?q=zebracorn");
    expect(main).not.toContain("scheduled-test-post");
    expect(main).not.toContain("Scheduled test post");
    expect(main).toContain("cle-dot--search");
  });

  test("an empty search shows the hunting Dot", async ({ page }) => {
    for (const path of ["/search?q=", "/search", "/search?q=qqqxxyyzz"]) {
      const { status, main } = await get(page, path);
      expect(status, path).toBe(200);
      expect(main, path).toContain("cle-dot--search");
      expect(main).toContain("Dot looked everywhere and found nothing.");
      expect(main).toContain('role="search"');
    }
  });

  test("the search words are escaped", async ({ page }) => {
    const { main } = await get(page, "/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(main).not.toContain("<script>alert");
    expect(main).toContain("&lt;script&gt;");
  });
});
