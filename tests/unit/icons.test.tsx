// Port of tests/php/test-icons.php.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleIcon, ICON_SLUGS, iconsAll } from "@/lib/icons";

describe("icons (inc/icons.php)", () => {
  it("has six icons", () => {
    expect(ICON_SLUGS).toHaveLength(6);
    expect([...ICON_SLUGS]).toEqual(["chat", "beer", "hotdog", "calendar", "pin", "headphones"]);
  });

  it.each([...ICON_SLUGS])("%s is decorative inline SVG with its modifier class, normalised for draw-in", (slug) => {
    const svg = cleIcon(slug);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain(`cle-icon--${slug}`);
    const shapes = (svg.match(/<(path|rect|circle|ellipse|line)\b/g) ?? []).length;
    expect(shapes).toBeGreaterThan(0);
    expect(svg.split('pathLength="1"').length - 1).toBe(shapes);
  });

  it.each([...ICON_SLUGS])("%s is the file in public/assets/icons, trimmed", (slug) => {
    expect(cleIcon(slug)).toBe(readFileSync(`public/assets/icons/${slug}.svg`, "utf8").trim());
  });

  it("an unknown slug gives an empty string, with no path traversal", () => {
    expect(cleIcon("nope")).toBe("");
    expect(cleIcon("../functions")).toBe("");
  });

  it("prepends an extra class", () => {
    expect(cleIcon("pin", "cle-extra")).toContain('class="cle-extra cle-icon');
  });

  it("iconsAll covers every slug", () => {
    expect(Object.keys(iconsAll())).toEqual([...ICON_SLUGS]);
  });
});
