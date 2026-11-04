// A port of WordPress's wptexturize() quote, apostrophe, dash and ellipsis rules (ruling R12).
// WordPress texturizes post text when it renders it; the migrated text is stored as typed, so the
// renderer applies the same rules to Portable Text spans. Stored text never changes.
//
// Not touched, as WordPress skips <code> and URLs: `backtick code`, URLs and email addresses.

const OPEN_DOUBLE = "“";
const CLOSE_DOUBLE = "”";
const OPEN_SINGLE = "‘";
const APOSTROPHE = "’";
const PRIME = "′";
const DOUBLE_PRIME = "″";
const EN_DASH = "–";
const EM_DASH = "—";

// Order follows wptexturize: static replacements, then the dynamic quote and dash patterns.
const RULES: [RegExp, string][] = [
  [/\.\.\./g, "…"],
  [/``/g, OPEN_DOUBLE],
  [/''/g, CLOSE_DOUBLE],
  [/ \(tm\)/gi, " ™"],
  // '99, '90s: an apostrophe before a two-digit year.
  [/(?<=^|[\s([{"\-])'(?=\d\d(?:s\b|\b))/g, APOSTROPHE],
  // Opening single quote after the start, a space, an opening bracket, a double quote or a dash.
  [/(?<=^|[\s([{"\-“])'/g, OPEN_SINGLE],
  // Feet and inches: 5'10".
  [/(?<=\d)'/g, PRIME],
  [/(?<=\d)"/g, DOUBLE_PRIME],
  // An apostrophe inside a word: don't, CLE's.
  [/(?<=\S)'(?=[^\s.,:;!?"'(){}[\]\-])/g, APOSTROPHE],
  // Opening double quote after the start, a space, an opening bracket or a dash.
  [/(?<=^|[\s([{\-‘])"(?!\s)/g, OPEN_DOUBLE],
  // Whatever is left closes.
  [/"/g, CLOSE_DOUBLE],
  [/'/g, APOSTROPHE],
  // Dashes.
  [/---/g, EM_DASH],
  [/(?<=^|\s)--(?=$|\s)/g, EM_DASH],
  [/(?<!xn)--/g, EN_DASH],
  [/(?<=^|\s)-(?=$|\s)/g, EN_DASH],
  // 1920x1080
  [/\b(\d[\d.,]*)x(\d[\d.,]*)\b/g, "$1×$2"],
];

/** Pieces texturize leaves alone: `code`, URLs and email addresses. */
const PROTECTED = /`[^`\n]+`|\b[a-z][a-z0-9+.-]*:\/\/\S+|\bwww\.\S+|\bmailto:\S+|\b[\w.+-]+@[\w-]+\.[\w.-]+/gi;

function texturizePlain(text: string): string {
  return RULES.reduce((s, [re, to]) => s.replace(re, to), text);
}

/**
 * Smart quotes, apostrophes, dashes and ellipses for one run of text. `before` is the character
 * just before it (the end of the previous span), so a quote at a span's start opens or closes
 * correctly.
 */
export function texturize(text: string, before = ""): string {
  if (!text) return text;
  // Stand-in for the preceding character that the rules can't merge with: space, bracket or letter.
  const ctx = !before ? "" : /\s/.test(before) ? " " : /[([{\-“‘"]/.test(before) ? "(" : "a";
  const out: string[] = [];
  let last = 0;
  let prev = ctx;
  for (const m of text.matchAll(PROTECTED)) {
    const plain = text.slice(last, m.index);
    out.push(texturizeWith(plain, prev), m[0]);
    prev = "a";
    last = m.index + m[0].length;
  }
  out.push(texturizeWith(text.slice(last), last === 0 ? ctx : prev));
  return out.join("");
}

function texturizeWith(text: string, ctx: string): string {
  if (!text) return text;
  return ctx ? texturizePlain(ctx + text).slice(ctx.length) : texturizePlain(text);
}

type Span = { _type?: string; text?: string };

/** Texturizes a block's spans, each with the previous span's last character as context. */
export function texturizeSpans<T extends Span>(children: T[]): T[] {
  let before = "";
  return children.map((child) => {
    if (child._type !== "span" || typeof child.text !== "string") return child;
    const text = texturize(child.text, before);
    before = child.text.slice(-1);
    return { ...child, text };
  });
}

/**
 * texturize() over inline HTML (table cells): only the text between tags changes, each run with the
 * previous run's last character as context; tags, attributes and <code>/<pre> contents are kept.
 */
export function texturizeHtml(html: string): string {
  let before = "";
  let skip = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        const m = /^<(\/?)(code|pre|kbd|samp|script|style)\b/i.exec(part);
        if (m) skip = Math.max(0, skip + (m[1] ? -1 : 1));
        return part;
      }
      if (!part || skip) return part;
      const out = texturize(part, before);
      before = part.slice(-1);
      return out;
    })
    .join("");
}
