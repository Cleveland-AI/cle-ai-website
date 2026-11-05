import type { CSSProperties } from "react";
import { parseStyle } from "@/components/core/Section";
import type { RawHtml as RawHtmlValue } from "@/lib/content/types";
import { sanitize } from "@/lib/sanitize";

const VOID = new Set(["area", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// Roots that may be hoisted, and the attributes they may carry (anything else keeps the wrapper).
const ROOTS = new Set(["figure", "div", "p", "section", "aside", "blockquote", "ul", "ol"]);
const ATTRS = /^(class|style|id|data-[\w-]+|aria-[\w-]+|role)$/;
const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>"'/]+(?:="[^"]*")?)*)\s*(\/?)>/g;

type Root = { tag: string; attrs: Record<string, string>; inner: string };

/**
 * The fragment's single root element, when it has exactly one (sanitized HTML: quoted attributes),
 * a tag in ROOTS and only plain attributes; else null.
 */
export function singleRoot(html: string): Root | null {
  const s = html.trim();
  const open = /^<([a-zA-Z][\w-]*)((?:\s+[^\s=>"'/]+(?:="[^"]*")?)*)\s*>/.exec(s);
  if (!open || !ROOTS.has(open[1].toLowerCase())) return null;
  const tag = open[1].toLowerCase();
  if (!s.toLowerCase().endsWith(`</${tag}>`)) return null;
  // The root must close only at the very end: walk the tags and track depth.
  let depth = 0;
  TAG.lastIndex = 0;
  for (let m = TAG.exec(s); m; m = TAG.exec(s)) {
    const name = m[2].toLowerCase();
    if (m[4] || VOID.has(name)) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0 && TAG.lastIndex !== s.length) return null;
  }
  if (depth !== 0) return null;
  const attrs: Record<string, string> = {};
  for (const a of open[2].matchAll(/([^\s=>"'/]+)(?:="([^"]*)")?/g)) {
    if (!ATTRS.test(a[1])) return null;
    attrs[a[1]] = a[2] ?? "";
  }
  return { tag, attrs, inner: s.slice(open[0].length, s.length - `</${tag}>`.length) };
}

const decode = (v: string) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/**
 * Editors' saved HTML (and migrated blocks with no equivalent), through the rawBlock sanitizer (R15).
 * A single-root fragment renders as that root element, as WordPress prints it: a wrapper (even with
 * display: contents) would break the flow layout's :first-child / :last-child margins (Task 17).
 */
export function RawHtml({ value }: { value: RawHtmlValue }) {
  if (!value.html) return null;
  const clean = sanitize(value.html, "rawBlock");
  const root = singleRoot(clean);
  if (!root) return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: clean }} />;
  const Tag = root.tag as "div";
  const { class: className, style, ...rest } = Object.fromEntries(Object.entries(root.attrs).map(([k, v]) => [k, decode(v)]));
  return (
    <Tag
      {...rest}
      className={className || undefined}
      style={parseStyle(style) as CSSProperties | undefined}
      dangerouslySetInnerHTML={{ __html: root.inner }}
    />
  );
}
