// HTML -> richBody (Portable Text plus the richBody objects). Used for classic post HTML and, by
// blocks.ts, for the saved HTML of the static core blocks, so both paths share one set of rules:
// - text keeps strong/em/links/line breaks; anything else inline (code, spans with classes, ...) keeps
//   the element's HTML as rawHtml;
// - a paragraph, heading or list whose classes/inline style have no named style becomes rawHtml (R9);
// - nothing is dropped: whatever can't be mapped is kept as its HTML.
import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";
import { findTextStyle, LIST_STYLES } from "../../src/components/core/textStyles";

export type Span = { _type: "span"; _key: string; text: string; marks: string[] };
export type LinkDef = { _type: "link"; _key: string; href: string; blank?: boolean };
export type TextBlock = {
  _type: "block";
  _key: string;
  style: string;
  markDefs: LinkDef[];
  children: Span[];
  listItem?: string;
  level?: number;
};
export type RichObject = { _type: string; _key: string; [field: string]: unknown };
export type RichItem = TextBlock | RichObject;
export type RichBody = RichItem[];

/** An image object without `_key`, e.g. `{_type: 'image', asset: {_type: 'reference', _ref}}`. */
export type ImageSource = { _type: "image"; [field: string]: unknown };

export type ConvertOptions = {
  /** Resolves an image URL to an image object. Unresolved images are kept as raw HTML. */
  resolveImage?: (src: string) => ImageSource | undefined;
  /** Key generator, shared by everything in one document so keys never collide. */
  keys?: () => string;
};

export type Ctx = { resolveImage?: ConvertOptions["resolveImage"]; key: () => string };

export function createKeys(prefix = "k"): () => string {
  let n = 0;
  return () => `${prefix}${(n++).toString(36)}`;
}

export function context(opts: ConvertOptions = {}): Ctx {
  return { resolveImage: opts.resolveImage, key: opts.keys ?? createKeys() };
}

export const rawHtml = (html: string, ctx: Ctx): RichObject => ({ _type: "rawHtml", _key: ctx.key(), html });

export const parseHtml = (html: string) =>
  parse(html, { comment: true, blockTextElements: { script: true, style: true, pre: true, noscript: true } });

const isElement = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;
const tagOf = (el: HTMLElement) => el.rawTagName?.toLowerCase() ?? "";
export const classesOf = (el: HTMLElement) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
const attrNames = (el: HTMLElement) => Object.keys(el.attributes).map((a) => a.toLowerCase());

/** `font-weight: 800;` -> `font-weight:800`, the form textStyles.ts and the renderer use. */
export const normalizeStyle = (css = "") =>
  css
    .split(";")
    .map((d) => d.trim().replace(/\s*:\s*/, ":"))
    .filter(Boolean)
    .join(";");

/** Only these classes, from the allowed set or matching a pattern. */
const onlyClasses = (el: HTMLElement, allowed: (string | RegExp)[]) =>
  classesOf(el).every((c) => allowed.some((a) => (typeof a === "string" ? a === c : a.test(c))));

/** True when the element has no attributes outside `allowed`. */
const onlyAttrs = (el: HTMLElement, allowed: string[]) => attrNames(el).every((a) => allowed.includes(a));

const elementChildren = (el: HTMLElement) => el.childNodes.filter(isElement);
const significant = (nodes: Node[]) =>
  nodes.filter((n) => (isElement(n) ? true : n.nodeType === NodeType.TEXT_NODE && n.rawText.trim() !== ""));

// ---- Inline content ----

type Inline = { children: Span[]; markDefs: LinkDef[] };

/** Spans and link definitions for inline nodes, or null when they hold markup we can't represent. */
export function inlineContent(nodes: Node[], ctx: Ctx): Inline | null {
  const spans: { text: string; marks: string[] }[] = [];
  const markDefs: LinkDef[] = [];
  let ok = true;

  const walk = (node: Node, marks: string[]) => {
    if (!ok) return;
    if (node.nodeType === NodeType.COMMENT_NODE) return;
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text.replace(/[ \t\n\r\f]+/g, " ");
      if (text) spans.push({ text, marks });
      return;
    }
    if (!isElement(node)) return;
    const el = node;
    const tag = tagOf(el);
    const plain = attrNames(el).length === 0;
    if ((tag === "strong" || tag === "b") && plain) el.childNodes.forEach((c) => walk(c, [...marks, "strong"]));
    else if ((tag === "em" || tag === "i") && plain) el.childNodes.forEach((c) => walk(c, [...marks, "em"]));
    else if (tag === "span" && plain) el.childNodes.forEach((c) => walk(c, marks));
    else if (tag === "br") spans.push({ text: "\n", marks });
    else if (tag === "a" && el.getAttribute("href") !== undefined && onlyAttrs(el, ["href", "target", "rel"])) {
      const def: LinkDef = { _type: "link", _key: ctx.key(), href: el.getAttribute("href") ?? "" };
      if (el.getAttribute("target") === "_blank") def.blank = true;
      markDefs.push(def);
      el.childNodes.forEach((c) => walk(c, [...marks, def._key]));
    } else ok = false;
  };
  nodes.forEach((n) => walk(n, []));
  if (!ok) return null;

  // Merge neighbours with the same marks, then trim like a browser would: no spaces at the edges or
  // around line breaks.
  const merged: { text: string; marks: string[] }[] = [];
  for (const s of spans) {
    const prev = merged.at(-1);
    if (prev && prev.marks.join() === s.marks.join()) prev.text += s.text;
    else merged.push({ ...s });
  }
  merged.forEach((s, i) => {
    s.text = s.text.replace(/ *\n */g, "\n");
    if (merged[i + 1]?.text.startsWith("\n")) s.text = s.text.replace(/ +$/, "");
    if (merged[i - 1]?.text.endsWith("\n")) s.text = s.text.replace(/^ +/, "");
  });
  if (merged.length) {
    merged[0].text = merged[0].text.replace(/^ +/, "");
    merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/ +$/, "");
  }
  const children = merged
    .filter((s) => s.text !== "")
    .map((s) => ({ _type: "span" as const, _key: ctx.key(), text: s.text, marks: s.marks }));
  const used = new Set(children.flatMap((s) => s.marks));
  return { children, markDefs: markDefs.filter((d) => used.has(d._key)) };
}

function textBlock(inline: Inline, style: string, ctx: Ctx, list?: { listItem: string; level: number }): TextBlock {
  return { _type: "block", _key: ctx.key(), style, markDefs: inline.markDefs, children: inline.children, ...list };
}

// ---- Block-level elements ----

/** A p or h1-h4 with a named style (R9), or rawHtml. Empty paragraphs give nothing. */
export function textElement(el: HTMLElement, ctx: Ctx): RichItem[] {
  const tag = tagOf(el);
  const only = significant(el.childNodes);
  if (tag === "p" && only.length === 1 && isElement(only[0]) && tagOf(only[0]) === "img") return image(null, only[0], ctx);
  const style = onlyAttrs(el, ["class", "style"])
    ? findTextStyle(tag, classesOf(el), normalizeStyle(el.getAttribute("style")))
    : undefined;
  const inline = style ? inlineContent(el.childNodes, ctx) : null;
  if (!style || !inline) return [rawHtml(el.outerHTML, ctx)];
  if (!inline.children.length) return [];
  return [textBlock(inline, style, ctx)];
}

function listStyleFor(el: HTMLElement): string | undefined {
  const tag = tagOf(el);
  const want = new Set(classesOf(el).filter((c) => c !== "wp-block-list"));
  return Object.entries(LIST_STYLES).find(([, s]) => {
    const have = s.className.split(" ").filter((c) => c !== "wp-block-list");
    return s.tag === tag && have.length === want.size && have.every((c) => want.has(c));
  })?.[0];
}

/** ul/ol -> list blocks (nested lists get deeper levels), or rawHtml. */
export function list(el: HTMLElement, ctx: Ctx): RichItem[] {
  const out: TextBlock[] = [];
  const walk = (listEl: HTMLElement, level: number): boolean => {
    const style = onlyAttrs(listEl, ["class"]) ? listStyleFor(listEl) : undefined;
    if (!style) return false;
    for (const li of significant(listEl.childNodes)) {
      if (!isElement(li) || tagOf(li) !== "li" || attrNames(li).length) return false;
      // Inline content, then any nested lists. A lone <p> inside the item is unwrapped.
      const kids = li.childNodes.filter((n) => n.nodeType !== NodeType.COMMENT_NODE);
      const nested = kids.filter((n) => isElement(n) && ["ul", "ol"].includes(tagOf(n))) as HTMLElement[];
      let inlineNodes = kids.filter((n) => !nested.includes(n as HTMLElement));
      const sig = significant(inlineNodes);
      if (sig.length === 1 && isElement(sig[0]) && tagOf(sig[0]) === "p" && attrNames(sig[0]).length === 0)
        inlineNodes = sig[0].childNodes;
      const firstNested = nested.length ? kids.indexOf(nested[0]) : kids.length;
      if (nested.length && significant(kids.slice(firstNested)).some((n) => !nested.includes(n as HTMLElement)))
        return false; // text after a nested list can't be one block
      const inline = inlineContent(inlineNodes, ctx);
      if (!inline) return false;
      out.push(textBlock(inline, "normal", ctx, { listItem: style, level }));
      for (const n of nested) if (!walk(n, level + 1)) return false;
    }
    return true;
  };
  return walk(el, 1) ? out : [rawHtml(el.outerHTML, ctx)];
}

const QUOTE_CLASSES = ["wp-block-quote", "is-layout-flow", "wp-block-quote-is-layout-flow"];

/** blockquote with one plain paragraph (or bare text) and an optional plain <cite> -> quote. */
export function quote(el: HTMLElement, ctx: Ctx): RichItem[] {
  const raw = [rawHtml(el.outerHTML, ctx)];
  if (!onlyClasses(el, QUOTE_CLASSES) || !onlyAttrs(el, ["class"])) return raw;
  const kids = significant(el.childNodes);
  const paras = kids.filter((n) => isElement(n) && tagOf(n) === "p") as HTMLElement[];
  const cites = kids.filter((n) => isElement(n) && tagOf(n) === "cite") as HTMLElement[];
  const bare = kids.filter((n) => !isElement(n));
  if (paras.length + cites.length + bare.length !== kids.length || paras.length > 1 || cites.length > 1) return raw;
  if (paras.length && bare.length) return raw;
  const plain = (e: HTMLElement) => elementChildren(e).length === 0 && onlyAttrs(e, ["class"]);
  if (paras.some((p) => !plain(p) || !onlyClasses(p, ["wp-block-paragraph"])) || cites.some((c) => !plain(c)))
    return raw;
  const text = (paras[0]?.text ?? bare.map((n) => n.text).join(" ")).replace(/\s+/g, " ").trim();
  const out: RichObject = { _type: "quote", _key: ctx.key(), text };
  const cite = cites[0]?.text.replace(/\s+/g, " ").trim();
  if (cite) {
    const i = cite.indexOf(", ");
    out.citeName = i < 0 ? cite : cite.slice(0, i);
    if (i >= 0) out.citeTitle = cite.slice(i + 2);
  }
  return [out];
}

export function separator(el: HTMLElement, ctx: Ctx): RichItem[] {
  if (!onlyAttrs(el, ["class"]) || !onlyClasses(el, ["wp-block-separator", "has-alpha-channel-opacity", /^is-style-(default|wide|dots)$/]))
    return [rawHtml(el.outerHTML, ctx)];
  const style = classesOf(el).find((c) => c.startsWith("is-style-"))?.slice(9) ?? "default";
  return [{ _type: "separator", _key: ctx.key(), style }];
}

export function spacer(el: HTMLElement, ctx: Ctx): RichItem[] {
  const height = /^height:\s*([^;]+)$/.exec(normalizeStyle(el.getAttribute("style")))?.[1];
  if (!height || !onlyClasses(el, ["wp-block-spacer"]) || !onlyAttrs(el, ["class", "style", "aria-hidden"]))
    return [rawHtml(el.outerHTML, ctx)];
  return [{ _type: "spacer", _key: ctx.key(), height }];
}

/** figure.wp-block-table (or a bare table) -> table with cells as their inner HTML (links kept). */
export function table(figure: HTMLElement | null, tableEl: HTMLElement, ctx: Ctx): RichItem[] {
  const raw = [rawHtml((figure ?? tableEl).outerHTML, ctx)];
  if (figure && (!onlyClasses(figure, ["wp-block-table", "cle-table"]) || !onlyAttrs(figure, ["class"]))) return raw;
  if (figure && significant(figure.childNodes).length !== 1) return raw; // a figcaption, say
  if (!onlyClasses(tableEl, ["has-fixed-layout"]) || !onlyAttrs(tableEl, ["class"])) return raw;
  const sections = elementChildren(tableEl);
  if (sections.some((s) => !["thead", "tbody", "tr"].includes(tagOf(s)))) return raw;
  const cellsOf = (tr: HTMLElement) => {
    const cells = elementChildren(tr);
    if (cells.some((c) => !["td", "th"].includes(tagOf(c)) || attrNames(c).length)) return null;
    return cells.map((c) => c.innerHTML.trim());
  };
  const rowsIn = (tags: string[]) =>
    sections.flatMap((s) => (tagOf(s) === "tr" ? (tags.includes("tbody") ? [s] : []) : tags.includes(tagOf(s)) ? elementChildren(s) : []));
  const headRows = rowsIn(["thead"]).map(cellsOf);
  const bodyRows = rowsIn(["tbody"]).map(cellsOf);
  if (headRows.length > 1 || [...headRows, ...bodyRows].some((r) => r === null)) return raw;
  return [
    {
      _type: "table",
      _key: ctx.key(),
      head: headRows[0] ?? [],
      rows: bodyRows.map((cells) => ({ _type: "tableRow", _key: ctx.key(), cells })),
    },
  ];
}

const IMG_ATTRS = ["src", "alt", "class", "width", "height", "decoding", "loading", "srcset", "sizes", "title"];

/** figure.wp-block-image / a bare img -> image object through the resolver, or rawHtml. */
export function image(figure: HTMLElement | null, img: HTMLElement, ctx: Ctx): RichItem[] {
  const raw = [rawHtml((figure ?? img).outerHTML, ctx)];
  const src = img.getAttribute("src");
  if (!src || !onlyAttrs(img, IMG_ATTRS) || img.getAttribute("style")) return raw;
  if (!onlyClasses(img, [/^wp-image-\d+$/, /^size-/, /^align(none|left|center|right)$/])) return raw;
  let caption: string | undefined;
  let alignFrom = img;
  if (figure) {
    alignFrom = figure;
    if (!onlyAttrs(figure, ["class"])) return raw;
    if (!onlyClasses(figure, ["wp-block-image", /^size-/, /^align(left|center|right|wide|full)$/, /^is-style-(default|plain)$/]))
      return raw;
    for (const kid of significant(figure.childNodes)) {
      if (kid === img) continue;
      if (!isElement(kid) || tagOf(kid) !== "figcaption" || elementChildren(kid).length) return raw;
      caption = kid.text.replace(/\s+/g, " ").trim();
    }
  }
  const resolved = ctx.resolveImage?.(src);
  if (!resolved) return raw;
  const align = classesOf(alignFrom).find((c) => /^align(left|center|right|wide|full)$/.test(c))?.slice(5) ?? "none";
  const out: RichObject = { ...resolved, _type: "image", _key: ctx.key() };
  const alt = img.getAttribute("alt");
  if (alt) out.alt = alt;
  if (caption) out.caption = caption;
  out.style = figure && classesOf(figure).includes("is-style-plain") ? "plain" : "framed";
  out.align = align;
  return [out];
}

const BUTTON_STYLE = /^is-style-(outline|fill)(--\d+)?$/;

/** div.wp-block-buttons of plain link buttons -> buttons, or rawHtml. */
export function buttons(el: HTMLElement, ctx: Ctx): RichItem[] {
  const raw = [rawHtml(el.outerHTML, ctx)];
  if (!onlyAttrs(el, ["class"]) || !onlyClasses(el, ["wp-block-buttons", "is-layout-flex", "wp-block-buttons-is-layout-flex"]))
    return raw;
  const items: RichObject[] = [];
  for (const b of significant(el.childNodes)) {
    if (!isElement(b) || !onlyAttrs(b, ["class"]) || !onlyClasses(b, ["wp-block-button", BUTTON_STYLE])) return raw;
    const links = significant(b.childNodes);
    const a = links[0];
    if (links.length !== 1 || !isElement(a) || tagOf(a) !== "a" || !onlyAttrs(a, ["class", "href"])) return raw;
    if (!onlyClasses(a, ["wp-block-button__link", "wp-element-button"]) || elementChildren(a).length) return raw;
    items.push({
      _type: "button",
      _key: ctx.key(),
      label: a.text.replace(/\s+/g, " ").trim(),
      href: a.getAttribute("href") ?? "",
      style: classesOf(b).some((c) => c.startsWith("is-style-outline")) ? "outline" : "fill",
    });
  }
  return [{ _type: "buttons", _key: ctx.key(), items }];
}

// ---- Documents ----

const INLINE_TAGS = new Set(["a", "strong", "b", "em", "i", "span", "br", "code", "mark", "sub", "sup", "s", "u", "small", "abbr", "time", "kbd", "q", "del", "ins"]);
/** Wrappers whose content we keep but whose box we can't: WordPress layout containers and bare divs. */
const FLATTEN = /^(wp-block-(group|columns|column|cover__inner-container|media-text__content)|is-layout-.*|wp-block-.*-is-layout-.*|wp-container-.*|is-vertically-aligned-.*|are-vertically-aligned-.*|is-content-justification-.*|is-nowrap|align(wide|full)|cle-art-row|cle-figure|has-global-padding)$/;

/** Converts a list of sibling nodes. Inline runs between block elements become paragraphs. */
export function convertNodes(nodes: Node[], ctx: Ctx): RichItem[] {
  const out: RichItem[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (significant(run).length) {
      const inline = inlineContent(run, ctx);
      if (!inline) out.push(rawHtml(run.map((n) => n.toString()).join("").trim(), ctx));
      else if (inline.children.length) out.push(textBlock(inline, "normal", ctx));
    }
    run = [];
  };
  for (const node of nodes) {
    if (node.nodeType === NodeType.COMMENT_NODE) continue;
    if (!isElement(node) || INLINE_TAGS.has(tagOf(node))) {
      run.push(node);
      continue;
    }
    flush();
    out.push(...convertElement(node, ctx));
  }
  flush();
  return out;
}

export function convertElement(el: HTMLElement, ctx: Ctx): RichItem[] {
  const tag = tagOf(el);
  const classes = classesOf(el);
  if (tag === "p" || /^h[1-6]$/.test(tag)) return textElement(el, ctx);
  if (tag === "ul" || tag === "ol") return list(el, ctx);
  if (tag === "blockquote") return quote(el, ctx);
  if (tag === "hr") return separator(el, ctx);
  if (tag === "table") return table(null, el, ctx);
  if (tag === "img") return image(null, el, ctx);
  if (tag === "figure") {
    const kids = elementChildren(el);
    const t = kids.find((k) => tagOf(k) === "table");
    if (t) return table(el, t, ctx);
    const img = kids.find((k) => tagOf(k) === "img");
    if (img) return image(el, img, ctx);
    return [rawHtml(el.outerHTML, ctx)];
  }
  if (tag === "div" && classes.includes("wp-block-spacer")) return spacer(el, ctx);
  if (tag === "div" && classes.includes("wp-block-buttons")) return buttons(el, ctx);
  if (["div", "section", "article", "main", "header", "footer", "aside"].includes(tag)) {
    const flattenable = classes.every((c) => FLATTEN.test(c)) && onlyAttrs(el, ["class", "style", "id"]) && !el.getAttribute("id");
    if (flattenable) return convertNodes(el.childNodes, ctx);
  }
  return [rawHtml(el.outerHTML, ctx)];
}

/** Classic post HTML (or any HTML fragment) -> richBody. */
export function htmlToRichBody(html: string, opts: ConvertOptions = {}): RichBody {
  return convertNodes(parseHtml(html).childNodes, context(opts));
}
