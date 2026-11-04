// Post HTML -> richBody. The fixtures are 2026 posts as the test site serves them (content.rendered
// from the REST API): the September 2026 newsletter, and the November 2026 merger announcement,
// which has the images and cited quotes the newsletter lacks.
import { readFileSync } from "node:fs";
import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import { htmlToRichBody } from "../../scripts/migrate-wp/html";

type Item = { _type: string; _key: string; [k: string]: unknown };
const fixture = (name: string) => readFileSync(`tests/fixtures/wp/${name}.html`, "utf8");
const text = (b: Item) => ((b.children as { text: string }[]) ?? []).map((s) => s.text).join("");

describe("htmlToRichBody: the September 2026 newsletter", () => {
  const body = htmlToRichBody(fixture("newsletter-2026-09")) as Item[];

  it("keeps paragraphs, headings and lists in order", () => {
    expect(body.map((b) => [b._type, b.style ?? null, b.listItem ?? null])).toEqual([
      ["block", "normal", null],
      ["block", "h2", null],
      ["block", "normal", "bullet"],
      ["block", "normal", "bullet"],
      ["quote", null, null],
      ["separator", "default", null],
      ["block", "normal", null],
    ]);
    expect(text(body[1])).toBe("A heading");
    expect([text(body[2]), text(body[3])]).toEqual(["First", "Second"]);
    expect(body[2].level).toBe(1);
  });

  it("keeps links as annotations", () => {
    const intro = body[0];
    expect(text(intro)).toBe("Intro paragraph with a link.");
    const [def] = intro.markDefs as Item[];
    expect(def).toMatchObject({ _type: "link", href: "https://example.com" });
    expect((intro.children as Item[]).find((s) => (s.marks as string[]).includes(def._key))).toMatchObject({ text: "link" });
  });

  it("keeps the blockquote", () => {
    expect(body[4]).toEqual({ _type: "quote", _key: expect.any(String), text: "A quotation." });
  });
});

describe("htmlToRichBody: the November 2026 merger announcement", () => {
  const body = htmlToRichBody(fixture("merger-announcement-2026-11")) as Item[];
  const ofType = (t: string) => body.filter((b) => b._type === t);

  it("keeps blockquotes with their cite, split into name and title", () => {
    const quotes = ofType("quote");
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({ citeName: "[NAME]", citeTitle: "[TITLE], CLE AI & DATA" });
    expect(String(quotes[0].text)).toMatch(/^\[QUOTE FROM A CLE AI & DATA LEADER: why this matters for Cleveland’s/);
    expect(quotes[1]).toMatchObject({ citeName: "[NAME]", citeTitle: "[TITLE], Data in the Land" });
  });

  it("keeps images: sized clay illustrations as their HTML, src intact", () => {
    const raws = ofType("rawHtml").map((r) => String(r.html));
    for (const img of ["merger-beads", "job-board", "east-side-taproom", "dot-welcome"])
      expect(raws.some((h) => h.includes(`assets/illustrations/${img}.webp`)), img).toBe(true);
  });

  it("keeps headings, the chapters list with bold and line breaks, links and buttons", () => {
    const h2s = body.filter((b) => b.style === "h2").map(text);
    expect(h2s).toEqual([
      "What this means for Data in the Land members",
      "What this means for CLE AI & DATA members",
      "Come say hello",
    ]);
    const chapters = body.filter((b) => b.listItem === "chapters");
    expect(chapters).toHaveLength(3);
    expect(chapters[0].children).toEqual([
      { _type: "span", _key: expect.any(String), text: "New: weekly job postings", marks: ["strong"] },
      {
        _type: "span",
        _key: expect.any(String),
        text: "\nData and AI job openings posted every week on the CLE AI & DATA LinkedIn page.",
        marks: [],
      },
    ]);
    expect(body.find((b) => b.style === "medium")).toBeDefined();
    const buttons = ofType("buttons")[0];
    expect((buttons.items as Item[]).map((b) => [b.label, b.href, b.style])).toEqual([
      ["RSVP on Meetup", "https://www.meetup.com/cleveland-ai-data/", "fill"],
      ["[CLE AI & DATA LinkedIn page]", "#", "outline"],
    ]);
    const last = body.at(-1)!;
    expect(text(last)).toBe("Questions? Reach us at info@cle-ai.com.");
    expect(last.markDefs).toEqual([{ _type: "link", _key: expect.any(String), href: "mailto:info@cle-ai.com" }]);
  });

  it("drops nothing: every word of the post's text is still there", () => {
    const words = (s: string) => s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const source = new Set(words(parse(fixture("merger-announcement-2026-11")).text));
    const out = new Set(words(JSON.stringify(body).replace(/\\n/g, " ")));
    expect([...source].filter((w) => !out.has(w))).toEqual([]);
  });
});

describe("htmlToRichBody: classic HTML", () => {
  it("turns a plain image into an image object through the resolver", () => {
    const body = htmlToRichBody(
      '<p><img class="aligncenter size-full wp-image-114" src="https://cle-ai.com/wp-content/uploads/2026/09/cle-logo.png" alt="Logo" width="1080" height="1080" /></p><p>After <b>bold</b><br />line</p>',
      { resolveImage: () => ({ _type: "image", asset: { _type: "reference", _ref: "image-x-1x1-png" } }) },
    ) as Item[];
    expect(body[0]).toMatchObject({ _type: "image", alt: "Logo", align: "center", style: "framed" });
    expect(body[1].children).toEqual([
      { _type: "span", _key: expect.any(String), text: "After ", marks: [] },
      { _type: "span", _key: expect.any(String), text: "bold", marks: ["strong"] },
      { _type: "span", _key: expect.any(String), text: "\nline", marks: [] },
    ]);
  });

  it("keeps markup it can't represent as rawHtml", () => {
    const body = htmlToRichBody('<p>Run <code>npm test</code></p><iframe src="https://example.com/x"></iframe>') as Item[];
    expect(body.map((b) => b._type)).toEqual(["rawHtml", "rawHtml"]);
    expect(body[0].html).toBe("<p>Run <code>npm test</code></p>");
  });

  it("nested lists get levels", () => {
    const body = htmlToRichBody("<ol><li>One<ul><li>One a</li></ul></li><li>Two</li></ol>") as Item[];
    expect(body.map((b) => [b.listItem, b.level, text(b)])).toEqual([
      ["number", 1, "One"],
      ["bullet", 2, "One a"],
      ["number", 1, "Two"],
    ]);
  });
});
