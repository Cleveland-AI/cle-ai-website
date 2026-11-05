// The mascot assertions in tests/php/test-interactive.php, plus the footer that Dot peeks over.
import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Mascot } from "@/blocks/mascot/Mascot";
import { FooterView } from "@/components/Footer";
import { ArtImg, artExists, artUrl } from "@/lib/art";
import sizes from "@/lib/art-sizes.json";
import { imageInfo } from "../../scripts/migrate-wp/media";
import { NOW, SETTINGS } from "./helpers/fixtures";

const JUNE = new Date("2026-06-15T12:00:00-04:00");
const dot = (props: Parameters<typeof Mascot>[0]) => renderToStaticMarkup(<Mascot now={JUNE} {...props} />);
const footer = (now: Date) => renderToStaticMarkup(<FooterView settings={SETTINGS} now={now} />);

describe("cle/mascot", () => {
  it.each(["peek", "lost", "sleep"])("renders the %s pose as a decorative image", (pose) => {
    const d = dot({ pose });
    expect(d).toContain(`cle-dot--${pose}`);
    expect(d).toContain(`/assets/illustrations/dot-${pose}.webp`);
    expect(d).toContain('alt=""');
  });

  it.each(["stage", "social", "workshop", "hike", "search", "welcome"])("has the %s pose", (pose) => {
    expect(dot({ pose })).toContain(`dot-${pose}.webp`);
  });

  it("an unknown pose falls back to peeking", () => {
    expect(dot({ pose: "bogus" })).toContain("cle-dot--peek");
  });

  it("matches WordPress's wrapper markup, sized and clamped to 80-600px", () => {
    expect(dot({ pose: "stage", width: 200, align: "center" })).toBe(
      '<div class="cle-dot cle-dot--stage aligncenter wp-block-cle-mascot" style="--dot-w:200px">' +
        '<img class="cle-dot__img" src="/assets/illustrations/dot-stage.webp" alt="" width="720" height="' +
        sizes.illustrations["dot-stage"][1] +
        '" loading="lazy" decoding="async"/></div>',
    );
    expect(dot({ pose: "lost", width: 10 })).toContain("--dot-w:80px");
    expect(dot({ pose: "lost", width: 9000 })).toContain("--dot-w:600px");
    expect(dot({ pose: "lost" })).toContain("--dot-w:220px");
  });

  it("ships still Dots only: no animated loop, so the peek and lost poses are plain images", () => {
    for (const pose of ["peek", "lost"]) {
      const d = dot({ pose });
      expect(d).not.toContain("<picture>");
      expect(d).not.toContain("-anim.webp");
    }
  });

  it("December to February, the peeking Dot wears his hat; the rest of the year he does not", () => {
    const at = (iso: string) => dot({ pose: "peek", now: new Date(iso) });
    expect(at("2026-12-15T12:00:00-05:00")).toContain("dot-peek-winter.webp");
    expect(at("2027-02-15T12:00:00-05:00")).toContain("dot-peek-winter.webp");
    const june = at("2026-06-15T12:00:00-04:00");
    expect(june).toContain("dot-peek.webp");
    expect(june).not.toContain("winter");
  });

  it("only the peek pose has a winter version", () => {
    expect(dot({ pose: "lost", now: new Date("2026-12-15T12:00:00-05:00") })).toContain("dot-lost.webp");
  });
});

describe("footer Dot", () => {
  it("Dot peeks over the footer", () => {
    const f = footer(NOW);
    expect(f).toContain('class="cle-dot cle-dot--peek cle-footer__dot wp-block-cle-mascot" style="--dot-w:150px"');
  });

  it("wears the winter hat on Dec 1 and Feb 28, and not on Mar 1 (New York dates)", () => {
    expect(footer(new Date("2026-12-01T00:30:00-05:00"))).toContain("dot-peek-winter.webp");
    expect(footer(new Date("2027-02-28T23:30:00-05:00"))).toContain("dot-peek-winter.webp");
    // 03:00 UTC on Mar 1 is still Feb 28 in Cleveland.
    expect(footer(new Date("2027-03-01T03:00:00Z"))).toContain("dot-peek-winter.webp");
    const march = footer(new Date("2027-03-01T00:30:00-05:00"));
    expect(march).toContain("dot-peek.webp");
    expect(march).not.toContain("winter");
  });
});

describe("footer", () => {
  const f = footer(NOW);

  it("carries the site title, tagline, contact line and the EIN line from site settings", () => {
    expect(f).toContain('<p style="font-weight:700" class="wp-block-site-title has-l-font-size"><a target="_self" rel="home" href="/">CLE AI &amp; DATA</a></p>');
    expect(f).toContain('<p class="has-m-font-size wp-block-paragraph">Making AI accessible to everyone.</p>');
    expect(f).toContain('Questions, or a code of conduct report: <a href="mailto:info@cle-ai.com">info@cle-ai.com</a>');
    expect(f).toContain(
      '<p class="has-s-font-size wp-block-paragraph">CLE AI &amp; DATA is a 501(c)(3) nonprofit, run by volunteers. Cleveland AI and Data, EIN 42-2843242.</p>',
    );
  });

  it("has the footer-legal pattern: Privacy policy · Code of conduct", () => {
    expect(f).toContain(
      '<p class="cle-footer__legal has-s-font-size wp-block-paragraph"><a href="/privacy">Privacy policy</a> · <a href="/code-of-conduct">Code of conduct</a></p>',
    );
  });

  it("lists the social menu under Find us and the support links", () => {
    expect(f).toContain('<p class="is-style-eyebrow wp-block-paragraph">Find us</p>');
    expect(f).toContain('<nav class="cle-menu--social wp-block-cle-menu" aria-label="Social">');
    expect(f).toContain('href="https://discord.gg/X8YZPBsSnh"');
    for (const [href, label] of [
      ["https://givebutter.com/cle-ai", "Donate"],
      ["https://cleai.printful.me/", "Shop"],
      ["https://www.meetup.com/cleveland-ai-data/", "Join on Meetup"],
    ]) {
      expect(f).toContain(`<li><a href="${href}">${label}</a></li>`);
    }
  });

  it("is the theme's indigo footer band", () => {
    expect(f).toMatch(
      /^<div class="wp-block-template-part"><footer class="wp-block-group alignfull cle-footer has-paper-color has-indigo-background-color has-text-color has-background has-global-padding is-layout-constrained wp-block-group-is-layout-constrained" style="padding-top:var\(--wp--preset--spacing--xl\);padding-bottom:var\(--wp--preset--spacing--xl\)">/,
    );
  });
});

describe("art (inc/art.php)", () => {
  it("knows the size of every bundled illustration and shape", () => {
    for (const dir of ["illustrations", "shapes"] as const) {
      const files = readdirSync(`public/assets/${dir}`).filter((f) => f.endsWith(".webp"));
      const map = sizes[dir] as Record<string, number[]>;
      expect(Object.keys(map).sort()).toEqual(files.map((f) => f.replace(/\.webp$/, "")).sort());
      for (const f of files) {
        const info = imageInfo(readFileSync(`public/assets/${dir}/${f}`))!;
        expect(map[f.replace(/\.webp$/, "")], f).toEqual([info.width, info.height]);
      }
    }
  });

  it("a missing illustration becomes a brand-shape stand-in", () => {
    expect(artExists("no-such-art")).toBe(false);
    expect(artUrl("no-such-art", 1)).toBe("/assets/shapes/coral.webp");
    expect(renderToStaticMarkup(<ArtImg slug="no-such-art" className="x" />)).toContain('class="x is-stand-in" src="/assets/shapes/blue.webp"');
    expect(artExists("../art-sizes")).toBe(false);
  });
});
