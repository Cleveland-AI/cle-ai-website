import sanitizeHtml, { type IOptions } from "sanitize-html";

/**
 * The one HTML sanitizer (R15), used at every raw-HTML sink. Built on sanitize-html's parser and
 * allowlists, so malformed or unterminated markup can't slip a tag or attribute through.
 *
 * - `eventDescription`: Meetup's event description (event pages).
 * - `tableCell`: richBody table cells (inline links and emphasis in the privacy policy's tables).
 * - `rawBlock`: richBody rawHtml, the migration's fallback for WordPress block markup.
 * - `inline`: a heading, intro or hotspot note an editor typed with a little emphasis or a link
 *   (WordPress's wp_kses_post on those block attributes): emphasis, line breaks and links, nothing else.
 *
 * Disallowed tags are dropped and their text kept; script, style and similar contents are dropped.
 */
export type SanitizeProfile = "eventDescription" | "tableCell" | "rawBlock" | "inline";

const NO_TEXT = ["script", "style", "textarea", "noscript", "option", "select", "template", "title", "iframe", "object", "embed"];

/** Drops an attribute whose URL doesn't start with one of `prefixes` (sanitize-html lets relative URLs through). */
const requireScheme =
  (attr: string, prefixes: RegExp): sanitizeHtml.Transformer =>
  (tagName, attribs) => {
    const { [attr]: value, ...rest } = attribs;
    return { tagName, attribs: value !== undefined && prefixes.test(value.trim()) ? { ...attribs } : rest };
  };

const EVENT_DESCRIPTION: IOptions = {
  allowedTags: ["p", "a", "strong", "em", "b", "i", "ul", "ol", "li", "br", "h2", "h3", "h4", "img"],
  allowedAttributes: { a: ["href", "rel", "target"], img: ["src", "alt"], p: ["class"] },
  allowedClasses: { p: ["wp-block-paragraph"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  transformTags: {
    a: requireScheme("href", /^(https?:|mailto:)/i),
    img: requireScheme("src", /^https:\/\//i),
  },
  // An image with nothing safe to show is dropped.
  exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  nonTextTags: NO_TEXT,
};

const TABLE_CELL: IOptions = {
  allowedTags: ["a", "strong", "em", "br"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  nonTextTags: NO_TEXT,
};

const INLINE: IOptions = {
  allowedTags: ["a", "strong", "em", "b", "i", "s", "u", "kbd", "del", "ins", "abbr", "cite", "q", "span", "br", "mark", "code", "small", "sub", "sup"],
  allowedAttributes: { a: ["href", "target", "rel"], mark: ["class", "style"], span: ["class", "style"], abbr: ["title"] },
  parseStyleAttributes: false,
  transformTags: { "*": (tagName, attribs) => ({ tagName, attribs: withFilteredStyle(attribs) }) },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
  nonTextTags: NO_TEXT,
};

/** Tags WordPress core blocks save (static blocks, embeds, the theme's patterns). */
const BLOCK_TAGS = [
  "div", "section", "header", "footer", "aside", "nav", "article", "p", "span", "a", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "b", "i", "u", "s", "mark", "small", "sub", "sup", "code", "kbd", "pre",
  "abbr", "cite", "q", "time", "blockquote", "ul", "ol", "li", "dl", "dt", "dd", "figure", "figcaption", "img", "picture", "source",
  "video", "audio", "track", "iframe", "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td",
  "details", "summary",
];

// ---- Inline styles (R23) ----

/** CSS properties the migrated markup uses. Everything else (position, z-index, behavior, ...) is dropped. */
const STYLE_PROPERTY =
  /^(?:width|max-width|min-height|padding(?:-[a-z]+)*|margin(?:-[a-z]+)*|color|background-color|text-align|gap|font-size|font-weight|line-height|letter-spacing|border|border-(?:top|right|bottom|left)(?:-(?:width|style|color))?|border-(?:width|style|color|radius)|border-(?:top|bottom)-(?:left|right)-radius|aspect-ratio|object-fit|object-position|flex-basis|grid-template-columns|--wp--[a-z0-9-]+)$/;
/** Values that can load something, run something or hide a property name. */
const STYLE_FORBIDDEN_VALUE = /url\(|image(?:-set)?\(|expression|javascript|\\|\/\*|@import|<|>/i;

/** Splits on ";" outside quotes and parentheses. */
function splitDeclarations(css: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === ";" && depth === 0) {
      parts.push(css.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(css.slice(start));
  return parts;
}

/** Keeps the allowlisted declarations of an inline style whose values are safe; "" when none remain. */
export function filterStyle(css: string): string {
  const kept: string[] = [];
  for (const decl of splitDeclarations(css)) {
    const i = decl.indexOf(":");
    if (i < 1) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).replace(/\s+/g, " ").trim().replace(/\s*!important\s*$/i, "");
    if (!value || !STYLE_PROPERTY.test(prop) || STYLE_FORBIDDEN_VALUE.test(value) || /[;{}]/.test(value.replace(/\([^)]*\)|"[^"]*"|'[^']*'/g, ""))) continue;
    kept.push(`${prop}:${value}`);
  }
  return kept.join(";");
}

function withFilteredStyle(attribs: Record<string, string>): Record<string, string> {
  if (attribs.style === undefined) return attribs;
  const safe = filterStyle(attribs.style);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attribs)) {
    if (k !== "style") out[k] = v;
    else if (safe) out[k] = safe;
  }
  return out;
}

const RAW_BLOCK: IOptions = {
  allowedTags: BLOCK_TAGS,
  allowedAttributes: {
    "*": ["class", "id", "style", "title", "lang", "dir", "role", "aria-*", "data-*", "hidden"],
    a: ["href", "target", "rel", "name", "download"],
    img: ["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding"],
    source: ["src", "srcset", "type", "media", "sizes"],
    video: ["src", "poster", "controls", "autoplay", "loop", "muted", "playsinline", "preload", "width", "height"],
    audio: ["src", "controls", "loop", "preload"],
    track: ["src", "kind", "srclang", "label", "default"],
    iframe: ["src", "width", "height", "allow", "allowfullscreen", "loading", "frameborder", "referrerpolicy"],
    time: ["datetime"],
    ol: ["start", "reversed", "type"],
    li: ["value"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    col: ["span"],
    details: ["open"],
    blockquote: ["cite"],
    q: ["cite"],
  },
  // sanitize-html's own style parsing (postcss) draws Math.random ids, which breaks prerendering under
  // Cache Components, and it forbids allowedStyles without it. So it stays off and the "*" transform
  // below filters every style attribute with filterStyle (R23).
  parseStyleAttributes: false,
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { iframe: ["https"] },
  allowedSchemesAppliedToAttributes: ["href", "src", "cite", "poster"],
  allowProtocolRelative: false,
  transformTags: {
    "*": (tagName, attribs) => ({ tagName, attribs: withFilteredStyle(attribs) }),
    iframe: requireScheme("src", /^https:\/\//i),
  },
  exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
  // Iframes are allowed here, so their (fallback) text isn't treated as non-text.
  nonTextTags: NO_TEXT.filter((t) => t !== "iframe"),
};

const PROFILES: Record<SanitizeProfile, IOptions> = {
  eventDescription: EVENT_DESCRIPTION,
  tableCell: TABLE_CELL,
  rawBlock: RAW_BLOCK,
  inline: INLINE,
};

export function sanitize(html: string | null | undefined, profile: SanitizeProfile): string {
  return html ? sanitizeHtml(html, PROFILES[profile]) : "";
}
