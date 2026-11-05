// Named text styles for richBody. Sanity text blocks can't carry per-block fields, so every
// attribute combination the theme uses on core/paragraph, core/heading and core/list is a named
// style here (ruling R9). The renderer reads this map; the Studio schema reads `title`; Task 5's
// migration reverses it (attributes -> style name) with `findTextStyle`.
//
// Enumerated from cle-ai-theme/patterns, templates and parts. Classes match what WordPress serves,
// including `wp-block-heading` / `wp-block-paragraph` / `wp-block-list`.

export type TextStyle = {
  /** Studio label. */
  title: string;
  kind: "paragraph" | "heading";
  tag: "p" | "h1" | "h2" | "h3" | "h4";
  /** Space-separated classes, in WordPress's order. */
  className: string;
  /** Inline style, as saved by WordPress (CSS string). */
  style?: string;
};

export type ListStyle = {
  title: string;
  tag: "ul" | "ol";
  className: string;
};

const P = "wp-block-paragraph";
const H = "wp-block-heading";

export const TEXT_STYLES: Record<string, TextStyle> = {
  // Paragraphs
  normal: { title: "Normal", kind: "paragraph", tag: "p", className: P },
  eyebrow: { title: "Eyebrow", kind: "paragraph", tag: "p", className: `is-style-eyebrow ${P}` },
  eyebrowCentered: {
    title: "Eyebrow (centred)",
    kind: "paragraph",
    tag: "p",
    className: `has-text-align-center is-style-eyebrow ${P}`,
  },
  medium: { title: "Medium text", kind: "paragraph", tag: "p", className: `has-m-font-size ${P}` },
  small: { title: "Small text", kind: "paragraph", tag: "p", className: `has-s-font-size ${P}` },
  muted: { title: "Muted text", kind: "paragraph", tag: "p", className: `has-ink-soft-color has-text-color ${P}` },
  mutedSmall: {
    title: "Muted small text",
    kind: "paragraph",
    tag: "p",
    className: `has-ink-soft-color has-text-color has-s-font-size ${P}`,
  },
  leadCentered: {
    title: "Intro line (centred, muted)",
    kind: "paragraph",
    tag: "p",
    className: `has-text-align-center has-ink-soft-color has-text-color has-m-font-size ${P}`,
  },
  sponsorName: {
    title: "Sponsor name",
    kind: "paragraph",
    tag: "p",
    className: `has-ink-soft-color has-text-color has-l-font-size ${P}`,
    style: "font-weight:800",
  },
  figures: {
    title: "Figures caption",
    kind: "paragraph",
    tag: "p",
    className: `cle-figures has-ink-soft-color has-text-color has-s-font-size ${P}`,
  },
  legal: { title: "Footer legal line", kind: "paragraph", tag: "p", className: `cle-footer__legal has-s-font-size ${P}` },
  worldOnly: { title: "World-mode only", kind: "paragraph", tag: "p", className: `cle-world-only ${P}` },

  // Headings
  h1: { title: "Heading 1", kind: "heading", tag: "h1", className: H },
  h1Wide: { title: "Heading 1 (wide)", kind: "heading", tag: "h1", className: `${H} alignwide` },
  h1Centered: { title: "Heading 1 (centred)", kind: "heading", tag: "h1", className: `${H} has-text-align-center` },
  h1Large: { title: "Heading 1 (extra large)", kind: "heading", tag: "h1", className: `${H} has-xxl-font-size` },
  light: {
    title: "Light heading (one bold word)",
    kind: "heading",
    tag: "h1",
    className: `${H} is-style-light has-xxxl-font-size`,
  },
  h2: { title: "Heading 2", kind: "heading", tag: "h2", className: H },
  h2Wide: { title: "Heading 2 (wide)", kind: "heading", tag: "h2", className: `${H} alignwide` },
  h2Paper: { title: "Heading 2 (paper text, for dark bands)", kind: "heading", tag: "h2", className: `${H} has-paper-color has-text-color` },
  h3: { title: "Heading 3", kind: "heading", tag: "h3", className: H },
  h3Large: { title: "Heading 3 (large)", kind: "heading", tag: "h3", className: `${H} has-l-font-size` },
  h4: { title: "Heading 4", kind: "heading", tag: "h4", className: H },
};

export const LIST_STYLES: Record<string, ListStyle> = {
  bullet: { title: "Bullets", tag: "ul", className: "wp-block-list" },
  number: { title: "Numbers", tag: "ol", className: "wp-block-list" },
  chapters: { title: "Numbered chapters", tag: "ul", className: "wp-block-list is-style-chapters" },
  sponsors: { title: "Sponsor list (wide)", tag: "ul", className: "wp-block-list alignwide cle-sponsors" },
};

/** Style name for a WordPress block (reverse of the map), for the migration. Undefined if the combination is unknown. */
export function findTextStyle(tag: string, classes: string[], style = ""): string | undefined {
  const want = new Set(classes.filter((c) => c !== H && c !== P));
  return Object.entries(TEXT_STYLES).find(([, s]) => {
    if (s.tag !== tag || (s.style ?? "") !== style) return false;
    const have = s.className.split(" ").filter((c) => c !== H && c !== P);
    return have.length === want.size && have.every((c) => want.has(c));
  })?.[0];
}
