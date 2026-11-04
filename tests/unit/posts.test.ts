import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Pagination, pageItems } from "@/components/Pagination";
import { excerptOf, monthRange, pageNumber, pageWindow } from "@/lib/posts";
import { reservedPostSlug } from "@/sanity/schemas/reservedSlugs";

describe("pageWindow", () => {
  it("one page has no pagination", () => expect(pageWindow(5, 10)).toEqual({ pages: 1, from: 0, to: 10 }));
  it("exactly a full page is one page", () => expect(pageWindow(10, 10).pages).toBe(1));
  it("11 posts are two pages", () => expect(pageWindow(11, 10)).toEqual({ pages: 2, from: 0, to: 10 }));
  it("page 2 window", () => expect(pageWindow(25, 10, 2)).toEqual({ pages: 3, from: 10, to: 20 }));
  it("no posts is one (empty) page", () => expect(pageWindow(0, 10).pages).toBe(1));
});

import { buildFeed } from "@/lib/posts";

describe("buildFeed", () => {
  const item = {
    title: "A & B <c>",
    slug: "a-b",
    publishedAt: "2026-09-19T13:00:00Z",
    excerpt: "Hello ]]> world & more",
  };
  const xml = buildFeed("https://x.test", [item]);
  it("escapes text and uses absolute URLs", () => {
    expect(xml).toContain("<title>A &amp; B &lt;c&gt;</title>");
    expect(xml).toContain("<link>https://x.test/blog/a-b</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://x.test/blog/a-b</guid>');
    expect(xml).toContain("<description>Hello ]]&gt; world &amp; more</description>");
    expect(xml).toContain("<pubDate>Sat, 19 Sep 2026 13:00:00 +0000</pubDate>");
  });
  it("is an RSS 2.0 document", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
  });
});

describe("buildFeed illegal characters", () => {
  it("strips XML-illegal control characters but keeps tab, newline and text", () => {
    const xml = buildFeed("https://x.test", [
      { title: "a\u0000b\u0008c\u000Bd\u001Fe\tf\ng\uFFFEh", slug: "s", publishedAt: "2026-09-19T13:00:00Z" },
    ]);
    expect(xml).toContain("<title>abcde\tf\ngh</title>");
    // eslint-disable-next-line no-control-regex
    expect(xml).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/);
  });
});

describe("pageNumber", () => {
  it.each([
    ["2", 2],
    ["10", 10],
    ["9999", 9999],
    ["1", null],
    ["0", null],
    ["02", null],
    ["-3", null],
    ["abc", null],
    ["1.5", null],
    ["12345", null],
    ["", null],
  ])("%j -> %j", (input, out) => expect(pageNumber(input)).toBe(out));
});

describe("monthRange (New York month boundaries)", () => {
  it("September 2026 starts and ends at midnight EDT", () => {
    expect(monthRange(2026, 9)).toEqual({ since: "2026-09-01T04:00:00.000Z", until: "2026-10-01T04:00:00.000Z" });
  });
  it("November 2026 spans the DST change (EDT start, EST end)", () => {
    expect(monthRange(2026, 11)).toEqual({ since: "2026-11-01T04:00:00.000Z", until: "2026-12-01T05:00:00.000Z" });
  });
  it("December rolls into the next year", () => {
    expect(monthRange(2026, 12).until).toBe("2027-01-01T05:00:00.000Z");
  });
});

describe("reservedPostSlug", () => {
  it.each(["page", "category", "author", "2026", "1999"])("rejects %s", (s) =>
    expect(reservedPostSlug({ current: s })).not.toBe(true),
  );
  it.each(["pages", "my-post", "2026-recap", "12345", "a2026"])("accepts %s", (s) =>
    expect(reservedPostSlug({ current: s })).toBe(true),
  );
  it("accepts an empty slug (required() reports that)", () => expect(reservedPostSlug(undefined)).toBe(true));
});

describe("<Pagination>", () => {
  const html = (page: number, pages: number) =>
    renderToStaticMarkup(Pagination({ page, pages, hrefFor: (n) => (n <= 1 ? "/blog" : `/blog/page/${n}`) }));
  it("renders nothing for one page", () => expect(html(1, 1)).toBe(""));
  it("current page is a span; page 1 links drop /page/1", () => {
    const h = html(2, 3);
    expect(h).toContain('<span aria-current="page" class="page-numbers current">2</span>');
    expect(h).toContain('<a class="page-numbers" href="/blog">1</a>');
    expect(h).toContain('<a class="page-numbers" href="/blog/page/3">3</a>');
    expect(h).not.toContain("/page/1");
  });
  it("previous only where valid", () => {
    expect(html(1, 3)).not.toContain("Previous Page");
    expect(html(1, 3)).toContain('href="/blog/page/2" class="wp-block-query-pagination-next"');
    expect(html(3, 3)).not.toContain("Next Page");
    expect(html(3, 3)).toContain('href="/blog/page/2" class="wp-block-query-pagination-previous"');
    expect(html(2, 3)).toContain("Previous Page");
    expect(html(2, 3)).toContain("Next Page");
  });
  it("windows long runs like paginate_links (end 1, mid 2, dots)", () => {
    expect(pageItems(1, 12)).toEqual([1, 2, 3, "dots", 12]);
    expect(pageItems(6, 12)).toEqual([1, "dots", 4, 5, 6, 7, 8, "dots", 12]);
    expect(pageItems(12, 12)).toEqual([1, "dots", 10, 11, 12]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const h = html(6, 12);
    expect(h).toContain('<span class="page-numbers dots">…</span>');
    expect(h).not.toContain('href="/blog/page/9"');
  });
});

// WordPress's automatic excerpt (excerpt_remove_blocks): lists are skipped (their list-item inner
// blocks aren't allowed), quotes are kept. Seen on the visual parity diff of /blog (Task 17).
describe("excerptOf (automatic)", () => {
  const span = (text: string) => ({ _type: "span", text, marks: [] });
  const body = [
    { _type: "block", style: "normal", children: [span("Intro paragraph with a "), span("link"), span(".")] },
    { _type: "block", style: "h2", children: [span("A heading")] },
    { _type: "block", style: "normal", listItem: "bullet", level: 1, children: [span("First")] },
    { _type: "block", style: "normal", listItem: "bullet", level: 1, children: [span("Second")] },
    { _type: "quote", text: "A quotation." },
    { _type: "separator", style: "default" },
    { _type: "block", style: "normal", children: [span("Closing paragraph.")] },
  ];
  it("matches WordPress: no list items, the quote's text kept", () =>
    expect(excerptOf({ body })).toBe("Intro paragraph with a link. A heading A quotation. Closing paragraph."));
  it("the excerpt field wins", () => expect(excerptOf({ excerpt: " Own. ", body })).toBe("Own."));
});
