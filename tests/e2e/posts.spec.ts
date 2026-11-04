// Port of every post and archive check() in tests/bin/spec-check, against the fixture build, plus the
// scheduled-post checks (a future publishOn is invisible everywhere). Clock pinned to Oct 26 2026.
import { expect, test, type Page } from "@playwright/test";

const NEWSLETTER = "/blog/voila-cle-ai-data-newsletter-september-2026";
const NO_IMAGE = "/blog/the-month-ai-agents-stopped-being-a-demo";
const SCHEDULED = "scheduled-test-post";

async function get(page: Page, path: string) {
  const res = await page.goto(path);
  const main = await page.locator("main").evaluate((m) => m.outerHTML);
  return { status: res?.status(), html: await page.content(), main };
}

test.describe("single post", () => {
  test("title, author, date, badges, featured image, content, prev/next", async ({ page }) => {
    const { status, main } = await get(page, NEWSLETTER);
    expect(status).toBe(200);
    expect(main).toContain("Voilà: CLE AI &amp; DATA newsletter, September 2026");
    expect(main).toContain(">Ted Troxell<");
    expect(main).toContain("September 19, 2026");
    expect(main).toMatch(/<p[^>]*>By<\/p>/);
    expect(main).toContain(">Blog<");
    expect(main).toContain(">Newsletter<");
    expect(main).toContain('href="/blog/category/newsletter"');
    expect(main).toContain("wp-block-post-featured-image");
    for (const t of ["<h2", "<ul", "<blockquote", "<hr", "wp-block-post-content"]) expect(main).toContain(t);
    expect(main).toMatch(/post-navigation-link-(previous|next)/);
  });

  test("a post without a featured image has no image element; a single category is one badge", async ({ page }) => {
    const { status, main } = await get(page, NO_IMAGE);
    expect(status).toBe(200);
    expect(main).toContain(">Will Tatz<");
    expect(main).not.toContain("wp-block-post-featured-image");
    expect(main.match(/rel="tag"/g)?.length).toBe(1);
  });

  test("there are no comments", async ({ page }) => {
    const { main } = await get(page, NEWSLETTER);
    expect(main).not.toContain("wp-block-comments");
  });

  test("unknown slug is a 404", async ({ request }) => {
    expect((await request.get("/blog/no-such-post")).status()).toBe(404);
  });
});

test.describe("archives", () => {
  for (const slug of ["blog", "newsletter", "podcast"]) {
    test(`category archive /blog/category/${slug}`, async ({ page }) => {
      const { status, main } = await get(page, `/blog/category/${slug}`);
      expect(status).toBe(200);
      expect(main).toContain("wp-block-query-title");
      expect(main.match(/wp-block-post-title/g)?.length).toBeGreaterThanOrEqual(1);
    });
  }

  test("archive entries have featured image slot, author, date, badges and excerpt", async ({ page }) => {
    const { main } = await get(page, "/blog/category/blog");
    expect(main).toContain("By</p>");
    for (const c of ["wp-block-post-author-name", "wp-block-post-date", "wp-block-post-excerpt", "cle-badges"]) {
      expect(main).toContain(c);
    }
  });

  test("author archive", async ({ page }) => {
    const { status, html } = await get(page, "/blog/author/curtis-oneal");
    expect(status).toBe(200);
    expect(html).toContain("Podcast episode 12");
  });

  test("unknown category and author are 404", async ({ request }) => {
    expect((await request.get("/blog/category/nope")).status()).toBe(404);
    expect((await request.get("/blog/author/nope")).status()).toBe(404);
  });

  test("/blog lists posts newest first; no pagination for one page; page 2 and 0 are 404; page 1 redirects", async ({
    page,
    request,
  }) => {
    const { status, main } = await get(page, "/blog");
    expect(status).toBe(200);
    expect(main).toContain(">Blog</h1>");
    const titles = [...main.matchAll(/wp-block-post-title[^>]*><a[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(titles[0]).toBe("Newsletter: September roundup");
    expect(titles.at(-1)).toBe("The month AI agents stopped being a demo");
    expect(titles.length).toBe(5);
    expect(main).not.toContain("wp-block-query-pagination");
    expect((await request.get("/blog/page/2")).status()).toBe(404);
    const r = await request.get("/blog/page/1", { maxRedirects: 0 });
    expect(r.status()).toBe(308);
    expect(r.headers().location).toBe("/blog");
  });
});

test.describe("date archive", () => {
  test("/blog/2026/09 lists that month's posts under 'Month: September 2026'", async ({ page }) => {
    const { status, main } = await get(page, "/blog/2026/09");
    expect(status).toBe(200);
    expect(main).toContain("wp-block-query-title");
    expect(main).toContain("Month: September 2026");
    const titles = [...main.matchAll(/wp-block-post-title[^>]*><a[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(titles.length).toBe(5);
    expect(titles).toContain("Podcast episode 12");
    for (const c of ["wp-block-post-author-name", "wp-block-post-date", "wp-block-post-excerpt"]) expect(main).toContain(c);
  });

  test("the scheduled post is absent from its own month (November 2026), which is then empty: 404", async ({ request }) => {
    expect((await request.get("/blog/2026/11")).status()).toBe(404);
    // Its publishedAt is Nov 1 2026; a month with only that post must not exist.
    expect(await (await request.get("/blog/2026/09")).text()).not.toContain("Scheduled test post");
  });

  test("invalid year or month, empty month and page 2 are 404; page 1 redirects", async ({ request }) => {
    for (const path of ["/blog/2026/13", "/blog/2026/00", "/blog/2026/9", "/blog/20x6/09", "/blog/2026/ab", "/blog/1999/01", "/blog/2026/09/page/2"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
    const r = await request.get("/blog/2026/09/page/1", { maxRedirects: 0 });
    expect(r.status()).toBe(308);
    expect(r.headers().location).toBe("/blog/2026/09");
  });
});

test.describe("scheduled post (future publishOn)", () => {
  test("its URL is a 404", async ({ request }) => {
    expect((await request.get(`/blog/${SCHEDULED}`)).status()).toBe(404);
  });

  test("it is absent from /blog, the category archive, the author archive and the page count", async ({ page }) => {
    for (const path of ["/blog", "/blog/category/blog", "/blog/author/ted-troxell"]) {
      const { html } = await get(page, path);
      expect(html, path).not.toContain("Scheduled test post");
      expect(html, path).not.toContain(SCHEDULED);
    }
    // 5 visible posts: the count (and so the pagination) excludes the scheduled one.
    const { main } = await get(page, "/blog");
    expect(main.match(/wp-block-post-title/g)?.length).toBe(5);
  });

  test("it is absent from its neighbours' prev/next links", async ({ page }) => {
    // Its publishedAt (Nov 1) is the newest, so unfiltered it would be the "next" of the newest visible post.
    const { html } = await get(page, NEWSLETTER);
    expect(html).not.toContain(SCHEDULED);
    expect(html).not.toContain("Scheduled test post");
    const roundup = await get(page, "/blog/newsletter-september-roundup");
    expect(roundup.html).not.toContain(SCHEDULED);
    // The newest visible post has nothing newer: no next link at all.
    expect(roundup.main).not.toContain("post-navigation-link-next");
  });

  test("prev/next hrefs of a middle post are its neighbours (older = previous, newer = next)", async ({ page }) => {
    // Visible order, newest first: roundup, podcast-episode-12, 183-meetups, voila, month-ai-agents.
    const { main } = await get(page, "/blog/what-we-learned-running-183-meetups");
    const prev = /post-navigation-link-previous[^>]*><a href="([^"]+)"/.exec(main)?.[1];
    const next = /post-navigation-link-next[^>]*><a href="([^"]+)"/.exec(main)?.[1];
    expect(prev).toBe("/blog/voila-cle-ai-data-newsletter-september-2026");
    expect(next).toBe("/blog/podcast-episode-12");
    const oldest = await get(page, "/blog/the-month-ai-agents-stopped-being-a-demo");
    expect(oldest.main).not.toContain("post-navigation-link-previous");
  });

  test("it is absent from /feed.xml", async ({ request }) => {
    const xml = await (await request.get("/feed.xml")).text();
    expect(xml).not.toContain("Scheduled test post");
    expect(xml).not.toContain(SCHEDULED);
    expect(xml).not.toContain("zebracorn");
  });
});

test.describe("feed", () => {
  test("RSS 2.0, posts only, newest first, absolute URLs", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const xml = await res.text();
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    const items = xml.split("<item>").slice(1);
    expect(items.length).toBe(5);
    expect(items[0]).toContain("<title>Newsletter: September roundup</title>");
    expect(items[0]).toContain("<link>https://cle-ai.com/blog/newsletter-september-roundup</link>");
    expect(items[0]).toMatch(/<guid[^>]*>https:\/\/cle-ai\.com\/blog\/newsletter-september-roundup/);
    expect(items[0]).toContain("<pubDate>Fri, 25 Sep 2026 21:35:35 +0000</pubDate>");
    expect(xml).toContain("<title>Voilà: CLE AI &amp; DATA newsletter, September 2026</title>");
    const dates = items.map((i) => Date.parse(/<pubDate>([^<]+)</.exec(i)![1]));
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    expect(xml).not.toContain("/events/");
  });

  test("the feed is well-formed XML", async ({ page, request }) => {
    const xml = await (await request.get("/feed.xml")).text();
    await page.goto("/");
    const result = await page.evaluate((x) => {
      const doc = new DOMParser().parseFromString(x, "application/xml");
      return { error: doc.querySelector("parsererror")?.textContent ?? null, items: doc.querySelectorAll("item").length };
    }, xml);
    expect(result.error).toBeNull();
    expect(result.items).toBe(5);
  });
});
