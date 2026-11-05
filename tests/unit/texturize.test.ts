// The renderer's port of wptexturize (ruling R12).
import { describe, expect, it } from "vitest";
import { texturize, texturizeHtml, texturizeSpans } from "@/components/core/texturize";

describe("texturize", () => {
  it("curls apostrophes and quotes", () => {
    expect(texturize("don't")).toBe("don’t");
    expect(texturize("CLE AI & DATA's members")).toBe("CLE AI & DATA’s members");
    expect(texturize('He said "quoted" twice.')).toBe("He said “quoted” twice.");
    expect(texturize('"Quoted" at the start')).toBe("“Quoted” at the start");
    expect(texturize("a 'single' quote")).toBe("a ‘single’ quote");
    expect(texturize("(\"bracketed\")")).toBe("(“bracketed”)");
    expect(texturize("back in the '90s")).toBe("back in the ’90s");
    expect(texturize("``old style''")).toBe("“old style”");
  });

  it("makes dashes, ellipses, primes and times signs", () => {
    expect(texturize("2010--2026")).toBe("2010–2026");
    expect(texturize("wait --- what")).toBe("wait — what");
    expect(texturize("wait---what")).toBe("wait—what");
    expect(texturize("this -- that")).toBe("this — that");
    expect(texturize("this - that")).toBe("this – that");
    expect(texturize("well-known")).toBe("well-known");
    expect(texturize("And then...")).toBe("And then…");
    expect(texturize(`He is 5'10" tall`)).toBe("He is 5′10″ tall");
    expect(texturize("1920x1080")).toBe("1920×1080");
  });

  it("leaves code, URLs and emails alone", () => {
    expect(texturize("Run `npm run --watch` now")).toBe("Run `npm run --watch` now");
    expect(texturize("See https://example.com/a--b?x='1' and don't")).toBe("See https://example.com/a--b?x='1' and don’t");
    expect(texturize("Mail first.last--x@example.com...")).toBe("Mail first.last--x@example.com...");
    expect(texturize("www.example.com/it's")).toBe("www.example.com/it's");
  });

  it("uses the previous span's last character as context", () => {
    const spans = texturizeSpans([
      { _type: "span", text: 'She said "' },
      { _type: "span", text: "bold" },
      { _type: "span", text: '" and left.' },
    ]);
    expect(spans.map((s) => s.text).join("")).toBe("She said “bold” and left.");
    expect(texturizeSpans([{ _type: "span", text: "it" }, { _type: "span", text: "'s" }]).map((s) => s.text)).toEqual(["it", "’s"]);
  });
});

// Table cells are inline HTML; WordPress texturizes their text but never tags or attributes (Task 17).
describe("texturizeHtml", () => {
  it("texturizes text between tags, with the previous text as context", () => {
    expect(texturizeHtml('Every question has a "prefer not to say" option.')).toBe("Every question has a “prefer not to say” option.");
    expect(texturizeHtml('<a href="https://x.com/it\'s">it\'s</a> -- <strong>"bold"</strong>')).toBe(
      '<a href="https://x.com/it\'s">it’s</a> — <strong>“bold”</strong>',
    );
  });
  it("leaves code alone", () => expect(texturizeHtml("<code>a--b \"c\"</code> d--e")).toBe('<code>a--b "c"</code> d–e'));
});
