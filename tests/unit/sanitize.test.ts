// R15: one sanitizer for every raw-HTML sink (event descriptions, table cells, rawHtml blocks).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitize, type SanitizeProfile } from "@/lib/sanitize";

const PROFILES: SanitizeProfile[] = ["eventDescription", "tableCell", "rawBlock"];

describe.each(PROFILES)("sanitize(%s) neutralises", (profile) => {
  const clean = (html: string) => sanitize(html, profile);

  it("<script>, with its contents", () => {
    const out = clean('<p>hi</p><script>alert("x")</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("alert(");
  });

  it("event handlers", () => {
    const out = clean('<a href="https://ok.example/" onclick="x()">a</a><img src="https://ok.example/a.png" onerror="alert(1)" alt="">');
    expect(out).not.toMatch(/onclick|onerror/i);
  });

  it("javascript: URLs, however they are spelled", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "java&#x09;script:alert(1)"]) {
      expect(clean(`<a href="${href}">x</a>`)).not.toMatch(/javascript/i);
    }
  });

  it("the unterminated-tag bypass that survived the old cell sanitizer", () => {
    const out = clean("cell <img src=x onerror=alert(1) ");
    expect(out).not.toMatch(/<img/i);
    expect(out).not.toMatch(/<[a-z][^>]*onerror/i);
  });

  it("objects, forms and style tags", () => {
    const out = clean('<object data="x"></object><form action="https://evil.example/"><input></form><style>body{}</style>');
    expect(out).not.toMatch(/<(object|form|input|style)/i);
  });
});

describe("sanitize profiles keep the markup they allow", () => {
  it("eventDescription: paragraphs, links, emphasis, lists, headings and https images", () => {
    const html =
      '<p class="wp-block-paragraph">Agenda <strong>bold</strong> <em>it</em> <b>b</b> <i>i</i><br>' +
      '<a href="https://www.meetup.com/x/" target="_blank" rel="noopener">link</a> <a href="mailto:info@cle-ai.com">mail</a></p>' +
      "<h2>Two</h2><h3>Three</h3><h4>Four</h4><ul><li>a</li></ul><ol><li>b</li></ol>" +
      '<img src="https://secure.meetupstatic.com/photo.jpeg" alt="Room">';
    expect(sanitize(html, "eventDescription")).toBe(
      '<p class="wp-block-paragraph">Agenda <strong>bold</strong> <em>it</em> <b>b</b> <i>i</i><br />' +
        '<a href="https://www.meetup.com/x/" target="_blank" rel="noopener">link</a> <a href="mailto:info@cle-ai.com">mail</a></p>' +
        "<h2>Two</h2><h3>Three</h3><h4>Four</h4><ul><li>a</li></ul><ol><li>b</li></ol>" +
        '<img src="https://secure.meetupstatic.com/photo.jpeg" alt="Room" />',
    );
  });

  it("eventDescription: only http(s)/mailto links and https images; other tags lose their markup but keep text", () => {
    const out = sanitize(
      '<a href="tel:123">t</a><a href="/local">l</a><img src="http://x.example/a.png"><img src="/a.png"><div class="x" style="color:red">text</div><h1>big</h1>',
      "eventDescription",
    );
    expect(out).toBe("<a>t</a><a>l</a>textbig");
  });

  it("tableCell: links, strong, em and br only", () => {
    expect(
      sanitize(
        '<strong>Bold</strong> <em>it</em><br>x <span class="x">kept</span> <a href="https://ok.example/" target="_blank">ok</a> <a href="/privacy">rel</a> 1 < 2',
        "tableCell",
      ),
    ).toBe('<strong>Bold</strong> <em>it</em><br />x kept <a href="https://ok.example/">ok</a> <a href="/privacy">rel</a> 1 &lt; 2');
  });

  it("rawBlock: WordPress block markup with its classes, ids, inline styles and aria attributes", () => {
    const html =
      '<figure class="wp-block-image size-large is-resized cle-art"><img src="/assets/illustrations/dot-hike.webp" alt="" style="width:240px" /></figure>' +
      '<div class="wp-block-group is-layout-flow" id="anchor" style="padding-top:var(--wp--preset--spacing--s)" aria-label="Group"><p class="has-s-font-size">x</p></div>' +
      '<details class="wp-block-details"><summary>More</summary><p>y</p></details>' +
      '<table class="has-fixed-layout"><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>' +
      '<blockquote class="wp-block-quote"><p>q</p><cite>c</cite></blockquote><pre class="wp-block-verse">v</pre><hr class="wp-block-separator" />';
    expect(sanitize(html, "rawBlock")).toBe(html);
  });

  it("rawBlock: keeps every rawHtml block in the fixture dataset unchanged", () => {
    const blocks: string[] = [];
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        if (r._type === "rawHtml" && typeof r.html === "string") blocks.push(r.html);
        Object.values(r).forEach(walk);
      }
    };
    for (const line of readFileSync("tests/fixtures/dataset.ndjson", "utf8").split("\n").filter(Boolean)) walk(JSON.parse(line));
    expect(blocks.length).toBeGreaterThan(0);
    const norm = (h: string) => h.replace(/\s*\/>/g, ">").replace(/\s+/g, " ").trim();
    for (const b of blocks) expect(norm(sanitize(b, "rawBlock"))).toBe(norm(b));
  });

  it("rawBlock: https embeds survive, other iframes don't", () => {
    expect(sanitize('<iframe src="https://www.youtube.com/embed/x" title="v" allowfullscreen></iframe>', "rawBlock")).toContain(
      '<iframe src="https://www.youtube.com/embed/x"',
    );
    expect(sanitize('<iframe src="javascript:alert(1)"></iframe><iframe srcdoc="<script>x</script>"></iframe>', "rawBlock")).not.toMatch(
      /javascript|srcdoc|<script/i,
    );
  });
});

describe("inline styles on the rawBlock profile (R23)", () => {
  const raw = (style: string) => sanitize(`<div style="${style}">x</div>`, "rawBlock");
  it("keeps allowlisted declarations, including --wp-- custom properties and var()", () => {
    expect(raw("padding-top:var(--wp--preset--spacing--section);max-width:720px;color:#fff;--wp--custom--x:1;border-radius:8px;margin-bottom:0")).toBe(
      '<div style="padding-top:var(--wp--preset--spacing--section);max-width:720px;color:#fff;--wp--custom--x:1;border-radius:8px;margin-bottom:0">x</div>',
    );
  });
  it("keeps a ; inside quotes or parentheses within one value", () => {
    expect(raw("width:calc(1px + 2px);font-size:12px")).toContain('style="width:calc(1px + 2px);font-size:12px"');
    expect(raw("width:10px;color:red;position:fixed")).toBe('<div style="width:10px;color:red">x</div>');
  });
  it("drops properties off the list", () => {
    for (const bad of ["position:fixed", "z-index:9999", "behavior:url(x.htc)", "-moz-binding:x", "display:none", "top:0"]) {
      expect(raw(`width:1px;${bad}`)).toBe('<div style="width:1px">x</div>');
    }
  });
  it("drops dangerous values", () => {
    for (const bad of [
      "background-color:url(https://evil/x.png)",
      "color:expression(alert(1))",
      "color:javascript:alert(1)",
      "color:\\72 ed",
      "color:red/*x*/",
      "width:1px;@import 'x'",
      "background-color:red;color:u\\72l(x)",
    ]) {
      expect(raw(bad), bad).not.toMatch(/url\(|expression|javascript|\\|\/\*|@import/i);
    }
    expect(raw("background-color:url(https://evil/x.png)")).toBe("<div>x</div>");
  });
  it("removes a style attribute that ends up empty, and keeps other attributes", () => {
    expect(sanitize('<p class="a" style="position:absolute">x</p>', "rawBlock")).toBe('<p class="a">x</p>');
    expect(sanitize('<p style="">x</p>', "rawBlock")).toBe("<p>x</p>");
  });
  it("leaves the other profiles without style attributes at all", () => {
    expect(sanitize('<p style="width:1px">x</p>', "tableCell")).toBe("x");
    expect(sanitize('<p style="width:1px">x</p>', "eventDescription")).toBe("<p>x</p>");
  });
  it("allows only the plain border properties", () => {
    const keep = ["border:1px solid red", "border-top-color:red", "border-left-width:2px", "border-width:1px", "border-style:solid", "border-radius:8px", "border-top-left-radius:4px"];
    for (const d of keep) expect(raw(d), d).toBe(`<div style="${d}">x</div>`);
    for (const bad of ["border-image:url(x)", 'border-image-source:image-set("https://x/p.png" 1x)', "border-image-slice:1", "border-collapse:collapse"]) {
      expect(raw(bad), bad).toBe("<div>x</div>");
    }
  });
  it("rejects image-set( and image( in any value", () => {
    for (const bad of ['color:image-set("https://x/p.png" 1x)', 'color:IMAGE("https://x/p.png")', "width:-webkit-image-set(x)"]) {
      expect(raw(bad), bad).toBe("<div>x</div>");
    }
  });
  it("collapses whitespace and newlines inside kept values", () => {
    expect(raw("width:calc(1px\n   +   2px);\n  color:  red  ")).toBe('<div style="width:calc(1px + 2px);color:red">x</div>');
  });
});
