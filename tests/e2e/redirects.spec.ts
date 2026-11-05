// Task 16: old WordPress URLs answer one 308 to the final address, against the built server.
import { expect, test } from "@playwright/test";

const cases: [string, string | RegExp][] = [
  ["/?p=10", "/blog/what-we-learned-running-183-meetups"],
  ["/events?query-2-page=2", "/events/page/2"],
  ["/events?query-2-page=1", "/events"],
  ["/index.php/about/", "/about"],
  ["/index.php/get-involed/", "/get-involved"],
  ["/get-involed", "/get-involved"],
  ["/index.php/2026/09/19/voila-cle-ai-data-newsletter-september-2026/", "/blog/voila-cle-ai-data-newsletter-september-2026"],
  ["/index.php/meetup-event/october-workshop/", "/events/october-workshop"],
  ["/index.php/category/podcast/page/2/", "/blog/category/podcast/page/2"],
  ["/index.php/author/tedt/", "/blog/author/ted-troxell"],
  ["/index.php/feed/", "/feed.xml"],
  ["/About/", "/about"],
  ["/about/", "/about"],
  ["/blog/", "/blog"],
  ["/newsletter", "https://timcleaidata.substack.com/"],
  ["/wp-content/uploads/2026/09/scene-300x167.webp", /^https:\/\/cdn\.sanity\.io\/images\/.+\.webp$/],
  // A redirect document in the fixtures (people-added redirects).
  ["/studio-added-redirect", "/events"],
  ["/?p=99999", "/"],
];

for (const [from, to] of cases) {
  test(`${from} -> one 308`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    const location = res.headers()["location"];
    if (typeof to === "string") {
      expect(location.replace(/^http:\/\/localhost:\d+/, "")).toBe(to);
    } else {
      expect(location).toMatch(to);
    }
    // One hop: the target is not itself redirected by the proxy (external targets are not followed).
    if (location.startsWith("http://localhost")) {
      const next = await request.get(location, { maxRedirects: 0 });
      expect(next.status(), `${location} should be final`).not.toBe(308);
    }
  });
}

test("normal pages are not touched", async ({ request }) => {
  const res = await request.get("/about", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
});
