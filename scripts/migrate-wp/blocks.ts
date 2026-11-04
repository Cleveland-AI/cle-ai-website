// WordPress block markup (post_content as saved, `content.raw` over REST) -> richBody.
//
// Core blocks map to the richBody objects that render the same markup (Task 4); static blocks are
// read from their saved HTML with the rules in html.ts. Theme blocks follow the naming rule
// (theme-defaults.ts). Anything else keeps its saved HTML as rawHtml, so nothing is dropped.
import { type HTMLElement, NodeType } from "node-html-parser";
import {
  buttons,
  classesOf,
  context,
  convertNodes,
  type ConvertOptions,
  type Ctx,
  image,
  list,
  normalizeStyle,
  parseHtml,
  quote,
  rawHtml,
  type RichBody,
  type RichItem,
  separator,
  spacer,
  table,
  textElement,
} from "./html";
import { cleObject } from "./theme-defaults";

export type ParsedBlock = {
  name: string;
  attrs: Record<string, unknown>;
  inner: ParsedBlock[];
  /** The block's own HTML with inner blocks cut out (WordPress's innerHTML). */
  innerHTML: string;
  /** The block's markup as saved, comments and inner blocks included. */
  source: string;
};
/** HTML outside any block (classic content). */
export type Freeform = { name: null; html: string };

// WordPress's block delimiter grammar: <!-- wp:ns/name {json} /--> or <!-- /wp:ns/name -->.
const DELIMITER = /<!--\s+(\/)?wp:([a-z][a-z0-9_-]*\/)?([a-z][a-z0-9_-]*)\s+(\{[\s\S]*?\}\s+)?(\/)?-->/g;

/** Parses block markup into a tree, like WordPress's parse_blocks(). */
export function parseBlocks(markup: string): (ParsedBlock | Freeform)[] {
  const root: (ParsedBlock | Freeform)[] = [];
  const stack: { block: ParsedBlock; start: number }[] = [];
  let last = 0;
  const text = (html: string) => {
    if (!html) return;
    const top = stack.at(-1);
    if (top) top.block.innerHTML += html;
    else root.push({ name: null, html });
  };
  const add = (block: ParsedBlock) => {
    const top = stack.at(-1);
    if (top) top.block.inner.push(block);
    else root.push(block);
  };
  for (const m of markup.matchAll(DELIMITER)) {
    const [token, closer, ns, bare, json, selfClosing] = m;
    const at = m.index;
    text(markup.slice(last, at));
    last = at + token.length;
    const name = `${ns ?? "core/"}${bare}`;
    if (closer) {
      // Pop to the matching opener (tolerates a stray closer).
      const i = stack.map((s) => s.block.name).lastIndexOf(name);
      if (i < 0) continue;
      while (stack.length > i + 1) {
        const orphan = stack.pop()!;
        orphan.block.source = markup.slice(orphan.start, at);
        add(orphan.block);
      }
      const { block, start } = stack.pop()!;
      block.source = markup.slice(start, last);
      add(block);
      continue;
    }
    let attrs: Record<string, unknown> = {};
    try {
      attrs = json ? (JSON.parse(json) as Record<string, unknown>) : {};
    } catch {
      attrs = {};
    }
    const block: ParsedBlock = { name, attrs, inner: [], innerHTML: "", source: token };
    if (selfClosing) add(block);
    else stack.push({ block, start: at });
  }
  text(markup.slice(last));
  while (stack.length) {
    const { block, start } = stack.shift()!;
    block.source = markup.slice(start);
    root.push(block);
  }
  return root;
}

/** The block's full HTML (inner blocks included), without block comments. */
const htmlOf = (block: ParsedBlock) => block.source.replace(DELIMITER, "").trim();

/** The first element in some HTML. */
function firstElement(html: string): HTMLElement | undefined {
  return parseHtml(html).childNodes.find((n) => n.nodeType === NodeType.ELEMENT_NODE) as HTMLElement | undefined;
}

const raw = (block: ParsedBlock, ctx: Ctx) => rawHtml(htmlOf(block) || block.source.trim(), ctx);

/** Classes WordPress derives from a layout attribute at render time (they aren't in saved HTML). */
function layoutClasses(layout: Record<string, unknown> | undefined): string[] {
  if (!layout || layout.type !== "flex") return [];
  const out: string[] = [];
  if (layout.orientation === "vertical") out.push("is-vertical");
  if (typeof layout.justifyContent === "string") out.push(`is-content-justification-${layout.justifyContent}`);
  if (layout.flexWrap === "nowrap") out.push("is-nowrap");
  return out;
}

/** Saved classes, minus the ones the renderer emits itself. */
function extraClasses(el: HTMLElement, generated: (string | RegExp)[]): string[] {
  return classesOf(el).filter((c) => !generated.some((g) => (typeof g === "string" ? g === c : g.test(c))));
}

const joinClasses = (classes: string[]) => (classes.length ? classes.join(" ") : undefined);

/** Drops undefined/empty-string fields so documents stay small and stable. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")) as T;
}

function group(block: ParsedBlock, ctx: BlockCtx): RichItem[] {
  const a = block.attrs as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const el = firstElement(block.innerHTML);
  if (!el) return [raw(block, ctx)];
  // The theme's big-number figure: a group of two paragraphs.
  if (classesOf(el).includes("cle-figure")) {
    const paras = block.inner.filter((b) => b.name === "core/paragraph");
    if (paras.length === 2 && block.inner.length === 2) {
      const [number, label] = paras.map((p) => (firstElement(p.innerHTML)?.text ?? "").replace(/\s+/g, " ").trim());
      return [{ _type: "figure", _key: ctx.key(), number, label }];
    }
  }
  const align = typeof a.align === "string" ? a.align : undefined;
  const layoutType = (a.layout?.type as string | undefined) ?? "default";
  const generated = [
    "wp-block-group",
    align ? `align${align}` : "",
    a.textColor ? `has-${a.textColor}-color` : "",
    a.backgroundColor ? `has-${a.backgroundColor}-background-color` : "",
    a.textColor ? "has-text-color" : "",
    a.backgroundColor ? "has-background" : "",
  ].filter(Boolean);
  return [
    compact({
      _type: "section",
      _key: ctx.key(),
      tag: (a.tagName as string | undefined) ?? "div",
      className: joinClasses([...extraClasses(el, generated), ...layoutClasses(a.layout)]),
      anchor: el.getAttribute("id"),
      align: align ?? "none",
      layout: layoutType === "flow" ? "default" : layoutType,
      backgroundColor: a.backgroundColor as string | undefined,
      textColor: a.textColor as string | undefined,
      style: normalizeStyle(el.getAttribute("style")) || undefined,
      // Only a zero gap is kept (the templates' <main>); other gaps are flex groups the renderer styles.
      blockGap: a.style?.spacing?.blockGap === "0" ? "0" : undefined,
      children: convert(block.inner, ctx),
    }),
  ];
}

function columns(block: ParsedBlock, ctx: BlockCtx): RichItem[] {
  const a = block.attrs as Record<string, unknown>;
  const el = firstElement(block.innerHTML);
  if (!el || block.inner.some((b) => b.name !== "core/column")) return [raw(block, ctx)];
  const cols = block.inner.map((col) => {
    const c = col.attrs as Record<string, unknown>;
    const colEl = firstElement(col.innerHTML);
    const width = typeof c.width === "number" ? `${c.width}%` : (c.width as string | undefined);
    return compact({
      _type: "column",
      _key: ctx.key(),
      width,
      verticalAlignment: c.verticalAlignment as string | undefined,
      className: colEl ? joinClasses(extraClasses(colEl, ["wp-block-column", /^is-vertically-aligned-/])) : undefined,
      children: convert(col.inner, ctx),
    });
  });
  const align = typeof a.align === "string" ? a.align : undefined;
  return [
    compact({
      _type: "columns",
      _key: ctx.key(),
      className: joinClasses(extraClasses(el, ["wp-block-columns", /^align(wide|full)$/, /^are-vertically-aligned-/])),
      align: align ?? "none",
      verticalAlignment: a.verticalAlignment as string | undefined,
      style: normalizeStyle(el.getAttribute("style")) || undefined,
      columns: cols,
    }),
  ];
}

function query(block: ParsedBlock, ctx: BlockCtx): RichItem[] {
  const q = (block.attrs.query ?? {}) as Record<string, unknown>;
  const events = q.postType === "meetup_events";
  return [
    compact({
      _type: "queryList",
      _key: ctx.key(),
      source: events ? "events" : "posts",
      when: events ? ((q.cleWhen as string | undefined) ?? "upcoming") : undefined,
      count: typeof q.perPage === "number" ? q.perPage : Number(q.perPage) || undefined,
    }),
  ];
}

/** Converts one static core block through its saved HTML with an html.ts rule. */
function viaHtml(block: ParsedBlock, ctx: Ctx, rule: (el: HTMLElement, ctx: Ctx) => RichItem[]): RichItem[] {
  const el = firstElement(htmlOf(block));
  return el ? rule(el, ctx) : [];
}

function convertBlock(block: ParsedBlock, ctx: BlockCtx): RichItem[] {
  if (ctx.drop?.includes(block.name)) return [];
  switch (block.name) {
    case "core/paragraph":
    case "core/heading":
      return viaHtml(block, ctx, textElement);
    case "core/list":
      return viaHtml(block, ctx, list);
    case "core/quote":
      return viaHtml(block, ctx, quote);
    case "core/separator":
      return viaHtml(block, ctx, separator);
    case "core/spacer":
      return viaHtml(block, ctx, spacer);
    case "core/table":
      return viaHtml(block, ctx, (el, c) => {
        const t = el.querySelector("table");
        return t ? table(el.rawTagName === "figure" ? el : null, t, c) : [rawHtml(el.outerHTML, c)];
      });
    case "core/image":
      return viaHtml(block, ctx, (el, c) => {
        const img = el.querySelector("img");
        // The image block's width/height attributes resize it; richBody images can't, so keep the HTML.
        const { width, height, className } = block.attrs;
        const styleOnly = className === undefined || /^is-style-(default|plain)$/.test(String(className));
        if (!img || width || height || !styleOnly) return [rawHtml(el.outerHTML, c)];
        return image(el.rawTagName === "figure" ? el : null, img, c);
      });
    case "core/buttons": {
      const { layout, style, align, className } = block.attrs as Record<string, unknown>;
      if (layout || style || align || className) return [raw(block, ctx)];
      return viaHtml(block, ctx, buttons);
    }
    case "core/group":
      return group(block, ctx);
    case "core/columns":
      return columns(block, ctx);
    case "core/query":
      return query(block, ctx);
    case "core/html":
      return block.innerHTML.trim() ? [rawHtml(block.innerHTML.trim(), ctx)] : [];
    case "core/freeform":
      return convertNodes(parseHtml(block.innerHTML).childNodes, ctx);
  }
  if (block.name.startsWith("cle/")) {
    const children = convert(block.inner, ctx);
    const obj = cleObject(block.name, block.attrs, ctx.key(), children, ctx.themeDir);
    if (!obj) return [rawHtml(block.source.trim(), ctx)];
    // A container type keeps its inner blocks as `children`; any other keeps them as siblings.
    return obj.children || !children.length ? [obj as RichItem] : [obj as RichItem, ...children];
  }
  return [raw(block, ctx)];
}

export type BlockOptions = ConvertOptions & {
  /** Block names to leave out (the homepage drops core/template-part: the layout supplies them). */
  drop?: string[];
  themeDir?: string;
};

type BlockCtx = Ctx & Pick<BlockOptions, "drop" | "themeDir">;

function convert(blocks: (ParsedBlock | Freeform)[], ctx: BlockCtx): RichItem[] {
  return blocks.flatMap((b) =>
    b.name === null ? (b.html.trim() ? convertNodes(parseHtml(b.html).childNodes, ctx) : []) : convertBlock(b, ctx),
  );
}

/** Block markup -> richBody. */
export function blockMarkupToRichBody(markup: string, opts: BlockOptions = {}): RichBody {
  return convert(parseBlocks(markup), { ...context(opts), drop: opts.drop, themeDir: opts.themeDir });
}
