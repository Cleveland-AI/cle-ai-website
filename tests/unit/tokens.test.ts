import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const theme = JSON.parse(readFileSync(resolve(root, "theme-source/cle-ai-theme/theme.json"), "utf8"));
const css = readFileSync(resolve(root, "src/styles/tokens.css"), "utf8");

/** Every `--name: value;` declaration in the file, last one wins. */
const declared = new Map<string, string>();
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) declared.set(m[1], m[2].trim());

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

type Item = { slug: string; color?: string; size?: string; fontFamily?: string };

function flatten(obj: Record<string, unknown>, path: string[] = []): [string, string][] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === "object"
      ? flatten(value as Record<string, unknown>, [...path, kebab(key)])
      : ([[[...path, kebab(key)].join("--"), String(value)]] as [string, string][]),
  );
}

describe("tokens.css", () => {
  it("has every palette colour", () => {
    const palette: Item[] = theme.settings.color.palette;
    expect(palette.length).toBeGreaterThan(10);
    for (const { slug, color } of palette) {
      expect(declared.get(`--wp--preset--color--${slug}`), slug).toBe(color);
    }
    expect(declared.get("--wp--preset--color--accent")).toBe("#38B6FF");
  });

  it("has every font size, spacing size and font family", () => {
    for (const { slug, size } of theme.settings.typography.fontSizes as Item[]) {
      expect(declared.get(`--wp--preset--font-size--${slug}`), slug).toBe(size);
    }
    for (const { slug, size } of theme.settings.spacing.spacingSizes as Item[]) {
      expect(declared.get(`--wp--preset--spacing--${slug}`), slug).toBe(size);
    }
    for (const { slug, fontFamily } of theme.settings.typography.fontFamilies as Item[]) {
      expect(declared.get(`--wp--preset--font-family--${slug}`), slug).toBe(fontFamily);
    }
  });

  it("has every settings.custom value, including all 13 clay tokens", () => {
    const custom = flatten(theme.settings.custom);
    expect(custom.length).toBeGreaterThan(25);
    for (const [name, value] of custom) {
      expect(declared.get(`--wp--custom--${name}`), name).toBe(value);
    }
    const clay = custom.filter(([name]) => name.startsWith("clay--"));
    expect(clay).toHaveLength(13);
    expect(declared.get("--wp--custom--clay--button-pressed")).toContain("var(--wp--custom--clay--lip)");
  });

  it("has the layout sizes", () => {
    expect(declared.get("--wp--style--global--content-size")).toBe("720px");
    expect(declared.get("--wp--style--global--wide-size")).toBe("1140px");
    expect(theme.settings.layout.contentSize).toBe("720px");
    expect(theme.settings.layout.wideSize).toBe("1140px");
  });
});
